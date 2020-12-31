import * as R from "../Restate"

describe("Selector", () => {
  class User extends R.Entity {
    constructor(public name: string, public age: number | null = null) {
      super()
    }

    @R.selector get name2() {
      ecounters[this.entityId].name2++
      return `${this.name}${this.name}`
    }
    @R.selector get name4() {
      ecounters[this.entityId].name4++
      return `${this.name2}${this.name2}`
    }
  }
  class _Users extends R.Entities<User> {
    @R.index("=name") byName: R.HashIndex<R.SortIndex<User>>
    @R.index("+name") sortByName: R.SortIndex<User>

    @R.selector get s1() {
      counters.s1++
      return this.entitiesById
    }
    @R.selector get s2() {
      counters.s2++
      return this.byName
    }
    @R.selector get s3() {
      counters.s3++
      return this.s1
    }
  }
  const Users = new _Users(User)

  class Job extends R.Entity {
    constructor(public name: string) {
      super()
    }
  }
  class _Jobs extends R.Entities<Job> {}
  const Jobs = new _Jobs(Job)

  class _Service1 extends R.Service {
    @R.selector get usersCount() {
      counters.s4++
      return Users.sortByName.length
    }
    @R.selector get usersCount2() {
      counters.s5++
      return this.usersCount * 2
    }
  }
  const Service1 = new _Service1()

  const AppModel = new R.StateManager({
    entities: {Users, Jobs},
    services: {Service1},
  })
  const action = <T>(f: () => T): T => {
    return AppModel.action(f)
  }
  beforeEach(() => {
    AppModel.clearState()
  })

  const counters = {
    s1: 0,
    s2: 0,
    s3: 0,
    s4: 0,
    s5: 0,
  }
  const ecounters = {
    user1: {
      name2: 0,
      name4: 0,
    },
    user2: {
      name2: 0,
      name4: 0,
    },
  }
  beforeEach(() => {
    counters.s1 = 0
    counters.s2 = 0
    counters.s3 = 0
    counters.s4 = 0
    counters.s5 = 0
    ecounters.user1.name2 = 0
    ecounters.user1.name4 = 0
    ecounters.user2.name2 = 0
    ecounters.user2.name4 = 0
  })

  describe("On an Entities class", () => {
    it("should be called when entitiesById changes", () => {
      expect(Users.s1).toBe(Users.entitiesById)
      expect(counters.s1).toBe(1)
      expect(Users.s1).toBe(Users.entitiesById)
      expect(counters.s1).toBe(1)
      action(() => Users.add(new User("a")))
      expect(Users.s1).toBe(Users.entitiesById)
      expect(counters.s1).toBe(2)
      expect(Users.s1).toBe(Users.entitiesById)
      expect(counters.s1).toBe(2)
    })
    it("should be called when an index changes", () => {
      expect(Users.s2).toBe(Users.byName)
      expect(counters.s2).toBe(1)
      expect(Users.s2).toBe(Users.byName)
      expect(counters.s2).toBe(1)
      action(() => Users.add(new User("a")))
      expect(Users.s2).toBe(Users.byName)
      expect(counters.s2).toBe(2)
      expect(Users.s2).toBe(Users.byName)
      expect(counters.s2).toBe(2)
    })
    it("should be called when a referenced selector changes", () => {
      expect(Users.s3).toBe(Users.entitiesById)
      expect(counters.s3).toBe(1)
      expect(Users.s3).toBe(Users.entitiesById)
      expect(counters.s3).toBe(1)
      action(() => Users.add(new User("a")))
      expect(Users.s3).toBe(Users.entitiesById)
      expect(counters.s3).toBe(2)
      expect(Users.s3).toBe(Users.entitiesById)
      expect(counters.s3).toBe(2)
    })
  })
  describe("On an Entity class", () => {
    it("should be called when the entity changes, but not when another entity changes", () => {
      const u1 = action(() => Users.add(new User("mark"), "user1"))
      const u2 = action(() => Users.add(new User("sam"), "user2"))

      expect(u1.name2).toBe("markmark")
      expect(u2.name2).toBe("samsam")
      expect(ecounters.user1.name2).toBe(1)
      expect(ecounters.user2.name2).toBe(1)

      action(() => (u1.name = "marky"))
      expect(u1.name2).toBe("markymarky")
      expect(u2.name2).toBe("samsam")
      expect(ecounters.user1.name2).toBe(2)
      expect(ecounters.user2.name2).toBe(1)
    })
    it("should be called when another selector changes", () => {
      const u1 = action(() => Users.add(new User("mark"), "user1"))

      expect(u1.name2).toBe("markmark")
      expect(u1.name4).toBe("markmarkmarkmark")
      expect(ecounters.user1.name2).toBe(1)
      expect(ecounters.user1.name4).toBe(1)

      action(() => (u1.name = "marky"))
      expect(u1.name2).toBe("markymarky")
      expect(u1.name4).toBe("markymarkymarkymarky")
      expect(ecounters.user1.name2).toBe(2)
      expect(ecounters.user1.name4).toBe(2)

      action(() => (u1.age = 10))
      expect(u1.name2).toBe("markymarky")
      expect(u1.name4).toBe("markymarkymarkymarky")
      // Even though the selectors don't depend directly on "age", the
      // selectors get called if the entity's identity changes at all
      expect(ecounters.user1.name2).toBe(3)
      expect(ecounters.user1.name4).toBe(3)
    })
  })
  describe("On a Service class", () => {
    it("should be called when Users changes", () => {
      const u1 = action(() => Users.add(new User("mark"), "user1"))
      expect(Service1.usersCount).toBe(1)
      expect(counters.s4).toBe(1)
      expect(Service1.usersCount).toBe(1)
      expect(counters.s4).toBe(1)

      const u2 = action(() => Users.add(new User("mike"), "user2"))
      expect(Service1.usersCount).toBe(2)
      expect(counters.s4).toBe(2)
      expect(Service1.usersCount).toBe(2)
      expect(counters.s4).toBe(2)
    })
    it("should not be called when a dependent selector does not change", () => {
      const u1 = action(() => Users.add(new User("mark"), "user1"))
      expect(Service1.usersCount).toBe(1)
      expect(Service1.usersCount2).toBe(2)
      expect(counters.s4).toBe(1)
      expect(counters.s5).toBe(1)
      expect(Service1.usersCount).toBe(1)
      expect(Service1.usersCount2).toBe(2)
      expect(counters.s4).toBe(1)
      expect(counters.s5).toBe(1)

      action(() => (u1.age = 20))
      expect(Service1.usersCount).toBe(1)
      expect(Service1.usersCount2).toBe(2)
      expect(counters.s4).toBe(2)
      // Service.usersCount changes since the Users.sortByName value
      // changes identity if any contained entity changes identity,
      // even if the overall order of the index doesn't change.  But
      // .usersCount2 only depends on the result of usersCount, so its
      // value remains cached.
      expect(counters.s5).toBe(1)
      expect(Service1.usersCount).toBe(1)
      expect(Service1.usersCount2).toBe(2)
      expect(counters.s4).toBe(2)
      expect(counters.s5).toBe(1)
    })
  })
  describe("When results are an array whose contents are unchanged", () => {
    it("should still return a different array", () => {
      class E1 extends R.Entity {
        constructor(public v1: number, public v2: number) {
          super()
        }
      }
      class _E1s extends R.Entities<E1> {
        @R.index("+v2") byV2!: R.SortIndex<E1>
        @R.selector v2s() {
          v2scalled++
          return this.byV2.map((e) => e.v2)
        }
      }
      const E1s = new _E1s(E1)
      const m = new R.StateManager({entities: {E1s}})
      let v2scalled = 0

      m.action(() => {
        E1s.add(new E1(10, 30), "id1")
        E1s.add(new E1(20, 20), "id2")
        E1s.add(new E1(30, 10), "id3")
      })
      const r1 = E1s.v2s()
      expect(r1).toEqual([10, 20, 30])
      expect(v2scalled).toBe(1)

      // Changing a value that doesn't change the result should still
      // change the identity of the result
      m.action(() => (E1s.entitiesById.id1.v1 = 15))
      const r2 = E1s.v2s()
      expect(r2).toEqual([10, 20, 30])
      expect(v2scalled).toBe(2)

      expect(r1).toEqual(r2)
      expect(r1).not.toBe(r2)
    })
  })
})
