import {IndexDecorator} from "./Types"
import {QueryDecorator} from "./Types"
import {ReactionDecorator} from "./Types"
import {replaceFunction} from "./Utils"
import {FunctionType} from "./Types"
import {Entities} from "./Entities"

/** Stores the declarations, typically made with @ decorators,
 * specified in an Entities class.  The declarations are associated
 * with the Entities class's prototype, then gathered up when the
 * Entities class is added to the StateManager.
 */
export class EntitiesDeclarations {
  indexDecorators: Array<IndexDecorator> = []
  queries: Array<QueryDecorator> = []
  reactions: Array<ReactionDecorator> = []

  static addAction(proto: Object, name: string, pd: PropertyDescriptor) {
    replaceFunction(
      proto,
      name,
      pd,
      (f: Function, name: string, type: FunctionType) => {
        return function (this: Entities<any>, ...args: Array<any>) {
          return this.entitiesState.applyAction(name, type, f, args)
        }
      }
    )
  }

  static addIndexDecorator(proto: Object, d: IndexDecorator) {
    EntitiesDeclarations.forPrototype(proto).indexDecorators.push(d)
  }

  static addQuery(proto: Object, name: string, pd:PropertyDescriptor) {
    const getter = pd.get
    if (getter == null) {
      throw new Error(
        `@query may only be specified for non-static getters of an Entity, Entities, or Service class`
      )
    }
    const c: QueryDecorator = {name, f: getter}
    replaceFunction(
      proto,
      name,
      pd,
      (f: Function, name: string, type: FunctionType) => {
        return function (this: Entities<any>, ...args: Array<any>) {
          const entitiesState = this.entitiesState
          const query = entitiesState.queriesByName[name]
          return query.value
        }
      }
    )

    EntitiesDeclarations.forPrototype(proto).queries.push(c)
  }

  static addReaction(proto: Object, name: string, pd: PropertyDescriptor) {
    const method = pd.value
    if (method == null) {
      throw new Error(
        `@reaction may only be specified for non-static non-getter/setter methods of an Entity, Entities, or Service class`
      )
    }
    const c: ReactionDecorator = {name, f: pd.value}
    EntitiesDeclarations.forPrototype(proto).reactions.push(c)
    replaceFunction(
      proto,
      name,
      pd,
      (f: Function, name: string, type: FunctionType) => {
        return function (this: Entities<any>, ...args: Array<any>) {
          const entitiesState = this.entitiesState
          const reaction = entitiesState.reactionsByName[name]
          return reaction.value
        }
      }
    )
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
