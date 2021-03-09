import {Entity} from "./Entity"
import {EntityClass} from "./Types"
import {InternalEntityClass} from "./Types"
import {EntitiesState} from "./EntitiesState"

/** Superclass for the different relationships that can be declared
 * for an entity */
export abstract class Relationship {
  _foreignEntitiesState: EntitiesState<any> | null = null
  constructor(
    public name: string,
    public foreignEntityFunc: () => EntityClass<any>
  ) {}
  get foreignEntitiesState(): EntitiesState<any> {
    if (this._foreignEntitiesState == null) {
      const entityClass = (this.foreignEntityFunc() as unknown) as InternalEntityClass<any>
      const entitiesState: EntitiesState<any> = entityClass.entitiesState
      // FIXME - if entitiesState is null, that could indicate that the entity class hasn't been added to the StateManager
      if (entitiesState == null) {
        throw new Error(`Class ${(entityClass as any).name || entityClass} not found - it may not have been added to the StateManager`)
      }
      this._foreignEntitiesState = entitiesState
    }
    return this._foreignEntitiesState
  }
  abstract apply(entitiesState: EntitiesState<any>): void
  abstract primaryRemoved<P extends Entity>(primary: P): void
  abstract get isMany(): boolean
  abstract add<P extends Entity, F extends Entity>(primary: P, foreign: F): void
  abstract get indexName(): string | null
}
