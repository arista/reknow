import * as R from "reknow"
import {ReactReknow} from "react-reknow"
import {TodoApp} from "./TodoApp"
import {TodoList} from "./TodoList"
import {TodoListItem} from "./TodoListItem"

export const models = new R.StateManager({
  entities: {
    todo: {
      TodoApp,
      TodoList,
      TodoListItem,
    },
  },
  listener: (e) => console.log(R.stringifyTransaction(e)),
  //debugListener: e=>console.log(R.stringifyDebugEvent(e)),
})

export const useQuery = ReactReknow(models).useQuery
