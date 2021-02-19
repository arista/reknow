import {Entity} from "./Entity"
import {EntitiesState} from "./EntitiesState"
import {EntityClass} from "./Types"
import {EntitiesDeclarations} from "./EntitiesDeclarations"
import {ById} from "./Types"

export class Entities<E extends Entity> {
  _entitiesState: EntitiesState<E> | null = null

  constructor(public entityClass: EntityClass<E>) {}

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

  get entitiesById(): ById<E> {
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
}
