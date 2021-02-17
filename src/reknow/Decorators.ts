import {FunctionType} from "./Types"
import {replaceFunction} from "./Utils"
import {toMemberName} from "./Utils"
import {Entity} from "./Entity"
import {EntityDeclarations} from "./EntityDeclarations"
import {EntitiesDeclarations} from "./EntitiesDeclarations"
import {ServiceDeclarations} from "./ServiceDeclarations"
import {HasMany} from "./HasMany"
import {HasOne} from "./HasOne"
import {BelongsTo} from "./BelongsTo"
import {indexTermsToSchema} from "./Utils"
import {uniqueIndexTermsToSchema} from "./Utils"
import {HasManyOptions} from "./Types"
import {HasOneOptions} from "./Types"
import {BelongsToOptions} from "./Types"
import {EntityClass} from "./Types"
import {Entities} from "./Entities"
import {Service} from "./Service"

export function action(target: any, name: string, pd: PropertyDescriptor) {
  if (typeof target === "object" && (typeof pd.value === "function" || typeof pd.set === "function")) {
    if (target instanceof Entity) {
      replaceFunction(
        target,
        name,
        pd,
        (f: Function, name: string, type: FunctionType) => {
          return function (this: Entity, ...args: Array<any>) {
            return this.entityState.applyAction(name, type, f, args)
          }
        }
      )
    } else if (target instanceof Entities) {
      replaceFunction(
        target,
        name,
        pd,
        (f: Function, name: string, type: FunctionType) => {
          return function (this: Entities<any>, ...args: Array<any>) {
            return this.entitiesState.applyAction(name, type, f, args)
          }
        }
      )
    } else if (target instanceof Service) {
      replaceFunction(
        target,
        name,
        pd,
        (f: Function, name: string, type: FunctionType) => {
          return function (this: Service, ...args: Array<any>) {
            return this.serviceState.applyAction(name, type, f, args)
          }
        }
      )
    } else {
      throw new Error(
        `@action may only be specified for non-static setters or methods of an Entity, Entities, or Service class`
      )
    }
  } else {
    throw new Error(
      `@action may only be specified for non-static setters or methods of an Entity, Entities, or Service class`
    )
  }
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
  if (typeof target === "object" && typeof pd.value === "function") {
    if (target instanceof Entity) {
      EntityDeclarations.addReaction(target, {name, f: pd.value})
      replaceFunction(
        target,
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
    } else if (target instanceof Entities) {
      EntitiesDeclarations.addReaction(target, {name, f: pd.value})
      replaceFunction(
        target,
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
    } else if (target instanceof Service) {
      ServiceDeclarations.addReaction(target, {name, f: pd.value})
      replaceFunction(
        target,
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
    } else {
      throw new Error(
        `@reaction may only be specified for non-static non-getter/setter methods of an Entity, Entities, or Service class`
      )
    }
  } else {
    throw new Error(
      `@reaction may only be specified for non-static non-getter/setter methods of an Entity, Entities, or Service class`
    )
  }
}

export function query(target: any, name: string, pd: PropertyDescriptor) {
  if (typeof target === "object" && typeof pd.get === "function") {
    if (target instanceof Entity) {
      EntityDeclarations.addQuery(target, {name, f: pd.get})
      replaceFunction(
        target,
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
    } else if (target instanceof Entities) {
      EntitiesDeclarations.addQuery(target, {name, f: pd.get})
      replaceFunction(
        target,
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
    } else if (target instanceof Service) {
      ServiceDeclarations.addQuery(target, {name, f: pd.get})
      replaceFunction(
        target,
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
    } else {
      throw new Error(
        `@query may only be specified for non-static getters of an Entity, Entities, or Service class`
      )
    }
  } else {
    throw new Error(
      `@query may only be specified for non-static getters of an Entity, Entities, or Service class`
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
