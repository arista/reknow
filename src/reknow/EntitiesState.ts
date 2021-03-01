import {Entity} from "./Entity"
import {EntityState} from "./EntityState"
import {StateManager} from "./StateManager"
import {Entities} from "./Entities"
import {StateChange} from "./Types"
import {Action} from "./Types"
import {notNull} from "./Utils"
import {EntityClass} from "./Types"
import {InternalEntityClass} from "./Types"
import {IndexSchema} from "./Types"
import {Index} from "./Index"
import {matchesSchema} from "./Utils"
import {EntityDeclarations} from "./EntityDeclarations"
import {EntitiesDeclarations} from "./EntitiesDeclarations"
import {Relationship} from "./Relationship"
import {Proxied} from "./Proxied"
import {ById} from "./Types"
import {IndexDecorator} from "./Types"
import {indexSchemaProperties} from "./Utils"
import {addProperty} from "./Utils"
import {addNonEnumerableProperty} from "./Utils"
import {isPlainObject} from "./Utils"
import {plainObjectToInstance} from "./Utils"
import {ChangePublisher} from "./ChangePublisher"
import {copyProperties} from "./Utils"
import {Query} from "./Query"
import {FunctionType} from "./Types"
import {toMemberName} from "./Utils"
import {ENTITY_STATE_KEY} from "./Entity"

export type EntityStateById<E extends Entity> = {[id: string]: EntityState<E>}

export class EntitiesState<E extends Entity> extends Proxied<
  ById<E>,
  EntityStateById<E>
