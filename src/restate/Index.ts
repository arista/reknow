import {Entity} from "./Entity"
import {EntityState} from "./EntityState"
import {createIndexEntries} from "./Utils"
import {EntitiesState} from "./EntitiesState"
import {IndexSchema} from "./Types"
import {IndexEntries} from "./IndexEntries"

export class Index<E extends Entity> {
  entitiesState!: EntitiesState<E>
  name!: string
  _entries: IndexEntries<E, any, any> | null = null

  constructor(public schema: IndexSchema) {}

  get stateManager() {
    return this.entitiesState.stateManager
  }

  clearState() {
    this._entries = null
  }

  get entries(): IndexEntries<E, any, any> {
    if (this._entries == null) {
      this._entries = createIndexEntries(this, this.name, this.schema)
    }
    return this._entries
  }

  get proxy() {
    const ret = this.entries.proxy

    // FIXME - should all this come out eventually?
    const s = this.stateManager?.currentSelector
    if (s != null) {
      // FIXME - create the name and getter once and reuse it
      s.addSelectorDependency(
        `${this.entitiesState.name}.${this.name}`,
        () => this.proxy,
        ret
      )
    }
    this.entitiesState.addSubscriber()
    return ret
  }

  onEntityAdded(e: EntityState<E>) {
    this.entries.onEntityAdded(e)
  }

  onEntityRemoved(e: EntityState<E>) {
    this.entries.onEntityRemoved(e)
  }

  onEntityPropertyChanged(
    e: EntityState<E>,
    property: string,
    hadOldValue: boolean,
    oldValue: any | null,
    hasNewValue: boolean,
    newValue: any | null
  ) {
    this.entries.onEntityPropertyChanged(
      e,
      property,
      hadOldValue,
      oldValue,
      hasNewValue,
      newValue
    )
  }
}
