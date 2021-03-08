import {Action} from "./Types"

export type DebugEvent =
  | ActionDebugEvent
  | AddDebugEvent
  | RemoveDebugEvent
  | ChangePropertyDebugEvent
  | DeletePropertyDebugEvent
  | AddSubscriberDebugEvent
  | RemoveSubscriberDebugEvent
  | NotifySubscriberDebugEvent
  | InvalidateQueryDebugEvent
  | RunQueryOnInvalidateDebugEvent
  | RunReactionDebugEvent
  | RunEffectDebugEvent
  | RunQueryDebugEvent
  | RunUseQueryDebugEvent
  | UnmountUseQueryDebugEvent
  | UseQueryForceRerenderDebugEvent

export interface DebugEventBase {
  children?: Array<DebugEvent>
}

export interface ActionDebugEvent extends DebugEventBase {
  type: "ActionDebugEvent"
  action: Action
}

export interface AddDebugEvent extends DebugEventBase {
  type: "AddDebugEvent"
  entity: string
}

export interface RemoveDebugEvent extends DebugEventBase {
  type: "RemoveDebugEvent"
  entity: string
}

export interface ChangePropertyDebugEvent extends DebugEventBase {
  type: "ChangePropertyDebugEvent"
  entity: string
  property: string
  value: any
}

export interface DeletePropertyDebugEvent extends DebugEventBase {
  type: "DeletePropertyDebugEvent"
  entity: string
  property: string
}

export interface AddSubscriberDebugEvent extends DebugEventBase {
  type: "AddSubscriberDebugEvent"
  publisher: string
  subscriber: string
}

export interface RemoveSubscriberDebugEvent extends DebugEventBase {
  type: "RemoveSubscriberDebugEvent"
  publisher: string
  subscriber: string
}

export interface NotifySubscriberDebugEvent extends DebugEventBase {
  type: "NotifySubscriberDebugEvent"
  publisher: string
  subscriber: string
}

export interface InvalidateQueryDebugEvent extends DebugEventBase {
  type: "InvalidateQueryDebugEvent"
  query: string
}

export interface RunQueryOnInvalidateDebugEvent extends DebugEventBase {
  type: "RunQueryOnInvalidateDebugEvent"
  query: string
}

export interface RunReactionDebugEvent extends DebugEventBase {
  type: "RunReactionDebugEvent"
  reaction: string
}

export interface RunEffectDebugEvent extends DebugEventBase {
  type: "RunEffectDebugEvent"
  effect: string
}

export interface RunQueryDebugEvent extends DebugEventBase {
  type: "RunQueryDebugEvent"
  query: string
}

export interface RunUseQueryDebugEvent extends DebugEventBase {
  type: "RunUseQueryDebugEvent"
  query: string
}

export interface UnmountUseQueryDebugEvent extends DebugEventBase {
  type: "UnmountUseQueryDebugEvent"
  query: string
}

export interface UseQueryForceRerenderDebugEvent extends DebugEventBase {
  type: "UseQueryForceRerenderDebugEvent"
  query: string
}

export function stringifyDebugEvent(event: DebugEvent) {
  return stringifyDebugEventWithIndent(event, 0)
}

export function stringifyDebugEventWithIndent(
  event: DebugEvent,
  indent: number
) {
  // FIXME - better indent
  let indentStr = ""
  for (let i = 0; i < indent; i++) {
    indentStr += " "
  }
  let str = `${indentStr}${toEventString(event)}\n`
  if (event.children != null) {
    for (const child of event.children) {
      str += stringifyDebugEventWithIndent(child, indent + 2)
    }
  }
  return str
}

function toEventString(event: DebugEvent): string {
  switch (event.type) {
    case "ActionDebugEvent":
      return `Action ${toActionString(event.action)}`
    case "AddDebugEvent":
      return `Add Entity "${event.entity}"`
    case "RemoveDebugEvent":
      return `Remove Entity "${event.entity}"`
    case "ChangePropertyDebugEvent":
      return `Set Entity property "${event.entity}.${event.property}" to ${event.value}`
    case "DeletePropertyDebugEvent":
      return `Delete Entity property "${event.entity}.${event.property}"`
    case "AddSubscriberDebugEvent":
      return `Add subscriber "${event.subscriber}" to "${event.publisher}"`
    case "RemoveSubscriberDebugEvent":
      return `Remove subscriber "${event.subscriber}" from "${event.publisher}"`
    case "NotifySubscriberDebugEvent":
      return `"${event.publisher}" notify subscriber "${event.subscriber}"`
    case "InvalidateQueryDebugEvent":
      return `Invalidate query "${event.query}"`
    case "RunQueryOnInvalidateDebugEvent":
      return `Run onInvalidate for query "${event.query}"`
    case "RunReactionDebugEvent":
      return `Run reaction for query "${event.reaction}"`
    case "RunEffectDebugEvent":
      return `Run effect "${event.effect}"`
    case "RunQueryDebugEvent":
      return `Run query "${event.query}"`
    case "RunUseQueryDebugEvent":
      return `Run useQuery "${event.query}"`
    case "UnmountUseQueryDebugEvent":
      return `Unmount useQuery "${event.query}"`
    case "UseQueryForceRerenderDebugEvent":
      return `useQuery force re-render "${event.query}"`
  }
}

function toActionString(action: Action): string {
  switch (action.type) {
    case "EntitiesAction":
      return `EntitiesAction "${action.entityType}.${
        action.name
      }(${toArgsString(action.args)})"`
    case "EntityAction":
      return `EntityAction "${action.entityType}#${action.id}.${
        action.name
      }(${toArgsString(action.args)})"`
    case "ServiceAction":
      return `ServiceAction "${action.service}.${action.name}(${toArgsString(
        action.args
      )})"`
    case "InitializeAction":
      return `"InitializeAction"`
    case "UnnamedAction":
      return `"UnnamedAction"`
  }
}

function toArgsString(args: Array<any>): string {
  const argStrs = args.map((arg) => `${arg}`)
  return argStrs.join(", ")
}
