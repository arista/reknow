import {EntitiesDefinitions} from "./Types"
import {EntitiesDefinitionTree} from "./Types"
import {Entities} from "./Entities"
import {ServiceDefinitions} from "./Types"
import {ServiceDefinitionTree} from "./Types"
import {Service} from "./Service"
import {FunctionType} from "./Types"
import {SortDirectives} from "./Types"
import {SortDirective} from "./Types"
import {SortDirection} from "./Types"
import {SortValues} from "./Types"
import {SortDirections} from "./Types"
import {SortedList} from "./Types"
import {Entity} from "./Entity"
import {EntityState} from "./EntityState"
import {IndexSchema} from "./Types"
import {ManagedState} from "./ManagedState"
import {Selector} from "./Selector"
import {Manageable} from "./Manageable"
import {ManyHashIndexEntries} from "./ManyHashIndexEntries"
import {UniqueHashIndexEntries} from "./UniqueHashIndexEntries"
import {SortIndexEntries} from "./SortIndexEntries"
import {Index} from "./Index"
import {HasManySort} from "./Types"
import {HasManySortElement} from "./Types"
import {ArrayChangesResults} from "./Types"
import {ConstructorFunction} from "./Types"

export function notNull<T>(val: T | null | undefined): T {
  if (val == null) {
    throw new Error(`Assertion failed: value is null`)
  }
  return val
}

export function flattenEntitiesDefinitionTree(
  tree: EntitiesDefinitionTree | null | undefined
): EntitiesDefinitions {
  const result: EntitiesDefinitions = {}
  if (tree != null) {
    _flattenEntitiesDefinitionTree(result, tree)
  }
  return result
}

export function _flattenEntitiesDefinitionTree(
  result: EntitiesDefinitions,
  tree: EntitiesDefinitionTree,
  baseName: string | null = null
) {
  for (const name in tree) {
    if (name.indexOf(".") >= 0) {
      throw new Error(`Entities name "${name}" name may not contain a period`)
    }
    const fullName = baseName == null ? name : `${baseName}.${name}`
    const entry = tree[name]
    if (entry instanceof Entities) {
      result[fullName] = entry
    } else {
      _flattenEntitiesDefinitionTree(result, entry, fullName)
    }
  }
}

export function flattenServiceDefinitionTree(
  tree: ServiceDefinitionTree | null | undefined
): ServiceDefinitions {
  const result: ServiceDefinitions = {}
  if (tree != null) {
    _flattenServiceDefinitionTree(result, tree)
  }
  return result
}

export function _flattenServiceDefinitionTree(
  result: ServiceDefinitions,
  tree: ServiceDefinitionTree,
  baseName: string | null = null
) {
  for (const name in tree) {
    if (name.indexOf(".") >= 0) {
      throw new Error(`Service name "${name}" name may not contain a period`)
    }
    const fullName = baseName == null ? name : `${baseName}.${name}`
    const entry = tree[name]
    if (entry instanceof Service) {
      result[fullName] = entry
    } else {
      _flattenServiceDefinitionTree(result, entry, fullName)
    }
  }
}

export function copyInstance<T extends Object>(obj: T): T {
  const ret: T = {...obj}
  Object.setPrototypeOf(ret, Object.getPrototypeOf(obj))
  return ret
}

export function replaceFunction(
  target: any,
  name: string,
  pd: PropertyDescriptor,
  replacer: (f: Function, name: string, type: FunctionType) => Function
) {
  // Only handle non-static methods (target will be the Object
  // prototype, not the constructor Function)
  if (typeof target !== "function") {
    // FIXME - how can we get rid of those "as any"
    if (typeof pd.value === "function") {
      pd.value = replacer(pd.value, name, "method") as any
    } else if (typeof pd.set === "function") {
      pd.set = replacer(pd.set, name, "setter") as any
    } else if (typeof pd.get === "function") {
      pd.get = replacer(pd.get, name, "getter") as any
    } else {
      throw new Error(
        `Unexpected placement for decorator.  Make sure the decorator is on a non-static method, getter, or setter`
      )
    }
  } else {
    throw new Error(
      `Unexpected placement for decorator.  Make sure the decorator is on a non-static method, getter, or setter`
    )
  }
}

export function toMemberName(name: string, type: FunctionType) {
  switch (type) {
    case "method":
      return name
    case "getter":
      return `get#${name}`
    case "setter":
      return `set#${name}`
  }
}

export function compareSortValues(
  e1: SortValues,
  e2: SortValues,
  dirs: SortDirections
): number {
  for (let i = 0; i < e1.length; i++) {
    const cmp = comparePrimitiveValues(e1[i], e2[i])
    if (cmp !== 0) {
      return dirs[i] === "asc" ? cmp : -cmp
    }
  }
  return 0
}

