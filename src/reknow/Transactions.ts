import {Transaction} from "./Types"
import {Action} from "./Types"
import {StateChange} from "./Types"
import {Entity} from "./Entity"
import {Entities} from "./Entities"
import {StateManager} from "./StateManager"
import {EntityAdded} from "./Types"
import {EntityRemoved} from "./Types"
import {EntityPropertyChanged} from "./Types"
import {ActionOptions} from "./Types"

export function stringifyTransaction(t: Transaction) {
  let ret = stringifyAction(t.action)
  for (const stateChange of t.stateChanges) {
    ret += `\n  ${stringifyStateChange(stateChange)}`
  }
  return ret
}

function stringifyAction(a: Action) {
  switch (a.type) {
    case "EntitiesAction":
      return `${a.entityType}.entities.${a.name}(${stringifyArgs(a.args)})`
    case "EntityAction":
      return `${a.entityType}#${a.id}.${a.name}(${stringifyArgs(a.args)})`
    case "ServiceAction":
      return `${a.service}.${a.name}(${stringifyArgs(a.args)})`
    case "InitializeAction":
      return `InitializeAction`
    case "UnnamedAction":
      return `UnnamedAction`
  }
}

function stringifyStateChange(sc: StateChange) {
  switch (sc.type) {
    case "EntityAdded":
      return `Added ${sc.entityType}#${sc.id}: ${sc.entity}`
    case "EntityRemoved":
      return `Removed ${sc.entityType}#${sc.id}`
    case "EntityPropertyChanged":
      return `Changed ${sc.entityType}#${sc.id}.${sc.property} from ${sc.oldValue} to ${sc.newValue}`
  }
}

function stringifyArgs(args: Array<any>) {
  return args.map((a) => stringifyArg(a)).join(", ")
}

function stringifyArg(arg: any) {
  if (arg instanceof Entity) {
    return arg.entityName
  } else {
    return `${arg}`
  }
}

export function applyTransaction(
  stateManager: StateManager,
  transaction: Transaction
) {
  stateManager.whileInSuppressedTransaction(() => {
    for (const stateChange of transaction.stateChanges) {
      switch (stateChange.type) {
        case "EntityAdded":
          applyEntityAdded(stateManager, stateChange)
          break
        case "EntityRemoved":
          applyEntityRemoved(stateManager, stateChange)
          break
        case "EntityPropertyChanged":
          applyEntityPropertyChanged(stateManager, stateChange)
          break
      }
    }
  })
}

function applyEntityAdded(stateManager: StateManager, s: EntityAdded) {
  const entities = getEntities(stateManager, s.entityType)
  entities.addObject(s.entity, s.id)
}

function applyEntityRemoved(stateManager: StateManager, s: EntityRemoved) {
  const entity = getEntity(stateManager, s.entityType, s.id)
  entity.removeEntity()
}

function applyEntityPropertyChanged(
  stateManager: StateManager,
  s: EntityPropertyChanged
) {
  const entity: {[name: string]: any} = getEntity(
    stateManager,
    s.entityType,
    s.id
  ) as any
  if (s.hasOwnProperty("newValue")) {
    entity[s.property] = s.newValue
  } else {
    delete entity[s.property]
  }
}

function getEntities(
  stateManager: StateManager,
  entityType: string
): Entities<any> {
  return stateManager.getEntitiesState(entityType).entities
}

function getEntity(
  stateManager: StateManager,
  entityType: string,
  id: string
): Entity {
  const entities = getEntities(stateManager, entityType)
  const entity = entities.byId[id]
  if (entity == null) {
    throw new Error(`Entity ${entityType}#${id} not found`)
  }
  return entity
}

export function reverseTransaction(t: Transaction): Transaction {
  const action: Action = {
    type: "ReverseAction",
    action: t.action,
  }
  const stateChanges = reverseStateChanges(t.stateChanges)
  return {action, stateChanges}
}

function reverseStateChanges(
  stateChanges: Array<StateChange>
): Array<StateChange> {
  const ret: Array<StateChange> = []
  for (let i = stateChanges.length - 1; i >= 0; i--) {
    ret.push(reverseStateChange(stateChanges[i]))
  }
  return ret
}

function reverseStateChange(stateChange: StateChange): StateChange {
  switch (stateChange.type) {
    case "EntityAdded":
      return reverseEntityAdded(stateChange)
    case "EntityRemoved":
      return reverseEntityRemoved(stateChange)
    case "EntityPropertyChanged":
      return reverseEntityPropertyChanged(stateChange)
  }
}

function reverseEntityAdded(c: EntityAdded): StateChange {
  return {
    type: "EntityRemoved",
    entityType: c.entityType,
    id: c.id,
    entity: c.entity,
  }
}

function reverseEntityRemoved(c: EntityRemoved): StateChange {
  if (c.entity == null) {
    throw new Error(
      `Cannot reverse a transction containing an EntityRemoved with no "entity"`
    )
  }
  return {
    type: "EntityAdded",
    entityType: c.entityType,
    id: c.id,
    entity: c.entity,
  }
}

function reverseEntityPropertyChanged(c: EntityPropertyChanged): StateChange {
  const ret: EntityPropertyChanged = {
    type: "EntityPropertyChanged",
    entityType: c.entityType,
    id: c.id,
    property: c.property,
  }
  if (c.hasOwnProperty("oldValue")) {
    ret.newValue = c.oldValue
  }
  if (c.hasOwnProperty("newValue")) {
    ret.oldValue = c.newValue
  }
  return ret
}
