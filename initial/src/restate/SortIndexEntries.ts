import {IndexEntries} from "./IndexEntries"
import {SortIndexEntry} from "./SortIndexEntry"
import {SortIndexSchema} from "./Types"
import {toSortValues} from "./Utils"
import {toSortDirections} from "./Utils"
import {getSortedInsertPosition} from "./Utils"
import {compareSortValues} from "./Utils"
import {Entity} from "./Entity"
import {SortValues} from "./Types"
import {Index} from "./Index"
import {EntityState} from "./EntityState"
import {SortIndex} from "./Types"
import {toInt} from "./Utils"

type EntriesType<E extends Entity> = Array<SortIndexEntry<E>>

export class SortIndexEntries<E extends Entity> extends IndexEntries<
  E,
  SortIndex<E>,
  EntriesType<E>
> {
  sortDirections = toSortDirections(this.schema.sort)

  constructor(
    public index: Index<E>,
    name: string,
    public schema: SortIndexSchema
  ) {
    super(index, name, [])
  }

  get entries() {
    return this.target
  }

  get empty() {
    return this.entries.length === 0
  }

  // If this is being accessed in a @reaction, don't bother recording
  // individual property accesses, since this is an array.  Any change
  // to the array will trigger a recompute.  We could get more
  // granular if that would really improve performance for a
  // significant set of use cases.
  shouldAddPropertySubscribers() {
    return false
  }

  onEntityAdded(e: EntityState<E>) {
    const sortValues = this.toSortValues(e.entity, e.id)
    const ix = this.getSortPosition(sortValues)
    const entry = new SortIndexEntry(e, sortValues)
    this.entries.splice(ix, 0, entry)
    this.invalidateProxy()
  }

  onEntityRemoved(e: EntityState<E>) {
    const sortValues = this.toSortValues(e.entity, e.id)
    const ix = this.getSortPosition(sortValues)
    const entry = this.entries[ix]
    if (entry != null && entry.entity === e) {
      this.entries.splice(ix, 1)
      this.invalidateProxy()
    }
  }

  onEntityPropertyChanged(
    e: EntityState<E>,
    property: string,
    hadOldValue: boolean,
    oldValue: any | null,
    hasNewValue: boolean,
    newValue: any | null
  ) {
    const entity = this.getEntityWithId(e.id)
    const oldSortValues = this.toSortValues(entity, e.id, property, oldValue)
    const newSortValues = this.toSortValues(e.entity, e.id)
    const oldIx = this.getSortPosition(oldSortValues)
    let newIx = this.getSortPosition(newSortValues)
    const oldState = this.entries[oldIx]
    const isInList = oldState.entity === e
    if (isInList && (newIx === oldIx || newIx === oldIx + 1)) {
      oldState.sortValues = newSortValues
    } else {
      if (isInList) {
        this.entries.splice(oldIx, 1)
        if (newIx > oldIx) {
          newIx--
        }
      }
      const entry = new SortIndexEntry(e, newSortValues)
      this.entries.splice(newIx, 0, entry)
    }
    this.invalidateProxy()
  }

  toSortValues(
    e: E,
    id: string,
    replaceProperty: string | null = null,
    replaceValue: any | null = null
  ) {
    return toSortValues(e, id, this.schema.sort, replaceProperty, replaceValue)
  }

  getSortPosition(sortValues: SortValues) {
    const compare = (e: SortIndexEntry<E>) =>
      compareSortValues(e.sortValues, sortValues, this.sortDirections)
    return getSortedInsertPosition(this.entries, compare)
  }

  getEntityWithId(id: string) {
    return this.entitiesState.getEntityWithId(id)
  }

  propertyGet(prop: string) {
    if (prop === "length") {
      return this.entries.length
    }
    // This is apparently the official test for seeing if a string is
    // a number
    const ix = toInt(prop)
    if (ix == null) {
      return super.propertyGet(prop)
    }
    const entry = this.entries[ix]
    if (entry == null) {
      return entry
    }
    return entry.entity.proxy
  }
}
