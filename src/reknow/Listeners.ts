import {Listener} from "./Types"

export class Listeners<E> {
  listeners: Array<Listener<E>> = []

  add(l: Listener<E>) {
    this.listeners.push(l)
  }

  remove(l: Listener<E>) {
    const ix = this.listeners.indexOf(l)
    if (ix >= 0) {
      this.listeners.splice(ix, 1)
    }
  }

  notify(e: E) {
    // Make a copy of the listeners in case the list is modified by
    // the listener callbacks
    const listeners = this.listeners.slice()
    for (const l of listeners) {
      l(e)
    }
  }
}
