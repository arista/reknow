import React from "react"
import {useQuery} from "./Models"
import {TodoListItem} from "./TodoListItem"

export const TodoListItemView: React.FC<{ item: TodoListItem }> = params => {
  const item = useQuery(()=>params.item)

  return (
      <>
      <div>
      {item.name}
      <button onClick={()=>item.setComplete()}>Done!</button>
    </div>
    </>
  )
}
