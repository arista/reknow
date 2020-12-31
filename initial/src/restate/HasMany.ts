import {Relationship} from "./Relationship"
import {EntitiesState} from "./EntitiesState"
import {HasManyOptions} from "./Types"
import {hasManySortToSortDirectives} from "./Utils"
import {IndexSchema} from "./Types"
import {Entity} from "./Entity"
import {EntityClass} from "./Types"
import {Index} from "./Index"
import {HasManyInstance} from "./HasManyInstance"
import {EntityState} from "./EntityState"
import {arrayChanges} from "./Utils"

export class HasMany extends Relationship {
  primaryKey!: string | null
  foreignIndex!: Index<any>
  hasManyInstancesByEntityState = new WeakMap<
    EntityState<Entity>,
    HasManyInstance
  >()

  constructor(
    public name: string,
    public foreignEntityFunc: () => EntityClass<any>,
    public foreignKey: string,
    public options: HasManyOptions | null
  ) {
    super(name, foreignEntityFunc)
  }

  get foreignIndexTargetSchema() {
    const sort = hasManySortToSortDirectives(this.options?.sort)
    const targetSchema: IndexSchema = {
      type: "ManyHashIndexSchema",
      property: this.foreignKey,
      entrySchema: {
        type: "SortIndexSchema",
        sort,
      },
    }
    return targetSchema
  }

  findOrCreateForeignIndex() {
    const targetSchema = this.foreignIndexTargetSchema
    const baseIndexName = `_indexForRelationship_${this.foreignEntitiesState.name}.${this.name}`
    return this.foreignEntitiesState.findOrCreateIndex(
      targetSchema,
      baseIndexName
    )
  }

  getPrimaryKeyValue<P extends Entity>(entity: P) {
    return this.primaryKey == null
      ? entity.entityId
      : (entity as any)[this.primaryKey]
  }

  getValue<P extends Entity, F extends Entity>(entity: P): Array<F> {
    const primaryKeyValue = this.getPrimaryKeyValue(entity)
    const result = this.foreignIndex.proxy[primaryKeyValue]
    return this.getResultProxy(entity, result)
  }

  setValue<P extends Entity, F extends Entity>(
    entity: P,
    val: Array<F> | null | undefined
  ): void {
    // Get the EntityStates of the old and new lists
    const val1 = this.getValue(entity).map((e) => e.entityState)

    // FIXME - this should check to see if the entities have been
    // added yet, and add them if not
    const val2 = val == null ? [] : val.map((e) => e.entityState)

    // Get the list of elements to be added and removed
    const changes = arrayChanges(val1, val2)

    for (const e of changes.add) {
      this.add(entity, e.proxy)
    }
    for (const e of changes.remove) {
      this.remove(e.proxy)
    }
  }

  createGetter<P extends Entity, F extends Entity>(): () => Array<F> {
    const self = this
    return function (this: P) {
      return self.getValue(this)
    }
  }

  createSetter<P extends Entity, F extends Entity>(): (val: Array<F>) => void {
    const self = this
    return function (this: P, val: Array<F>) {
      return self.setValue(this, val)
    }
  }

  remove<F extends Entity>(foreign: F) {
    // Null out the connection
    this.setForeignKeyValue(foreign, null)

    // Remove the entity if so directed
    if (this.options?.dependent === "remove") {
      this.foreignEntitiesState.remove(foreign)
    }
  }

  add<P extends Entity, F extends Entity>(primary: P, foreignSource: F) {
    const foreign = this.foreignEntitiesState.add(foreignSource)
    const primaryKeyValue = this.getPrimaryKeyValue(primary)
    this.setForeignKeyValue(foreign, primaryKeyValue)
  }

  setForeignKeyValue<F extends Entity>(foreign: F, value: any) {
    ;(foreign as any)[this.foreignKey] = value
  }

  getResultProxy<F extends Entity>(
    entity: Entity,
    result: Array<F> | null | undefined
  ): Array<F> {
    const entityState = entity.entityState
    let instance = this.hasManyInstancesByEntityState.get(entityState)
    if (instance == null || !instance.matchesTarget(result)) {
      instance = new HasManyInstance(this, entity, result)
      this.hasManyInstancesByEntityState.set(entityState, instance)
    }
    return instance.proxy as Array<F>
  }

  apply(entitiesState: EntitiesState<any>) {
    this.primaryKey = this.options?.primaryKey || null
    this.foreignIndex = this.findOrCreateForeignIndex()
    const getter = this.createGetter()
    const setter = this.createSetter()
    entitiesState.addInstancePropertyToEntityClass(this.name, getter, setter)
    entitiesState.relationships.push(this)
    entitiesState.relationshipsByName[this.name] = this
  }

  primaryRemoved<P extends Entity>(primary: P): void {
    const existingElems = this.getValue(primary).slice()
    for (const existing of existingElems) {
      switch (this.options?.dependent) {
        case "remove":
          this.foreignEntitiesState.remove(existing)
          break
        case "none":
          break
        case "nullify":
        default:
          this.setForeignKeyValue(existing, null)
          break
      }
    }
  }

  get isMany(): boolean {
    return true
  }

  get indexName(): string | null {
    return this.foreignIndex.name
  }
}
