import {ChangeSubscriber} from "./ChangeSubscriber"
import {ChangePublisher} from "./ChangePublisher"
import {StateManager} from "./StateManager"
import {Proxied} from "./Proxied"
import {QueryNotifyAt} from "./Types"

class CachedValue<T> {
  constructor(public value: T) {}
}

export class Query<T> extends ChangeSubscriber {
  cachedValue: CachedValue<T> | null = null
  isRemoved: boolean = false
  publisher: ChangePublisher

  // Flag if this has already been added to the queue of notifications
  isQueuedToCallOnInvalidate = false

  // Flag if the invalidation handler was called at least once during
  // the notification phase
  wasOnInvalidateCalled = false

  // The number of times the invalidation handler was called during
  // the notification phase.  If this gets too high, then we'll assume
  // it's a circular reference and throw an error.
  onInvalidateCallCount = 0

  // This is to handle a query that modifies its own dependencies
  // (which will be detected as a circular reference).  Such a query's
  // value would never be cached, because the very act of running the
  // query invalidates itself.  These flags are used to make sure that
  // we detect this situation and prevent the caching of the value.
  // This allows the Query to run over and over again, and eventually
  // be detected as a possible circular reference.
  isEvaluating = false
  wasNotifiedWhileEvaluating = false

  constructor(
    public stateManager: StateManager,
    public query: () => T,
    name: string,
    public onInvalidate: (() => void) | null,
    public notifyAt: QueryNotifyAt
  ) {
    super(name)
    this.publisher = new ChangePublisher(name, stateManager)
  }

  get value(): T {
    if (this.isEvaluating) {
      throw new Error(`Circular reference - ${this.name} directly or indirectly references itself`)
    }

    if (this.isRemoved) {
      throw new Error(
        `Attempt to evaluate Query "${this.name}" after it has been removed`
      )
    }
    
    this.wasNotifiedWhileEvaluating = false
    this.isEvaluating = true
    try {
      if (this.cachedValue == null) {
        const value = this.evaluate()
        if (!this.wasNotifiedWhileEvaluating) {
          this.cachedValue = new CachedValue(value)
        }
        return value
      }
      else  {
        return this.cachedValue.value
      }
    }
    finally {
      this.isEvaluating = false
    }
  }

  evaluate(): T {
    if (this.stateManager.currentChangeSubscriber != null) {
      this.stateManager.currentChangeSubscriber.addChangePublisher(
        this.publisher
      )
    }
    this.removeChangePublishers()
    const ret = this.stateManager.whileEvaluatingChangeSubscriber(
      this,
      this.query
    )

    // If the return value is a Proxied (Entity, byId, or index node),
    // then subscribe to any changes to the proxy, and return the
    // proxy's latest value.
    if (ret instanceof Object) {
      const p = Proxied.getProxied(ret)
      if (p != null) {
        this.stateManager.whileEvaluatingChangeSubscriber(this, () =>
          p.addSubscriber()
        )
        return p.proxy as T
      }
    }

    return ret
  }

  remove() {
    this.removeChangePublishers()
    this.isRemoved = true
    this.cachedValue = null
  }

  notifyChangeSubscriber() {
    this.cachedValue = null

    if (this.isEvaluating) {
      this.wasNotifiedWhileEvaluating = true
    }

    // If this has an invalidation handler, then queue it for
    // notification (unless it's already queued)
    if (this.onInvalidate && !this.isQueuedToCallOnInvalidate) {
      this.isQueuedToCallOnInvalidate = true
      this.stateManager.addPendingQueryNotification(this)
    }

    // If other subscribers depend on the result of this Query, notify
    // them of a change
    this.publisher.notifyChangeSubscribers()
  }

  get hasCachedValue() {
    return this.cachedValue != null
  }
}
