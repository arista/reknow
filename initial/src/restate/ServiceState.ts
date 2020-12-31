import {ManagedState} from "./ManagedState"
import {StateManager} from "./StateManager"
import {Service} from "./Service"
import {Action} from "./Types"

export class ServiceState implements ManagedState {
  constructor(
    public name: string,
    public stateManager: StateManager,
    public service: Service
  ) {}

  toAction(name: string, args: Array<any>): Action {
    return {
      type: "ServiceAction",
      service: this.name,
      name,
      args,
    }
  }

  toSelectorName(name: string) {
    return `${this.name}.${name}`
  }

  clearState() {
    // FIXME  - clear out selectors
  }
}
