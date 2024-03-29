import {Entity} from "./Entity"
import {Proxied} from "./Proxied"
import {EntitiesState} from "./EntitiesState"
import {Action} from "./TransactionTypes"
import {Query} from "./Query"
import {ChangePublisher} from "./ChangePublisher"
import {isNonInheritedProperty} from "./Utils"
import {PendingEffects} from "./PendingEffects"
import {FunctionType} from "./Types"
import {toMemberName} from "./Utils"

export class EntityState<E extends Entity> extends Proxied<E, E> {
  reactions: Array<Query<any>> = []
  reactionsByName: {[name: string]: Query<any>} = {}
  queries: Array<Query<any>> = []
  queriesByName: {[name: string]: Query<any>} = {}

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

  applyAction(name: string, type: FunctionType, f: Function, args: Array<any>) {
    const actionName = toMemberName(name, type)
    const action = this.toAction(actionName, args)
    return this.stateManager.whileInAction(action, () =>
      f.apply(this.proxy, args)
    )
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

  removeQueries() {
    for (const query of this.queries) {
      query.remove()
    }
  }

  checkMutable() {
    this.stateManager.checkMutable()
  }

  propertySet(prop: string, value: any) {
    return this.stateManager.withDebugEvent(
      () => {
        return {
          type: "ChangePropertyDebugEvent",
          entity: this.changePublisherName,
          property: prop,
          value,
        }
      },
      () => {
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
    )
  }

  propertyChanged(prop: string, hadValue: boolean, oldValue: any, value: any) {
    this.invalidateProxy()
    this.entitiesState.updateIndexesInInheritanceChainOnEntityPropertyChanged(
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
    return this.stateManager.withDebugEvent(
      () => {
        return {
          type: "DeletePropertyDebugEvent",
          entity: this.changePublisherName,
          property: prop,
        }
      },
      () => {
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
    )
  }

  propertyDeleted(prop: string, hadValue: boolean, oldValue: any) {
    this.invalidateProxy()
    this.entitiesState.updateIndexesInInheritanceChainOnEntityPropertyChanged(
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
