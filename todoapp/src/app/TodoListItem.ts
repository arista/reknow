import * as R from "reknow"
import {TodoList} from "./TodoList"

export class TodoListItem extends R.Entity {
  @R.id id!: string
  todoListId!: string
  @R.belongsTo(() => TodoList, "todoListId") todoList!: TodoList

  complete = false

  constructor(public name: string, public createdAt = new Date().toISOString()) {
    super()
  }

  @R.action setComplete() {
    this.complete = true
  }
}

class Entities extends R.Entities<TodoListItem> {
  @R.index("=todoListId", "=complete", "+createdAt") byComplete!: R.HashIndex<
    R.HashIndex<R.SortIndex<TodoListItem>>
  >
}

export const TodoListItemEntities = new Entities(TodoListItem)
