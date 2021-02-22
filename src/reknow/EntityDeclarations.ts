import {Relationship} from "./Relationship"
import {ReactionDecorator} from "./Types"
import {QueryDecorator} from "./Types"
import {AfterAddDecorator} from "./Types"
import {AfterRemoveDecorator} from "./Types"
import {AfterChangeDecorator} from "./Types"
import {AfterPropertyChangeDecorator} from "./Types"
import {replaceFunction} from "./Utils"
import {Entity} from "./Entity"
import {FunctionType} from "./Types"
import {HasMany} from "./HasMany"
import {HasOne} from "./HasOne"
import {BelongsTo} from "./BelongsTo"
import {HasManyOptions} from "./Types"
import {HasOneOptions} from "./Types"
import {BelongsToOptions} from "./Types"
import {EntityClass} from "./Types"

/** Stores the declarations, typically made with @ decorators,
 * specified in an Entity class.  The declarations are associated with
 * the Entity class's prototype, then gathered up when the Entities
 * class is added to the StateManager.
 */
export class EntityDeclarations {
  relationships: Array<Relationship> = []
  reactions: Array<ReactionDecorator> = []
  queries: Array<QueryDecorator> = []
  afterAdds: Array<AfterAddDecorator> = []
  afterRemoves: Array<AfterRemoveDecorator> = []
  afterChanges: Array<AfterChangeDecorator> = []
  afterPropertyChanges: {
    [property: string]: Array<AfterPropertyChangeDecorator>
  } = {}
  idPropertyName: string | null = null

  static addAction(proto: Object, name: string, pd: PropertyDescriptor) {
    replaceFunction(
      proto,
      name,
      pd,
      (f: Function, name: string, type: FunctionType) => {
        return function (this: Entity, ...args: Array<any>) {
          return this.entityState.applyAction(name, type, f, args)
        }
      }
    )
  }

  static addHasMany<E extends Entity>(
    proto: Object,
    name: string,
    foreignEntityFunc: () => EntityClass<E>,
    foreignKey: string,
    options: HasManyOptions | null
  ) {
    const r = new HasMany(name, foreignEntityFunc, foreignKey, options)
    this.addRelationship(proto, r)
  }

  static addHasOne<E extends Entity>(
    proto: Object,
    name: string,
    foreignEntityFunc: () => EntityClass<E>,
    foreignKey: string,
    options: HasOneOptions | null
  ) {
    const r = new HasOne(name, foreignEntityFunc, foreignKey, options)
    this.addRelationship(proto, r)
  }

  static addBelongsTo<E extends Entity>(
    proto: Object,
    name: string,
    foreignEntityFunc: () => EntityClass<E>,
    primaryKey: string,
    options: BelongsToOptions | null
  ) {
    const r = new BelongsTo(name, foreignEntityFunc, primaryKey, options)
    this.addRelationship(proto, r)
  }

  static addRelationship(proto: Object, r: Relationship) {
    EntityDeclarations.forPrototype(proto).relationships.push(r)
  }

  static addReaction(proto: Object, name: string, pd: PropertyDescriptor) {
    const method = pd.value
    if (method == null) {
      throw new Error(
        `@reaction may only be specified for non-static non-getter/setter methods of an Entity, Entities, or Service class`
      )
    }
    const c: ReactionDecorator = {name, f: pd.value}
    EntityDeclarations.forPrototype(proto).reactions.push(c)
    replaceFunction(
      proto,
      name,
      pd,
      (f: Function, name: string, type: FunctionType) => {
        return function (this: Entity, ...args: Array<any>) {
          const entityState = this.entityState
          const reaction = entityState.reactionsByName[name]
          return reaction.value
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
    replaceFunction(
      proto,
      name,
      pd,
      (f: Function, name: string, type: FunctionType) => {
        return function (this: Entity, ...args: Array<any>) {
          const entityState = this.entityState
          const query = entityState.queriesByName[name]
          return query.value
        }
      }
    )

    EntityDeclarations.forPrototype(proto).queries.push(c)
  }

  static addAfterAdd(proto: Object, name: string, pd: PropertyDescriptor) {
    const method = pd.value
    if (method == null) {
      throw new Error(
        `@afterAdd may only be specified for non-static functions that are not getters or setters`
      )
    }
    const c: AfterAddDecorator = {name, f: method}
    EntityDeclarations.forPrototype(proto).afterAdds.push(c)
  }

  static addAfterRemove(proto: Object, name: string, pd: PropertyDescriptor) {
    const method = pd.value
    if (method == null) {
      throw new Error(
        `@afterRemove may only be specified for non-static functions that are not getters or setters`
      )
    }
    const c: AfterRemoveDecorator = {name, f: method}
    EntityDeclarations.forPrototype(proto).afterRemoves.push(c)
  }

  static addAfterChange(proto: Object, name: string, pd: PropertyDescriptor) {
    const method = pd.value
    if (method == null) {
      throw new Error(
        `@afterChange may only be specified for non-static functions that are not getters or setters`
      )
    }
    const c: AfterChangeDecorator = {name, f: method}
    EntityDeclarations.forPrototype(proto).afterChanges.push(c)
  }

  static addAfterPropertyChange(
    proto: Object,
    name: string,
    property: string,
    pd: PropertyDescriptor
  ) {
    const method = pd.value
    if (method == null) {
      throw new Error(
        `@afterRemove may only be specified for non-static functions that are not getters or setters`
      )
    }
    const c: AfterPropertyChangeDecorator = {name, property, f: method}
    const apcs = EntityDeclarations.forPrototype(proto).afterPropertyChanges
    let a = apcs[c.property]
    if (a == null) {
      a = []
      apcs[c.property] = a
    }
    a.push(c)
  }

  static setIdPropertyName(proto: Object, name: string) {
    const ed = EntityDeclarations.forPrototype(proto)
    if (ed.idPropertyName != null) {
      throw new Error(
        `@id may not be declared for multiple properties ("${name}" and "${ed.idPropertyName}")`
      )
    }
    ed.idPropertyName = name
  }

  static forPrototype(proto: Object): EntityDeclarations {
    let ret: EntityDeclarations | null = (proto as any)[ENTITY_DECLARATIONS_KEY]
    if (ret == null) {
      ret = new EntityDeclarations()
      ;(proto as any)[ENTITY_DECLARATIONS_KEY] = ret
    }
    return ret
  }

  static forClass(entityClass: Function): EntityDeclarations {
    // FIXME - go up the inheritance chain and collect and combine the
    // declarations, checking for collisions
    return EntityDeclarations.forPrototype(entityClass.prototype)
  }
}

export const ENTITY_DECLARATIONS_KEY = Symbol("ENTTITY_DECLARATIONS_KEY")
