import {Entity} from "./Entity"
import {EntityState} from "./EntityState"

export class SortIndexEntry<E extends Entity> {
  constructor(public entity: EntityState<E>, public sortValues: Array<any>) {}
}
