import React from "react"
import {useQuery} from "./Models"
import {TodoListItem} from "./TodoListItem"

export const TodoListItemView: React.FC<{item: TodoListItem}> = (params) => {
  const item = useQuery(() => params.item)

  return (
    <>
      {item.complete ? (
        <CompleteItemView item={item} />
      ) : (
        <IncompleteItemView item={item} />
      )}
    </>
  )
}

const IncompleteItemView: React.FC<{item: TodoListItem}> = (params) => {
  const {item} = params
  return (
    <li>
      <div>
        {item.name}
        <button onClick={() => item.setComplete()}>Done!</button>
      </div>
    </li>
  )
}

const CompleteItemView: React.FC<{item: TodoListItem}> = (params) => {
  const {item} = params
  return (
    <li>
      <div style={{textDecorationLine: "line-through"}}>{item.name}</div>
    </li>
  )
}
