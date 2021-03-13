import * as R from "reknow"

export class TextInput extends R.Entity {
  static get entities(): Entities {
    return entities
  }

  constructor(public value: string = "", public onValue: (v: string) => void) {
    super()
  }

  @R.query get isEmpty() {
    return this.value === ""
  }

  @R.action setValue(value: string) {
    this.value = value
  }

  @R.action notifyValue() {
    this.onValue(this.value)
    this.value = ""
  }
}

class Entities extends R.Entities<TextInput> {}

const entities = new Entities(TextInput)
