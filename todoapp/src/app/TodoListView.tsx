import React from "react"
import {useQuery} from "./Models"
import {TodoList} from "./TodoList"
import {TodoListItemView} from "./TodoListItemView"

export const TodoListView: React.FC<{ todoList: TodoList }> = params => {
  const todoList = useQuery(()=>params.todoList)
  const items = useQuery(()=>todoList.items)

  return (
      <>
      <div>List {todoList.name}</div>
      <div className="ml20">
      {items.map(item=><TodoListItemView item={item} key={item.id}/>)}
      <input type="text" value={todoList.itemToAdd} onChange={e=>todoList.setItemToAdd(e.target.value)} />
      <button disabled={!todoList.canAddItem} onClick={()=>todoList.addItem()}>Add Item</button>
      </div>
    </>
  )
}
