import {EntitiesState} from "./EntitiesState"
import {ChangePublisher} from "./ChangePublisher"
import {ObjectChangePublishers} from "./ObjectChangePublishers"
import {Entities} from "./Entities"
import {StateManager} from "./StateManager"
import {Index} from "./Index"
import {IndexEntries} from "./IndexEntries"
import {ManyHashIndexEntries} from "./ManyHashIndexEntries"

export class ChangeSubscriberDumper {
  constructor(public stateManager: StateManager) {}

  get entitiesStates() {
    return this.stateManager.entitiesStates
  }

  get serviceStates() {
    return this.stateManager.serviceStates
  }

  dumpChangeSubscribers() {
    return {
      entities: this.entitiesStates.map((o) =>
        this.dumpEntitiesStateChangeSubscribers(o)
      ),
    }
  }

  dumpEntitiesStateChangeSubscribers(o: EntitiesState<any>) {
    return {
      name: o.name,
      changePublishers: this.dumpObjectChangePublishers(o._changePublishers),
      changePublisher: this.dumpChangePublisher(o._changePublisher),
      entities: this.dumpEntities(o.entities),
      indexes: this.dumpIndexes(o.indexes),
    }
  }

  dumpChangePublisher(p: ChangePublisher | null) {
    if (p == null) {
      return null
    }
    return {
      subscribers: p.subscribers.map((s) => s.name),
    }
  }

  dumpPropertyChangePublishers(p: {[prop: string]: ChangePublisher} | null) {
    if (p == null) {
      return null
    }
    let ret: any = {}
    for (const key in p) {
      const cp = p[key]
      ret[key] = this.dumpChangePublisher(cp)
    }
    return ret
  }

  dumpEntities(e: Entities<any>) {
    let ret: any = {}
    for (const id in e.entitiesById) {
      const en = e.entitiesById[id]
      const es = en.entityState
      ret[id] = this.dumpObjectChangePublishers(es._changePublishers)
    }
    return ret
  }

  dumpObjectChangePublishers(p: ObjectChangePublishers | null) {
    if (p == null) {
      return null
    }
    return {
      propertyChangePublishers:
        p._propertyChangePublishers == null
          ? null
          : this.dumpPropertyChangePublishers(p._propertyChangePublishers),
      ownKeysChangePublisher:
        p._ownKeysChangePublisher == null
          ? null
          : this.dumpChangePublisher(p._ownKeysChangePublisher),
      changePublisher:
        p._changePublisher == null
          ? null
          : this.dumpChangePublisher(p._changePublisher),
    }
  }

  dumpIndexes(indexes: Array<Index<any>>) {
    let ret: any = {}
    for (const index of indexes) {
      ret[index.name] = this.dumpIndex(index)
    }
    return ret
  }

  dumpIndex(index: Index<any>) {
    return index._entries != null ? this.dumpIndexEntries(index._entries) : null
  }

  dumpIndexEntries(entries: IndexEntries<any, any, any>) {
    let ret: any = {
      changePublishers: this.dumpObjectChangePublishers(
        entries._changePublishers
      ),
    }
    if (entries instanceof ManyHashIndexEntries) {
      const keys: any = {}
      const e = entries.entries
      for (const key in e) {
        const entry = e[key]
        keys[key] = this.dumpIndexEntries(entry)
      }
      ret.keys = keys
    }
    return ret
  }
}
