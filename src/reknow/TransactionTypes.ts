export interface Transaction {
  action: Action
  stateChanges: Array<StateChange>
}

export type ObjectWithProperties = {[name: string]: any}

export type StateChange = EntityAdded | EntityRemoved | EntityPropertyChanged

export interface EntityAdded {
  type: "EntityAdded"
  entityType: string
  id: string
  entity: ObjectWithProperties
}

export interface EntityRemoved {
  type: "EntityRemoved"
  entityType: string
  id: string
  entity?: ObjectWithProperties
}

export interface EntityPropertyChanged {
  type: "EntityPropertyChanged"
  entityType: string
  id: string
  property: string
  oldValue?: any
  newValue?: any
}

export type Action =
  | EntitiesAction
  | EntityAction
  | ServiceAction
  | InitializeAction
  | ReverseAction
  | UnnamedAction

export interface EntitiesAction {
  type: "EntitiesAction"
  entityType: string
  name: string
  args: Array<any>
}

export interface EntityAction {
  type: "EntityAction"
  entityType: string
  id: string
  name: string
  args: Array<any>
}

export interface ServiceAction {
  type: "ServiceAction"
  service: string
  name: string
  args: Array<any>
}

export interface UnnamedAction {
  type: "UnnamedAction"
}

export interface ReverseAction {
  type: "ReverseAction"
  action: Action
}

export interface InitializeAction {
  type: "InitializeAction"
}
