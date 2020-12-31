import {StateManager} from "./StateManager"

/** Superclass for objects that expose their state to the application
 * through a Proxy.  A change to the state of the object is
 * represented by creating a new Proxy, so that the object's
 * "identity" appears to change, even if the underlying object itself
 * remains the same. */

export abstract class Proxied<P extends Object, T extends Object>
  implements ProxyHandler<P> {
  _proxy: P | null = null

  _stateManager: StateManager

  constructor(public target: T, stateManager: StateManager) {
    // We set this so it doesn't conflict with "stateManager"
    // defined in subclasses
    this._stateManager = stateManager
  }

  /** Called when the object's state has changed, forcing a new proxy
   * instance to be returned the next time it is accessed. */
  invalidateProxy() {
    this._proxy = null
  }

  /** Returns the proxy, whose object identity should change whenever
   * stateChanged is called. */
  get proxy() {
    if (this._proxy == null) {
      this._proxy = new Proxy(this.target, this) as P
    }
    const ret = this._proxy
    this.proxyAccessed()
    return ret
  }

  static getTarget<T extends Object>(proxy: T): T {
    return (proxy as any)[TARGET]
  }

  static getProxied<
    P extends Object,
    T extends Object,
    R extends Proxied<P, T>
  >(proxy: T): R {
    return (proxy as any)[PROXIED]
  }

  // Subclasses can override these to intercept get/set/delete calls

  proxyAccessed() {}

  propertyGet(prop: string) {
    return Reflect.get(this.target, prop, this.target)
  }

  propertyDescriptorGet(prop: string) {
    return Reflect.getOwnPropertyDescriptor(this.target, prop)
  }

  propertyHas(prop: string) {
    return Reflect.has(this.target, prop)
  }

  getOwnKeys() {
    return Reflect.ownKeys(this.target)
  }

  propertySet(prop: string, value: any) {
    return Reflect.set(this.target, prop, value, this.target)
  }

  propertyDelete(prop: string) {
    return Reflect.deleteProperty(this.target, prop)
  }

  //--------------------------------------------------
  // ProxyHandler methods

  get(target: Object, prop: PropertyKey, receiver: Object) {
    if (prop === TARGET) {
      return target
    } else if (prop === PROXIED) {
      return this
    } else if (typeof prop === "string") {
      return this.propertyGet(prop)
    } else {
      return Reflect.get(target, prop, receiver)
    }
  }

  set(target: Object, prop: PropertyKey, value: any, receiver: Object) {
    if (typeof prop === "string") {
      return this.propertySet(prop, value)
    } else {
      return Reflect.set(target, prop, value, receiver)
    }
  }

  deleteProperty(target: Object, prop: PropertyKey) {
    if (typeof prop === "string") {
      return this.propertyDelete(prop)
    } else {
      return Reflect.deleteProperty(target, prop)
    }
  }

  setPrototypeOf(target: Object, prototype: any): boolean {
    throw new Error(`Illegal operation: setPrototypeOf`)
  }

  getOwnPropertyDescriptor(target: Object, prop: PropertyKey) {
    if (typeof prop === "string") {
      return this.propertyDescriptorGet(prop)
    }
    return Reflect.getOwnPropertyDescriptor(this.target, prop)
  }

  defineProperty(
    target: Object,
    prop: PropertyKey,
    descriptor: PropertyDescriptor
  ): boolean {
    // FIXME - maybe someday we can figure out how to allow this?  For
    // now, maybe it's not an important use case
    throw new Error(`Illegal operation: defineProperty`)
  }

  has(target: Object, prop: PropertyKey) {
    if (typeof prop === "string") {
      return this.propertyHas(prop)
    }
    return Reflect.has(this.target, prop)
  }

  ownKeys(target: Object) {
    return this.getOwnKeys()
  }

  //--------------------------------------------------
  // These methods are just ProxyHandler passthroughs

  getPrototypeOf(target: Object) {
    return Reflect.getPrototypeOf(this.target)
  }

  isExtensible(target: Object) {
    return Reflect.isExtensible(this.target)
  }

  preventExtensions(target: Object) {
    return Reflect.preventExtensions(this.target)
  }

  apply(target: Object, thisArg: any, argumentsList: Array<any>) {
    return Reflect.apply(
      (this.target as unknown) as Function,
      thisArg,
      argumentsList
    )
  }

  construct(target: Object, argumentsList: Array<any>) {
    return Reflect.construct(
      (this.target as unknown) as Function,
      argumentsList
    )
  }
}

const TARGET = Symbol("TARGET")
const PROXIED = Symbol("PROXIED")
