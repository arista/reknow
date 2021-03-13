import * as R from "reknow"
import {TodoListItem} from "./TodoListItem"
import {TodoApp} from "./TodoApp"

export class TodoList extends R.Entity {
  static get entities(): Entities {
    return entities
  }

  @R.id id!: string
  todoAppId!: string

  @R.hasMany(() => TodoListItem, "todoListId", {
    sort: "+createdAt",
    dependent: "remove",
  })
  items!: Array<TodoListItem>
  itemCount = 0

  @R.belongsTo(() => TodoApp, "todoAppId") todoApp!: TodoApp

  constructor(public name: string) {
    super()
  }

  @R.action addItem(value: string) {
    const item = TodoListItem.entities.addItem(value)
    this.items.push(item)
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

  @R.reaction computeItemCount() {
    this.itemCount = this.items.length
  }
}

class Entities extends R.Entities<TodoList> {
  @R.index("-createdAt") byCreatedAt!: R.SortIndex<TodoList>
  @R.index("-itemCount") byItemCount!: R.SortIndex<TodoList>
  @R.index("+name") byName!: R.SortIndex<TodoList>

  addList(name: string) {
    return this.add(new TodoList(name))
  }
}

const entities = new Entities(TodoList)
