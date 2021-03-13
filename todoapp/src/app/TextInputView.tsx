import React from "react"
import {useComponentEntity} from "./Models"
import {TextInput} from "./TextInput"

export const TextInputView: React.FC<{
  onValue: (value: string) => void
  caption: string
}> = (params) => {
  const {onValue, caption} = params
  const textInput = useComponentEntity(() => new TextInput("", onValue))
  return (
    <>
      <input
        type="text"
        value={textInput.value}
        onChange={(e) => textInput.setValue(e.target.value)}
      />
      <button
        disabled={textInput.isEmpty}
        onClick={() => textInput.notifyValue()}
      >
        {caption}
      </button>
    </>
  )
}
