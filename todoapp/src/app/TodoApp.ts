import * as R from "reknow"
import {TodoList} from "./TodoList"

export type ListSortOrder = "byCreatedAt" | "byName"

export class TodoApp extends R.Entity {
  static get entities():R.SingletonEntities<TodoApp> {
    return entities
  }

  @R.id id!: string

  @R.hasMany(() => TodoList, "todoAppId", {dependent: "remove"})
  todoLists!: Array<TodoList>

  @R.hasMany(() => TodoList, "todoAppId", {sort: "+name"})
  todoListsByName!: Array<TodoList>

  @R.hasMany(() => TodoList, "todoAppId", {sort: "+createdAt"})
  todoListsByCreatedAt!: Array<TodoList>

  listToAdd = ""
  listSortOrder: ListSortOrder = "byCreatedAt"

  @R.query get canAddList() {
    return this.listToAdd !== ""
  }

  @R.action addList() {
    const todoList = TodoList.entities.addList(this.listToAdd)
    this.todoLists.push(todoList)
    this.listToAdd = ""
  }

  @R.action setListToAdd(val: string) {
    this.listToAdd = val
  }

  @R.action setListSortOrder(val: ListSortOrder) {
    this.listSortOrder = val
  }

  @R.query get sortedTodoLists() {
    switch (this.listSortOrder) {
      case "byName":
        return this.todoListsByName
      default:
        return this.todoListsByCreatedAt
    }
  }
}

const entities = new R.SingletonEntities(TodoApp, () => new TodoApp())
