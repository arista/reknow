import {QueryDecorator} from "./Types"
import {ReactionDecorator} from "./Types"
import {replaceFunction} from "./Utils"
import {Service} from "./Service"
import {FunctionType} from "./Types"

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

  static addQuery(proto: Object, c: QueryDecorator) {
    ServiceDeclarations.forPrototype(proto).queries.push(c)
  }

  static addReaction(proto: Object, c: ReactionDecorator) {
    ServiceDeclarations.forPrototype(proto).reactions.push(c)
  }

  static forPrototype(proto: Object): ServiceDeclarations {
    let ret: ServiceDeclarations | null = (proto as any)[
      SERVICE_DECLARATIONS_KEY
    ]
    if (ret == null) {
      ret = new ServiceDeclarations()
      ;(proto as any)[SERVICE_DECLARATIONS_KEY] = ret
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
