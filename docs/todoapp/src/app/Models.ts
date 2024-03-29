import * as R from "reknow"
import {ReactReknow} from "react-reknow"
import {TodoApp} from "./TodoApp"
import {TodoList} from "./TodoList"
import {TodoListItem} from "./TodoListItem"
import {TextInput} from "./TextInput"

export const models = new R.StateManager({
  entities: {
    todo: {
      TodoApp,
      TodoList,
      TodoListItem,
      TextInput,
    },
  },
  listener: (e) => console.log(R.stringifyTransaction(e)),
  // Uncomment to see information about queries, subscriptions, and invalidations
  //debugListener: e=>console.log(R.stringifyDebugEvent(e)),
})

export const {useQuery, useComponentEntity} = ReactReknow(models)
