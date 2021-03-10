import {Transaction} from "./Types"
import {Action} from "./Types"
import {StateChange} from "./Types"
import {Entity} from "./Entity"

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

function stringifyStateChange(sc: StateChange<Entity>) {
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
