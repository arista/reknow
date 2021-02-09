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
import {StateDumper} from "./StateDumper"
import {Query} from "./Query"
import {QueryNotifyAt} from "./Types"
import {PendingQueryNotifications} from "./PendingQueryNotifications"

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
  // FIXME - remove this
  queuedChangeNotifications: Array<ChangeSubscriber> | null = null
  pendingEffects: Array<EntityState<any>> | null = null
  pendingQueryNotificationsTransactionEnd = new PendingQueryNotifications()
  pendingQueryNotificationsAfterTransaction = new PendingQueryNotifications()

  constructor(config: StateManagerConfig) {
    if (config.listener != null) {
      this.transactionListeners.add(config.listener)
    }
    this.initializeEntities(config.entities)
    this.initializeServices(config.services)
  }

  initialize() {
    for(const entitiesState of this.entitiesStates) {
      entitiesState.entities.initialize()
    }
    for(const serviceState of this.serviceStates) {
      serviceState.service.initialize()
    }
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
        // Call onInvalidate() on any queries/reactions that were
        // invalidated during the transaction and want to be notified
        // before the transaction ends (typically @reactions)
        this.pendingQueryNotificationsTransactionEnd.notify()
        return ret
      })

      // Call onInvalidate() on any queries/reactions that were
      // invalidated during the transaction, and want to be notified
      // after the transaction ends
      this.pendingQueryNotificationsAfterTransaction.notify()

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
      throw new Error(`Attempt to mutate state outside of an action`)
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

  addPendingQueryNotification(query: Query<any>) {
    switch (query.notifyAt) {
      case "transactionEnd":
        this.pendingQueryNotificationsTransactionEnd.add(query)
        break
      case "afterTransaction":
        this.pendingQueryNotificationsAfterTransaction.add(query)
        break
    }
  }

  dumpChangeSubscribers() {
    return new ChangeSubscriberDumper(this).dumpChangeSubscribers()
  }

  createReaction(f: () => any, name: string = "UnnamedReaction") {
    const reaction:Query<any> = this.createQuery(f, name, ()=>{
      reaction.value
    }, "transactionEnd")

    // Run this in an action in case it modifies any state
    this.whileInAction({type: "NoAction"}, () => reaction.value)
    return reaction
  }

  createQuery<T>(
    query: () => T,
    name: string = "UnnamedQuery",
    onInvalidate: (() => void) | null = null,
    notifyAt: QueryNotifyAt = "afterTransaction"
  ) {
    return new Query(this, query, name, onInvalidate, notifyAt)
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
