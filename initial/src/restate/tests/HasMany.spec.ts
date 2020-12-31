import * as R from "../Restate"

describe("HasMany", () => {
  class User extends R.Entity {
    constructor(public name: string) {
      super()
    }

    @R.hasMany(() => Job, "userId", {sort: "+name"}) jobs: Array<Job>
    @R.hasMany(() => Job, "userName", {primaryKey: "name"})
    jobsByName: Array<Job>

    @R.hasMany(() => Job, "dependentUnspecifiedId")
    dependentUnspecifieds: Array<Job>
    @R.hasMany(() => Job, "dependentNoneId", {dependent: "none"})
    dependentNones: Array<Job>
    @R.hasMany(() => Job, "dependentRemoveId", {dependent: "remove"})
    dependentRemoves: Array<Job>
    @R.hasMany(() => Job, "dependentNullifyId", {dependent: "nullify"})
    dependentNullifys: Array<Job>
  }
  class _Users extends R.Entities<User> {}
  const Users = new _Users(User)

  class Job extends R.Entity {
    dependentUnspecifiedId!: string | null
    dependentNoneId!: string | null
    dependentRemoveId!: string | null
    dependentNullifyId!: string | null
    constructor(
      public name: string,
      public userId: string | null = null,
      public userName: string | null = null
    ) {
      super()
    }
  }
  class _Jobs extends R.Entities<Job> {}
  const Jobs = new _Jobs(Job)

  const AppModel = new R.StateManager({entities: {Users, Jobs}})
  const action = <T>(f: () => T) => {
    AppModel.action(f)
  }
  beforeEach(() => {
    AppModel.clearState()
  })
  describe("get value", () => {
    it("should return empty array with no elements", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        expect(u1.jobs).toEqual([])
        expect(u1.jobsByName).toEqual([])
      })
    })
    it("should return an element constructed with primary key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker", "user#1"))
        expect(u1.jobs).toEqual([j1])
        expect(u1.jobs[0]).toBe(j1)
      })
    })
    it("should return an element assigned with primary key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        expect(u1.jobs).toEqual([])
        j1.userId = "user#1"
        expect(u1.jobs).toEqual([j1])
        expect(u1.jobs[0]).toBe(j1.currentEntity)
      })
    })
    it("should return multiple elements constructed with different primary keys", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker", "user#1"))
        const j2 = Jobs.add(new Job("acrobat", "user#2"))
        const j3 = Jobs.add(new Job("carpenter", "user#1"))
        expect(u1.jobs).toEqual([j1, j3])
        expect(u1.jobs[0]).toBe(j1)
        expect(u1.jobs[1]).toBe(j3)
        expect(u2.jobs).toEqual([j2])
        expect(u2.jobs[0]).toBe(j2)
      })
    })
    it("should return multiple elements assigned to different primary keys", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        const j2 = Jobs.add(new Job("acrobat"))
        expect(u1.jobs).toEqual([])
        j1.userId = "user#1"
        expect(u1.jobs).toEqual([j1])
        expect(u1.jobs[0]).toBe(j1.currentEntity)
        j2.userId = "user#1"
        expect(u1.jobs).toEqual([j2, j1])
        expect(u1.jobs[0]).toBe(j2.currentEntity)
        expect(u1.jobs[1]).toBe(j1.currentEntity)
      })
    })
    it("should return multiple elements constructed with different foreign keys", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker", null, "jack"))
        const j2 = Jobs.add(new Job("acrobat", null, "sam"))
        const j3 = Jobs.add(new Job("carpenter", null, "jack"))
        expect(u1.jobsByName).toEqual([j1, j3])
        expect(u1.jobsByName[0]).toBe(j1)
        expect(u1.jobsByName[1]).toBe(j3)
        expect(u2.jobsByName).toEqual([j2])
        expect(u2.jobsByName[0]).toBe(j2)
      })
    })
    it("should return multiple elements assigned to different foreign keys", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker"))
        const j2 = Jobs.add(new Job("acrobat"))
        const j3 = Jobs.add(new Job("carpenter"))
        j1.userName = "jack"
        expect(u1.jobsByName).toEqual([j1])
        j2.userName = "sam"
        expect(u2.jobsByName).toEqual([j2])
        j3.userName = "jack"
        expect(u1.jobsByName).toEqual([j1, j3])
      })
    })
    it("should move items between primary keys", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker"))
        j1.userId = "user#1"
        expect(u1.jobs).toEqual([j1])
        expect(u2.jobs).toEqual([])
        j1.userId = "user#2"
        expect(u1.jobs).toEqual([])
        expect(u2.jobs).toEqual([j1])
      })
    })
  })
  describe("set value", () => {
    it("should add an item to an empty array by primary key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        u1.jobs = [j1]
        expect(u1.jobs).toEqual([j1])
        expect(u1.jobs[0]).toBe(j1.currentEntity)
        expect(j1.userId).toBe("user#1")
      })
    })
    it("should add multiple items to an empty array by primary key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        const j2 = Jobs.add(new Job("acrobat"))
        u1.jobs = [j1, j2]
        expect(u1.jobs).toEqual([j2, j1])
        expect(u1.jobs[0]).toBe(j2.currentEntity)
        expect(u1.jobs[1]).toBe(j1.currentEntity)
        expect(j1.userId).toBe("user#1")
        expect(j2.userId).toBe("user#1")
      })
    })
    it("should remove multiple items when assigning a new array by primary key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker", "user#1"))
        const j2 = Jobs.add(new Job("acrobat", "user#1"))
        expect(u1.jobs).toEqual([j2, j1])
        u1.jobs = []
        expect(u1.jobs).toEqual([])
        expect(j1.userId).toBe(null)
        expect(j2.userId).toBe(null)
      })
    })
    it("should remove multiple items when assigning null by primary key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker", "user#1"))
        const j2 = Jobs.add(new Job("acrobat", "user#1"))
        expect(u1.jobs).toEqual([j2, j1])
        u1.jobs = null
        expect(u1.jobs).toEqual([])
        expect(j1.userId).toBe(null)
        expect(j2.userId).toBe(null)
      })
    })
    it("should not change items assigned again by primary key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker", "user#1"))
        const j2 = Jobs.add(new Job("acrobat", "user#1"))
        expect(u1.jobs).toEqual([j2, j1])
        u1.jobs = [j1]
        expect(u1.jobs).toEqual([j1])
        expect(j1.userId).toBe("user#1")
        expect(j1).toBe(j1.currentEntity)
        expect(j2.userId).toBe(null)
      })
    })
    it("should add, remove, and change items appropriately", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker", "user#1"))
        const j2 = Jobs.add(new Job("acrobat", "user#2"))
        const j3 = Jobs.add(new Job("carpenter", "user#1"))
        expect(u1.jobs).toEqual([j1, j3])
        expect(u2.jobs).toEqual([j2])

        u1.jobs = [j3, j2]
        expect(u1.jobs).toEqual([j2, j3])
        expect(u2.jobs).toEqual([])
        expect(j1.userId).toBe(null)
        expect(j2.userId).toBe("user#1")
        expect(j3.userId).toBe("user#1")
      })
    })
    it("should add, remove, and change items by foreign key appropriately", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker", null, "jack"))
        const j2 = Jobs.add(new Job("acrobat", null, "sam"))
        const j3 = Jobs.add(new Job("carpenter", null, "jack"))
        expect(u1.jobsByName).toEqual([j1, j3])
        expect(u2.jobsByName).toEqual([j2])

        u1.jobsByName = [j3, j2]
        expect(u1.jobsByName).toEqual([j2, j3])
        expect(u2.jobsByName).toEqual([])
        expect(j1.userName).toBe(null)
        expect(j2.userName).toBe("jack")
        expect(j3.userName).toBe("jack")
      })
    })
  })
  describe("modify array", () => {
    it("should add an item by primary key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        const j2 = Jobs.add(new Job("acrobat"))
        expect(u1.jobs).toEqual([])
        u1.jobs.push(j1)
        expect(u1.jobs).toEqual([j1])
        expect(j1.userId).toBe("user#1")
        u1.jobs.push(j2)
        expect(u1.jobs).toEqual([j2, j1])
        expect(j1.userId).toBe("user#1")
        expect(j2.userId).toBe("user#1")
      })
    })
    describe("should remove an item by primary key", () => {
      it("by delete", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", "user#1"))
          expect(u1.jobs).toEqual([j1])
          delete u1.jobs[0]
          expect(u1.jobs).toEqual([])
          expect(j1.userId).toBe(null)
        })
      })
      it("by assigning to null", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", "user#1"))
          expect(u1.jobs).toEqual([j1])
          u1.jobs[0] = null
          expect(u1.jobs).toEqual([])
          expect(j1.userId).toBe(null)
        })
      })
      it("by popping", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", "user#1"))
          expect(u1.jobs).toEqual([j1])
          expect(u1.jobs.pop()).toEqual(j1)
          expect(u1.jobs).toEqual([])
          expect(j1.userId).toBe(null)
        })
      })
    })
    it("should move an item by primary key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker", "user#1"))
        expect(u1.jobs).toEqual([j1])
        expect(u2.jobs).toEqual([])
        u2.jobs[0] = u1.jobs[0]
        expect(u1.jobs).toEqual([])
        expect(u2.jobs).toEqual([j1])
        expect(j1.userId).toBe("user#2")
      })
    })
    it("should add an item by foreign key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        const j2 = Jobs.add(new Job("acrobat"))
        expect(u1.jobsByName).toEqual([])
        u1.jobsByName.push(j1)
        expect(u1.jobsByName).toEqual([j1])
        expect(j1.userName).toBe("jack")
        u1.jobsByName.push(j2)
        expect(u1.jobsByName).toEqual([j1, j2])
        expect(j1.userName).toBe("jack")
        expect(j2.userName).toBe("jack")
      })
    })
    describe("should remove an item by foreign key", () => {
      it("by delete", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", null, "jack"))
          expect(u1.jobsByName).toEqual([j1])
          delete u1.jobsByName[0]
          expect(u1.jobsByName).toEqual([])
          expect(j1.userName).toBe(null)
        })
      })
      it("by assigning to null", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", null, "jack"))
          expect(u1.jobsByName).toEqual([j1])
          u1.jobsByName[0] = null
          expect(u1.jobsByName).toEqual([])
          expect(j1.userName).toBe(null)
        })
      })
      it("by popping", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", null, "jack"))
          expect(u1.jobsByName).toEqual([j1])
          expect(u1.jobsByName.pop()).toEqual(j1)
          expect(u1.jobsByName).toEqual([])
          expect(j1.userName).toBe(null)
        })
      })
    })
    it("should move an item by foreign key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker", null, "jack"))
        expect(u1.jobsByName).toEqual([j1])
        expect(u2.jobsByName).toEqual([])
        u2.jobsByName[0] = u1.jobsByName[0]
        expect(u1.jobsByName).toEqual([])
        expect(u2.jobsByName).toEqual([j1])
        expect(j1.userName).toBe("sam")
      })
    })
  })
  describe("dependent", () => {
    describe("none", () => {
      it("should not remove foreign if changed but should nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", "user#1"), "job#1")
          u1.dependentNones.push(j1)
          expect(j1.dependentNoneId).toBe("user#1")
          u1.dependentNones.pop()
          expect(j1.dependentNoneId).toBe(null)
          expect(Jobs.entitiesById["job#1"]).toBe(j1.currentEntity)
        })
      })
      it("should not remove foreign if primary removed and should not nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", "user#1"), "job#1")
          const j2 = Jobs.add(new Job("carpenter", "user#1"), "job#2")
          u1.dependentNones.push(j1, j2)
          Users.remove(u1)
          expect(j1.dependentNoneId).toBe("user#1")
          expect(j2.dependentNoneId).toBe("user#1")
          expect(Jobs.entitiesById["job#1"]).toBe(j1.currentEntity)
          expect(Jobs.entitiesById["job#2"]).toBe(j2.currentEntity)
        })
      })
    })
    describe("nullify", () => {
      it("should not remove foreign if changed but should nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", "user#1"), "job#1")
          u1.dependentNullifys.push(j1)
          expect(j1.dependentNullifyId).toBe("user#1")
          u1.dependentNullifys.pop()
          expect(j1.dependentNullifyId).toBe(null)
          expect(Jobs.entitiesById["job#1"]).toBe(j1.currentEntity)
        })
      })
      it("should not remove foreign if primary removed but should nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", "user#1"), "job#1")
          const j2 = Jobs.add(new Job("carpenter", "user#1"), "job#2")
          u1.dependentNullifys.push(j1, j2)
          Users.remove(u1)
          expect(j1.dependentNullifyId).toBe(null)
          expect(j2.dependentNullifyId).toBe(null)
          expect(Jobs.entitiesById["job#1"]).toBe(j1.currentEntity)
          expect(Jobs.entitiesById["job#2"]).toBe(j2.currentEntity)
        })
      })
    })
    describe("default is nullify", () => {
      it("should not remove foreign if changed but should nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", "user#1"), "job#1")
          u1.dependentUnspecifieds.push(j1)
          expect(j1.dependentUnspecifiedId).toBe("user#1")
          u1.dependentUnspecifieds.pop()
          expect(j1.dependentUnspecifiedId).toBe(null)
          expect(Jobs.entitiesById["job#1"]).toBe(j1.currentEntity)
        })
      })
      it("should not remove foreign if primary removed but should nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", "user#1"), "job#1")
          const j2 = Jobs.add(new Job("carpenter", "user#1"), "job#2")
          u1.dependentUnspecifieds.push(j1, j2)
          Users.remove(u1)
          expect(j1.dependentUnspecifiedId).toBe(null)
          expect(j2.dependentUnspecifiedId).toBe(null)
          expect(Jobs.entitiesById["job#1"]).toBe(j1.currentEntity)
          expect(Jobs.entitiesById["job#2"]).toBe(j2.currentEntity)
        })
      })
    })
    describe("nullify", () => {
      it("should remove foreign if changed", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", "user#1"), "job#1")
          u1.dependentRemoves.push(j1)
          expect(j1.dependentRemoveId).toBe("user#1")
          u1.dependentRemoves.pop()
          expect(Jobs.entitiesById["job#1"] == null).toBe(true)
        })
      })
      it("should not remove foreign if primary removed but should remove key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker", "user#1"), "job#1")
          const j2 = Jobs.add(new Job("carpenter", "user#1"), "job#2")
          u1.dependentRemoves.push(j1, j2)
          Users.remove(u1)
          expect(Jobs.entitiesById["job#1"] == null).toBe(true)
          expect(Jobs.entitiesById["job#2"] == null).toBe(true)
        })
      })
    })
    describe("circular dependentRemove", () => {
      it("should not get caught in an infinite loop", () => {
        class M1 extends R.Entity {
          @R.id id: string
          @R.hasMany(() => M2, "m1Id", {dependent: "remove", sort: "+num"})
          m2s!: M2 | null
        }
        class _M1s extends R.Entities<User> {}
        const M1s = new _M1s(M1)

        class M2 extends R.Entity {
          @R.id id: string
          @R.belongsTo(() => M1, "m1Id", {dependent: "remove"}) m1!: M1 | null
          constructor(public m1Id: string, public num: number) {
            super()
          }
        }
        class _M2s extends R.Entities<User> {}
        const M2s = new _M2s(M2)

        const AppModel = new R.StateManager({entities: {M1s, M2s}})

        // Removing m1 should remove m2
        {
          AppModel.clearState()
          const m1 = AppModel.action(() => M1s.add(new M1()))
          const m2a = AppModel.action(() => M2s.add(new M2(m1.id, 20)))
          const m2b = AppModel.action(() => M2s.add(new M2(m1.id, 10)))

          expect(m1.m2s[0]).toBe(m2b)
          expect(m1.m2s[1]).toBe(m2a)
          expect(m2a.m1).toBe(m1)
          expect(m2b.m1).toBe(m1)
          expect(M1s.entitiesById[m1.id] == null).toBe(false)
          expect(M2s.entitiesById[m2a.id] == null).toBe(false)
          expect(M2s.entitiesById[m2b.id] == null).toBe(false)

          expect(() => AppModel.action(() => M1s.remove(m1))).not.toThrow()

          expect(M1s.entitiesById[m1.id] == null).toBe(true)
          expect(M2s.entitiesById[m2a.id] == null).toBe(true)
          expect(M2s.entitiesById[m2b.id] == null).toBe(true)
        }

        // Removing an m2 should remove m1
        {
          AppModel.clearState()
          const m1 = AppModel.action(() => M1s.add(new M1()))
          const m2a = AppModel.action(() => M2s.add(new M2(m1.id, 20)))
          const m2b = AppModel.action(() => M2s.add(new M2(m1.id, 10)))

          expect(() => AppModel.action(() => M2s.remove(m2a))).not.toThrow()

          expect(M1s.entitiesById[m1.id] == null).toBe(true)
          expect(M2s.entitiesById[m2a.id] == null).toBe(true)
          expect(M2s.entitiesById[m2b.id] == null).toBe(true)
        }
      })
    })
  })
  describe("selecting indexes", () => {
    it("should use a matching index", () => {
      class M1 extends R.Entity {
        @R.hasMany(() => M2, "m1Id") r!: M2 | null
      }
      class _M1s extends R.Entities<User> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<User> {
        @R.index("=m1Id") ix1: R.HashIndex<R.SortIndex<M2>>
      }
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r")).toEqual("ix1")
    })
    it("should re-use a created index", () => {
      class M1 extends R.Entity {
        @R.hasMany(() => M2, "m1Id") r!: M2 | null
        @R.hasMany(() => M2, "m1Id") r2!: M2 | null
      }
      class _M1s extends R.Entities<User> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<User> {}
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r") == null).toBe(false)
      expect(M1s.getRelationshipIndexName("r")).toEqual(
        M1s.getRelationshipIndexName("r2")
      )
    })
    it("should not use a unique index", () => {
      class M1 extends R.Entity {
        @R.hasMany(() => M2, "m1Id") r!: M2 | null
      }
      class _M1s extends R.Entities<User> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<User> {
        @R.uniqueIndex("=m1Id") ix1: R.UniqueHashIndex<M2>
      }
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r")).not.toEqual("ix1")
    })
    it("should not use an index for a different property", () => {
      class M1 extends R.Entity {
        @R.hasMany(() => M2, "m1Id") r!: M2 | null
      }
      class _M1s extends R.Entities<User> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<User> {
        @R.index("=m1Id2") ix1: R.HashIndex<R.SortIndex<M2>>
      }
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r")).not.toEqual("ix1")
    })
    it("should use an index matching the sort directives", () => {
      class M1 extends R.Entity {
        @R.hasMany(() => M2, "m1Id", {sort: "-num"}) r!: M2 | null
      }
      class _M1s extends R.Entities<User> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<User> {
        @R.index("=m1Id") ix1: R.HashIndex<R.SortIndex<M2>>
        @R.index("=m1Id", "+num") ix2: R.HashIndex<R.SortIndex<M2>>
        @R.index("=m1Id", "-num") ix3: R.HashIndex<R.SortIndex<M2>>
      }
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r")).toEqual("ix3")
    })
    it("should use an index matching the first part of the sort directives", () => {
      class M1 extends R.Entity {
        @R.hasMany(() => M2, "m1Id", {sort: "-num"}) r!: M2 | null
      }
      class _M1s extends R.Entities<User> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<User> {
        @R.index("=m1Id") ix1: R.HashIndex<R.SortIndex<M2>>
        @R.index("=m1Id", "+num") ix2: R.HashIndex<R.SortIndex<M2>>
        @R.index("=m1Id", "-num", "+age", "-gender") ix3: R.HashIndex<
          R.SortIndex<M2>
        >
      }
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r")).toEqual("ix3")
    })
  })
})
