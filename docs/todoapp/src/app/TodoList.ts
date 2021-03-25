import * as R from "reknow"
import {TodoListItem, TodoListItemEntities} from "./TodoListItem"
import {TodoApp} from "./TodoApp"

export class TodoList extends R.Entity {
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
    const item = new TodoListItem(value).addEntity()
    this.items.push(item)
  }

  @R.query get completeItems() {
    return TodoListItemEntities.byComplete[this.id]?.true || []
  }

  @R.query get incompleteItems() {
    return TodoListItemEntities.byComplete[this.id]?.false || []
  }

  @R.action remove() {
    this.removeEntity()
  }

  @R.reaction computeItemCount() {
    this.itemCount = this.items.length
  }
}

class Entities extends R.Entities<TodoList> {}

new Entities(TodoList)
