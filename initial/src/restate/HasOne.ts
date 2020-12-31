import {Relationship} from "./Relationship"
import {EntitiesState} from "./EntitiesState"
import {HasOneOptions} from "./Types"
import {IndexSchema} from "./Types"
import {Entity} from "./Entity"
import {EntityClass} from "./Types"
import {Index} from "./Index"

export class HasOne extends Relationship {
  primaryKey!: string | null
  foreignIndex!: Index<any>

  constructor(
    public name: string,
    public foreignEntityFunc: () => EntityClass<any>,
    public foreignKey: string,
    public options: HasOneOptions | null
  ) {
    super(name, foreignEntityFunc)
  }

  get foreignIndexTargetSchema() {
    const targetSchema: IndexSchema = {
      type: "UniqueHashIndexSchema",
      property: this.foreignKey,
    }
    return targetSchema
  }

  findOrCreateForeignIndex() {
    const targetSchema = this.foreignIndexTargetSchema
    const baseIndexName = `_indexForRelationship_${this.foreignEntitiesState.name}.${this.name}`
    return this.foreignEntitiesState.findOrCreateIndex(
      targetSchema,
      baseIndexName
    )
  }

  getPrimaryKeyValue<P extends Entity>(entity: P) {
    return this.primaryKey == null
      ? entity.entityId
      : (entity as any)[this.primaryKey]
  }

  getValue<P extends Entity, F extends Entity>(entity: P): F | null {
    const primaryKeyValue = this.getPrimaryKeyValue(entity)
    return this.foreignIndex.proxy[primaryKeyValue] || null
  }

  setValue<P extends Entity, F extends Entity>(
    entity: P,
    val: F | null | undefined
  ): void {
    // FIXME - if the entity is not actually an Entity yet, then add it

    // See if there is an existing value that is different, and remove
    // it if so
    const existing = this.getValue(entity)
    if (existing != null) {
      if (existing.isSameEntity(val)) {
        return
      }
      this.remove(existing)
    }

    // Add the value
    if (val != null) {
      this.add(entity, val)
    }
  }

  remove<F extends Entity>(foreign: F) {
    // Null out the connection
    this.setForeignKeyValue(foreign, null)

    // Remove the entity if so directed
    if (this.options?.dependent === "remove") {
      this.foreignEntitiesState.remove(foreign)
    }
  }

  add<P extends Entity, F extends Entity>(primary: P, foreignSource: F) {
    const foreign = this.foreignEntitiesState.add(foreignSource)
    const primaryKeyValue = this.getPrimaryKeyValue(primary)
    this.setForeignKeyValue(foreign, primaryKeyValue)
  }

  setForeignKeyValue<F extends Entity>(foreign: F, value: any) {
    ;(foreign as any)[this.foreignKey] = value
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

  apply(entitiesState: EntitiesState<any>) {
    this.primaryKey = this.options?.primaryKey || null
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
        case "none":
          break
        case "nullify":
        default:
          this.setForeignKeyValue(existing, null)
          break
      }
    }
  }

  get isMany(): boolean {
    return false
  }

  get indexName(): string | null {
    return this.foreignIndex.name
  }
}
