import {IndexEntries} from "./IndexEntries"
import {Entity} from "./Entity"
import {Index} from "./Index"
import {ManyHashIndexSchema} from "./Types"
import {EntityState} from "./EntityState"
import {createIndexEntries} from "./Utils"
import {HashIndex} from "./Types"
import {HashIndexEntry} from "./Types"

type EntriesType<E extends Entity> = {[key: string]: IndexEntries<E, any, any>}

export class ManyHashIndexEntries<E extends Entity> extends IndexEntries<
  E,
  HashIndex<HashIndexEntry<E>>,
  EntriesType<E>
> {
  entryCount = 0
  constructor(
    public index: Index<E>,
    name: string,
    public schema: ManyHashIndexSchema
  ) {
    super(index, name, {})
  }

  get entries() {
    return this.target
  }

  get key() {
    return this.schema.property
  }

  get empty() {
    return this.entryCount === 0
  }

  addEntity(key: string | null | undefined, e: EntityState<E>) {
    if (key != null) {
      let entries = this.entries[key]
      if (entries == null) {
        const name = `${this.name}.${key}`
        entries = createIndexEntries(this.index, name, this.schema.entrySchema)
        this.entries[key] = entries
        this.entryCount++
        this.notifySubscribersOfPropertyChange(key)
        this.notifyOwnKeysSubscribersOfChange()
      }
      // FIXME - invalidateProxy should be moved up to the if clause
      this.invalidateProxy()
      entries.onEntityAdded(e)
    }
  }

  removeEntity(key: string | null | undefined, e: EntityState<E>) {
    if (key != null) {
      let entries = this.entries[key]
      if (entries != null) {
        // FIXME - only invalidate proxy if entries is empty
        this.invalidateProxy()
        entries.onEntityRemoved(e)
        if (entries.empty) {
          delete this.entries[key]
          this.entryCount--
          this.notifySubscribersOfPropertyChange(key)
          this.notifyOwnKeysSubscribersOfChange()
        }
      }
    }
  }

  onEntityAdded(e: EntityState<E>) {
    const key = (e.entity as any)[this.key]
    this.addEntity(key, e)
  }

  onEntityRemoved(e: EntityState<E>) {
    const key = (e.entity as any)[this.key]
    this.removeEntity(key, e)
  }

  onEntityPropertyChanged(
    e: EntityState<E>,
    property: string,
    hadOldValue: boolean,
    oldValue: any | null,
    hasNewValue: boolean,
    newValue: any | null
  ) {
    // If the changed property is one being indexed by this, then
    // remove and add it
    if (property === this.key) {
      if (hadOldValue) {
        this.removeEntity(oldValue, e)
      }
      if (hasNewValue) {
        this.addEntity(newValue, e)
      }
    }
    // Otherwise pass the call on to the next index
    else {
      const key = (e.entity as any)[this.key]
      if (key != null) {
        let entries = this.entries[key]
        if (entries != null) {
          this.invalidateProxy()
          entries.onEntityPropertyChanged(
            e,
            property,
            hadOldValue,
            oldValue,
            hasNewValue,
            newValue
          )
          if (entries.empty) {
            delete this.entries[key]
          }
        }
      }
    }
  }

  propertyGet(prop: string) {
    const es = super.propertyGet(prop)
    if (es != null) {
      return es.proxy
    } else {
      return es
    }
  }
}
