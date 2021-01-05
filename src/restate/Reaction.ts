import {ChangeSubscriber} from "./ChangeSubscriber"
import {StateManager} from "./StateManager"

export class Reaction extends ChangeSubscriber {
  evaluateFunc = () => {
    const fthis = this.thisFunc ? this.thisFunc() : null
    return this.f.apply(fthis)
  }

  constructor(
    public stateManager: StateManager,
    public thisFunc: (() => any) | null,
    name: string,
    public f: () => any
  ) {
    super(name)
  }

  evaluate() {
    this.removeChangePublishers()
    this.stateManager.whileEvaluatingChangeSubscriber(this, this.evaluateFunc)
  }

  remove() {
    this.removeChangePublishers()
  }

  notifyChangeSubscriber() {
    this.evaluate()
  }
}
