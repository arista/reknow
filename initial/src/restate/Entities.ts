import {Entity} from "./Entity"
import {EntitiesState} from "./EntitiesState"
import {Manageable} from "./Manageable"
import {EntityClass} from "./Types"
import {ById} from "./Types"

export class Entities<E extends Entity> extends Manageable {
  _entitiesState: EntitiesState<E> | null = null

  constructor(public entityClass: EntityClass<E>) {
    super()
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

  remove(entity: E) {
    this.entitiesState.remove(entity)
  }

  removeAll() {
    this.entitiesState.removeAll()
  }

  initialize() {}
}
