import * as R from "../Restate"

describe("Reactions", () => {
  class User extends R.Entity {
    constructor(public name: string, public age: number) {
      super()
    }

    @R.hasMany(() => Job, "userId") jobs!: Array<Job>

    _r1!:string
    @R.reaction r1() {
      r1counters[this.entityId]++
      this._r1 = `${this.name}:${this.age || "none"}`
    }
  }
  class _Users extends R.Entities<User> {
    @R.uniqueIndex("=name") byUniqueName!: R.UniqueHashIndex<Job>
  }
  const Users = new _Users(User)

  let r1counters: {[id: string]: number}
  beforeEach(() => (r1counters = {u1: 0, u2: 0}))

  class Job extends R.Entity {
    constructor(public name: string, public userId: string) {
      super()
    }
  }
  class _Jobs extends R.Entities<Job> {}
  const Jobs = new _Jobs(Job)

  const AppModel = new R.StateManager({
    entities: {Users, Jobs},
  })
  const action = <T>(f: () => T): T => {
    return AppModel.action(f)
  }
  beforeEach(() => {
    AppModel.clearState()
  })

  describe("Reactions created through the StateManager", () => {
    describe("accessing an entity's property", () => {
      let u1!: User
      let r1count!: number
      let r1val!: string | null
      let r1!: R.Reaction
      beforeEach(() => {
        u1 = action(() => Users.add(new User("u1", 10), "user1"))
        r1count = 0
        r1val = null
        r1 = AppModel.addReaction(() => {
          r1count++
          r1val = `name: ${u1.name}`
        })
      })
      it("should be triggered when first created", () => {
        expect(r1count).toBe(1)
        expect(r1val).toEqual("name: u1")
      })
      it("should be triggered if the referenced property changes", () => {
        action(() => (u1.name = "bob"))
        expect(r1count).toBe(2)
        expect(r1val).toEqual("name: bob")
      })
      it("should be triggered if the referenced property is deleted", () => {
        action(() => delete (u1 as any).name)
        expect(r1count).toBe(2)
        expect(r1val).toEqual("name: undefined")
      })
      it("should not be triggered if the property is set to the same value", () => {
        action(() => (u1.name = "u1"))
        expect(r1count).toBe(1)
        expect(r1val).toEqual("name: u1")
      })
      it("should not be triggered by another entity", () => {
        const u2 = action(() => Users.add(new User("u2", 10), "user2"))
        expect(r1count).toBe(1)
        expect(r1val).toEqual("name: u1")
        action(() => (u2.name = "u3"))
        expect(r1count).toBe(1)
        expect(r1val).toEqual("name: u1")
      })
      it("should not be triggered if a different property changes", () => {
        action(() => (u1.age = 20))
        expect(r1count).toBe(1)
        expect(r1val).toEqual("name: u1")
      })
      it("should not be triggered if a different property is added", () => {
        action(() => ((u1 as any).val1 = 8))
        expect(r1count).toBe(1)
        expect(r1val).toEqual("name: u1")
      })
      it("should not be triggered if a different property is deleted", () => {
        action(() => delete (u1 as any).age)
        expect(r1count).toBe(1)
        expect(r1val).toEqual("name: u1")
      })
      it("should not be triggered if the entity is removed", () => {
        action(() => Users.remove(u1))
        expect(r1count).toBe(1)
        expect(r1val).toEqual("name: u1")
      })
    })
    describe("accessing two of an entity's properties", () => {
      let u1!: User
      let r1count!: number
      let r1val!: string | null
      let r1!: R.Reaction
      beforeEach(() => {
        u1 = action(() => Users.add(new User("u1", 10), "user1"))
        r1count = 0
        r1val = null
        r1 = AppModel.addReaction(() => {
          r1count++
          r1val = `name: ${u1.name} = ${u1.age}`
        })
      })
      it("should be triggered when first created", () => {
        expect(r1count).toBe(1)
        expect(r1val).toEqual("name: u1 = 10")
      })
      it("should be triggered once if either or both referenced properties changes", () => {
        action(() => (u1.name = "bob"))
        expect(r1count).toBe(2)
        expect(r1val).toEqual("name: bob = 10")
        action(() => (u1.age = 20))
        expect(r1count).toBe(3)
        expect(r1val).toEqual("name: bob = 20")
        action(() => {
          u1.name = "christine"
          u1.age = 30
        })
        expect(r1count).toBe(4)
        expect(r1val).toEqual("name: christine = 30")
      })
    })
    describe("conditionally accesing an entity's properties", () => {
      let u1!: User
      let r1count!: number
      let r1val!: string | null
      let r1!: R.Reaction
      beforeEach(() => {
        u1 = action(() => Users.add(new User("u1", 10), "user1"))
        r1count = 0
        r1val = null
        r1 = AppModel.addReaction(() => {
          r1count++
          if (u1.name == "noage") {
            r1val = `name: ${u1.name}`
          } else {
            r1val = `name: ${u1.name} = ${u1.age}`
          }
        })
      })
      it("should be triggered when first created", () => {
        expect(r1count).toBe(1)
        expect(r1val).toEqual("name: u1 = 10")
      })
      it("should be triggered when age is modified, but not triggered when age is modified again after not being referenced", () => {
        expect(r1count).toBe(1)
        action(() => (u1.age = 20))
        expect(r1count).toBe(2)
        expect(r1val).toEqual("name: u1 = 20")
        action(() => (u1.name = "noage"))
        expect(r1count).toBe(3)
        expect(r1val).toEqual("name: noage")
        action(() => (u1.age = 40))
        expect(r1count).toBe(3)
        expect(r1val).toEqual("name: noage")
      })
    })
    describe("accessing an entity's nonexistent property", () => {
      let u1!: User
      let r1count!: number
      let r1val!: string | null
      let r1!: R.Reaction
      beforeEach(() => {
        u1 = action(() => Users.add(new User("u1", 10), "user1"))
        r1count = 0
        r1val = null
        r1 = AppModel.addReaction(() => {
          r1count++
          r1val = `v: ${(u1 as any).noval}`
        })
      })
      it("should be triggered when first created", () => {
        expect(r1count).toBe(1)
        expect(r1val).toEqual("v: undefined")
      })
      it("should not be triggered if the referenced property is deleted before being set", () => {
        action(() => delete (u1 as any).noval)
        expect(r1count).toBe(1)
        expect(r1val).toEqual("v: undefined")
      })
      it("should be triggered if the referenced property is set", () => {
        action(() => ((u1 as any).noval = "v1val"))
        expect(r1count).toBe(2)
        expect(r1val).toEqual("v: v1val")
      })
      it("should be triggered if the referenced property is set then deleted", () => {
        action(() => ((u1 as any).noval = "v1val"))
        expect(r1count).toBe(2)
        expect(r1val).toEqual("v: v1val")
        action(() => delete (u1 as any).noval)
        expect(r1count).toBe(3)
        expect(r1val).toEqual("v: undefined")
      })
      it("should not be triggered if a different property changes", () => {
        action(() => (u1.age = 20))
        expect(r1count).toBe(1)
        expect(r1val).toEqual("v: undefined")
      })
    })
    // FIXME - calling inherited property
    describe("calling getOwnPropertyDescriptor", () => {
      let u1!: User
      let r1count!: number
      let r1val!: string | null
      let r1!: R.Reaction
      beforeEach(() => {
        u1 = action(() => Users.add(new User("u1", 10), "user1"))
        r1count = 0
        r1val = null
        r1 = AppModel.addReaction(() => {
          r1count++
          const pd = Object.getOwnPropertyDescriptor(u1, "name")
          if (pd != null) {
            r1val = pd.value
          }
        })
      })
      it("should be triggered when first created", () => {
        expect(r1count).toBe(1)
        expect(r1val).toEqual("u1")
      })
      it("should be triggered if the value is changed", () => {
        action(() => (u1.name = "u2"))
        expect(r1count).toBe(2)
        expect(r1val).toEqual("u2")
      })
      it("should not be triggered if a different value changes", () => {
        action(() => (u1.age = 20))
        expect(r1count).toBe(1)
        expect(r1val).toEqual("u1")
      })
    })
    describe("calling hasOwnProperty", () => {
      let u1!: User
      let r1count!: number
      let r1val!: string | null
      let r1!: R.Reaction
      beforeEach(() => {
        u1 = action(() => Users.add(new User("u1", 10), "user1"))
        r1count = 0
        r1val = null
        r1 = AppModel.addReaction(() => {
          r1count++
          r1val = u1.hasOwnProperty("name2") ? "yes" : "no"
        })
      })
      it("should be triggered when first created", () => {
        expect(r1count).toBe(1)
        expect(r1val).toEqual("no")
      })
      it("should be triggered if the value is added", () => {
        action(() => ((u1 as any).name2 = "u2"))
        expect(r1count).toBe(2)
        expect(r1val).toEqual("yes")
      })
      it("should not be triggered if a different value changes", () => {
        action(() => (u1.age = 20))
        expect(r1count).toBe(1)
        expect(r1val).toEqual("no")
      })
      it("should be triggered if the value is added, then changed", () => {
        action(() => ((u1 as any).name2 = "u2"))
        expect(r1count).toBe(2)
        expect(r1val).toEqual("yes")
        // Arguably this shouldn't trigger, since the @reaction only
        // depends on the presence of "name2", not its value.  But
        // that level of granularity isn't currently implemented.
        action(() => ((u1 as any).name2 = "u3"))
        expect(r1count).toBe(3)
        expect(r1val).toEqual("yes")
      })
      it("should be triggered if the value is added, then deleted", () => {
        action(() => ((u1 as any).name2 = "u2"))
        expect(r1count).toBe(2)
        expect(r1val).toEqual("yes")
        action(() => delete (u1 as any).name2)
        expect(r1count).toBe(3)
        expect(r1val).toEqual("no")
      })
    })
    describe("calling ownKeys", () => {
      let u1!: User
      let r1count!: number
      let r1val!: boolean | null
      let r1!: R.Reaction
      beforeEach(() => {
        u1 = action(() => Users.add(new User("u1", 10), "user1"))
        r1count = 0
        r1val = null
        r1 = AppModel.addReaction(() => {
          r1count++
          r1val = false
          for (const key of Object.keys(u1)) {
            if (key === "name2") {
              r1val = true
              break
            }
          }
        })
      })
      it("should be triggered when first created", () => {
        expect(r1count).toBe(1)
        expect(r1val).toBe(false)
      })
      it("should be triggered if the value is added", () => {
        action(() => ((u1 as any).name2 = "u2"))
        expect(r1count).toBe(2)
        expect(r1val).toBe(true)
      })
      it("should be triggered if a value changes", () => {
        action(() => (u1.age = 20))
        // Arguably this shouldn't trigger, since changing a value
        // doesn't change the list of keys.  However, getting the keys
        // of an object apparently also calls the proxy's
        // getOwnPropertyDescriptor, which then adds a subscriber to
        // the property (since the property descriptor can return the
        // property's value).  So this might be unavoidable.
        expect(r1count).toBe(2)
        expect(r1val).toBe(false)
      })
      it("should be triggered if the value is added, then changed", () => {
        action(() => ((u1 as any).name2 = "u2"))
        expect(r1count).toBe(2)
        expect(r1val).toBe(true)
        action(() => ((u1 as any).name2 = "u3"))
        // Same as above, where ideally it wouldn't be triggered, but
        // doesn't seem like we can prevent it.
        expect(r1count).toBe(3)
        expect(r1val).toBe(true)
      })
      it("should be triggered if the value is added, then deleted", () => {
        action(() => ((u1 as any).name2 = "u2"))
        expect(r1count).toBe(2)
        expect(r1val).toBe(true)
        action(() => delete (u1 as any).name2)
        expect(r1count).toBe(3)
        expect(r1val).toBe(false)
      })
    })
    describe("depending on Entities properties", () => {
      describe("entitiesById", () => {
        let r1count!: number
        let r1!: R.Reaction
        beforeEach(() => {
          r1count = 0
          r1 = AppModel.addReaction(() => {
            r1count++
            const u = Users.entitiesById.u1
          })
        })
        it("should be triggered when first created", () => {
          expect(r1count).toBe(1)
        })
        it("should be triggered if a User is added", () => {
          const u1 = action(() => Users.add(new User("u1", 10), "user1"))
          expect(r1count).toBe(2)
        })
        it("should be triggered if a User is added then changed", () => {
          const u1 = action(() => Users.add(new User("u1", 10), "user1"))
          expect(r1count).toBe(2)
          action(() => u1.age++)
          expect(r1count).toBe(3)
        })
        it("should be triggered if a User is added then removed", () => {
          const u1 = action(() => Users.add(new User("u1", 10), "user1"))
          expect(r1count).toBe(2)
          action(() => u1.removeEntity())
          expect(r1count).toBe(3)
        })
        it("should not be triggered if a Job is added", () => {
          const u1 = action(() => Users.add(new User("u1", 10), "user1"))
          expect(r1count).toBe(2)
          action(() => Jobs.add(new Job("bartender", "u1"), "job1"))
          expect(r1count).toBe(2)
        })
      })
      describe("byName index", () => {
        let r1count!: number
        let r1!: R.Reaction
        beforeEach(() => {
          r1count = 0
          r1 = AppModel.addReaction(() => {
            r1count++
            const u = Users.byUniqueName
          })
        })
        it("should be triggered when first created", () => {
          expect(r1count).toBe(1)
        })
        it("should be triggered if a User is added", () => {
          const u1 = action(() => Users.add(new User("u1", 10), "user1"))
          expect(r1count).toBe(2)
        })
        it("should be triggered if a User is added then changed", () => {
          const u1 = action(() => Users.add(new User("u1", 10), "user1"))
          expect(r1count).toBe(2)
          action(() => u1.age++)
          expect(r1count).toBe(3)
        })
        it("should be triggered if a User is added then removed", () => {
          const u1 = action(() => Users.add(new User("u1", 10), "user1"))
          expect(r1count).toBe(2)
          action(() => u1.removeEntity())
          expect(r1count).toBe(3)
        })
        it("should not be triggered if a Job is added", () => {
          const u1 = action(() => Users.add(new User("u1", 10), "user1"))
          expect(r1count).toBe(2)
          action(() => Jobs.add(new Job("bartender", "u1"), "job1"))
          expect(r1count).toBe(2)
        })
      })
      describe("relationship", () => {
        let r1count!: number
        let r1!: R.Reaction
        let u1!: User
        beforeEach(() => {
          u1 = action(() => Users.add(new User("u1", 10), "user1"))
          r1count = 0
          r1 = AppModel.addReaction(() => {
            r1count++
            const u = u1.jobs
          })
        })
        it("should be triggered when first created", () => {
          expect(r1count).toBe(1)
        })
        it("should not be triggered if a User is added", () => {
          action(() => Users.add(new User("u2", 10), "user2"))
          expect(r1count).toBe(1)
        })
        it("should be triggered if a Job is added for the user", () => {
          const j1 = action(() =>
            Jobs.add(new Job("bartender", "user1"), "job1")
          )
          expect(u1.jobs).toEqual([j1])
          expect(r1count).toBe(2)
        })
        it("should be triggered if a Job is added even for a different user", () => {
          const j1 = action(() =>
            Jobs.add(new Job("bartender", "user2"), "job1")
          )
          expect(u1.jobs).toEqual([])
          expect(r1count).toBe(2)
        })
      })
    })
  })
  describe("Reactions defined on an entity", () => {
    it("should be called when the appropriate User is created or modified", () => {
      expect(r1counters.u1).toBe(0)
      expect(r1counters.u2).toBe(0)

      const u1 = action(() => Users.add(new User("u1", 10), "u1"))
      expect(r1counters.u1).toBe(1)
      expect(r1counters.u2).toBe(0)

      const u2 = action(() => Users.add(new User("u2", 10), "u2"))
      expect(r1counters.u1).toBe(1)
      expect(r1counters.u2).toBe(1)

      action(() => u1.age++)
      expect(r1counters.u1).toBe(2)
      expect(r1counters.u2).toBe(1)

      action(() => u2.age++)
      expect(r1counters.u1).toBe(2)
      expect(r1counters.u2).toBe(2)
    })
  })
  describe("Circular definitions", () => {
    it("should be detected as errors", () => {
      const u1 = action(() => Users.add(new User("u1", 10), "u1"))
      expect(() => {
        AppModel.addReaction(() => {
          u1.name = `${u1.name}:${u1.age}`
        }, "cdef")
      }).toThrow(
        new Error(
          `Circular dependency detected while executing these reactions: Users#u1.r1, cdef`
        )
      )
    })
  })
  describe("Reactions that depend on each other in a chain", () => {
    it("should trigger all of the affected reactions in the action", () => {
      class E1 extends R.Entity {
        v2!: number
        v3!: number
        constructor(public v: number) {
          super()
        }
        @R.reaction computeV2() {
          v2calls++
          this.v2 = this.v * 2
        }
        @R.reaction computeV3() {
          v3calls++
          this.v3 = this.v2 * 2
        }
      }
      class _E1s extends R.Entities<E1> {}
      const E1s = new _E1s(E1)
      const m = new R.StateManager({
        entities: {E1s},
      })
      let v2calls = 0
      let v3calls = 0

      let e1!: E1
      m.action(() => {
        e1 = E1s.add(new E1(10))
      })
      expect(e1.v).toBe(10)
      expect(e1.v2).toBe(20)
      expect(e1.v3).toBe(40)
      expect(v2calls).toBe(1)
      expect(v3calls).toBe(1)

      m.action(() => e1.v++)
      expect(e1.v).toBe(11)
      expect(e1.v2).toBe(22)
      expect(e1.v3).toBe(44)
      expect(v2calls).toBe(2)
      expect(v3calls).toBe(2)
    })
  })
})
