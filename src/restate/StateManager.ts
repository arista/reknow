import {EntitiesDefinitionTree} from "./Types"
import {flattenEntitiesDefinitionTree} from "./Utils"
import {EntitiesState} from "./EntitiesState"
import {ServiceDefinitionTree} from "./Types"
import {flattenServiceDefinitionTree} from "./Utils"
import {ServiceState} from "./ServiceState"
import {Transaction} from "./Types"
import {Action} from "./Types"
import {notNull} from "./Utils"
import {StateChange} from "./Types"
import {Listeners} from "./Listeners"
import {Selector} from "./Selector"
import {EntityState} from "./EntityState"
import {copyInstance} from "./Utils"
import {EntityAdded} from "./Types"
import {EntityRemoved} from "./Types"
import {EntityPropertyChanged} from "./Types"
import {NoAction} from "./Types"
import {Entity} from "./Entity"
import {ChangeSubscriber} from "./ChangeSubscriber"
import {ChangePublisher} from "./ChangePublisher"
import {Listener} from "./Types"
import {ChangeSubscriberDumper} from "./ChangeSubscriberDumper"
import {Reaction} from "./Reaction"
import {StateDumper} from "./StateDumper"
import {Query} from "./Query"

export interface StateManagerConfig {
  entities?: EntitiesDefinitionTree
  services?: ServiceDefinitionTree
  listener?: Listener<Transaction>
}

export class StateManager {
  transaction: Transaction | null = null
  transactionListeners = new Listeners<Transaction>()
  entitiesStates: Array<EntitiesState<any>> = []
  serviceStates: Array<ServiceState> = []
  currentSelector: Selector<any> | null = null
  currentChangeSubscriber: ChangeSubscriber | null = null
  queuedChangeNotifications: Array<ChangeSubscriber> | null = null
  pendingEffects: Array<EntityState<any>> | null = null

  constructor(config: StateManagerConfig) {
    if (config.listener != null) {
      this.transactionListeners.add(config.listener)
    }
    this.initializeEntities(config.entities)
    this.initializeServices(config.services)
  }

  clearState() {
    for (const entitiesState of this.entitiesStates) {
      entitiesState.clearState()
    }
    for (const serviceState of this.serviceStates) {
      serviceState.clearState()
    }
    this.transaction = null
    this.currentSelector = null
    this.currentChangeSubscriber = null
    this.queuedChangeNotifications = null
    this.pendingEffects = null
  }

  initializeEntities(
    entitiesDefinitionTree: EntitiesDefinitionTree | null | undefined
  ) {
    const flattenedDefinitions = flattenEntitiesDefinitionTree(
      entitiesDefinitionTree
    )
    // Run through a pass to create the EntitiesStates and do some
    // initialization
    for (const name in flattenedDefinitions) {
      const entities = flattenedDefinitions[name]
      const entitiesState = new EntitiesState(
        name,
        this,
        entities,
        entities.entityClass
      )
      this.entitiesStates.push(entitiesState)
    }

    // Do a second pass to set up relationships, etc. based on the
    // EntityDeclarations
    for (const entitiesState of this.entitiesStates) {
      entitiesState.applyEntityDeclarations()
    }
  }

  initializeServices(
    serviceDefinitionTree: ServiceDefinitionTree | null | undefined
  ) {
    const flattenedDefinitions = flattenServiceDefinitionTree(
      serviceDefinitionTree
    )
    for (const name in flattenedDefinitions) {
      const service = flattenedDefinitions[name]
      const serviceState = new ServiceState(name, this, service)
      this.serviceStates.push(serviceState)
      if (service._serviceState != null) {
        throw new Error(
          `Attempt to register Service class multiple times ("${name}" and "${service._serviceState.name}")`
        )
      }
      service._serviceState = serviceState
    }
  }

  whileInAction<T>(action: Action, f: () => T): T {
    if (this.transaction == null) {
      const transaction = {action, stateChanges: []}
      const ret = this.withTransaction(transaction, () => {
        const ret = f()
        // Notify change subscribers (i.e., reactions) while still
        // in the transaction
        this.notifyChangeSubscribers()
        return ret
      })

      // We are now "outside" of the transaction
      // Apply any effects
      this.applyPendingEffects()
      // Pass the transaction to any listeners
      this.transactionListeners.notify(transaction)
      return ret
    } else {
      return f()
    }
  }

  action<T>(f: () => T): T {
    const action: NoAction = {type: "NoAction"}
    return this.whileInAction(action, f)
  }

  withTransaction<T>(t: Transaction, f: () => T): T {
    const oldTransaction = this.transaction
    this.transaction = t
    try {
      return f()
    } finally {
      this.transaction = oldTransaction
    }
  }

