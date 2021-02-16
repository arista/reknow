import {ManagedState} from "./ManagedState"

/** The superclass for classes that can be assigned to the
 * StateManager, and can support the various decorators that require
 * access to the StateManager (@action, @selector, etc.)
 *
 * This class is implemented by the classes that serve as the base
 * classes for user-defined classes: Entity, Entities, Service.
 **/
export abstract class Manageable {
  abstract get managedState(): ManagedState
}
