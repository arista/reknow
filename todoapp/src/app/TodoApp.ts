import * as R from "reknow"
import {TodoList} from "./TodoList"

export type ListSortOrder = "byCreatedAt" | "byName"

export class TodoApp extends R.Entity {
  listToAdd = ""
  listSortOrder:ListSortOrder = "byCreatedAt"
  
  @R.query get canAddList() {
    return this.listToAdd !== ""
  }

  @R.action addList() {
    TodoList.entities.addList(this.listToAdd)
    this.listToAdd = ""
  }

  @R.action setListToAdd(val:string) {
    this.listToAdd = val
  }

  @R.query get todoLists() {
    switch(this.listSortOrder) {
    case "byName":
      return TodoList.entities.byName
    default:
      return TodoList.entities.byCreatedAt
    }
  }

  @R.action setListSortOrder(val:ListSortOrder) {
    this.listSortOrder = val
  }

  static get entities() {
    return entities
  }
}

const entities = new R.SingletonEntities(TodoApp, () => new TodoApp())
