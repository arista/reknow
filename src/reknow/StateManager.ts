import {EntitiesDefinitionTree} from "./Types"
import {flattenEntitiesDefinitionTree} from "./Utils"
import {EntitiesState} from "./EntitiesState"
import {ServiceDefinitionTree} from "./Types"
import {flattenServiceDefinitionTree} from "./Utils"
import {currentEntity} from "./Utils"
import {ServiceState} from "./ServiceState"
import {Transaction} from "./Types"
import {Action} from "./Types"
import {notNull} from "./Utils"
import {StateChange} from "./Types"
import {Listeners} from "./Listeners"
import {EntityState} from "./EntityState"
import {copyInstance} from "./Utils"
import {EntityAdded} from "./Types"
import {EntityRemoved} from "./Types"
import {EntityPropertyChanged} from "./Types"
import {UnnamedAction} from "./Types"
import {Entity} from "./Entity"
import {Entities} from "./Entities"
import {ChangeSubscriber} from "./ChangeSubscriber"
import {ChangePublisher} from "./ChangePublisher"
import {Listener} from "./Types"
import {ChangeSubscriberDumper} from "./ChangeSubscriberDumper"
import {StateDumper} from "./StateDumper"
import {Query} from "./Query"
import {QueryNotifyAt} from "./Types"
import {PendingQueryNotifications} from "./PendingQueryNotifications"
import {DebugEvent} from "./DebugEvents"
import {EntitiesExport} from "./Types"
import {EntityTypeExport} from "./Types"
import {EntityPropertiesExport} from "./Types"

export interface StateManagerConfig {
  entities?: EntitiesDefinitionTree
  services?: ServiceDefinitionTree
  listener?: Listener<Transaction>
  debugListener?: Listener<DebugEvent>
}

export class StateManager {
  transaction: Transaction | null = null
  transactionListeners = new Listeners<Transaction>()
  debugListener: Listener<DebugEvent> | null
  entitiesStates: Array<EntitiesState<any>> = []
  serviceStates: Array<ServiceState> = []
  currentChangeSubscriber: ChangeSubscriber | null = null
  // FIXME - remove this
  queuedChangeNotifications: Array<ChangeSubscriber> | null = null
  pendingEffects: Array<EntityState<any>> | null = null
  pendingQueryNotificationsTransactionEnd = new PendingQueryNotifications(this)
  pendingQueryNotificationsAfterTransaction = new PendingQueryNotifications(
    this
  )
  debugEventStack: Array<DebugEvent> = []

  constructor(config: StateManagerConfig) {
    if (config.listener != null) {
      this.transactionListeners.add(config.listener)
    }
    this.debugListener = config.debugListener || null
    this.initializeEntities(config.entities)
    this.initializeServices(config.services)
    this.initialize()
  }

  initialize() {
    const action: Action = {type: "InitializeAction"}
    this.whileInAction(action, () => {
      for (const entitiesState of this.entitiesStates) {
        entitiesState.entities.initialize()
      }
      for (const serviceState of this.serviceStates) {
        serviceState.service.initialize()
      }
    })
  }

  clearState() {
    for (const entitiesState of this.entitiesStates) {
      entitiesState.clearState()
    }
    for (const serviceState of this.serviceStates) {
      serviceState.clearState()
    }
    this.transaction = null
    this.currentChangeSubscriber = null
    this.queuedChangeNotifications = null
    this.pendingEffects = null
  }

  releaseClasses() {
    for (const entitiesState of this.entitiesStates) {
      entitiesState.releaseClasses()
    }
    for (const serviceState of this.serviceStates) {
      serviceState.releaseClasses()
    }
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
      const entityClass = flattenedDefinitions[name]
      const entitiesState = new EntitiesState(
        name,
        this,
        Entities.getEntitiesForEntityClass(entityClass),
        entityClass
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
      if (service._serviceState != null) {
        throw new Error(
          `Attempt to register Service class multiple times ("${name}" and "${service._serviceState.name}")`
        )
      }
      const serviceState = new ServiceState(name, this, service)
      this.serviceStates.push(serviceState)
    }
  }

  whileInAction<T>(action: Action, f: () => T): T {
    return this.withDebugEvent(
      () => {
        return {type: "ActionDebugEvent", action}
      },
      () => {
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

          // If this is the outermost transaction and it's returning an
          // Entity, make sure we're returning the latest Proxy.
          // Otherwise, query notifications that modify the Entity after
          // the original function f() returned it could already have
          // rendered that Entity proxy stale.
          return currentEntity(ret)
        } else {
          return f()
        }
      }
    )
  }

  action<T>(f: () => T): T {
    const action: UnnamedAction = {type: "UnnamedAction"}
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
    const reaction: Query<any> = this.createQuery(
      f,
      name,
      () => {
        this.withDebugEvent(
          () => {
            return {
              type: "RunReactionDebugEvent",
              reaction: reaction.name,
            }
          },
          () => {
            reaction.value
          }
        )
      },
      "transactionEnd"
    )

    // Run this in an action in case it modifies any state
    this.whileInAction({type: "UnnamedAction"}, () => reaction.value)
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

  withDebugEvent<T>(e: () => DebugEvent, f: () => T): T {
    if (this.debugListener != null) {
      const event = e()
      // If the event stack is empty, then we'll report this event
      // when it's done
      if (this.debugEventStack.length == 0) {
        this.debugEventStack.push(event)
        try {
          return f()
        } finally {
          const topEvent = this.debugEventStack.pop()
          if (topEvent != null) {
            this.debugListener(topEvent)
          }
        }
      }
      // If the event stack is not empty, then push the event onto the
      // stack and onto the top-most event's children
      else {
        const topEvent = this.debugEventStack[this.debugEventStack.length - 1]
        if (topEvent.children == null) {
          topEvent.children = []
        }
        topEvent.children.push(event)
        this.debugEventStack.push(event)
        try {
          return f()
        } finally {
          this.debugEventStack.pop()
        }
      }
    } else {
      return f()
    }
  }

  exportEntities(): EntitiesExport {
    const ret: EntitiesExport = {entities: {}}
    for (const entitiesState of this.entitiesStates) {
      const entityType: EntityTypeExport = {}
      ret.entities[entitiesState.name] = entityType

      for (const id in entitiesState.byId) {
        const entityState = entitiesState.byId[id]
        const entity: EntityPropertiesExport = {}
        entityType[id] = entity

        for (const name in entityState.target) {
          const value = entityState.target[name]
          entity[name] = value
        }
      }
    }
    return ret
  }
}
