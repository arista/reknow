import {Action} from "./Types"

export type DebugEvent =
  ActionDebugEvent|
  PropertySetDebugEvent|
  PropertyDeleteDebugEvent|

export interface DebugEventBase {
  children?: Array<DebugEvent>
}

export interface ActionDebugEvent extends DebugEventBase {
  type: "ActionDebugEvent"
  action: Action
  nestedAction?: boolean
}

export interface PropertySetDebugEvent extends DebugEventBase {
  type: "PropertySetDebugEvent"
  object: string
  property: string
  value: any
}

export interface PropertyDeleteDebugEvent extends DebugEventBase {
  type: "PropertyDeleteDebugEvent"
  object: string
  property: string
}
