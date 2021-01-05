import * as R from "../Restate"

describe("Changing Object Identities", () => {
  class User extends R.Entity {
    age?: number
    name?: string
    constructor(
      name: string,
      public gender: string | null = null,
      public height: number | null = null,
      public status: string | null = null
    ) {
      super()
      this.name = name
    }
    @R.hasMany(() => Job, "userId", {sort: "name"}) jobs!: Array<Job>
  }
  class _Users extends R.Entities<User> {
    @R.index("+name") index1!: R.SortIndex<User>
    @R.uniqueIndex("=name") index2!: R.UniqueHashIndex<User>
    @R.index("=gender", "+height") index3!: R.HashIndex<R.SortIndex<User>>
    @R.index("=gender", "=status", "+height") index4!: R.HashIndex<
      R.HashIndex<R.SortIndex<User>>
    >
  }
  const Users = new _Users(User)

  class Job extends R.Entity {
    constructor(
      public name: string,
      public userId: string,
      public salary: number | null = null
    ) {
      super()
    }
  }
  class _Jobs extends R.Entities<Job> {}
  const Jobs = new _Jobs(Job)

  const AppModel = new R.StateManager({entities: {Users, Jobs}})
  const action = <T>(f: () => T): T => {
    return AppModel.action(f)
  }
  beforeEach(() => {
    AppModel.clearState()
  })

  describe("Entity", () => {
    it("should change identity if a property changes", () => {
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      expect(Users.entitiesById["user#1"]).toBe(u1)
      action(() => (u1.name = "harriet"))
      expect(Users.entitiesById["user#1"]).toEqual(u1)
      expect(Users.entitiesById["user#1"]).not.toBe(u1)
    })
    it("should change identity if a property is added", () => {
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      expect(Users.entitiesById["user#1"]).toBe(u1)
      action(() => ((u1 as any).age = 14))
      expect(Users.entitiesById["user#1"]).toEqual(u1)
      expect(Users.entitiesById["user#1"]).not.toBe(u1)
    })
    it("should change identity if a property is deleted", () => {
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      expect(Users.entitiesById["user#1"]).toBe(u1)
      action(() => delete u1.name)
      expect(Users.entitiesById["user#1"]).toEqual(u1)
      expect(Users.entitiesById["user#1"]).not.toBe(u1)
    })
    it("should not change identity if a property is changed to the same value", () => {
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      expect(Users.entitiesById["user#1"]).toBe(u1)
      action(() => (u1.name = "daryl"))
      expect(Users.entitiesById["user#1"]).toBe(u1)
    })
    it("should not change identity if a non-existent property is deleted", () => {
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      expect(Users.entitiesById["user#1"]).toBe(u1)
      action(() => delete u1.age)
      expect(Users.entitiesById["user#1"]).toBe(u1)
    })
    it("should not change identity if another entity is changed", () => {
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      const u2 = action(() => Users.add(new User("mark"), "user#2"))
      expect(Users.entitiesById["user#1"]).toBe(u1)
      action(() => (u2.name = "harriet"))
      expect(Users.entitiesById["user#1"]).toEqual(u1)
      expect(Users.entitiesById["user#1"]).toBe(u1)
      expect(Users.entitiesById["user#2"]).toEqual(u2)
      expect(Users.entitiesById["user#2"]).not.toBe(u2)
    })
  })
  describe("Entities.entitiesById", () => {
    it("should change identity if a property changes", () => {
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      const byId = Users.entitiesById
      action(() => (u1.name = "harriet"))
      expect(Users.entitiesById).not.toBe(byId)
      expect(Users.entitiesById).toEqual(byId)
    })
    it("should change identity if a property is added", () => {
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      const byId = Users.entitiesById
      action(() => ((u1 as any).age = 14))
      expect(Users.entitiesById).not.toBe(byId)
      expect(Users.entitiesById).toEqual(byId)
    })
    it("should change identity if a property is deleted", () => {
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      const byId = Users.entitiesById
      action(() => delete u1.name)
      expect(Users.entitiesById).not.toBe(byId)
      expect(Users.entitiesById).toEqual(byId)
    })
    it("should not change identity if a property is changed to the same value", () => {
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      const byId = Users.entitiesById
      action(() => (u1.name = "daryl"))
      expect(Users.entitiesById).toBe(byId)
    })
    it("should not change identity if a non-existent property is deleted", () => {
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      const byId = Users.entitiesById
      action(() => delete u1.age)
      expect(Users.entitiesById).toBe(byId)
    })
    it("should change identity if an entity is added", () => {
      const byId = Users.entitiesById
      const u1 = action(() => Users.add(new User("daryl"), "user#1"))
      expect(Users.entitiesById).not.toBe(byId)
      expect(Users.entitiesById).toEqual(byId)
    })
  })
  describe("Indexes", () => {
    describe("sortIndex", () => {
      it("should change identity if an entity is added", () => {
        const ix = Users.index1
        const u1 = action(() => Users.add(new User("daryl"), "user#1"))
        expect(Users.index1).toEqual([u1])
        expect(Users.index1).toEqual(ix)
        expect(Users.index1).not.toBe(ix)
      })
      it("should change identity if an entity is removed", () => {
        const u1 = action(() => Users.add(new User("daryl"), "user#1"))
        const ix = Users.index1
        action(() => Users.remove(u1))
        expect(Users.index1).toEqual([])
        expect(Users.index1).toEqual(ix)
        expect(Users.index1).not.toBe(ix)
      })
      it("should change identity if an entity changes its sorted position", () => {
        const u1 = action(() => Users.add(new User("daryl"), "user#1"))
        const u2 = action(() => Users.add(new User("mark"), "user#2"))
        const ix = Users.index1
        expect(Users.index1).toEqual([u1, u2])
        action(() => (u2.name = "bess"))
        expect(Users.index1).toEqual([u2, u1])
        expect(Users.index1).toEqual(ix)
        expect(Users.index1).not.toBe(ix)
      })
      it("should change identity if an entity does not change its sorted position", () => {
        const u1 = action(() => Users.add(new User("daryl"), "user#1"))
        const u2 = action(() => Users.add(new User("mark"), "user#2"))
        const ix = Users.index1
        expect(Users.index1).toEqual([u1, u2])
        action(() => (u1.name = "bess"))
        expect(Users.index1).toEqual([u1, u2])
        expect(Users.index1).toEqual(ix)
        expect(Users.index1).not.toBe(ix)
      })
      it("should change identity even if an entity changes an unrelated property", () => {
        const u1 = action(() => Users.add(new User("daryl"), "user#1"))
        const ix = Users.index1
        expect(Users.index1).toEqual([u1])
        action(() => (u1.height = 45))
        expect(Users.index1).toEqual(ix)
        expect(Users.index1).not.toBe(ix)
      })
    })
    describe("uniqueHashIndex", () => {
      it("should change identity if an entity is added", () => {
        const ix = Users.index2
        const u1 = action(() => Users.add(new User("daryl"), "user#1"))
        expect(Users.index2).toEqual({daryl: u1})
        expect(Users.index2).toEqual(ix)
        expect(Users.index2).not.toBe(ix)
      })
      it("should change identity if an entity is removed", () => {
        const u1 = action(() => Users.add(new User("daryl"), "user#1"))
        const ix = Users.index2
        action(() => Users.remove(u1))
        expect(Users.index2).toEqual({})
        expect(Users.index2).toEqual(ix)
        expect(Users.index2).not.toBe(ix)
      })
      it("should change identity if a property changes", () => {
        const u1 = action(() => Users.add(new User("daryl"), "user#1"))
        const ix = Users.index2
        action(() => (u1.name = "harriet"))
        expect(Users.index2).toEqual({harriet: u1})
        expect(Users.index2).toEqual(ix)
        expect(Users.index2).not.toBe(ix)
      })
      it("should not change identity if a property changes to the same value", () => {
        const u1 = action(() => Users.add(new User("daryl"), "user#1"))
        const ix = Users.index2
        action(() => (u1.name = "daryl"))
        expect(Users.index2).toBe(ix)
      })
      it("should change identity even if an unrelated property changes", () => {
        const u1 = action(() => Users.add(new User("daryl"), "user#1"))
        const ix = Users.index2
        action(() => (u1.height = 45))
        expect(Users.index2).toEqual(ix)
        expect(Users.index2).not.toBe(ix)
      })
    })
    describe("hashIndex", () => {
      it("should change identity if an entity is added", () => {
        const ix = Users.index3
        const u1 = action(() => Users.add(new User("daryl", "m"), "user#1"))
        expect(Users.index3).toEqual({m: [u1]})
        expect(Users.index3).toEqual(ix)
        expect(Users.index3).not.toBe(ix)
      })
      it("should change identity if an entity is removed", () => {
        const u1 = action(() => Users.add(new User("daryl", "m"), "user#1"))
        const ix = Users.index3
        action(() => Users.remove(u1))
        expect(Users.index3).toEqual({})
        expect(Users.index3).toEqual(ix)
        expect(Users.index3).not.toBe(ix)
      })
      it("should change identity if hash property is changed", () => {
        const u1 = action(() => Users.add(new User("daryl", "m"), "user#1"))
        const ix = Users.index3
        action(() => (u1.gender = "f"))
        expect(Users.index3).toEqual({f: [u1]})
        expect(Users.index3).toEqual(ix)
        expect(Users.index3).not.toBe(ix)
      })
      it("should change identity if unrelated property is changed", () => {
        const u1 = action(() => Users.add(new User("daryl", "m"), "user#1"))
        const ix = Users.index3
        action(() => (u1.name = "mark"))
        expect(Users.index3).toEqual({m: [u1]})
        expect(Users.index3).toEqual(ix)
        expect(Users.index3).not.toBe(ix)
      })
      it("should change identity if sort property is changed but sort order is unchanged", () => {
        const u1 = action(() => Users.add(new User("daryl", "m", 40), "user#1"))
        const u2 = action(() => Users.add(new User("mark", "m", 45), "user#2"))
        const ix = Users.index3
        expect(Users.index3).toEqual({m: [u1, u2]})
        action(() => (u2.height = 50))
        expect(Users.index3).toEqual({m: [u1, u2]})
        expect(Users.index3).toEqual(ix)
        expect(Users.index3).not.toBe(ix)
      })
      describe("with two subindexes", () => {
        it("adding an entity should only change the appropriate subindex", () => {
          const u1 = action(() =>
            Users.add(new User("daryl", "m", 40), "user#1")
          )
          const u2 = action(() =>
            Users.add(new User("harriet", "f", 45), "user#2")
          )
          expect(Users.index3).toEqual({m: [u1], f: [u2]})
          const ix = Users.index3
          const ixm = Users.index3.m
          const ixf = Users.index3.f
          const u3 = action(() =>
            Users.add(new User("joel", "m", 21), "user#3")
          )
          expect(Users.index3).toEqual({m: [u3, u1], f: [u2]})
          expect(Users.index3).toEqual(ix)
          expect(Users.index3).not.toBe(ix)
          expect(Users.index3.m).toEqual(ixm)
          expect(Users.index3.m).not.toBe(ixm)
          expect(Users.index3.f).toBe(ixf)
        })
        it("removing an entity should only change the appropriate subindex", () => {
          const u1 = action(() =>
            Users.add(new User("daryl", "m", 40), "user#1")
          )
          const u2 = action(() =>
            Users.add(new User("harriet", "f", 45), "user#2")
          )
          expect(Users.index3).toEqual({m: [u1], f: [u2]})
          const ix = Users.index3
          const ixm = Users.index3.m
          const ixf = Users.index3.f
          const u3 = action(() => Users.remove(u1))
          expect(Users.index3).toEqual({f: [u2]})
          expect(Users.index3).toEqual(ix)
          expect(Users.index3).not.toBe(ix)
          expect(Users.index3.f).toBe(ixf)
        })
        it("changing an entity property should only change the appropriate subindex", () => {
          const u1 = action(() =>
            Users.add(new User("daryl", "m", 40), "user#1")
          )
          const u2 = action(() =>
            Users.add(new User("harriet", "f", 45), "user#2")
          )
          const u3 = action(() =>
            Users.add(new User("joel", "m", 21), "user#3")
          )
          expect(Users.index3).toEqual({m: [u3, u1], f: [u2]})
          const ix = Users.index3
          const ixm = Users.index3.m
          const ixf = Users.index3.f
          action(() => (u1.height = 20))
          expect(Users.index3).toEqual({m: [u1, u3], f: [u2]})
          expect(Users.index3).toEqual(ix)
          expect(Users.index3).not.toBe(ix)
          expect(Users.index3.m).toEqual(ixm)
          expect(Users.index3.m).not.toBe(ixm)
          expect(Users.index3.f).toBe(ixf)
        })
        it("changing an unrelated entity property should only change the appropriate subindex", () => {
          const u1 = action(() =>
            Users.add(new User("daryl", "m", 40), "user#1")
          )
          const u2 = action(() =>
            Users.add(new User("harriet", "f", 45), "user#2")
          )
          const u3 = action(() =>
            Users.add(new User("joel", "m", 21), "user#3")
          )
          expect(Users.index3).toEqual({m: [u3, u1], f: [u2]})
          const ix = Users.index3
          const ixm = Users.index3.m
          const ixf = Users.index3.f
          action(() => (u1.name = "mark"))
          expect(Users.index3).toEqual({m: [u3, u1], f: [u2]})
          expect(Users.index3).toEqual(ix)
          expect(Users.index3).not.toBe(ix)
          expect(Users.index3.m).toEqual(ixm)
          expect(Users.index3.m).not.toBe(ixm)
          expect(Users.index3.f).toBe(ixf)
        })
      })
      describe("with a second level of subindexes", () => {
        it("should only change the sub-sub-index with a changed entity", () => {
          const u1 = action(() =>
            Users.add(new User("daryl", "m", 40, "active"), "user#1")
          )
          const u2 = action(() =>
            Users.add(new User("mark", "m", 30, "inactive"), "user#2")
          )
          const u3 = action(() =>
            Users.add(new User("peter", "m", 20, "inactive"), "user#3")
          )
          const u4 = action(() =>
            Users.add(new User("lee", "f", 25, "active"), "user#4")
          )
          expect(Users.index4).toEqual({
            m: {active: [u1], inactive: [u3, u2]},
            f: {active: [u4]},
          })

          const ix = Users.index4
          const ixm = Users.index4.m
          const ixma = Users.index4.m.active
          const ixmi = Users.index4.m.inactive
          const ixf = Users.index4.f
          const ixfa = Users.index4.f.active

          action(() => (u3.age = 35))

          expect(Users.index4).toEqual(ix)
          expect(Users.index4.m).toEqual(ixm)
          expect(Users.index4.m.active).toEqual(ixma)
          expect(Users.index4.m.inactive).toEqual(ixmi)
          expect(Users.index4.f).toEqual(ixf)
          expect(Users.index4.f.active).toEqual(ixfa)

          expect(Users.index4).not.toBe(ix)
          expect(Users.index4.m).not.toBe(ixm)
          expect(Users.index4.m.active).toBe(ixma)
          expect(Users.index4.m.inactive).not.toBe(ixmi)
          expect(Users.index4.f).toBe(ixf)
          expect(Users.index4.f.active).toBe(ixfa)
        })
      })
    })
  })
  describe("HasMany", () => {
    it("should change identity if a referenced entity changes", () => {
      const u1 = action(() => Users.add(new User("mark"), "user#1"))
      const u2 = action(() => Users.add(new User("maia"), "user#2"))
      const j1 = action(() => Jobs.add(new Job("musician", "user#1")))
      const j2 = action(() => Jobs.add(new Job("banker", "user#1")))
      const j3 = action(() => Jobs.add(new Job("teacher", "user#2")))

      expect(u1.jobs).toEqual([j2, j1])
      expect(u2.jobs).toEqual([j3])

      const u1j = u1.jobs
      const u2j = u2.jobs

      action(() => (j2.name = "actor"))

      expect(u1.jobs).toEqual(u1j)
      expect(u2.jobs).toEqual(u2j)
      expect(u1.jobs).not.toBe(u1j)
      expect(u2.jobs).toBe(u2j)
    })
    it("should change identity if a referenced entity changes an unrelated property", () => {
      const u1 = action(() => Users.add(new User("mark"), "user#1"))
      const u2 = action(() => Users.add(new User("maia"), "user#2"))
      const j1 = action(() => Jobs.add(new Job("musician", "user#1")))
      const j2 = action(() => Jobs.add(new Job("banker", "user#1")))
      const j3 = action(() => Jobs.add(new Job("teacher", "user#2")))

      expect(u1.jobs).toEqual([j2, j1])
      expect(u2.jobs).toEqual([j3])

      const u1j = u1.jobs
      const u2j = u2.jobs

      action(() => (j2.salary = 1000))

      expect(u1.jobs).toEqual(u1j)
      expect(u2.jobs).toEqual(u2j)
      expect(u1.jobs).not.toBe(u1j)
      expect(u2.jobs).toBe(u2j)
    })
    it("should not change identity of an empty array", () => {
      const u1 = action(() => Users.add(new User("mark"), "user#1"))
      const u2 = action(() => Users.add(new User("maia"), "user#2"))
      const j1 = action(() => Jobs.add(new Job("musician", "user#1")))
      const j2 = action(() => Jobs.add(new Job("banker", "user#1")))

      expect(u1.jobs).toEqual([j2, j1])
      expect(u2.jobs).toEqual([])

      const u1j = u1.jobs
      const u2j = u2.jobs

      action(() => (j2.salary = 1000))

      expect(u1.jobs).toEqual(u1j)
      expect(u2.jobs).toEqual(u2j)
      expect(u1.jobs).not.toBe(u1j)
      expect(u2.jobs).toBe(u2j)
    })
  })
  describe("identity of selector results", () => {
    it("should change if recomputed", () => {
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
      // return a new result
      m.action(() => (E1s.entitiesById.id1.v1 = 15))
      const r2 = E1s.v2s()
      expect(r2).toEqual([10, 20, 30])
      expect(v2scalled).toBe(2)

      expect(r1).toEqual(r2)
      expect(r1).not.toBe(r2)
    })
  })
})
