import {ChangePublisher} from "./ChangePublisher"

export abstract class ChangeSubscriber {
  publishers: Array<ChangePublisher> = []
  publisherSet = new Set<ChangePublisher>()

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