/** Algorithm for comparing primitive values */
export function comparePrimitiveValues(val1: any, val2: any): number {
  if (val1 == null && val2 == null) {
    return 0
  }
  if (val1 === val2) {
    return 0
  }
  if (val1 == null) {
    return -1
  }
  if (val2 == null) {
    return 1
  }
  if (typeof val1 === "string" && typeof val2 === "string") {
    return val1 < val2 ? -1 : 1
  }
  if (typeof val1 === "number" && typeof val2 === "number") {
    return val1 < val2 ? -1 : 1
  }
  if (typeof val1 === "boolean" && typeof val2 === "boolean") {
    return !val1 ? -1 : 1
  }
  throw new Error(
    `Unable to compare values "${val1}" (type ${typeof val1}) and "${val2}" (type ${typeof val2})`
  )
}

export function getSortPosition(
  list: SortedList,
  sortValues: SortValues,
  sortDirections: SortDirections
): number {
  let low = -1
  let high = list.length
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2)
    const midSortValues = list[mid].sortValues
    const cmp = compareSortValues(sortValues, midSortValues, sortDirections)

    if (cmp < 0) {
      high = mid
    } else if (cmp > 0) {
      low = mid
    } else {
      return mid
    }
  }
  return high
}

/** A function that compares a value from the list against a target
 * value.  Returns < 0 if the list value comes before the target
 * value, > 0 if the list value comes after the target value, == 0 if
 * the target value has the same ordering as the value from the list.
 * For exampare a comparison function against target value "4" would
 * be "v=>v-4" **/
export type CompareFunc<E> = (v: E) => number

export function getSortedInsertPosition<E>(
  list: Array<E>,
  compare: CompareFunc<E>
): number {
  let low = -1
  let high = list.length
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2)
    const midVal = list[mid]
    const cmp = compare(midVal)
    if (cmp > 0) {
      high = mid
    } else if (cmp < 0) {
      low = mid
    } else {
      return mid
    }
  }
  return high
}

/** Returns the index of the first element that is >= the target value
 * represented by the compare function. */
export function getSortedGERange<E>(
  list: Array<E>,
  low: number,
  high: number,
  compare: CompareFunc<E>
): number {
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2)
    const midVal = list[mid]
    const cmp = compare(midVal)
    if (cmp >= 0) {
      high = mid
    } else {
      low = mid
    }
  }
  return high
}

export function getSortedGE<E>(
  list: Array<E>,
  compare: CompareFunc<E>
): number {
  return getSortedGERange(list, -1, list.length, compare)
}

/** Returns the index of the first element that is > the target value
 * represented by the compare function. */
export function getSortedGTRange<E>(
  list: Array<E>,
  low: number,
  high: number,
  compare: CompareFunc<E>
): number {
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2)
    const midVal = list[mid]
    const cmp = compare(midVal)
    if (cmp > 0) {
      high = mid
    } else {
      low = mid
    }
  }
  return high
}

export function getSortedGT<E>(
  list: Array<E>,
  compare: CompareFunc<E>
): number {
  return getSortedGTRange(list, -1, list.length, compare)
}

/** Returns the index of the first element that is <= the target value
 * represented by the compare function. */
export function getSortedLERange<E>(
  list: Array<E>,
  low: number,
  high: number,
  compare: CompareFunc<E>
): number {
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2)
    const midVal = list[mid]
    const cmp = compare(midVal)
    if (cmp > 0) {
      high = mid
    } else {
      low = mid
    }
  }
  return low
}

export function getSortedLE<E>(
  list: Array<E>,
  compare: CompareFunc<E>
): number {
  return getSortedLERange(list, -1, list.length, compare)
}

/** Returns the index of the first element that is < the target value
 * represented by the compare function. */
export function getSortedLTRange<E>(
  list: Array<E>,
  low: number,
  high: number,
  compare: CompareFunc<E>
): number {
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2)
    const midVal = list[mid]
    const cmp = compare(midVal)
    if (cmp >= 0) {
      high = mid
    } else {
      low = mid
    }
  }
  return low
}

export function getSortedLT<E>(
  list: Array<E>,
  compare: CompareFunc<E>
): number {
  return getSortedLTRange(list, -1, list.length, compare)
}

export function toSortValues(
  e: {[name: string]: any},
  id: string,
  sort: SortDirectives,
  replaceProperty: string | null = null,
  replaceValue: any | null = null
): SortValues {
  const ret = []
  for (const sd of sort) {
    const sortValue = toSortValue(e, id, sd, replaceProperty, replaceValue)
    ret.push(sortValue)
  }
  ret.push(id)
  return ret
}

