import {ChangeSubscriber} from "./ChangeSubscriber"
import {ChangePublisher} from "./ChangePublisher"
import {StateManager} from "./StateManager"
import {Proxied} from "./Proxied"

class CachedValue<T> {
  constructor(public value: T) {}
}

export class Query<T> extends ChangeSubscriber {
  cachedValue: CachedValue<T> | null = null
  isRemoved: boolean = false
  publisher: ChangePublisher

  constructor(
    public stateManager: StateManager,
    public query: () => T,
    name: string,
    public onInvalidate: (() => void) | null
  ) {
    super(name)
    this.publisher = new ChangePublisher(name, stateManager)
  }

  get value(): T {
    if (this.isRemoved) {
      throw new Error(
        `Attempt to evaluate Query "${this.name}" after it has been removed`
      )
    }

    if (this.cachedValue == null) {
      const value = this.evaluate()
      this.cachedValue = new CachedValue(value)
    }
    return this.cachedValue.value
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
    this.publisher.notifyChangeSubscribers()
    // FIXME - set up the notification to onInvalidate
  }

  get hasCachedValue() {
    return this.cachedValue != null
  }
}
