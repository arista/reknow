import "./App.css"
import React from 'react'
import {useQuery} from "./app/Models"
import {TodoApp} from "./app/TodoApp"
import {TodoAppView} from "./app/TodoAppView"

function App() {
  const todoApp = useQuery(()=>TodoApp.entities.singleton)
  return (
    <TodoAppView todoApp={todoApp} />
  )
}

export default App
