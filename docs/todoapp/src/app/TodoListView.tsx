import React from "react"
import {useQuery} from "./Models"
import {TodoList} from "./TodoList"
import {TodoListItemView} from "./TodoListItemView"
import {TextInputView} from "./TextInputView"

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
        <TextInputView
          caption="Add Item"
          onValue={(v) => todoList.addItem(v)}
        />
      </ul>
    </li>
  )
}
