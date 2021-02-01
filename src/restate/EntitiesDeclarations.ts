import {IndexDecorator} from "./Types"
import {QueryDecorator} from "./Types"
import {ReactionDecorator} from "./Types"

/** Stores the declarations, typically made with @ decorators,
 * specified in an Entities class.  The declarations are associated
 * with the Entities class's prototype, then gathered up when the
 * Entities class is added to the StateManager.
 */
export class EntitiesDeclarations {
  indexDecorators: Array<IndexDecorator> = []
  queries: Array<QueryDecorator> = []
  reactions: Array<ReactionDecorator> = []

  static addIndexDecorator(proto: Object, d: IndexDecorator) {
    EntitiesDeclarations.forPrototype(proto).indexDecorators.push(d)
  }

  static addQuery(proto: Object, c: QueryDecorator) {
    EntitiesDeclarations.forPrototype(proto).queries.push(c)
  }

  static addReaction(proto: Object, c: ReactionDecorator) {
    EntitiesDeclarations.forPrototype(proto).reactions.push(c)
  }

  static forPrototype(proto: Object): EntitiesDeclarations {
    let ret: EntitiesDeclarations | null = (proto as any)[
      ENTITIES_DECLARATIONS_KEY
    ]
    if (ret == null) {
      ret = new EntitiesDeclarations()
      ;(proto as any)[ENTITIES_DECLARATIONS_KEY] = ret
    }
    return ret
  }

  static forClass(entitiesClass: Function): EntitiesDeclarations {
    // FIXME - go up the inheritance chain and collect and combine the
    // declarations, checking for collisions
    return EntitiesDeclarations.forPrototype(entitiesClass.prototype)
  }
}

export const ENTITIES_DECLARATIONS_KEY = Symbol("ENTITIES_DECLARATIONS_KEY")
