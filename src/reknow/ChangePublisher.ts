import {ChangeSubscriber} from "./ChangeSubscriber"
import {StateManager} from "./StateManager"

export class ChangePublisher {
  subscribers: Array<ChangeSubscriber> = []

  constructor(public name: string, public stateManager: StateManager) {}

  addChangeSubscriber(s: ChangeSubscriber) {
    this.subscribers.push(s)
  }

  removeChangeSubscriber(s: ChangeSubscriber) {
    const ix = this.subscribers.indexOf(s)
    if (ix >= 0) {
      this.subscribers.splice(ix, 1)
    }
  }

  notifyChangeSubscribers() {
    if (this.subscribers.length > 0) {
      const subscribers = this.subscribers
      this.subscribers = []
      for (const subscriber of subscribers) {
        subscriber.notifyChangeSubscriber()
      }
    }
  }
}
