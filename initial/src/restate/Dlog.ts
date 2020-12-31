export class _Dlog {
  sections: Array<DlogSection> = []
  isLogging = false

  log(...args: Array<any>) {
    if (this.isLogging) {
      console.log(this.indent(), ...args)
    }
  }

  section<T>(name: string, f: () => T): T {
    if (this.isLogging) {
      this.startSection(name)
      try {
        return f()
      } finally {
        this.endSection()
      }
    } else {
      return f()
    }
  }

  startSection(name: string) {
    if (this.isLogging) {
      const section = new DlogSection(name)
      console.log(this.indent(), `++++ ${section.name}`)
      this.sections.push(section)
    }
  }

  endSection() {
    if (this.isLogging) {
      const section = this.sections.pop()
      if (section != null) {
        console.log(this.indent(), `---- ${section.name}`)
      }
    }
  }

  logging<T>(f: () => T, logging: boolean = true): T {
    const wasLogging = this.isLogging
    this.isLogging = logging
    try {
      return f()
    } finally {
      this.isLogging = wasLogging
    }
  }

  indent() {
    return this.spaces(this.sections.length * 2)
  }

  spaces(count: number): string {
    let ret = ""
    for (let i = 0; i < count; i++) {
      ret += " "
    }
    return ret
  }
}

class DlogSection {
  constructor(public name: string) {}
}

export const dlog = new _Dlog()