export function toSortValue(
  e: {[name: string]: any},
  id: string,
  sd: SortDirective,
  replaceProperty: string | null = null,
  replaceValue: any | null = null
) {
  if (replaceProperty != null && replaceProperty === sd.prop) {
    return replaceValue
  } else {
    return e[sd.prop]
  }
}

export function toSortDirections(sort: SortDirectives): SortDirections {
  const ret: SortDirections = []
  for (const sd of sort) {
    ret.push(sd.dir || "asc")
  }
  ret.push("asc")
  return ret
}

/** Compare two entities using a set of sort directives */
export function compareSortDirectives<E>(
  e1: E,
  e1Id: string,
  e2: E,
  e2Id: string,
  sortDirectives: SortDirectives | null
): number {
  // Go through the sort directives
  if (sortDirectives != null) {
    for (const sortDirective of sortDirectives) {
      const cmp = compareSortDirective(e1, e1Id, e2, e2Id, sortDirective)
      if (cmp !== 0) {
        return cmp
      }
    }
  }

  // If all other values are the same, compare id's
  return comparePrimitiveValues(e1Id, e2Id)
}

/** Compare two entities using a single sort directive */
export function compareSortDirective<E>(
  e1: E,
  e1Id: string,
  e2: E,
  e2Id: string,
  sortDirective: SortDirective
): number {
  const val1 = toSortValue(e1, e1Id, sortDirective)
  const val2 = toSortValue(e2, e2Id, sortDirective)
  const cmp = comparePrimitiveValues(val1, val2)
  return sortDirective.dir === "desc" ? -cmp : cmp
}

export function sortArgsToSortDirectives(
  sortArgs: string | Array<string> | null | undefined
): Array<SortDirective> {
  const ret = []
  if (sortArgs != null) {
    if (Array.isArray(sortArgs)) {
      for (const sortArg of sortArgs) {
        ret.push(sortArgToSortDirective(sortArg))
      }
    } else {
      ret.push(sortArgToSortDirective(sortArgs))
    }
  }
  return ret
}

export function sortArgToSortDirective(sortArg: string): SortDirective {
  if (sortArg.startsWith("-")) {
    return {
      prop: sortArg.substring(1),
      dir: "asc",
    }
  } else if (sortArg.startsWith("+")) {
    return {
      prop: sortArg.substring(1),
      dir: "desc",
    }
  } else {
    return {prop: sortArg, dir: "asc"}
  }
}

/** Used by selectors to determine if a newly-computed value is
 * different from a previously-computed value.  This checks "one level
 * deep" into arrays and objects, to see if their keys and values are
 * ===.
 *
 * NOTE - this is no longer used by selectors.  If v1 and v2 are both
 * proxies to the same underlying value, then using this would make it
 * appear that the old value issAemValue as the new value, even though
 * the value has actually changed.
 */
export function isSameValue(v1: any, v2: any): boolean {
  if (v1 === v2) {
    return true
  } else if (v1 == null && v2 == null) {
    return true
  } else if (v1 == null || v2 == null) {
    return false
  } else if (v1 instanceof Entity || v2 instanceof Entity) {
    return false
  } else if (v1 instanceof EntityState || v2 instanceof EntityState) {
    return false
  } else if (Array.isArray(v1) && Array.isArray(v2)) {
    if (v1.length !== v2.length) {
      return false
    }
    for (let i = 0; i < v1.length; i++) {
      if (v1[i] !== v2[i]) {
        return false
      }
    }
    return true
  } else if (typeof v1 === "object" && typeof v2 === "object") {
    for (let p1 in v1) {
      if (v1[p1] !== v2[p1]) {
        return false
      }
    }
    for (let p2 in v2) {
      if (v1[p2] !== v2[p2]) {
        return false
      }
    }
    return true
  } else {
    return false
  }
}

/** Returns true if the given schema can be satisfied by an existing
 * index with the given existingSchema.  This will be true if the
 * existing Schema's terms start with the schema's terms. */
