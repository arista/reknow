import {Entity} from "./Entity"
import {Entities} from "./Entities"
import {EntityClass} from "./Types"

export class SingletonEntities<E extends Entity> extends Entities<E> {
  constructor(public entityClass: EntityClass<E>, public generator: () => E) {
    super(entityClass)
  }

  initialize() {
    this.add(this.generator(), "singleton")
  }

  get singleton(): E {
    return this.entitiesById["singleton"]
  }
}
