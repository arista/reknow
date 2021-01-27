// FIXME - apparently you need these workarounds to reexport types in TS <3.8
import {EntitiesDefinitions as _EntitiesDefinitions} from "./Types"
import {ServiceDefinitions as _ServiceDefinitions} from "./Types"
import {HashIndex as _HashIndex} from "./Types"
import {UniqueHashIndex as _UniqueHashIndex} from "./Types"
import {SortIndex as _SortIndex} from "./Types"
import {QueryNotifyAt as _QueryNotifyAt} from "./Types"

import {Entity as _Entity} from "./Entity"

import {Transaction as _Transaction} from "./Types"
import {StateChange as _StateChange} from "./Types"
import {EntityAdded as _EntityAdded} from "./Types"
import {EntityRemoved as _EntityRemoved} from "./Types"
import {EntityPropertyChanged as _EntityPropertyChanged} from "./Types"
import {Action as _Action} from "./Types"
import {EntitiesAction as _EntitiesAction} from "./Types"
import {EntityAction as _EntityAction} from "./Types"
import {ServiceAction as _ServiceAction} from "./Types"
import {InitializeAction as _InitializeAction} from "./Types"
import {NoAction as _NoAction} from "./Types"

export {StateManager} from "./StateManager"
export {Entities} from "./Entities"
export {SingletonEntities} from "./SingletonEntities"
export {Entity} from "./Entity"
export {Service} from "./Service"
export {Reaction} from "./Reaction"
export {Query} from "./Query"
export {action} from "./Decorators"
export {selector} from "./Decorators"
export {hasMany} from "./Decorators"
export {hasOne} from "./Decorators"
export {belongsTo} from "./Decorators"
export {id} from "./Decorators"
export {index} from "./Decorators"
export {uniqueIndex} from "./Decorators"
export {reaction} from "./Decorators"
export {afterAdd} from "./Decorators"
export {afterRemove} from "./Decorators"
export {afterChange} from "./Decorators"
export {afterPropertyChange} from "./Decorators"

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
export type StateChange<E extends _Entity> = _StateChange<E>
export type EntityAdded<E extends _Entity> = _EntityAdded<E>
export type EntityRemoved<E extends _Entity> = _EntityRemoved<E>
export type EntityPropertyChanged = _EntityPropertyChanged
export type Action = _Action
export type EntitiesAction = _EntitiesAction
export type EntityAction = _EntityAction
export type ServiceAction = _ServiceAction
export type InitializeAction = _InitializeAction
export type NoAction = _NoAction
