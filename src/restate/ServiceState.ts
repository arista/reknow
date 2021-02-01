import {ManagedState} from "./ManagedState"
import {StateManager} from "./StateManager"
import {Service} from "./Service"
import {Action} from "./Types"
import {Query} from "./Query"
import {ServiceDeclarations} from "./ServiceDeclarations"

export class ServiceState implements ManagedState {
  reactions: Array<Query<any>> = []
  reactionsByName: {[name: string]: Query<any>} = {}
  queries: Array<Query<any>> = []
  queriesByName: {[name: string]: Query<any>} = {}
  serviceDeclarations = ServiceDeclarations.forClass(this.service.constructor)

  constructor(
    public name: string,
    public stateManager: StateManager,
    public service: Service
  ) {
    this.addQueries()
    this.addReactions()
  }

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

  addQueries() {
    for (const cdecl of this.serviceDeclarations.queries) {
      const f = () => cdecl.f.apply(this)
      const query = this.stateManager.createQuery(
        f,
        `${this.name}.${cdecl.name}`
      )
      this.queries.push(query)
      this.queriesByName[cdecl.name] = query
    }
  }

  addReactions() {
    for (const cdecl of this.serviceDeclarations.reactions) {
      const f = () => cdecl.f.apply(this)
      const query:Query<any> = this.stateManager.createReaction(
        f,
        `${this.name}.${cdecl.name}`
      )
      this.reactions.push(query)
      this.reactionsByName[cdecl.name] = query
    }
  }

  clearState() {
    // FIXME  - clear out selectors
  }
}
