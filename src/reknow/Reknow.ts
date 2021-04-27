// FIXME - apparently you need these workarounds to reexport types in TS <3.8
import {EntitiesDefinitions as _EntitiesDefinitions} from "./Types"
import {ServiceDefinitions as _ServiceDefinitions} from "./Types"
import {HashIndex as _HashIndex} from "./Types"
import {UniqueHashIndex as _UniqueHashIndex} from "./Types"
import {SortIndex as _SortIndex} from "./Types"
import {QueryNotifyAt as _QueryNotifyAt} from "./Types"

import {Entity as _Entity} from "./Entity"

import {Transaction as _Transaction} from "./TransactionTypes"
import {StateChange as _StateChange} from "./TransactionTypes"
import {EntityAdded as _EntityAdded} from "./TransactionTypes"
import {EntityRemoved as _EntityRemoved} from "./TransactionTypes"
import {EntityPropertyChanged as _EntityPropertyChanged} from "./TransactionTypes"
import {Action as _Action} from "./TransactionTypes"
import {EntitiesAction as _EntitiesAction} from "./TransactionTypes"
import {EntityAction as _EntityAction} from "./TransactionTypes"
import {ServiceAction as _ServiceAction} from "./TransactionTypes"
import {InitializeAction as _InitializeAction} from "./TransactionTypes"
import {ReverseAction as _ReverseAction} from "./TransactionTypes"
import {UnnamedAction as _UnnamedAction} from "./TransactionTypes"

import {EntityClass as _EntityClass} from "./Types"
import {EntitiesExport as _EntitiesExport} from "./Types"
import {EntityTypeExport as _EntityTypeExport} from "./Types"
import {EntityPropertiesExport as _EntityPropertiesExport} from "./Types"

import {DebugEvent as _DebugEvent} from "./DebugEvents"
import {ActionDebugEvent as _ActionDebugEvent} from "./DebugEvents"
import {AddDebugEvent as _AddDebugEvent} from "./DebugEvents"
import {RemoveDebugEvent as _RemoveDebugEvent} from "./DebugEvents"
import {ChangePropertyDebugEvent as _ChangePropertyDebugEvent} from "./DebugEvents"
import {DeletePropertyDebugEvent as _DeletePropertyDebugEvent} from "./DebugEvents"
import {AddSubscriberDebugEvent as _AddSubscriberDebugEvent} from "./DebugEvents"
import {RemoveSubscriberDebugEvent as _RemoveSubscriberDebugEvent} from "./DebugEvents"
import {NotifySubscriberDebugEvent as _NotifySubscriberDebugEvent} from "./DebugEvents"
import {InvalidateQueryDebugEvent as _InvalidateQueryDebugEvent} from "./DebugEvents"
import {RunQueryOnInvalidateDebugEvent as _RunQueryOnInvalidateDebugEvent} from "./DebugEvents"
import {RunReactionDebugEvent as _RunReactionDebugEvent} from "./DebugEvents"
import {RunEffectDebugEvent as _RunEffectDebugEvent} from "./DebugEvents"

export {StateManager} from "./StateManager"
export {Entities} from "./Entities"
export {SingletonEntities} from "./SingletonEntities"
export {Entity} from "./Entity"
export {Service} from "./Service"
export {Query} from "./Query"
export {action} from "./Decorators"
export {hasMany} from "./Decorators"
export {hasOne} from "./Decorators"
export {belongsTo} from "./Decorators"
export {id} from "./Decorators"
export {index} from "./Decorators"
export {uniqueIndex} from "./Decorators"
export {reaction} from "./Decorators"
export {query} from "./Decorators"
export {afterAdd} from "./Decorators"
export {afterRemove} from "./Decorators"
export {afterChange} from "./Decorators"
export {afterPropertyChange} from "./Decorators"
export {reverseTransaction} from "./Transactions"

export {stringifyDebugEvent} from "./DebugEvents"
export {stringifyTransaction} from "./Transactions"

// FIXME - apparently you need these workarounds to reexport types in TS <3.8
export type EntitiesDefinitions = _EntitiesDefinitions
export type ServiceDefinitions = _ServiceDefinitions
export type HashIndex<
  I extends HashIndex<any> | UniqueHashIndex<any> | SortIndex<any>
> = _HashIndex<I>
export type UniqueHashIndex<E extends _Entity> = _UniqueHashIndex<E>
export type SortIndex<E extends _Entity> = _SortIndex<E>
export type QueryNotifyAt = _QueryNotifyAt

export type Transaction = _Transaction
export type StateChange = _StateChange
export type EntityAdded = _EntityAdded
export type EntityRemoved = _EntityRemoved
export type EntityPropertyChanged = _EntityPropertyChanged
export type Action = _Action
export type EntitiesAction = _EntitiesAction
export type EntityAction = _EntityAction
export type ServiceAction = _ServiceAction
export type InitializeAction = _InitializeAction
export type UnnamedAction = _UnnamedAction
export type ReverseAction = _ReverseAction

export type DebugEvent = _DebugEvent
export type ActionDebugEvent = _ActionDebugEvent
export type AddDebugEvent = _AddDebugEvent
export type RemoveDebugEvent = _RemoveDebugEvent
export type ChangePropertyDebugEvent = _ChangePropertyDebugEvent
export type DeletePropertyDebugEvent = _DeletePropertyDebugEvent
export type AddSubscriberDebugEvent = _AddSubscriberDebugEvent
export type RemoveSubscriberDebugEvent = _RemoveSubscriberDebugEvent
export type NotifySubscriberDebugEvent = _NotifySubscriberDebugEvent
export type InvalidateQueryDebugEvent = _InvalidateQueryDebugEvent
export type RunQueryOnInvalidateDebugEvent = _RunQueryOnInvalidateDebugEvent
export type RunReactionDebugEvent = _RunReactionDebugEvent
export type RunEffectDebugEvent = _RunEffectDebugEvent
export type EntitiesExport = _EntitiesExport
export type EntityTypeExport = _EntityTypeExport
export type EntityPropertiesExport = _EntityPropertiesExport

export type EntityClass<E extends _Entity> = _EntityClass<E>
