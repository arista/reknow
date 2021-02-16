import {IndexEntries} from "./IndexEntries"
import {Entity} from "./Entity"
import {EntityState} from "./EntityState"
import {Index} from "./Index"
import {UniqueHashIndexSchema} from "./Types"
import {UniqueHashIndex} from "./Types"

type EntriesType<E extends Entity> = {[key: string]: EntityState<E>}

export class UniqueHashIndexEntries<E extends Entity> extends IndexEntries<
  E,
  UniqueHashIndex<E>,
  EntriesType<E>
> {
  entryCount = 0
  constructor(
    public index: Index<E>,
    name: string,
    public schema: UniqueHashIndexSchema
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
      if (this.entries.hasOwnProperty(key)) {
        throw new Error(
          `Unique key violation: attempt to add multiple entities with key "${key}" from property "${this.key}" in index "${this.index.name}"`
        )
      }
      if (this.entries[key] !== e) {
        this.entries[key] = e
        this.entryCount++
        this.notifySubscribersOfPropertyChange(key)
        this.notifyOwnKeysSubscribersOfChange()
        this.invalidateProxy()
      }
    }
  }

  removeEntity(key: string | null | undefined) {
    if (key != null) {
      if (this.entries[key] != null) {
        delete this.entries[key]
        this.entryCount--
        this.notifySubscribersOfPropertyChange(key)
        this.notifyOwnKeysSubscribersOfChange()
        this.invalidateProxy()
      }
    }
  }

  onEntityAdded(e: EntityState<E>) {
    const key = (e.entity as any)[this.key]
    this.addEntity(key, e)
  }

  onEntityRemoved(e: EntityState<E>) {
    const key = (e.entity as any)[this.key]
    this.removeEntity(key)
  }

  onEntityPropertyChanged(
    e: EntityState<E>,
    property: string,
    hadOldValue: boolean,
    oldValue: any | null,
    hasNewValue: boolean,
    newValue: any | null
  ) {
    if (property === this.key) {
      if (hadOldValue) {
        this.removeEntity(oldValue)
      }
      if (hasNewValue) {
        this.addEntity(newValue, e)
      }
    } else {
      // FIXME - shouldn't be invalidating proxy except for real changes
      this.invalidateProxy()
    }
  }

  propertyGet(prop: string) {
    const es = super.propertyGet(prop)
    if (es instanceof EntityState) {
      return es.proxy
    } else {
      return es
    }
  }
}
