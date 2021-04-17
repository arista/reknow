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
