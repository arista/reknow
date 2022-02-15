import {Entity} from "./Entity"
import {ENTITIES_KEY} from "./Entity"
import {EntitiesState} from "./EntitiesState"
import {EntityClass} from "./Types"
import {EntitiesDeclarations} from "./EntitiesDeclarations"
import {ById} from "./Types"
import {addNonEnumerableProperty} from "./Utils"

export class Entities<E extends Entity> {
  _entitiesState: EntitiesState<E> | null = null

  constructor(public entityClass: EntityClass<E>) {
    Entities.setEntitiesForEntityClass(entityClass, this)
  }

  get entitiesState() {
    if (this._entitiesState == null) {
      throw new Error(
        `Attempt to use an Entities class that has not been registered with a StateManager`
      )
    }
    return this._entitiesState
  }

  get managedState() {
    return this.entitiesState
  }

  get byId(): ById<E> {
    return this.entitiesState.entitiesById
  }

  getRelationshipIndexName(relationshipName: string): string | null {
    return this.entitiesState.getRelationshipIndexName(relationshipName)
  }

  add(entity: E, id: string | null = null): E {
    return this.entitiesState.add(entity, id)
  }

  update(entity: E, id: string | null = null): E {
    return this.entitiesState.update(entity, id)
  }

  addObject(entity: Object, id: string | null = null): E {
    return this.entitiesState.add(entity as E, id)
  }

  updateObject(entity: Object, id: string | null = null): E {
    return this.entitiesState.update(entity as E, id)
  }

  remove(entity: E) {
    this.entitiesState.remove(entity)
  }

  removeAll() {
    this.entitiesState.removeAll()
  }

  initialize() {}

  static getEntitiesForEntity<E extends Entity>(entity: E): Entities<E> {
    const entityClass: EntityClass<E> = entity.constructor as EntityClass<E>
    return this.getEntitiesForEntityClass(entityClass)
  }

  static getEntitiesForEntityClass<E extends Entity>(
    entityClass: EntityClass<E>
  ): Entities<E> {
    const ret = entityClass[ENTITIES_KEY]
    if (ret == null) {
      throw new Error(
        `Entity class "${entityClass}" does not have an associated Entities class.  Make sure an instance of the appropriate Entities class has been instantiated and passed the Entity class`
      )
    }
    return ret
  }

  static setEntitiesForEntityClass<E extends Entity>(
    entityClass: EntityClass<E>,
    entities: Entities<E>
  ) {
    addNonEnumerableProperty(entityClass, ENTITIES_KEY, entities)
  }

  // FIXME - factor this out into Utils of Entity, Entities, and Service
  static getPropertyDescriptor(name: string): PropertyDescriptor {
    const pd = Object.getOwnPropertyDescriptor(this.prototype, name)
    if (pd == null) {
      throw new Error(`property or method "${name}" not found`)
    }
    return pd
  }

  static action(name: string) {
    const pd = this.getPropertyDescriptor(name)
    EntitiesDeclarations.addAction(this.prototype, name, pd)
  }

  static query(name: string) {
    const pd = this.getPropertyDescriptor(name)
    EntitiesDeclarations.addQuery(this.prototype, name, pd)
  }

  static reaction(name: string) {
    const pd = this.getPropertyDescriptor(name)
    EntitiesDeclarations.addReaction(this.prototype, name, pd)
  }

  static index(name: string, ...terms: Array<string>) {
    EntitiesDeclarations.addIndexDecorator(this.prototype, name, terms)
  }

  static uniqueIndex(name: string, ...terms: Array<string>) {
    EntitiesDeclarations.addUniqueIndexDecorator(this.prototype, name, terms)
  }
}
