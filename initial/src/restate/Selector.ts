import {SelectorDependency} from "./Types"
import {StateManager} from "./StateManager"
import {Entity} from "./Entity"
import {EntityState} from "./EntityState"

export class Selector<T> {
  hasGeneratedResult = false
  lastResult!: T
  ignoringAddedDependencies = false

  selectorDependencies: Array<SelectorDependency<any>> = []

  /** If this is a selector on an Entity, then this is the EntityState
   * and the proxy that was in place when last evaluated.  If the
   * Entity changes state, then the proxy on the EntityState will
   * change identity. */
  entityState: EntityState<any> | null = null
  lastEntityProxy: Entity | null = null

  selectorFunction = () => this.evaluate()

  constructor(
    public stateManager: StateManager,
    public name: string,
    public f: () => T
  ) {}

  /** Indicates that this is a selector on a specific instance of an
   * Entity */
  setAsEntitySelector(entityState: EntityState<any>) {
    this.entityState = entityState
    this.lastEntityProxy = entityState.proxy
  }

  clearDependencies() {
    this.selectorDependencies = []
  }

  /** Indicates that the given Selector was called while this Selector
   * was being evaluated.  This will be ignored if
   * ignoringAddedDependencies is true, which would be the case while
   * evaluating the dependencies to see if they have changed. */
  addSelectorDependency<T>(name: string, selector: () => T, lastValue: T) {
    if (!this.ignoringAddedDependencies) {
      this.selectorDependencies.push({name, selector, lastValue})
    }
  }

  /** Returns the result of evaluating the selector.  If none of the
   * dependencies have changed, then the last cached value will be
   * returned. */
  evaluate(): T {
    if (this.shouldGenerateResult()) {
      this.generateResult()
    }

    // If this was called while another selector was in place, notify
    // that selector that it depends on this selector
    if (this.stateManager.currentSelector != null) {
      this.stateManager.currentSelector.addSelectorDependency(
        this.name,
        this.selectorFunction,
        this.lastResult
      )
    }
    return this.lastResult
  }

  generateResult() {
    this.clearDependencies()

    const result = this.stateManager.whileEvaluatingSelector(this, this.f)
    this.hasGeneratedResult = true

    // If this is a selector on an Entity instance, then remember
    // the identity of the Entity proxy representing this Entity.
    if (this.entityState != null) {
      this.lastEntityProxy = this.entityState.proxy
    }

    this.lastResult = result
  }

  shouldGenerateResult(): boolean {
    // See if this is the first time evaluating
    if (!this.hasGeneratedResult) {
      return true
    }
    // See if the underlying Entity has changed
    if (
      this.entityState != null &&
      this.entityState.proxy !== this.lastEntityProxy
    ) {
      return true
    }

    // Let the StateManager know that we're evaluating, so that nested
    // selector calls get sent to us as dependencies.  But also set
    // ourselves in a mode where we ignore those dependencies, since
    // for the moment we're just calling our previously-determined
    // dependencdies to see if they changed.  If a dependency *has*
    // changed, then we'll come back around and evaluate "for real",
    // and the dependencies can be added at that point.
    return this.whileIgnoringAddedDependencies(() => {
      return this.stateManager.whileEvaluatingSelector(this, () => {
        for (const sd of this.selectorDependencies) {
          if (this.hasDependencyChanged(sd)) {
            return true
          }
        }
        return false
      })
    })
  }

  /** Evaluate the dependency's selector, and see if its result is
   * different from the last time this selector evaluated it. */
  hasDependencyChanged(dependency: SelectorDependency<any>) {
    const evaluated = dependency.selector()
    return evaluated !== dependency.lastValue
  }

  whileIgnoringAddedDependencies<T>(f: () => T): T {
    const oldIgnoringAddedDependencies = this.ignoringAddedDependencies
    this.ignoringAddedDependencies = true
    try {
      return f()
    } finally {
      this.ignoringAddedDependencies = oldIgnoringAddedDependencies
    }
  }
}
