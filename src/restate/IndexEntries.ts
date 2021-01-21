import {Index} from "./Index"
import {Entity} from "./Entity"
import {EntityState} from "./EntityState"
import {Proxied} from "./Proxied"

export abstract class IndexEntries<
  E extends Entity,
  P extends Object,
  T extends Object
> extends Proxied<P, T> {
  constructor(public index: Index<E>, public name: string, entries: T) {
    super(entries, index.entitiesState.stateManager)
  }

  get entitiesState() {
    return this.index.entitiesState
  }

  abstract get empty(): boolean
  abstract onEntityAdded(e: EntityState<E>): void
  abstract onEntityRemoved(e: EntityState<E>): void
  abstract onEntityPropertyChanged(
    e: EntityState<E>,
    property: string,
    hadOldValue: boolean,
    oldValue: any | null,
    hasNewValue: boolean,
    newValue: any | null
  ): void

  propertySet(prop: string, value: any): boolean {
    // FIXME - implement someday
    throw new Error(`Indexes are currently not mutable`)
  }

  propertyDelete(prop: string): boolean {
    // FIXME - implement someday
    throw new Error(`Indexes are currently not mutable`)
  }

  get changePublisherName() {
    return this.name
  }
}
