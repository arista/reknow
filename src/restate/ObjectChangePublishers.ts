import {ChangeSubscriber} from "./ChangeSubscriber"
import {ChangePublisher} from "./ChangePublisher"
import {StateManager} from "./StateManager"

/**
 * Manages subscribers listening for changes on an object with
 * properties, by allowing subscribers to be notified of changes to
 * specific properties, or to the actual list of properties.
 **/
export class ObjectChangePublishers {
  // Maintains subscribers that have referenced a property of the object
  _propertyChangePublishers: {[prop: string]: ChangePublisher} | null = null

  // Maintains subscribers that have referenced "ownKeys" of the object
  _ownKeysChangePublisher: ChangePublisher | null = null

  // Maintains subscribers that want to be notified of any change to
  // the object.  This is used for Arrays, in which tracking the
  // gets/sets of individual properties in the array isn't very
  // practical or useful.  It's also used for Queries that return a
  // Proxied (such as an Entity, the entire byId index, or a node of
  // an index)
  _changePublisher: ChangePublisher | null = null

  constructor(public stateManager: StateManager, public name: string) {}

  get currentChangeSubscriber() {
    return this.stateManager.currentChangeSubscriber
  }

  removeChangePublishers() {
    this._propertyChangePublishers = null
    this._ownKeysChangePublisher = null
  }

  get ownKeysChangePublisher() {
    if (this._ownKeysChangePublisher == null) {
      this._ownKeysChangePublisher = new ChangePublisher(
        `${this.name}.$ownKeys`,
        this.stateManager
      )
    }
    return this._ownKeysChangePublisher
  }

  addOwnKeysSubscriber() {
    const changeSubscriber = this.currentChangeSubscriber
    if (changeSubscriber != null) {
      changeSubscriber.addChangePublisher(this.ownKeysChangePublisher)
    }
  }

  notifyOwnKeysSubscribersOfChange() {
    if (this._ownKeysChangePublisher != null) {
      this._ownKeysChangePublisher.notifyChangeSubscribers()
    }
    this.notifySubscribersOfChange()
  }

  get propertyChangePublishers() {
    if (this._propertyChangePublishers == null) {
      this._propertyChangePublishers = {}
    }
    return this._propertyChangePublishers
  }

  getOrCreatePropertyChangePublisher(property: string) {
    let ret = this.propertyChangePublishers[property]
    if (ret == null) {
      ret = new ChangePublisher(`${this.name}.${property}`, this.stateManager)
      this.propertyChangePublishers[property] = ret
    }
    return ret
  }

  getPropertyChangePublisher(property: string) {
    if (this._propertyChangePublishers == null) {
      return null
    }
    return this.propertyChangePublishers[property] || null
  }

  addPropertySubscriber(property: string) {
    const changeSubscriber = this.currentChangeSubscriber
    if (changeSubscriber != null) {
      const changePublisher = this.getOrCreatePropertyChangePublisher(property)
      changeSubscriber.addChangePublisher(changePublisher)
    }
  }

  notifySubscribersOfPropertyChange(property: string) {
    const ppub = this.getPropertyChangePublisher(property)
    if (ppub != null) {
      ppub.notifyChangeSubscribers()
    }
    this.notifySubscribersOfChange()
  }

  get changePublisher() {
    if (this._changePublisher == null) {
      this._changePublisher = new ChangePublisher(
        `${this.name}`,
        this.stateManager
      )
    }
    return this._changePublisher
  }

  notifySubscribersOfChange() {
    if (this._changePublisher != null) {
      this._changePublisher.notifyChangeSubscribers()
    }
  }

  addSubscriber() {
    const changeSubscriber = this.currentChangeSubscriber
    if (changeSubscriber != null) {
      changeSubscriber.addChangePublisher(this.changePublisher)
    }
  }
}
