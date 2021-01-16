import {ChangeSubscriber} from "./ChangeSubscriber"
import {ChangePublisher} from "./ChangePublisher"
import {StateManager} from "./StateManager"

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
    return this.stateManager.whileEvaluatingChangeSubscriber(this, this.query)
  }

  remove() {
    this.removeChangePublishers()
    this.isRemoved = true
  }

  notifyChangeSubscriber() {
    this.cachedValue = null
    // FIXME - currently this queues up notifications, instead of sending them out immediately
    this.publisher.notifyChangeSubscribers()
    // FIXME - set up the notification to onInvalidate
  }

  get hasCachedValue() {
    return this.cachedValue != null
  }
}
