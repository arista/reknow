import {Entities} from "./Entities"
import {ENTITIES_KEY} from "./Entity"
import {EntitiesState} from "./EntitiesState"
import {Entity} from "./Entity"
import {Service} from "./Service"

export type EntitiesDefinitionTree = {
  [name: string]: EntitiesDefinitionTreeEntry
}
export type EntitiesDefinitionTreeEntry =
  | EntityClass<any>
  | EntitiesDefinitionTree
export type EntitiesDefinitions = {[name: string]: EntityClass<any>}

export type ServiceDefinitionTree = {
  [name: string]: ServiceDefinitionTreeEntry
}
export type ServiceDefinitionTreeEntry = Service | ServiceDefinitionTree
export type ServiceDefinitions = {[name: string]: Service}

export interface Transaction {
  action: Action
  stateChanges: Array<StateChange<Entity>>
}

export type StateChange<E extends Entity> =
  | EntityAdded<E>
  | EntityRemoved<E>
  | EntityPropertyChanged

export interface EntityAdded<E extends Entity> {
  type: "EntityAdded"
  entityType: string
  id: string
  entity: E
}

export interface EntityRemoved<E extends Entity> {
  type: "EntityRemoved"
  entityType: string
  id: string
  entity: E
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

export interface InitializeAction {
  type: "InitializeAction"
}

export type Listener<E> = (e: E) => void
export type TransactionListener = Listener<Transaction>

export type SortDirectives = Array<SortDirective>

export type SortDirective = {
  prop: string
  dir?: SortDirection
}

export type SortDirection = "asc" | "desc"

export type SortDirections = Array<SortDirection>

export type SortValues = Array<any>

export interface SortedListEntry {
  sortValues: Array<any>
}

export type SortedList = Array<SortedListEntry>

export type IndexSchema =
  | ManyHashIndexSchema
  | UniqueHashIndexSchema
  | SortIndexSchema

export interface ManyHashIndexSchema {
  type: "ManyHashIndexSchema"
  property: string
  entrySchema: IndexSchema
}

export interface UniqueHashIndexSchema {
  type: "UniqueHashIndexSchema"
  property: string
}

export interface SortIndexSchema {
  type: "SortIndexSchema"
  sort: SortDirectives
}

export interface IndexEntry<E extends Entity> {
  id: string
  sortValues: SortValues
}

export type FunctionType = "method" | "getter" | "setter"

export type ConstructorFunction<T> = new (...args: Array<any>) => T

export type EntityClass<E extends Entity> = {
  new (...args: Array<any>): E
  [ENTITIES_KEY]?: Entities<E>
}

export type InternalEntityClass<E extends Entity> = {
  entitiesState: EntitiesState<E> | null
}

export type ById<E extends Entity> = {[id: string]: E}

export type HashIndexEntry<E extends Entity> =
  | HashIndex<E>
  | UniqueHashIndex<E>
  | SortIndex<E>

export type HashIndex<I extends HashIndexEntry<any>> = Readonly<{
  [key: string]: I
}>
export type UniqueHashIndex<E extends Entity> = Readonly<{[key: string]: E}>
export type SortIndex<E extends Entity> = ReadonlyArray<E>

export interface IndexDecorator {
  name: string
  schema: IndexSchema
}

export interface ReactionDecorator {
  name: string
  f: () => void
}

export interface QueryDecorator {
  name: string
  f: () => void
}

export type HasManySort = HasManySortElement | Array<HasManySortElement>
export type HasManySortElement = string | SortDirective

export interface HasManyOptions {
  primaryKey?: string | null
  dependent?: "none" | "remove" | "nullify" | null
  sort?: HasManySort | null
}

export interface HasOneOptions {
  primaryKey?: string | null
  dependent?: "none" | "remove" | "nullify" | null
}

export interface BelongsToOptions {
  foreignKey?: string | null
  dependent?: "none" | "remove" | null
}

export type EffectDecorator =
  | AfterAddDecorator
  | AfterRemoveDecorator
  | AfterChangeDecorator
  | AfterPropertyChangeDecorator

export interface AfterAddDecorator {
  name: string
  f: () => void
}

export interface AfterRemoveDecorator {
  name: string
  f: () => void
}

export interface AfterChangeDecorator {
  name: string
  f: () => void
}

export interface AfterPropertyChangeDecorator {
  name: string
  property: string
  f: (oldValue: any) => void
}

export type RelationshipDecorator =
  | HasManyDecorator
  | HasOneDecorator
  | BelongsToDecorator

export interface HasManyDecorator {
  type: "HasManyDecorator"
  name: string
  foreignEntityFunc: () => EntityClass<any>
  foreignKey: string
  options: HasManyOptions | null
}

export interface HasOneDecorator {
  type: "HasOneDecorator"
  name: string
  foreignEntityFunc: () => EntityClass<any>
  foreignKey: string
  options: HasOneOptions | null
}

export interface BelongsToDecorator {
  type: "BelongsToDecorator"
  name: string
  foreignEntityFunc: () => EntityClass<any>
  primaryKey: string
  options: BelongsToOptions | null
}

export interface ArrayChangesResults<T> {
  add: Array<T>
  remove: Array<T>
}

export interface StateDump {
  entities: {[entitiesName: string]: EntitiesStateDump}
}

export interface EntitiesStateDump {
  byId: {[id: string]: Object}
}

export type QueryNotifyAt = "transactionEnd" | "afterTransaction"

export interface EntitiesExport {
  entities: {
    [entityName: string]: EntityTypeExport
  }
}

export interface EntityTypeExport {
  [entityId: string]: EntityPropertiesExport
}

export interface EntityPropertiesExport {
  [name: string]: any
}
