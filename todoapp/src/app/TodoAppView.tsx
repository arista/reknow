import React from "react"
import {useQuery} from "./Models"
import {TodoApp} from "./TodoApp"
import {TodoListView} from "./TodoListView"

export const TodoAppView: React.FC<{ todoApp: TodoApp }> = params => {
  const todoApp = useQuery(()=>params.todoApp)
  const lists = useQuery(()=>todoApp.todoLists)

  return (
    <>
      <div>Todo App</div>
      <div>
      <input type="text" value={todoApp.listToAdd} onChange={e=>todoApp.setListToAdd(e.target.value)} />
      <button disabled={!todoApp.canAddList} onClick={()=>todoApp.addList()}>Add List</button>
      <div>Lists
      <button onClick={()=>todoApp.setListSortOrder("byCreatedAt")} disabled={todoApp.listSortOrder === "byCreatedAt"}>Sort By Created At</button>
      <button onClick={()=>todoApp.setListSortOrder("byName")} disabled={todoApp.listSortOrder === "byName"}>Sort By Name</button>
    </div>
      {lists.map(l=><TodoListView key={l.id} todoList={l}/>)}
      </div>
    </>
  )
}
