import {Query} from "./Query"

/**
 * Manages Queries that have been invalidated, that need to be
 * notified.  Notifying a Query could result in Queries being
 * re-evaluated (as in the case of Reactions), so circular references
 * also need to be detected.
 **/
export class PendingQueryNotifications {
  queue: Array<Query<any>> = []
  queued = new Set<Query<any>>()
  notified = new Set<Query<any>>()
  notifiedList: Array<Query<any>> = []

  add(query: Query<any>) {
    if (!this.queued.has(query)) {
      this.queue.push(query)
      this.queued.add(query)
    }
  }

  notify() {
    if (this.queue.length > 0) {
      this.queued = new Set<Query<any>>()

      for (let i = 0; i < this.queue.length; i++) {
        const query = this.queue[i]
        // Detect circular references
        if (this.notified.has(query)) {
          const l = this.notifiedList.map((q) => q.name).join(", ")
          throw new Error(
            `Circular dependency detected while executing these queries: ${l}`
          )
        }

        this.notified.add(query)
        this.notifiedList.push(query)
        if (query.onInvalidate) {
          query.onInvalidate()
        }
      }
      this.queue = []
      this.notified = new Set<Query<any>>()
      this.notifiedList = []
    }
  }
}
