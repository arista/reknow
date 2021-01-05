import {FunctionType} from "./Types"
import {replaceFunction} from "./Utils"
import {Manageable} from "./Manageable"
import {toMemberName} from "./Utils"
import {Entity} from "./Entity"
import {EntityDeclarations} from "./EntityDeclarations"
import {EntitiesDeclarations} from "./EntitiesDeclarations"
import {HasMany} from "./HasMany"
import {HasOne} from "./HasOne"
import {BelongsTo} from "./BelongsTo"
import {selectorize} from "./Utils"
import {indexTermsToSchema} from "./Utils"
import {uniqueIndexTermsToSchema} from "./Utils"
import {HasManyOptions} from "./Types"
import {HasOneOptions} from "./Types"
import {BelongsToOptions} from "./Types"
import {EntityClass} from "./Types"

export function action(target: any, name: string, pd: PropertyDescriptor) {
  // FIXME - error if not declared on an Entity, Entities, or Selector class
  replaceFunction(
    target,
    name,
    pd,
    (f: Function, name: string, type: FunctionType) => {
      return function (this: Manageable, ...args: Array<any>) {
        const managedState = this.managedState
        if (this.managedState == null) {
          throw new Error(
            `@action has been used on a class that doesn't extend Entity, Entities, or Service, or has not been added to a StateManager`
          )
        }
        const actionName = toMemberName(name, type)
        const action = managedState.toAction(actionName, args)
        const self = this
        return managedState.stateManager.whileInAction(action, () => {
          return f.apply(self, args)
        })
      }
    }
  )
}

export function selector(target: any, name: string, pd: PropertyDescriptor) {
  // FIXME - error if not declared on an Entity, Entities, or Selector class
  replaceFunction(target, name, pd, selectorize)
}

export function hasMany<E extends Entity>(
  foreignEntityFunc: () => EntityClass<E>,
  foreignKey: string,
  options: HasManyOptions | null = null
) {
  // FIXME - error if not declared on an Entity class
  return function (target: any, name: string) {
    const r = new HasMany(name, foreignEntityFunc, foreignKey, options)
    EntityDeclarations.addRelationship(target, r)
  }
}

export function hasOne<E extends Entity>(
  foreignEntityFunc: () => EntityClass<E>,
  foreignKey: string,
  options: HasOneOptions | null = null
) {
  // FIXME - error if not declared on an Entity class
  return function (target: any, name: string) {
    const r = new HasOne(name, foreignEntityFunc, foreignKey, options)
    EntityDeclarations.addRelationship(target, r)
  }
}

export function belongsTo<E extends Entity>(
  foreignEntityFunc: () => EntityClass<E>,
  primaryKey: string,
  options: BelongsToOptions | null = null
) {
  // FIXME - error if not declared on an Entity class
  return function (target: any, name: string) {
    const r = new BelongsTo(name, foreignEntityFunc, primaryKey, options)
    EntityDeclarations.addRelationship(target, r)
  }
}

export function id(target: any, name: string) {
  // FIXME - error if not declared on an Entity class
  EntityDeclarations.setIdPropertyName(target, name)
}

export function index(...terms: Array<string>) {
  // FIXME - error if not declared on an Entities
  return function (target: any, name: string) {
    const schema = indexTermsToSchema(terms)
    EntitiesDeclarations.addIndexDecorator(target, {name, schema})
  }
}

export function uniqueIndex(...terms: Array<string>) {
  // FIXME - error if not declared on an Entity class
  return function (target: any, name: string) {
    const schema = uniqueIndexTermsToSchema(terms)
    EntitiesDeclarations.addIndexDecorator(target, {name, schema})
  }
}

export function reaction(target: any, name: string, pd: PropertyDescriptor) {
  // FIXME - should this also be implemented for Entities and Service
  // classes?  Or should it detect and throw an error?
  if (typeof target === "object" && typeof pd.value === "function") {
    EntityDeclarations.addReaction(target, {name, f: pd.value})
  } else {
    throw new Error(
      `@reaction may only be specified for non-static functions that are not getters or setters`
    )
  }
}

export function afterAdd(target: any, name: string, pd: PropertyDescriptor) {
  if (typeof target === "object" && typeof pd.value === "function") {
    EntityDeclarations.addAfterAdd(target, {name, f: pd.value})
  } else {
    throw new Error(
      `@afterAdd may only be specified for non-static functions that are not getters or setters`
    )
  }
}

export function afterRemove(target: any, name: string, pd: PropertyDescriptor) {
  if (typeof target === "object" && typeof pd.value === "function") {
    EntityDeclarations.addAfterRemove(target, {name, f: pd.value})
  } else {
    throw new Error(
      `@afterRemove may only be specified for non-static functions that are not getters or setters`
    )
  }
}

export function afterChange(target: any, name: string, pd: PropertyDescriptor) {
  addAfterChange(target, name, pd, null)
}

export function afterPropertyChange(property: string) {
  return (target: any, name: string, pd: PropertyDescriptor) => {
    addAfterChange(target, name, pd, property)
  }
}

function addAfterChange(
  target: any,
  name: string,
  pd: PropertyDescriptor,
  property: string | null
) {
  if (typeof target === "object" && typeof pd.value === "function") {
    if (property != null) {
      EntityDeclarations.addAfterPropertyChange(target, {
        name,
        property,
        f: pd.value,
      })
    } else {
      EntityDeclarations.addAfterChange(target, {name, f: pd.value})
    }
  } else {
    throw new Error(
      `@afterChange may only be specified for non-static functions that are not getters or setters`
    )
  }
}
