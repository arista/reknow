import {Relationship} from "./Relationship"
import {EntitiesState} from "./EntitiesState"
import {BelongsToOptions} from "./Types"
import {Entity} from "./Entity"
import {EntityClass} from "./Types"
import {IndexSchema} from "./Types"
import {Index} from "./Index"
import {getOwnProperty} from "./Utils"
import {setOwnProperty} from "./Utils"

export class BelongsTo extends Relationship {
  foreignIndex!: Index<any> | null
  foreignKey!: string | null

  constructor(
    public name: string,
    public foreignEntityFunc: () => EntityClass<any>,
    public primaryKey: string,
    public options: BelongsToOptions | null
  ) {
    super(name, foreignEntityFunc)
  }

  findOrCreateForeignIndex() {
    if (this.foreignKey == null) {
      return null
    } else {
      const targetSchema: IndexSchema = {
        type: "UniqueHashIndexSchema",
        property: this.foreignKey,
      }
      const foreignEntitiesState = this.foreignEntitiesState
      const baseIndexName = `_indexForRelationship_${foreignEntitiesState.name}.${this.name}`
      return foreignEntitiesState.findOrCreateIndex(targetSchema, baseIndexName)
    }
  }

  getPrimaryKeyValue<P extends Entity>(entity: P) {
    return (entity.currentEntity as any)[this.primaryKey]
  }

  getValue<P extends Entity, F extends Entity>(entity: P): F | null {
    // If the entity hasn't been added yet, then treat it as an "own"
    // property, avoiding any getter that might be on the prototype
    if (!entity.hasEntityState) {
      return getOwnProperty(entity, this.name, null)
    }

    const primaryKeyValue = this.getPrimaryKeyValue(entity)
    if (this.foreignIndex != null) {
      return this.foreignIndex.proxy[primaryKeyValue] || null
    } else {
      // Use the proxy of the foreign byId
      return this.foreignEntitiesState.proxy[primaryKeyValue] || null
    }
  }

  createGetter<P extends Entity, F extends Entity>(): () => F | null {
    const self = this
    return function (this: P) {
      return self.getValue(this)
    }
  }

  createSetter<P extends Entity, F extends Entity>(): (
    val: F | null | undefined
  ) => void {
    const self = this
    return function (this: P, val: F | null | undefined) {
      return self.setValue(this, val)
    }
  }

  setValue<P extends Entity, F extends Entity>(
    entity: P,
    val: F | null | undefined
  ): void {
    // If the entity hasn't been added yet, then treat it as an "own"
    // property, avoiding any setter that might be on the prototype
    if (!entity.hasEntityState) {
      setOwnProperty(entity, this.name, val)
      return
    }

    // See if there is an existing value that is different, and remove
    // it if so
    const existing = this.getValue(entity)
    if (existing != null) {
      if (existing.isSameEntity(val)) {
        return
      }
      this.remove(entity, existing)
    }

    // Add the value
    this.add(entity, val)
  }

  remove<P extends Entity, F extends Entity>(primary: P, foreign: F) {
    // Remove the entity if so directed
    if (this.options?.dependent === "remove") {
      this.foreignEntitiesState.remove(foreign)
    }
  }

  add<P extends Entity, F extends Entity>(
    primary: P,
    foreignSource: F | null | undefined
  ) {
    if (foreignSource == null) {
      this.setPrimaryKeyValue(primary, null)
    } else {
      const foreign = this.foreignEntitiesState.add(foreignSource)
      const foreignKeyValue = this.getForeignKeyValue(foreign)
      this.setPrimaryKeyValue(primary, foreignKeyValue)
    }
  }

  getForeignKeyValue<F extends Entity>(foreign: F) {
    return this.foreignKey == null
      ? foreign.entityId
      : (foreign as any)[this.foreignKey]
  }

  setPrimaryKeyValue<P extends Entity>(primary: P, value: any) {
    ;(primary as any)[this.primaryKey] = value
  }

  apply(entitiesState: EntitiesState<any>) {
    this.foreignKey = this.options?.foreignKey || null
    this.foreignIndex = this.findOrCreateForeignIndex()

    const getter = this.createGetter()
    const setter = this.createSetter()
    entitiesState.addInstancePropertyToEntityClass(this.name, getter, setter)
    entitiesState.relationships.push(this)
    entitiesState.relationshipsByName[this.name] = this
  }

  primaryRemoved<P extends Entity>(primary: P): void {
    const existing = this.getValue(primary)
    if (existing != null) {
      switch (this.options?.dependent) {
        case "remove":
          this.foreignEntitiesState.remove(existing)
          break
      }
    }
  }

  get isMany(): boolean {
    return false
  }

  get indexName(): string | null {
    return this.foreignIndex == null ? null : this.foreignIndex.name
  }
}
