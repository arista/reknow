import {Relationship} from "./Relationship"
import {ReactionDecorator} from "./Types"
import {QueryDecorator} from "./Types"
import {AfterAddDecorator} from "./Types"
import {AfterRemoveDecorator} from "./Types"
import {AfterChangeDecorator} from "./Types"
import {AfterPropertyChangeDecorator} from "./Types"
import {replaceFunction} from "./Utils"
import {getSuperclass} from "./Utils"
import {Entity} from "./Entity"
import {FunctionType} from "./Types"
import {RelationshipDecorator} from "./Types"
import {HasManyDecorator} from "./Types"
import {HasOneDecorator} from "./Types"
import {BelongsToDecorator} from "./Types"
import {HasManyOptions} from "./Types"
import {HasOneOptions} from "./Types"
import {BelongsToOptions} from "./Types"
import {EntityClass} from "./Types"
import {REACTION_USAGE} from "./Decorators"
import {QUERY_USAGE} from "./Decorators"
import {AFTER_ADD_USAGE} from "./Decorators"
import {AFTER_REMOVE_USAGE} from "./Decorators"
import {AFTER_CHANGE_USAGE} from "./Decorators"
import {AFTER_PROPERTY_CHANGE_USAGE} from "./Decorators"

/** Stores the declarations, typically made with @ decorators,
 * specified in an Entity class.  The declarations are associated with
 * the Entity class's prototype, then gathered up when the Entities
 * class is added to the StateManager.
 */
export class EntityDeclarations {
  relationships: Array<RelationshipDecorator> = []
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
    this.addRelationship(proto, {
      type: "HasManyDecorator",
      name,
      foreignEntityFunc,
      foreignKey,
      options,
    })
  }

  static addHasOne<E extends Entity>(
    proto: Object,
    name: string,
    foreignEntityFunc: () => EntityClass<E>,
    foreignKey: string,
    options: HasOneOptions | null
  ) {
    this.addRelationship(proto, {
      type: "HasOneDecorator",
      name,
      foreignEntityFunc,
      foreignKey,
      options,
    })
  }

  static addBelongsTo<E extends Entity>(
    proto: Object,
    name: string,
    foreignEntityFunc: () => EntityClass<E>,
    primaryKey: string,
    options: BelongsToOptions | null
  ) {
    this.addRelationship(proto, {
      type: "BelongsToDecorator",
      name,
      foreignEntityFunc,
      primaryKey,
      options,
    })
  }

  static addRelationship(proto: Object, r: RelationshipDecorator) {
    EntityDeclarations.forPrototype(proto).relationships.push(r)
  }

  static addReaction(proto: Object, name: string, pd: PropertyDescriptor) {
    const method = this.getMethod(pd, REACTION_USAGE)
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
    const getter = this.getGetter(pd, QUERY_USAGE)
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
    const method = this.getMethod(pd, AFTER_ADD_USAGE)
    const c: AfterAddDecorator = {name, f: method}
    EntityDeclarations.forPrototype(proto).afterAdds.push(c)
  }

  static addAfterRemove(proto: Object, name: string, pd: PropertyDescriptor) {
    const method = this.getMethod(pd, AFTER_REMOVE_USAGE)
    const c: AfterRemoveDecorator = {name, f: method}
    EntityDeclarations.forPrototype(proto).afterRemoves.push(c)
  }

  static addAfterChange(proto: Object, name: string, pd: PropertyDescriptor) {
    const method = this.getMethod(pd, AFTER_CHANGE_USAGE)
    const c: AfterChangeDecorator = {name, f: method}
    EntityDeclarations.forPrototype(proto).afterChanges.push(c)
  }

  static getMethod(pd: PropertyDescriptor, message: string) {
    const method = pd.value
    if (method == null) {
      throw new Error(message)
    }
    return method
  }

  static getGetter(pd: PropertyDescriptor, message: string) {
    const getter = pd.get
    if (getter == null) {
      throw new Error(message)
    }
    return getter
  }

  static addAfterPropertyChange(
    proto: Object,
    name: string,
    property: string,
    pd: PropertyDescriptor
  ) {
    const method = pd.value
    if (method == null) {
      throw new Error(AFTER_PROPERTY_CHANGE_USAGE)
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

  static combineDeclarations(d1:EntityDeclarations, d2:EntityDeclarations, className:string):EntityDeclarations {
    const ret = new EntityDeclarations()

    // Just combine these - it doesn't matter if they have the same
    // name in both classes
    ret.relationships.push(...d1.relationships, ...d2.relationships)
    ret.queries.push(...d1.queries, ...d2.queries)
    ret.reactions.push(...d1.reactions, ...d2.reactions)
    ret.afterAdds.push(...d1.afterAdds, ...d2.afterAdds)
    ret.afterRemoves.push(...d1.afterRemoves, ...d2.afterRemoves)
    ret.afterChanges.push(...d1.afterChanges, ...d2.afterChanges)
    for(const p in d1.afterPropertyChanges) {
      if (!ret.afterPropertyChanges[p]) {
        ret.afterPropertyChanges[p] = []
      }
      ret.afterPropertyChanges[p].push(...d1.afterPropertyChanges[p])
    }
    for(const p in d2.afterPropertyChanges) {
      if (!ret.afterPropertyChanges[p]) {
        ret.afterPropertyChanges[p] = []
      }
      ret.afterPropertyChanges[p].push(...d2.afterPropertyChanges[p])
    }

    // The id property cannot have conflicting declarations
    if (d1.idPropertyName && d2.idPropertyName && d1.idPropertyName !== d2.idPropertyName) {
      throw new Error(`Class ${className} declares @id property ${d2.idPropertyName}, which conflict with @id property declaration ${d1.idPropertyName} in a superclass`)
    }
    ret.idPropertyName = d1.idPropertyName || d2.idPropertyName
    
    return ret
  }

  static forPrototype(proto: Object): EntityDeclarations {
    let ret = entityDeclarationsByClassProto.get(proto)
    if (ret == null) {
      ret = new EntityDeclarations()
      entityDeclarationsByClassProto.set(proto, ret)
    }
    return ret
  }

  static forClass(entityClass: Function): EntityDeclarations {
    let ret = entityDeclarationsByClass.get(entityClass)
    if (ret == null) {
      // Go up the inheritance chain and collect and combine the
      // declarations, checking for collisions
      const sclazz = getSuperclass(entityClass)
      const d1 = (sclazz == null) ? new EntityDeclarations() : this.forClass(sclazz)
      const d2 = EntityDeclarations.forPrototype(entityClass.prototype)
      ret = this.combineDeclarations(d1, d2, entityClass.name)

      // Cache the result
      entityDeclarationsByClass.set(entityClass, ret)
    }
    return ret
  }
}

const entityDeclarationsByClassProto = new WeakMap<Object,EntityDeclarations>()
const entityDeclarationsByClass = new WeakMap<Function,EntityDeclarations>()
