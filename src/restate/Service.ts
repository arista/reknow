import {Manageable} from "./Manageable"
import {ServiceState} from "./ServiceState"

/** Superclass for classes that aren't Entities, but still want to use
 * the various decorators (@action, @selector, etc.)
 **/
export class Service extends Manageable {
  _serviceState: ServiceState | null = null

  get serviceState() {
    if (this._serviceState == null) {
      throw new Error(
        `Attempt to use a Service class that has not been registered with a StateManager`
      )
    }
    return this._serviceState
  }

  get managedState() {
    return this.serviceState
  }

  initialize() {}
}
