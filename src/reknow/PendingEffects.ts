import {Entity} from "./Entity"
import {EntityState} from "./EntityState"
import {EffectDecorator} from "./Types"
import {AfterAddDecorator} from "./Types"
import {AfterRemoveDecorator} from "./Types"
import {AfterChangeDecorator} from "./Types"
import {AfterPropertyChangeDecorator} from "./Types"

export class PendingEffects<E extends Entity> {
  effectsByDecorator: Map<EffectDecorator, PendingEffect> = new Map()
  effects: Array<PendingEffect> = []

  constructor(public entityState: EntityState<E>) {}

  apply() {
    for (const effect of this.effects) {
      this.entityState.stateManager.withDebugEvent(
        () => {
          return {
            type: "RunEffectDebugEvent",
            effect: `${this.entityState.changePublisherName}.${effect.name}`,
          }
        },
        () => {
          effect.apply(this.entityState)
        }
      )
    }
  }

  addAfterAdd(e: AfterAddDecorator) {
    if (!this.effectsByDecorator.has(e)) {
      const pe = new PendingAddEffect(e)
      this.effectsByDecorator.set(e, pe)
      this.effects.push(pe)
    }
  }

  addAfterRemove(e: AfterRemoveDecorator) {
    if (!this.effectsByDecorator.has(e)) {
      const pe = new PendingRemoveEffect(e)
      this.effectsByDecorator.set(e, pe)
      this.effects.push(pe)
    }
  }

  addAfterChange(e: AfterChangeDecorator) {
    if (!this.effectsByDecorator.has(e)) {
      const pe = new PendingChangeEffect(e)
      this.effectsByDecorator.set(e, pe)
      this.effects.push(pe)
    }
  }

  addAfterPropertyChange(e: AfterPropertyChangeDecorator, oldValue: any) {
    if (!this.effectsByDecorator.has(e)) {
      const pe = new PendingChangePropertyEffect(e, oldValue)
      this.effectsByDecorator.set(e, pe)
      this.effects.push(pe)
    }
  }
}

abstract class PendingEffect {
  abstract apply<E extends Entity>(entityState: EntityState<E>): void
  abstract get name(): string
}

class PendingAddEffect extends PendingEffect {
  constructor(public e: AfterAddDecorator) {
    super()
  }

  get name() {
    return this.e.name
  }

  apply<E extends Entity>(entityState: EntityState<E>): void {
    this.e.f.call(entityState.proxy)
  }
}

class PendingRemoveEffect extends PendingEffect {
  constructor(public e: AfterRemoveDecorator) {
    super()
  }

  get name() {
    return this.e.name
  }

  apply<E extends Entity>(entityState: EntityState<E>): void {
    this.e.f.call(entityState.proxy)
  }
}

class PendingChangeEffect extends PendingEffect {
  constructor(public e: AfterChangeDecorator) {
    super()
  }

  get name() {
    return this.e.name
  }

  apply<E extends Entity>(entityState: EntityState<E>): void {
    this.e.f.call(entityState.proxy)
  }
}

class PendingChangePropertyEffect extends PendingEffect {
  constructor(public e: AfterPropertyChangeDecorator, public oldValue: any) {
    super()
  }

  get name() {
    return this.e.name
  }

  apply<E extends Entity>(entityState: EntityState<E>): void {
    this.e.f.call(entityState.proxy, this.oldValue)
  }
}
