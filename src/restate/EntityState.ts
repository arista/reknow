import {Entity} from "./Entity"
import {Proxied} from "./Proxied"
import {EntitiesState} from "./EntitiesState"
import {ManagedState} from "./ManagedState"
import {Action} from "./Types"
import {Reaction} from "./Reaction"
import {ChangePublisher} from "./ChangePublisher"
import {isNonInheritedProperty} from "./Utils"
import {PendingEffects} from "./PendingEffects"

export class EntityState<E extends Entity>
  extends Proxied<E, E>
  implements ManagedState {
  reactions: Array<Reaction> = []

  // Tracks the @afterAdd, @afterRemove, and @afterChange calls that
  // need to be made after the current transaction ends
  _pendingEffects: PendingEffects<E> | null = null

  // Set to true when a previously-added entity is removed
  isRemoved: boolean = false

  constructor(
    public entitiesState: EntitiesState<E>,
    public entity: E,
    public id: string
  ) {
    super(entity, entitiesState.stateManager)
  }

  get stateManager() {
    return this.entitiesState.stateManager
  }

  get changePublisherName() {
    return `${this.entitiesState.name}#${this.id}`
  }

  get currentChangeSubscriber() {
    return this.stateManager.currentChangeSubscriber
  }

  toAction(name: string, args: Array<any>): Action {
    return {
      type: "EntityAction",
      entityType: this.entitiesState.name,
      id: this.id,
      name,
      args,
    }
  }

  toSelectorName(name: string) {
    return `${this.entitiesState.name}#${this.id}.${name}`
  }

  toReactionName(name: string) {
    return `${this.entitiesState.name}#${this.id}.${name}`
  }

  removeReactions() {
    for (const reaction of this.reactions) {
      reaction.remove()
    }
  }

  checkMutable() {
    this.stateManager.checkMutable()
  }

  propertySet(prop: string, value: any) {
    this.checkMutable()

    if (prop === this.entitiesState.idPropertyName) {
      throw new Error(
        `An @id property may not be modified after an Entity has been added`
      )
    }

    if (this.isRemoved) {
      throw new Error(`A removed entity may not be mutated`)
    }

    return super.propertySet(prop, value)
  }

  propertyChanged(prop: string, hadValue: boolean, oldValue: any, value: any) {
    this.invalidateProxy()
    this.entitiesState.updateIndexesOnEntityPropertyChanged(
      this,
      prop,
      hadValue,
      oldValue,
      true,
      value
    )
    this.stateManager.recordEntityPropertyChanged(
      this,
      prop,
      hadValue,
      oldValue,
      true,
      value
    )
    this.addPendingAfterChangeProperty(prop, oldValue)
  }

  propertyDelete(prop: string) {
    this.checkMutable()

    if (prop === this.entitiesState.idPropertyName) {
      throw new Error(
        `An @id property may not be deleted after an Entity has been added`
      )
    }

    if (this.isRemoved) {
      throw new Error(`A removed entity may not be mutated`)
    }

    return super.propertyDelete(prop)
  }

  propertyDeleted(prop: string, hadValue: boolean, oldValue: any) {
    this.invalidateProxy()
    this.entitiesState.updateIndexesOnEntityPropertyChanged(
      this,
      prop,
      hadValue,
      oldValue,
      false,
      null
    )
    this.stateManager.recordEntityPropertyChanged(
      this,
      prop,
      hadValue,
      oldValue,
      false,
      null
    )
    this.addPendingAfterChangeProperty(prop, oldValue)
  }

  static getEntityState<E extends Entity>(entity: E): EntityState<E> | null {
    if (entity instanceof Entity && entity.hasEntityState) {
      return entity.entityState
    }
    return Proxied.getProxied<E, E, EntityState<E>>(entity) || null
  }

  //--------------------------------------------------
  // For handling effects - @afterAdd, @afterRemove, @afterChange

  get pendingEffects() {
    if (this._pendingEffects == null) {
      this._pendingEffects = new PendingEffects(this)
      this.stateManager.addPendingEffects(this)
    }
    return this._pendingEffects
  }

  applyPendingEffects() {
    if (this._pendingEffects != null) {
      const pendingEffects = this._pendingEffects
      this._pendingEffects = null
      pendingEffects.apply()
    }
  }

  addPendingAfterAdd() {
    if (this.entitiesState.entityDeclarations.afterAdds.length > 0) {
      for (const e of this.entitiesState.entityDeclarations.afterAdds) {
        this.pendingEffects.addAfterAdd(e)
      }
    }
  }

  addPendingAfterRemove() {
    if (this.entitiesState.entityDeclarations.afterRemoves.length > 0) {
      for (const e of this.entitiesState.entityDeclarations.afterRemoves) {
        this.pendingEffects.addAfterRemove(e)
      }
    }
  }

  addPendingAfterChangeProperty(property: string, oldValue: any) {
    const entityDeclarations = this.entitiesState.entityDeclarations
    if (entityDeclarations.afterChanges.length > 0) {
      for (const e of entityDeclarations.afterChanges) {
        this.pendingEffects.addAfterChange(e)
      }
    }
    if (entityDeclarations.afterPropertyChanges != null) {
      const pcs = entityDeclarations.afterPropertyChanges[property]
      if (pcs != null) {
        for (const e of pcs) {
          this.pendingEffects.addAfterPropertyChange(e, oldValue)
        }
      }
    }
  }
}
