import * as R from "reknow"
import {TodoList} from "./TodoList"

export type ListSortOrder = "byCreatedAt" | "byName" | "byItemCount"

export class TodoApp extends R.Entity {
  @R.id id!: string

  @R.hasMany(() => TodoList, "todoAppId", {dependent: "remove"})
  todoLists!: Array<TodoList>

  @R.hasMany(() => TodoList, "todoAppId", {sort: "+name"})
  todoListsByName!: Array<TodoList>

  @R.hasMany(() => TodoList, "todoAppId", {sort: "+createdAt"})
  todoListsByCreatedAt!: Array<TodoList>

  @R.hasMany(() => TodoList, "todoAppId", {sort: "-itemCount"})
  todoListsByItemCount!: Array<TodoList>

  listSortOrder: ListSortOrder = "byCreatedAt"

  @R.action addList(value: string) {
    const todoList = new TodoList(value).addEntity()
    this.todoLists.push(todoList)
  }

  @R.action setListSortOrder(val: ListSortOrder) {
    this.listSortOrder = val
  }

  @R.query get sortedTodoLists() {
    switch (this.listSortOrder) {
      case "byName":
        return this.todoListsByName
      case "byItemCount":
        return this.todoListsByItemCount
      default:
        return this.todoListsByCreatedAt
    }
  }
}

class Entities extends R.Entities<TodoApp> {}
new Entities(TodoApp)