// FIXME - this doesn't distinguish between unique and many indexes if only the hash terms are specified
export function matchesSchema(
  schema: IndexSchema,
  existingSchema: IndexSchema
): boolean {
  switch (schema.type) {
    case "ManyHashIndexSchema":
      if (
        existingSchema.type !== "ManyHashIndexSchema" ||
        schema.property !== existingSchema.property
      ) {
        return false
      }
      return matchesSchema(schema.entrySchema, existingSchema.entrySchema)
    case "UniqueHashIndexSchema":
      return (
        existingSchema.type === "UniqueHashIndexSchema" &&
        schema.property === existingSchema.property
      )
    case "SortIndexSchema":
      if (existingSchema.type !== "SortIndexSchema") {
        return false
      }
      if (schema.sort.length > existingSchema.sort.length) {
        return false
      }
      for (let i = 0; i < schema.sort.length; i++) {
        if (!matchesSortDirective(schema.sort[i], existingSchema.sort[i])) {
          return false
        }
      }
      return true
  }
}

export function matchesSortDirective(
  d1: SortDirective,
  d2: SortDirective
): boolean {
  return d1.prop === d2.prop && matchesSortDirection(d1.dir, d2.dir)
}

export function matchesSortDirection(
  d1: SortDirection | null | undefined,
  d2: SortDirection | null | undefined
): boolean {
  if (d1 == null) {
    d1 = "asc"
  }
  if (d2 == null) {
    d2 = "asc"
  }
  return d1 === d2
}

export function selectorize(
  f: Function,
  name: string,
  type: FunctionType
): Function {
  const selectorByThis = new WeakMap<ManagedState, Selector<any>>()
  return function (this: Manageable, ...args: Array<any>) {
    if (args != null && args.length !== 0) {
      throw new Error(`No arguments may be passed to a @selector function`)
    }
    const managedState = this.managedState
    if (managedState == null) {
      throw new Error(
        `@selector has been used on a class that doesn't extend Entity, Entities, or Service, or has not been added to a StateManager`
      )
    }

    // Find or create the Selector associated with the stable
    // ManagedState associated with this (since "this" could be a
    // changing Proxy instance that still refers to the same
    // underlying state object)
    let selector = selectorByThis.get(managedState)
    if (selector == null) {
      const selectorName = managedState.toSelectorName(toMemberName(name, type))
      const stateManager = managedState.stateManager
      const selectorFunc = () => f.call(this, ...args)
      selector = new Selector(stateManager, selectorName, selectorFunc)
      // If this is a selector on an Entity instance, then set it
      // up to re-evaluate if the instance's Proxy changes
      // (indicating that the instance has changed state)
      if (managedState instanceof EntityState) {
        selector.setAsEntitySelector(managedState)
      }
      selectorByThis.set(managedState, selector)
    }
    return selector.evaluate()
  }
}

export function createIndexEntries<E extends Entity>(
  index: Index<E>,
  name: string,
  schema: IndexSchema
) {
  switch (schema.type) {
    case "ManyHashIndexSchema":
      return new ManyHashIndexEntries(index, name, schema)
    case "UniqueHashIndexSchema":
      return new UniqueHashIndexEntries(index, name, schema)
    case "SortIndexSchema":
      return new SortIndexEntries(index, name, schema)
  }
}

export function indexTermsToSchema(terms: Array<string>): IndexSchema {
  const hash: Array<string> = []
  const sort: Array<SortDirective> = []
  for (const term of terms) {
    const prefix = term.charAt(0)
    const prop = term.substring(1)
    switch (prefix) {
      case "=":
        if (sort.length !== 0) {
          throw new Error(
            `All hash ("=") terms must come before any sort terms ("+"/"-")`
          )
        }
        hash.push(prop)
        break
      case "+":
        sort.push({prop, dir: "asc"})
        break
      case "-":
        sort.push({prop, dir: "desc"})
        break
      default:
        throw new Error(`All terms must start with "=", "+", or "-"`)
    }
  }
  let ret: IndexSchema = {type: "SortIndexSchema", sort}
  for (let i = hash.length - 1; i >= 0; i--) {
    ret = {type: "ManyHashIndexSchema", property: hash[i], entrySchema: ret}
  }
  return ret
}

export function uniqueIndexTermsToSchema(terms: Array<string>): IndexSchema {
  const hash: Array<string> = []
  for (const term of terms) {
    const prefix = term.charAt(0)
    const prop = term.substring(1)
    switch (prefix) {
      case "=":
        hash.push(prop)
        break
      case "+":
      case "-":
        throw new Error(`uniqueIndex may not contain any sort terms ("+"/"-")`)
    }
  }
  if (hash.length === 0) {
    throw new Error(`uniqueIndex must specify at least one "=" term`)
  }
  let ret: IndexSchema = {
    type: "UniqueHashIndexSchema",
    property: hash[hash.length - 1],
  }
  for (let i = hash.length - 2; i >= 0; i--) {
    ret = {type: "ManyHashIndexSchema", property: hash[i], entrySchema: ret}
  }
  return ret
}

