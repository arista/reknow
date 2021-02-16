import {StateManager} from "./StateManager"
import {StateDump} from "./Types"
import {EntitiesStateDump} from "./Types"
import {EntitiesState} from "./EntitiesState"
import {EntityState} from "./EntityState"

export class StateDumper {
  constructor(public stateManager: StateManager) {}

  dumpState(): StateDump {
    const ret: StateDump = {
      entities: {},
    }
    for (const entitiesState of this.stateManager.entitiesStates) {
      ret.entities[entitiesState.name] = this.dumpEntitiesState(entitiesState)
    }
    return ret
  }

  dumpEntitiesState(entitiesState: EntitiesState<any>): EntitiesStateDump {
    const ret: EntitiesStateDump = {
      byId: {},
    }
    const byId = entitiesState.byId
    for (const id in byId) {
      const entityState = byId[id]
      ret.byId[id] = this.dumpEntityState(entityState)
    }
    return ret
  }

  dumpEntityState(entityState: EntityState<any>): Object {
    const ret: {[key: string]: any} = {}
    for (const key in entityState.entity) {
      if (typeof key === "string") {
        const val = entityState.entity[key]
        ret[key] = val
      }
    }
    return ret
  }
}
