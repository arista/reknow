import {QueryDecorator} from "./Types"
import {ReactionDecorator} from "./Types"
import {replaceFunction} from "./Utils"
import {Service} from "./Service"
import {FunctionType} from "./Types"
import {addNonEnumerableProperty} from "./Utils"

/** Stores the declarations, typically made with @ decorators,
 * specified in a Services class.  The declarations are associated
 * with the Service class's prototype, then gathered up when the
 * Service is added to the StateManager.
 */
export class ServiceDeclarations {
  queries: Array<QueryDecorator> = []
  reactions: Array<ReactionDecorator> = []

  static addAction(proto: Object, name: string, pd: PropertyDescriptor) {
    replaceFunction(
      proto,
      name,
      pd,
      (f: Function, name: string, type: FunctionType) => {
        return function (this: Service, ...args: Array<any>) {
          return this.serviceState.applyAction(name, type, f, args)
        }
      }
    )
  }

  static addQuery(proto: Object, name: string, pd: PropertyDescriptor) {
    const getter = pd.get
    if (getter == null) {
      throw new Error(
        `@query may only be specified for non-static getters of an Entity, Entities, or Service class`
      )
    }
    const c: QueryDecorator = {name, f: getter}
    ServiceDeclarations.forPrototype(proto).queries.push(c)
    replaceFunction(
      proto,
      name,
      pd,
      (f: Function, name: string, type: FunctionType) => {
        return function (this: Service, ...args: Array<any>) {
          const serviceState = this.serviceState
          const query = serviceState.queriesByName[name]
          return query.value
        }
      }
    )
  }

  static addReaction(proto: Object, name: string, pd: PropertyDescriptor) {
    const method = pd.value
    if (method == null) {
      throw new Error(
        `@reaction may only be specified for non-static non-getter/setter methods of an Entity, Entities, or Service class`
      )
    }
    const c: ReactionDecorator = {name, f: pd.value}
    ServiceDeclarations.forPrototype(proto).reactions.push(c)
    replaceFunction(
      proto,
      name,
      pd,
      (f: Function, name: string, type: FunctionType) => {
        return function (this: Service, ...args: Array<any>) {
          const serviceState = this.serviceState
          const reaction = serviceState.reactionsByName[name]
          return reaction.value
        }
      }
    )
  }

  static forPrototype(proto: Object): ServiceDeclarations {
    let ret: ServiceDeclarations | null = (proto as any)[
      SERVICE_DECLARATIONS_KEY
    ]
    if (ret == null) {
      ret = new ServiceDeclarations()
      addNonEnumerableProperty(proto, SERVICE_DECLARATIONS_KEY, ret)
    }
    return ret
  }

  static forClass(serviceClass: Function): ServiceDeclarations {
    // FIXME - go up the inheritance chain and collect and combine the
    // declarations, checking for collisions
    return ServiceDeclarations.forPrototype(serviceClass.prototype)
  }
}

export const SERVICE_DECLARATIONS_KEY = Symbol("SERVICE_DECLARATIONS_KEY")
