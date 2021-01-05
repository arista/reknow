import {EntitiesState} from "./EntitiesState"
import {ChangePublisher} from "./ChangePublisher"
import {Entities} from "./Entities"
import {StateManager} from "./StateManager"

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
      changePublisher: this.dumpChangePublisher(o._changePublisher),
      entities: this.dumpEntities(o.entities),
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
      ret[id] = {
        ownKeysChangePublisher:
          es._ownKeysChangePublisher == null
            ? null
            : this.dumpChangePublisher(es._ownKeysChangePublisher),
        propertyChangePublishers:
          es._propertyChangePublishers == null
            ? null
            : this.dumpPropertyChangePublishers(es._propertyChangePublishers),
      }
    }
    return ret
  }
}
