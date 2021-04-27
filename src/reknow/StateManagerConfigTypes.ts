import {Transaction} from "./TransactionTypes"
import {DebugEvent} from "./DebugEvents"
import {EntityClass} from "./Types"
import {Service} from "./Service"

export interface StateManagerConfig {
  entities?: EntitiesDefinitionTree
  services?: ServiceDefinitionTree
  listener?: (e: Transaction) => void
  debugListener?: (e: DebugEvent) => void
  idGenerator?: IdGenerator
}

export type EntitiesDefinitionTree = {
  [name: string]: EntitiesDefinitionTreeEntry
}
export type EntitiesDefinitionTreeEntry =
  | EntityClass<any>
  | EntitiesDefinitionTree

export type ServiceDefinitionTree = {
  [name: string]: ServiceDefinitionTreeEntry
}
export type ServiceDefinitionTreeEntry = Service | ServiceDefinitionTree

export type IdGenerator = (entityType: string) => string | null
