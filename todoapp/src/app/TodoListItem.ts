import * as R from "reknow"
import {TodoList} from "./TodoList"

export class TodoListItem extends R.Entity {
  static get entities() {
    return entities
  }

  @R.id id!:string
  todoListId!:string
  @R.belongsTo(()=>TodoList, "todoListId") todoList!:TodoList
  complete = false
  
  constructor(public name: string, public createdAt:string) {
    super()
  }

  @R.action setComplete() {
    this.complete = true
  }
}

class _Entities extends R.Entities<TodoListItem> {
  addItem(name: string) {
    const createdAt = new Date().toISOString()
    return this.add(new TodoListItem(name, createdAt))
  }
}

const entities = new _Entities(TodoListItem)
