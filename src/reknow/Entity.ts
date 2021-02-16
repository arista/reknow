import {Manageable} from "./Manageable"
import {notNull} from "./Utils"
import {EntityState} from "./EntityState"

export const ENTITY_STATE_KEY = Symbol("ENTITY_STATE_KEY")

export abstract class Entity extends Manageable {
  [ENTITY_STATE_KEY]: EntityState<any> | null = null
  get entityState() {
    return notNull(this[ENTITY_STATE_KEY])
  }

  get hasEntityState() {
    return this[ENTITY_STATE_KEY] != null
  }

  get managedState() {
    return this.entityState
  }

  get entityId() {
    return this.entityState.id
  }

  get currentEntity() {
    return this.entityState.proxy
  }

  get isEntityRemoved() {
    return this.entityState.isRemoved
  }

  removeEntity() {
    return this.entityState.entitiesState.remove(this)
  }

  isSameEntity(entity: Entity | null | undefined): boolean {
    return entity != null && entity.entityState === this.entityState
  }
}
