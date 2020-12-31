import {HasMany} from "./HasMany"
import {Entity} from "./Entity"
import {toInt} from "./Utils"

export class HasManyInstance implements ProxyHandler<Array<Entity>> {
  target: Array<Entity>
  proxy: Array<Entity>

  constructor(
    public hasMany: HasMany,
    public entity: Entity,
    target: Array<Entity> | null | undefined
  ) {
    this.target = target || []
    this.proxy = new Proxy<Array<Entity>>(this.target, this)
  }

  matchesTarget(val: Array<Entity> | null | undefined) {
    return val === this.target || (val == null && this.target.length === 0)
  }

  set(target: Object, prop: PropertyKey, value: any, receiver: Object) {
    const ix = toInt(prop)
    if (ix == null) {
      // Ignore attempts to set the length
      if (prop === "length") {
        return true
      } else {
        return Reflect.set(target, prop, value, receiver)
      }
    }

    const current = this.target[ix]
    if (current instanceof Entity) {
      this.hasMany.remove(current)
    }

    // FIXME - add the value if it's not already an Entity
    if (value != null) {
      this.hasMany.add(this.entity, value)
    }

    return true
  }

  deleteProperty(target: Object, prop: PropertyKey) {
    const ix = toInt(prop)
    if (ix == null) {
      return Reflect.deleteProperty(target, prop)
    }

    const current = this.target[ix]
    if (current instanceof Entity) {
      this.hasMany.remove(current)
    }
    return true
  }
}