> {
  idPropertyName: string | null = null

  indexes: Array<Index<E>> = []
  // note - realized that this might not be needed, since updating a property involves updating even indexes that don't change their references, since the entity identities are still changing
  indexesByProperty: {[prop: string]: Array<Index<E>>} = {}

  relationships: Array<Relationship> = []
  relationshipsByName: {[relationshipName: string]: Relationship} = {}

  // FIXME - not sure we need this
  idGenerator: number = 1

  entityDeclarations = EntityDeclarations.forClass(this.entityClass)

  // Flag if the proxy is being mutated internally, vs. from the
  // application
  mutatingProxyInternally: boolean = false

  reactions: Array<Query<any>> = []
  reactionsByName: {[name: string]: Query<any>} = {}
  queries: Array<Query<any>> = []
  queriesByName: {[name: string]: Query<any>} = {}

  constructor(
    public name: string,
    public stateManager: StateManager,
    public entities: Entities<E>,
    public entityClass: EntityClass<E>
  ) {
    super({}, stateManager)

    // Connect the Entities to this
    if (entities._entitiesState != null) {
      throw new Error(
        `Attempt to register Entities class multiple times ("${name}" and "${entities._entitiesState.name}")`
      )
    }
    entities._entitiesState = this

    // Connect the Entity class to this
    ;((entityClass as unknown) as InternalEntityClass<any>).entitiesState = this

    // Apply declarations for the entities class (@index, for example)
    this.applyEntitiesDeclarations()
  }

  // FIXME - remove this concept, fix the tests to no longer need it
  clearState() {
    super.clearState()
    this.idGenerator = 1
    for (const id in this.target) {
      const entityState = this.target[id]
      entityState.clearState()
    }
    this.target = {}
    for (const index of this.indexes) {
      index.clearState()
    }
    // FIXME - clear out selectors somehow?
  }

  get entitiesClass() {
    return this.entities.constructor
  }

  get byId(): EntityStateById<E> {
    return this.target
  }

  applyEntityDeclarations() {
    for (const r of this.entityDeclarations.relationships) {
      r.apply(this)
    }
    this.idPropertyName = this.entityDeclarations.idPropertyName
  }

  applyEntitiesDeclarations() {
    const entitiesDeclarations = EntitiesDeclarations.forClass(
      this.entitiesClass
    )
    for (const d of entitiesDeclarations.indexDecorators) {
      this.addIndexFromDecorator(d)
    }
    this.addEntitiesQueries(entitiesDeclarations)
    this.addEntitiesReactions(entitiesDeclarations)
  }

  addPropertyToEntitiesInstance<T>(
    name: string,
    getter: (() => T) | null = null,
    setter: ((val: T) => void) | null = null
  ) {
    addProperty(this.entities, name, getter, setter)
  }

  addInstancePropertyToEntityClass<T>(
    name: string,
    getter: (() => T) | null = null,
    setter: ((val: T) => void) | null = null
  ) {
    addProperty(this.entityClass.prototype, name, getter, setter)
  }

  addIndexFromDecorator(d: IndexDecorator) {
    const index = new Index<E>(d.schema)
    index.name = d.name
    this.addIndex(index)

    // Create the getter
    const getter = function () {
      return index.proxy
    }
    this.addPropertyToEntitiesInstance(d.name, getter)
  }

  findOrCreateIndex(schema: IndexSchema, baseName: string): Index<any> {
    for (const index of this.indexes) {
      if (index instanceof Index && matchesSchema(schema, index.schema)) {
        return index
      }
    }
    const index = new Index<any>(schema)
    index.name = baseName
    this.addIndex(index)
    return index
  }

  checkMutable() {
    this.stateManager.checkMutable()
  }

  toAction(name: string, args: Array<any>): Action {
    return {
      type: "EntitiesAction",
      entityType: this.name,
      name,
      args,
    }
  }

  applyAction(name: string, type: FunctionType, f: Function, args: Array<any>) {
    const actionName = toMemberName(name, type)
    const action = this.toAction(actionName, args)
    return this.stateManager.whileInAction(action, () =>
      f.apply(this.entities, args)
    )
  }

  toSelectorName(name: string) {
    return `${this.name}.${name}`
  }

  /** If a relationship is declared using this form:
   *
   *  @hasMany(ScorePages, "scoreId") scorePages!: Array<ScorePage>
   *
   * Typescript will actually define a scorePages property with value
   * "undefined", which will overshadow the scorePages getter created
   * in the prototype for the relationship.  So when the entity is
   * added, we need to go through and delete those properties.
   **/
  removeRelationshipProperties(entity: E) {
    for (const r of this.relationships) {
      delete (entity as any)[r.name]
    }
  }

  extractRelationshipProperties(entity: E) {
    let ret: {[name: string]: any} | null = null
    for (const r of this.relationships) {
      // Read the property directly from the object, not from any
      // prototype
      const pd = Object.getOwnPropertyDescriptor(entity, r.name)
      if (pd != null) {
        const rval = pd.value
        if (rval != null) {
          if (ret == null) {
            ret = {}
          }
          ret[r.name] = rval
        }
        delete (entity as any)[r.name]
      }
    }
    return ret
  }

  add(entity: E, id: string | null = null, update = false): E {
    this.checkMutable()
    const addedEntities: Map<Entity, Entity> = new Map()
    return this.addEntity(addedEntities, entity, id, update)
  }

  update(entity: E, id: string | null = null): E {
    return this.add(entity, id, true)
  }

  addEntity(
    addedEntities: Map<Entity, Entity>,
    entitySource: E,
    id: string | null,
    update: boolean
  ): E {
    // If the entity was already added as part of this operation,
    // return its associated Entity
    const addedEntity = addedEntities.get(entitySource)
    if (addedEntity != null) {
      return addedEntity as E
    }

    // If the Entity already has an EntityState, or is a Proxy with an
    // EntityState, make sure it's the expected class and just return
    // its current Proxy
    let existingEntityState = EntityState.getEntityState(entitySource)
    if (existingEntityState != null) {
      const entitiesState = existingEntityState.entitiesState
      if (!(entitySource instanceof entitiesState.entityClass)) {
        throw new Error(
          `Attempt to add entity of unexpected class ${entitySource?.constructor?.name} to ${entitiesState.name}`
        )
      }
      // Throw an error if the entity was previously removed
      if (existingEntityState.isRemoved) {
        throw new Error(`A removed entity may not be re-added`)
      }
      const ret = existingEntityState.proxy
      addedEntities.set(entitySource, ret)
      return ret
    }

    // Extract the relationships, which we'll add back later
    const entityRelationships = this.extractRelationshipProperties(entitySource)

    // If the entitySource is a plain object, then create an object of
    // the appropriate class
    let entity: E = entitySource
    if (isPlainObject(entitySource)) {
      entity = plainObjectToInstance(entitySource, this.entityClass)
    } else if (!(entity instanceof this.entityClass)) {
      throw new Error(
        `Attempt to add entity of unexpected class ${entity?.constructor?.name} to ${this.name}`
      )
    }

    // Determine what id to use
    const entityId = this.getOrAssignEntityId(entity, id)

    // If there is already an entity with the given id, then error
    // unless we're updating instead of only adding
    const isExistingEntity = this.byId.hasOwnProperty(entityId)
    if (isExistingEntity && !update) {
      throw new Error(
        `An Entity has already been added to "${this.name}" with id "${entityId}"`
      )
    }

    const entityState = isExistingEntity
      ? this.byId[entityId]
      : new EntityState(this, entity, entityId)

    return this.stateManager.withDebugEvent(
      () => {
        return {
          type: "AddDebugEvent",
          entity: entityState.changePublisherName,
        }
      },
      () => {
        if (isExistingEntity) {
          const esproxy = entityState.proxy
          copyProperties(entity, esproxy)
        } else {
          addNonEnumerableProperty(entity, ENTITY_STATE_KEY, entityState)

          this.invalidateProxy()
          this.addEntityToEntitiesById(entityId, entityState)
          this.notifySubscribersOfChange()
          this.updateIndexesOnEntityAdded(entityState)
          this.stateManager.recordEntityAdded(entityState)
          entityState.addPendingAfterAdd()

          // Add the queries defined on the Entity class
          this.addQueries(entityState)

          // Add the reactions
          this.addReactions(entityState)
        }

        // Keep track of the added entity, to handle adding a graph of
        // objects
        addedEntities.set(entitySource, entityState.proxy)

        // Now go back and add the relationships that were extracted
        this.addEntityRelationships(
          addedEntities,
          entityState.proxy,
          entityRelationships,
          update
        )

        return entityState.proxy
      }
    )
  }

  addEntityToEntitiesById(entityId: string, entityState: EntityState<E>) {
    const oldValue = this.mutatingProxyInternally
    try {
      this.mutatingProxyInternally = true
      // We need to modify the proxy to get its side effects, but
      // from the application's view it is typed as having Entity
      // instances, so we need to do some type-casting to make this
      // pass the compiler
      const byId = (this.entitiesById as unknown) as {
        [key: string]: EntityState<E>
      }
      byId[entityId] = entityState
    } finally {
      this.mutatingProxyInternally = oldValue
    }
  }

  addEntityRelationships(
    addedEntities: Map<Entity, Entity>,
    entity: E,
    entityRelationships: {[name: string]: any} | null,
    update: boolean
  ) {
    if (entityRelationships == null) {
      return
    }
    for (const r of this.relationships) {
      const foreignEntitiesState = r.foreignEntitiesState
      const rval = (entityRelationships as any)[r.name]
      if (rval != null) {
        if (r.isMany) {
          if (!Array.isArray(rval)) {
            throw new Error(
              `Relationship property ${r.name} of entity being added to ${this.name} is expected to be an array`
            )
          }
          for (const e of rval) {
            const added = foreignEntitiesState.addEntity(
              addedEntities,
              e,
              null,
              update
            )
            r.add(entity, added)
          }
        } else {
          if (Array.isArray(rval)) {
            throw new Error(
              `Relationship property ${r.name} of entity being added to ${this.name} is expected to be a single object, not an array`
            )
          }
          const added = foreignEntitiesState.addEntity(
            addedEntities,
            rval,
            null,
            update
          )
          r.add(entity, added)
        }
      }
    }
  }

  remove(entity: E) {
    this.checkMutable()

    // FIXME - set a flag that this is being removed, and don't execute if it was already true.  This is to prevent circular loops in dependent "remove"

    const entityState = EntityState.getEntityState(entity)
    if (entityState == null) {
      throw new Error(`Attempt to remove an entity that has not been added`)
    }

    if (entityState.entitiesState !== this) {
      throw new Error(
        `Attempt to remove entity with type "${entityState.entitiesState.name}" from the wrong Entities ("${this.name}")`
      )
    }

    // If the entity has already been removed (possibly because it was
    // part of a graph of objects being removed through {dependent:
    // "remove"} declarations), then just ignore the call
    if (entityState.isRemoved) {
      return
    }

    const id = entityState.id
    if (this.byId[id] !== entityState) {
      throw new Error(
        `Entity with id "${id}" is not found, or is not the same as the Entity being removed`
      )
    }
    entityState.isRemoved = true

    return this.stateManager.withDebugEvent(
      () => {
        return {
          type: "RemoveDebugEvent",
          entity: entityState.changePublisherName,
        }
      },
      () => {
        entityState.removeReactions()
        entityState.removeQueries()
        entityState.removeChangePublishers()

        this.invalidateProxy()
        this.deleteEntityFromEntitiesById(id)
        this.notifySubscribersOfChange()
        this.removeRelationships(entity)
        this.updateIndexesOnEntityRemoved(entityState)
        this.stateManager.recordEntityRemoved(entityState)
        entityState.addPendingAfterRemove()
      }
    )
  }

  removeRelationships(entity: E) {
    for (const relationship of this.relationships) {
      relationship.primaryRemoved(entity)
    }
  }

  deleteEntityFromEntitiesById(entityId: string) {
    const oldValue = this.mutatingProxyInternally
    try {
      this.mutatingProxyInternally = true
      delete this.entitiesById[entityId]
    } finally {
      this.mutatingProxyInternally = oldValue
    }
  }

  removeAll() {
    const ids = Object.keys(this.byId)
    for (const id of ids) {
      const entityState = this.byId[id]
      this.remove(entityState.entity)
    }
  }

  getOrAssignEntityId(entity: E, id: string | null): string {
    if (id != null) {
      if (this.idPropertyName != null) {
        ;(entity as any)[this.idPropertyName] = id
      }
      return id
    } else if (this.idPropertyName != null) {
      const declaredId: string | null = (entity as any)[this.idPropertyName]
      if (declaredId != null) {
        // FIXME - check that the id isn't already defined
        return declaredId
      } else {
        const id = this.generateId()
        ;(entity as any)[this.idPropertyName] = id
        return id
      }
    } else {
      return this.generateId()
    }
  }

  generateId(): string {
    // FIXME - better id generator?
    // FIXME - make sure id isn't already used
    return `${this.idGenerator++}`
  }

  addReactions(entityState: EntityState<E>) {
    for (const cdecl of this.entityDeclarations.reactions) {
      const f = () => cdecl.f.apply(entityState.proxy)
      const query: Query<any> = this.stateManager.createReaction(
        f,
        `${this.name}#${entityState.id}.${cdecl.name}`
      )
      entityState.reactions.push(query)
      entityState.reactionsByName[cdecl.name] = query
    }
  }

  addQueries(entityState: EntityState<E>) {
    for (const cdecl of this.entityDeclarations.queries) {
      const f = () => cdecl.f.apply(entityState.proxy)
      const query: Query<any> = this.stateManager.createQuery(
        f,
        `${this.name}#${entityState.id}.${cdecl.name}`,
        // If a query on an Entity is invalidated, notify any
        // subscribers looking for any change to an Entity (such as
        // Queries that return the entity), just like we would if a
        // property on the Entity was invalidated.
        ()=>entityState.notifySubscribersOfChange()
      )
      entityState.queries.push(query)
      entityState.queriesByName[cdecl.name] = query
    }
  }

  addEntitiesReactions(entitiesDeclarations: EntitiesDeclarations) {
    for (const cdecl of entitiesDeclarations.reactions) {
      const f = () => cdecl.f.apply(this.entities)
      const query: Query<any> = this.stateManager.createReaction(
        f,
        `${this.name}.${cdecl.name}`
      )
      this.reactions.push(query)
      this.reactionsByName[cdecl.name] = query
    }
  }

  addEntitiesQueries(entitiesDeclarations: EntitiesDeclarations) {
    for (const cdecl of entitiesDeclarations.queries) {
      const f = () => cdecl.f.apply(this.entities)
      const query = this.stateManager.createQuery(
        f,
        `${this.name}.${cdecl.name}`
      )
      this.queries.push(query)
      this.queriesByName[cdecl.name] = query
    }
  }

  addIndex(index: Index<E>) {
    index.entitiesState = this
    this.indexes.push(index)
    for (const p of indexSchemaProperties(index.schema)) {
      const pindexes = this.indexesByProperty[p]
      if (pindexes == null) {
        this.indexesByProperty[p] = [index]
      } else {
        pindexes.push(index)
      }
    }
  }

  updateIndexesOnEntityAdded(e: EntityState<E>) {
    for (const index of this.indexes) {
      index.onEntityAdded(e)
    }
  }

  updateIndexesOnEntityRemoved(e: EntityState<E>) {
    for (const index of this.indexes) {
      index.onEntityRemoved(e)
    }
  }

  updateIndexesOnEntityPropertyChanged(
    e: EntityState<E>,
    property: string,
    hadOldValue: boolean,
    oldValue: any | null,
    hasNewValue: boolean,
    newValue: any | null
  ) {
    for (const index of this.indexes) {
      index.onEntityPropertyChanged(
        e,
        property,
        hadOldValue,
        oldValue,
        hasNewValue,
        newValue
      )
    }
  }

  getEntityWithId(id: string): E {
    return notNull(this.byId[id]).entity
  }

  get proxy() {
    const ret = super.proxy
    const s = this.stateManager?.currentSelector
    if (s != null) {
      // FIXME - create the name and getter once and reuse it
      s.addSelectorDependency(
        `${this.name}.entitiesById`,
        () => this.entitiesById,
        ret
      )
    }
    return ret
  }

  get entitiesById() {
    return this.proxy
  }

  getRelationshipIndexName(relationshipName: string): string | null {
    const r = this.relationshipsByName[relationshipName]
    if (r == null) {
      throw new Error(
        `Entities "${this.name}" does not have a relationship property "${relationshipName}"`
      )
    }
    return r.indexName
  }

  // Method from Proxied, exposing byId
  propertyGet(prop: string) {
    const es = super.propertyGet(prop)
    if (es instanceof EntityState) {
      return es.proxy
    } else {
      return es
    }
  }

  // Method from Proxied, exposing byId
  propertySet(prop: string, value: any): boolean {
    if (!this.mutatingProxyInternally) {
      throw new Error(`ById cannot be modified directly`)
    }
    return super.propertySet(prop, value)
  }

  // Method from Proxied, exposing byId
  propertyDelete(prop: string): boolean {
    if (!this.mutatingProxyInternally) {
      throw new Error(`ById cannot be modified directly`)
    }
    return super.propertyDelete(prop)
  }

  //--------------------------------------------------
  // ChangeSubscribers and ChangePublishers for handling @reactions

  get changePublisherName() {
    return this.name
  }
}
