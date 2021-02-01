import {Query} from "./Query"

const MAX_INVALIDATE_CALL_COUNT = 20

/**
 * Manages Queries that have been invalidated, that need to be
 * notified.  Notifying a Query could result in Queries being
 * re-evaluated (as in the case of Reactions), so circular references
 * also need to be detected.
 **/
export class PendingQueryNotifications {
  queue: Array<Query<any>> = []

  add(query: Query<any>) {
    this.queue.push(query)
  }

  notify() {
    if (this.queue.length > 0) {
      // Keep track of Queries on which onInvalidate was called at
      // least once, so we can go back and clear them all at the end
      const onInvalidateCalled:Array<Query<any>> = []
      try {
        for (let i = 0; i < this.queue.length; i++) {
          const query = this.queue[i]

          query.isQueuedToCallOnInvalidate = false
          if (!query.wasOnInvalidateCalled) {
            query.wasOnInvalidateCalled = true
            onInvalidateCalled.push(query)
          }
          query.onInvalidateCallCount++

          // If a Query's onInvalidate() has been called too many
          // times, assume there's a circular dependency.  Note that
          // this only a best guess - without actually analyzing the
          // code, detecting a circular reference is equivalent to the
          // halting problem.  There are legitimate cases where a
          // Query's onInvalidate might be called mutliple times at
          // the end of a transaction - but we'll assume that at some
          // point it was a mistake.
          if (query.onInvalidateCallCount > MAX_INVALIDATE_CALL_COUNT) {
            throw new Error(
              `Possible circular dependency detected: ${query.name}'s onInvalidate called more than ${MAX_INVALIDATE_CALL_COUNT} times while resolving transaction`
            )
          }

          if (query.onInvalidate) {
            query.onInvalidate()
          }
        }
      }
      finally {
        for(const query of onInvalidateCalled) {
          query.wasOnInvalidateCalled = false
          query.onInvalidateCallCount = 0
        }
        this.queue = []
      }
    }
  }
}