export function indexSchemaProperties(schema: IndexSchema): Array<string> {
  const s = new Set<string>()
  _indexSchemaProperties(schema, s)
  return [...s]
}

export function _indexSchemaProperties(
  schema: IndexSchema,
  properties: Set<string>
) {
  switch (schema.type) {
    case "ManyHashIndexSchema":
      properties.add(schema.property)
      _indexSchemaProperties(schema.entrySchema, properties)
      break
    case "UniqueHashIndexSchema":
      properties.add(schema.property)
      break
    case "SortIndexSchema":
      for (const sd of schema.sort) {
        properties.add(sd.prop)
      }
      break
  }
}

export function hasManySortToSortDirectives(
  sort: HasManySort | null | undefined
): SortDirectives {
  if (sort == null) {
    return []
  } else if (Array.isArray(sort)) {
    const ret: SortDirectives = []
    for (const e of sort) {
      ret.push(hasManySortElementToSortDirective(e))
    }
    return ret
  } else {
    return [hasManySortElementToSortDirective(sort)]
  }
}

export function hasManySortElementToSortDirective(
  sort: HasManySortElement
): SortDirective {
  if (typeof sort === "string") {
    if (sort.startsWith("+")) {
      return {
        prop: sort.substring(1),
        dir: "asc",
      }
    } else if (sort.startsWith("-")) {
      return {
        prop: sort.substring(1),
        dir: "desc",
      }
    } else {
      return {
        prop: sort,
        dir: "asc",
      }
    }
  } else {
    return sort
  }
}

export function addProperty<T>(
  target: Object,
  name: string,
  getter: (() => T) | null = null,
  setter: ((val: T) => void) | null = null
) {
  const pd: PropertyDescriptor = {}
  if (getter != null) {
    pd.get = getter
  }
  if (setter != null) {
    pd.set = setter
  }
  Object.defineProperty(target, name, pd)
}

export function addNonEnumerableProperty<T>(
  target: Object,
  name: symbol,
  value: T
) {
  const pd: PropertyDescriptor = {value, enumerable: false}
  Object.defineProperty(target, name, pd)
}

export function arrayChanges<T>(
  val1: Array<T>,
  val2: Array<T>
): ArrayChangesResults<T> {
  const val1Set = new Set(val1)
  const val2Set = new Set(val2)
  const add: Array<T> = []
  const remove: Array<T> = []

  // Remove elements that were in val1 but not in val2
  for (const e1 of val1) {
    if (!val2Set.has(e1)) {
      remove.push(e1)
    }
  }
  // Add elements that are in val2 but not in val1
  for (const e2 of val2) {
    if (!val1Set.has(e2)) {
      add.push(e2)
    }
  }
  return {add, remove}
}

export function toInt(val: any): number | null {
  if (typeof val !== "string") {
    return null
  }
  // This is apparently the official test for seeing if a string is
  // a number (parseInt(v).toString() === v)
  const ret = parseInt(val)
  if (ret.toString() !== val) {
    return null
  }
  return ret
}

/**
 * Returns true if the given property is either an "own" property of
 * obj, or else is not defined anywhere in the prototype chain.
 **/
export function isNonInheritedProperty(obj: Object, prop: string) {
  if (obj.hasOwnProperty(prop)) {
    return true
  } else if (prop in obj) {
    return false
  } else {
    return true
  }
}

/**
 * Returns true if the given value is a "plain" Object, as opposed to
 * an instance of a class
 **/
export function isPlainObject(val: any): boolean {
  return val != null && Object.getPrototypeOf(val) === Object.prototype
}

/**
 * Creates an instance of the given clazz
 **/
export function plainObjectToInstance<E>(
  src: Object,
  clazz: ConstructorFunction<E>
): E {
  const ret = Object.assign({}, src) as E
  Object.setPrototypeOf(ret, clazz.prototype)
  return ret
}

/**
 * Copies the non-symbol properites from src to dest, only copying
 * those that have different values (testing with "!==")
 **/
export function copyProperties(
  src: {[key: string]: any},
  dest: {[key: string]: any}
) {
  for (const key in src) {
    const val = src[key]
    if (dest[key] !== val) {
      dest[key] = src[key]
    }
  }
}

export function setOwnProperty(obj:Object, name:string, value:any) {
  Object.defineProperty(obj, name, {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  })
}

export function getOwnProperty<T>(obj:Object, name:string, defaultValue: T):T {
  const pd = Object.getOwnPropertyDescriptor(obj, name)
  return (pd != null && pd.value != null) ? pd.value : defaultValue
}