  checkMutable() {
    if (this.transaction == null) {
      throw new Error(`Attempt to mutate state outside of an @action`)
    }
  }

  recordStateChange(stateChange: StateChange<any>) {
    const transaction = notNull(this.transaction)
    transaction.stateChanges.push(stateChange)
  }

  recordEntityAdded<E extends Entity>(e: EntityState<E>) {
    const entityStateSnapshot = copyInstance(e.entity)
    const stateChange: EntityAdded<E> = {
      type: "EntityAdded",
      entityType: e.entitiesState.name,
      id: e.id,
      entity: entityStateSnapshot,
    }
    this.recordStateChange(stateChange)
  }

  recordEntityRemoved<E extends Entity>(e: EntityState<E>) {
    const entityStateSnapshot = copyInstance(e.entity)
    const stateChange: EntityRemoved<E> = {
      type: "EntityRemoved",
      entityType: e.entitiesState.name,
      id: e.id,
      entity: entityStateSnapshot,
    }
    this.recordStateChange(stateChange)
  }

  recordEntityPropertyChanged<E extends Entity>(
    e: EntityState<E>,
    property: string,
    hadOldValue: boolean,
    oldValue: any | null,
    hasNewValue: boolean,
    newValue: any | null
  ) {
    const stateChange: EntityPropertyChanged = {
      type: "EntityPropertyChanged",
      entityType: e.entitiesState.name,
      id: e.id,
      property: property,
    }
    if (hasNewValue) {
      stateChange.newValue = newValue
    }
    if (hadOldValue) {
      stateChange.oldValue = oldValue
    }
    this.recordStateChange(stateChange)
  }

  whileEvaluatingSelector<T>(selector: Selector<any>, f: () => T): T {
    const previousSelector = this.currentSelector
    this.currentSelector = selector
    try {
      return f()
    } finally {
      this.currentSelector = previousSelector
    }
  }

  whileEvaluatingChangeSubscriber<T>(
    reaction: ChangeSubscriber,
    f: () => T
  ): T {
    const previousChangeSubscriber = this.currentChangeSubscriber
    this.currentChangeSubscriber = reaction
    try {
      return f()
    } finally {
      this.currentChangeSubscriber = previousChangeSubscriber
    }
  }

  queueChangeSubscriber(
    publisher: ChangePublisher,
    subscriber: ChangeSubscriber
  ) {
    if (!subscriber.queued) {
      if (this.queuedChangeNotifications == null) {
        this.queuedChangeNotifications = []
      }
      subscriber.queued = true
      this.queuedChangeNotifications.push(subscriber)
    }
  }

  notifyChangeSubscribers() {
    const notified: Array<ChangeSubscriber> = []
    try {
      // Executing a reaction could trigger more reactions, so keep
      // flushing the queue until it's empty
      while (
        this.queuedChangeNotifications != null &&
        this.queuedChangeNotifications.length > 0
      ) {
        const notifications = this.queuedChangeNotifications
        this.queuedChangeNotifications = null
        for (const subscriber of notifications) {
          if (subscriber.notified) {
            throw new Error(
              `Circular dependency detected while executing these reactions: ${notified
                .map((n) => n.name)
                .join(", ")}`
            )
          }
          subscriber.queued = false
          subscriber.notified = true
          notified.push(subscriber)
          subscriber.notifyChangeSubscriber()
        }
      }
    } finally {
      // Clear the "notified" flag that was used to detect circular references
      for (const subscriber of notified) {
        subscriber.notified = false
      }
    }
  }

  dumpChangeSubscribers() {
    return new ChangeSubscriberDumper(this).dumpChangeSubscribers()
  }

  addReaction(f: () => any, name: string = "UnnamedReaction") {
    const reaction = new Reaction(this, null, name, f)
    // Run this in an action in case it modifies any state
    this.whileInAction({type: "NoAction"}, () => reaction.evaluate())
    return reaction
  }

  createQuery<T>(
    query: () => T,
    name: string = "UnnamedQuery",
    onInvalidate: (() => void) | null = null
  ) {
    return new Query(this, query, name, onInvalidate)
  }

  dumpState() {
    return new StateDumper(this).dumpState()
  }

  applyPendingEffects() {
    const pendingEffects = this.pendingEffects
    if (pendingEffects != null) {
      this.pendingEffects = null
      for (const e of pendingEffects) {
        e.applyPendingEffects()
      }
    }
  }

  addPendingEffects<E extends Entity>(e: EntityState<E>) {
    if (this.pendingEffects == null) {
      this.pendingEffects = []
    }
    this.pendingEffects.push(e)
  }
}
