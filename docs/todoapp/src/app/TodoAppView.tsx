import React from "react"
import {useQuery} from "./Models"
import {useComponentEntity} from "./Models"
import {TodoApp} from "./TodoApp"
import {TodoListView} from "./TodoListView"
import {TextInputView} from "./TextInputView"

export const TodoAppView: React.FC<{}> = (params) => {
  const todoApp = useComponentEntity(() => new TodoApp())
  const lists = useQuery(() => todoApp.sortedTodoLists)

  return (
    <>
      <div>Todo App</div>
      <div>
        Add a new Todo list:
        <TextInputView caption="Add List" onValue={(v) => todoApp.addList(v)} />
        <div>
          Lists
          <button
            onClick={() => todoApp.setListSortOrder("byCreatedAt")}
            disabled={todoApp.listSortOrder === "byCreatedAt"}
          >
            Sort By Created At
          </button>
          <button
            onClick={() => todoApp.setListSortOrder("byName")}
            disabled={todoApp.listSortOrder === "byName"}
          >
            Sort By Name
          </button>
          <button
            onClick={() => todoApp.setListSortOrder("byItemCount")}
            disabled={todoApp.listSortOrder === "byItemCount"}
          >
            Sort By Item Count
          </button>
        </div>
        <ul>
          {lists.map((l) => (
            <TodoListView key={l.id} todoList={l} />
          ))}
        </ul>
      </div>
    </>
  )
}
