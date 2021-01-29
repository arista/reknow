import {QueryDecorator} from "./Types"

/** Stores the declarations, typically made with @ decorators,
 * specified in a Services class.  The declarations are associated
 * with the Service class's prototype, then gathered up when the
 * Service is added to the StateManager.
 */
export class ServiceDeclarations {
  queries: Array<QueryDecorator> = []

  static addQuery(proto: Object, c: QueryDecorator) {
    ServiceDeclarations.forPrototype(proto).queries.push(c)
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
