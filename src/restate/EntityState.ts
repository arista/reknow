import {Entity} from "./Entity"
import {Proxied} from "./Proxied"
import {EntitiesState} from "./EntitiesState"
import {ManagedState} from "./ManagedState"
import {Action} from "./Types"
import {Reaction} from "./Reaction"
import {ChangePublisher} from "./ChangePublisher"
import {isNonInheritedProperty} from "./Utils"
import {PendingEffects} from "./PendingEffects"
import {ObjectChangePublishers} from "./ObjectChangePublishers"

export class EntityState<E extends Entity>
  extends Proxied<E, E>
  implements ManagedState {
  reactions: Array<Reaction> = []

  _changePublishers: ObjectChangePublishers | null = null

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

  clearState() {
    this._changePublishers = null
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

  removeChangePublishers() {
    if (this._changePublishers != null) {
      this._changePublishers.removeChangePublishers()
      this._changePublishers = null
    }
  }

  checkMutable() {
    this.stateManager.checkMutable()
  }

  propertyGet(prop: string) {
    if (isNonInheritedProperty(this.target, prop)) {
      this.addPropertySubscriber(prop)
    }
    return super.propertyGet(prop)
  }

  propertyDescriptorGet(prop: string) {
    if (isNonInheritedProperty(this.target, prop)) {
      this.addPropertySubscriber(prop)
    }
    return super.propertyDescriptorGet(prop)
  }

  propertyHas(prop: string) {
    if (isNonInheritedProperty(this.target, prop)) {
      this.addPropertySubscriber(prop)
    }
    return super.propertyHas(prop)
  }

  getOwnKeys() {
    this.addOwnKeysSubscriber()
    return super.getOwnKeys()
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

    // FIXME - check for setters on relationships

    const hadValue = this.entity.hasOwnProperty(prop)
    const oldValue = (this.entity as any)[prop]
    const ret = super.propertySet(prop, value)

    if (oldValue !== value) {
      this.invalidateProxy()
      this.notifySubscribersOfPropertyChange(prop)
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

    // If the property is being added, notify any @reactions watching
    // "ownKeys"
    if (!hadValue) {
      this.notifyOwnKeysSubscribersOfChange()
    }

    return ret
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

    // FIXME - check for setters on relationships

    const hadValue = this.entity.hasOwnProperty(prop)
    const oldValue = (this.entity as any)[prop]
    const ret = super.propertyDelete(prop)
    if (hadValue) {
      this.invalidateProxy()
      this.notifySubscribersOfPropertyChange(prop)
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

    // If the property is being removed, notify any @reactions
    // watching "ownKeys"
    if (hadValue) {
      this.notifyOwnKeysSubscribersOfChange()
    }

    return ret
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

  //--------------------------------------------------
  // ChangeSubscribers and ChangePublishers

  get changePublishers() {
    if (this._changePublishers == null) {
      this._changePublishers = new ObjectChangePublishers(
        this._stateManager,
        this.changePublisherName
      )
    }
    return this._changePublishers
  }

  addOwnKeysSubscriber() {
    this.changePublishers.addOwnKeysSubscriber()
  }

  notifyOwnKeysSubscribersOfChange() {
    if (this._changePublishers != null) {
      this.changePublishers.notifyOwnKeysSubscribersOfChange()
    }
    // Any change to an Entity also notifies @reactions subscribed to
    // the EntitiesState
    this.entitiesState.notifySubscribersOfChange()
  }

  addPropertySubscriber(property: string) {
    this.changePublishers.addPropertySubscriber(property)
  }

  notifySubscribersOfPropertyChange(property: string) {
    if (this._changePublishers) {
      this._changePublishers.notifySubscribersOfPropertyChange(property)
    }
    // Any change to an Entity also notifies @reactions subscribed to
    // the EntitiesState
    this.entitiesState.notifySubscribersOfChange()
  }
}
