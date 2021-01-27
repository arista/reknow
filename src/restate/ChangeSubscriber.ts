import {ChangePublisher} from "./ChangePublisher"

export abstract class ChangeSubscriber {
  publishers: Array<ChangePublisher> = []
  publisherSet = new Set<ChangePublisher>()

  // FIXME - remove these flags
  // Flag if the subscriber has already been queued for notification
  // at the end of the current action
  queued = false
  // Flag if the subscriber has already been notified during the
  // current action, used to detect circular references
  notified = false

  constructor(public name: string) {}

  addChangePublisher(publisher: ChangePublisher) {
    if (!this.publisherSet.has(publisher)) {
      this.publishers.push(publisher)
      this.publisherSet.add(publisher)
      publisher.addChangeSubscriber(this)
    }
  }

  removeChangePublishers() {
    if (this.publishers.length > 0) {
      for (const publisher of this.publishers) {
        publisher.removeChangeSubscriber(this)
      }
      this.publishers = []
      this.publisherSet = new Set()
    }
  }

  abstract notifyChangeSubscriber(): void
}
