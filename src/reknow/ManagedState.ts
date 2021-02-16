import {StateManager} from "./StateManager"
import {Action} from "./Types"

/** Interface that is accessed by various decorators (@action,
 * @selector, etc.) **/
export interface ManagedState {
  stateManager: StateManager
  toAction: (name: string, args: Array<any>) => Action
  toSelectorName: (name: string) => string
}
