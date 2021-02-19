import {notNull} from "./Utils"
import {EntityState} from "./EntityState"
import {EntityDeclarations} from "./EntityDeclarations"

export const ENTITY_STATE_KEY = Symbol("ENTITY_STATE_KEY")

export abstract class Entity {
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

  static id(name: string) {
    EntityDeclarations.setIdPropertyName(this.prototype, name)
  }

  static getPropertyDescriptor(name: string): PropertyDescriptor {
    const pd = Object.getOwnPropertyDescriptor(this.prototype, name)
    if (pd == null) {
      throw new Error(`property or method "${name}" not found`)
    }
    return pd
  }

  static action(name: string) {
    const pd = this.getPropertyDescriptor(name)
    EntityDeclarations.addAction(this.prototype, name, pd)
  }

  static query(name: string) {
    const pd = this.getPropertyDescriptor(name)
    EntityDeclarations.addQuery(this.prototype, name, pd)
  }

  static reaction(name: string) {
    const pd = this.getPropertyDescriptor(name)
    EntityDeclarations.addReaction(this.prototype, name, pd)
  }
}
