import * as R from "reknow"
import {TodoListItem} from "./TodoListItem"
import {TodoApp} from "./TodoApp"

export class TodoList extends R.Entity {
  static get entities() {
    return entities
  }

  @R.id id!: string
  todoAppId!: string

  @R.hasMany(() => TodoListItem, "todoListId", {
    sort: "+createdAt",
    dependent: "remove",
  })
  items!: Array<TodoListItem>

  @R.belongsTo(() => TodoApp, "todoAppId") todoApp!: TodoApp

  itemToAdd = ""

  constructor(public name: string) {
    super()
  }

  @R.query get canAddItem() {
    return this.itemToAdd !== ""
  }

  @R.action addItem() {
    const item = TodoListItem.entities.addItem(this.itemToAdd)
    this.items.push(item)
    this.itemToAdd = ""
  }

  @R.action setItemToAdd(val: string) {
    this.itemToAdd = val
  }

  @R.query get completeItems() {
    return TodoListItem.entities.byComplete[this.id]?.true || []
  }

  @R.query get incompleteItems() {
    return TodoListItem.entities.byComplete[this.id]?.false || []
  }

  @R.action remove() {
    this.removeEntity()
  }
}

class _Entities extends R.Entities<TodoList> {
  @R.index("-createdAt") byCreatedAt!: R.SortIndex<TodoList>
  @R.index("+name") byName!: R.SortIndex<TodoList>

  addList(name: string) {
    return this.add(new TodoList(name))
  }
}

const entities = new _Entities(TodoList)
