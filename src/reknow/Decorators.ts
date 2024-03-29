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

export const ACTION_USAGE =
  "@action may only be specified for non-static setters or methods of an Entity, Entities, or Service class"
export const REACTION_USAGE =
  "@reaction may only be specified for non-static non-getter/setter methods of an Entity, Entities, or Service class"
export const QUERY_USAGE =
  "@query may only be specified for non-static getters of an Entity, Entities, or Service class"
export const AFTER_ADD_USAGE =
  "@afterAdd may only be specified for non-static non-getter/setter methods of an Entity"
export const AFTER_REMOVE_USAGE =
  "@afterRemove may only be specified for non-static non-getter/setter methods of an Entity"
export const AFTER_CHANGE_USAGE =
  "@afterChange may only be specified for non-static non-getter/setter methods of an Entity"
export const AFTER_PROPERTY_CHANGE_USAGE =
  "@afterPropertyChange may only be specified for non-static non-getter/setter methods of an Entity"

export function action(target: any, name: string, pd: PropertyDescriptor) {
  if (
    typeof target === "object" &&
    (typeof pd.value === "function" || typeof pd.set === "function")
  ) {
    if (target instanceof Entity) {
      EntityDeclarations.addAction(target, name, pd)
    } else if (target instanceof Entities) {
      EntitiesDeclarations.addAction(target, name, pd)
    } else if (target instanceof Service) {
      ServiceDeclarations.addAction(target, name, pd)
    } else {
      throw new Error(ACTION_USAGE)
    }
  } else {
    throw new Error(ACTION_USAGE)
  }
}

export function hasMany<E extends Entity>(
  foreignEntityFunc: () => EntityClass<E>,
  foreignKey: string,
  options: HasManyOptions | null = null
) {
  // FIXME - error if not declared on an Entity class
  return function (target: any, name: string) {
    EntityDeclarations.addHasMany(
      target,
      name,
      foreignEntityFunc,
      foreignKey,
      options
    )
  }
}

export function hasOne<E extends Entity>(
  foreignEntityFunc: () => EntityClass<E>,
  foreignKey: string,
  options: HasOneOptions | null = null
) {
  // FIXME - error if not declared on an Entity class
  return function (target: any, name: string) {
    EntityDeclarations.addHasOne(
      target,
      name,
      foreignEntityFunc,
      foreignKey,
      options
    )
  }
}

export function belongsTo<E extends Entity>(
  foreignEntityFunc: () => EntityClass<E>,
  primaryKey: string,
  options: BelongsToOptions | null = null
) {
  // FIXME - error if not declared on an Entity class
  return function (target: any, name: string) {
    EntityDeclarations.addBelongsTo(
      target,
      name,
      foreignEntityFunc,
      primaryKey,
      options
    )
  }
}

export function id(target: any, name: string) {
  // FIXME - error if not declared on an Entity class
  EntityDeclarations.setIdPropertyName(target, name)
}

export function index(...terms: Array<string>) {
  // FIXME - error if not declared on an Entities
  return function (target: any, name: string) {
    EntitiesDeclarations.addIndexDecorator(target, name, terms)
  }
}

export function uniqueIndex(...terms: Array<string>) {
  // FIXME - error if not declared on an Entity class
  return function (target: any, name: string) {
    EntitiesDeclarations.addUniqueIndexDecorator(target, name, terms)
  }
}

export function reaction(target: any, name: string, pd: PropertyDescriptor) {
  if (typeof target === "object" && typeof pd.value === "function") {
    if (target instanceof Entity) {
      EntityDeclarations.addReaction(target, name, pd)
    } else if (target instanceof Entities) {
      EntitiesDeclarations.addReaction(target, name, pd)
    } else if (target instanceof Service) {
      ServiceDeclarations.addReaction(target, name, pd)
    } else {
      throw new Error(REACTION_USAGE)
    }
  } else {
    throw new Error(REACTION_USAGE)
  }
}

export function query(target: any, name: string, pd: PropertyDescriptor) {
  if (typeof target === "object" && typeof pd.get === "function") {
    if (target instanceof Entity) {
      EntityDeclarations.addQuery(target, name, pd)
    } else if (target instanceof Entities) {
      EntitiesDeclarations.addQuery(target, name, pd)
    } else if (target instanceof Service) {
      ServiceDeclarations.addQuery(target, name, pd)
    } else {
      throw new Error(QUERY_USAGE)
    }
  } else {
    throw new Error(QUERY_USAGE)
  }
}

export function afterAdd(target: any, name: string, pd: PropertyDescriptor) {
  // FIXME - only allow on Entity classes
  EntityDeclarations.addAfterAdd(target, name, pd)
}

export function afterRemove(target: any, name: string, pd: PropertyDescriptor) {
  // FIXME - only allow on Entity classes
  EntityDeclarations.addAfterRemove(target, name, pd)
}

export function afterChange(target: any, name: string, pd: PropertyDescriptor) {
  // FIXME - only allow on Entity classes
  EntityDeclarations.addAfterChange(target, name, pd)
}

export function afterPropertyChange(property: string) {
  // FIXME - only allow on Entity classes
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
      EntityDeclarations.addAfterPropertyChange(target, name, property, pd)
    } else {
      EntityDeclarations.addAfterChange(target, name, pd)
    }
  } else {
    throw new Error(AFTER_CHANGE_USAGE)
  }
}
