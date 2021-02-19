import {ServiceState} from "./ServiceState"
import {ServiceDeclarations} from "./ServiceDeclarations"

/** Superclass for classes that aren't Entities, but still want to use
 * the various decorators (@action, @selector, etc.)
 **/
export class Service {
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

  // FIXME - factor this out into Utils of Entity, Entities, and Service
  static getPropertyDescriptor(name: string): PropertyDescriptor {
    const pd = Object.getOwnPropertyDescriptor(this.prototype, name)
    if (pd == null) {
      throw new Error(`property or method "${name}" not found`)
    }
    return pd
  }

  static action(name: string) {
    const pd = this.getPropertyDescriptor(name)
    ServiceDeclarations.addAction(this.prototype, name, pd)
  }

  static query(name: string) {
    const pd = this.getPropertyDescriptor(name)
    ServiceDeclarations.addQuery(this.prototype, name, pd)
  }
}
