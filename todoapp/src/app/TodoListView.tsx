import React from "react"
import {useQuery} from "./Models"
import {TodoList} from "./TodoList"
import {TodoListItemView} from "./TodoListItemView"

export const TodoListView: React.FC<{todoList: TodoList}> = (params) => {
  const todoList = useQuery(() => params.todoList)
  const incompleteItems = useQuery(() => todoList.incompleteItems)
  const completeItems = useQuery(() => todoList.completeItems)

  return (
    <li>
      <div>
        List {todoList.name}
        <button onClick={() => todoList.remove()}>Remove</button>
      </div>
      <ul>
        {incompleteItems.map((item) => (
          <TodoListItemView item={item} key={item.id} />
        ))}
        {completeItems.map((item) => (
          <TodoListItemView item={item} key={item.id} />
        ))}
        Add new todo:
        <input
          type="text"
          value={todoList.itemToAdd}
          onChange={(e) => todoList.setItemToAdd(e.target.value)}
        />
        <button
          disabled={!todoList.canAddItem}
          onClick={() => todoList.addItem()}
        >
          Add Item
        </button>
      </ul>
    </li>
  )
}
