import * as R from "../Reknow"

describe("HasOne", () => {
  class User extends R.Entity {
    constructor(public name: string) {
      super()
    }

    @R.hasOne(() => Job, "userId") job!: Job | null
    @R.hasOne(() => Job, "userName", {primaryKey: "name"})
    jobByName!: Job | null

    @R.hasOne(() => Job, "dependentUnspecifiedId")
    dependentUnspecified!: Job | null
    @R.hasOne(() => Job, "dependentNoneId", {dependent: "none"})
    dependentNone!: Job | null
    @R.hasOne(() => Job, "dependentRemoveId", {dependent: "remove"})
    dependentRemove!: Job | null
    @R.hasOne(() => Job, "dependentNullifyId", {dependent: "nullify"})
    dependentNullify!: Job | null
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
    it("should resolve by id", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker", "user#1"))
        expect(u1.job).toBe(j1)
      })
    })
    it("should resolve by non-existent id", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker", "user#2"))
        expect(u1.job).toBe(null)
      })
    })
    it("should resolve by a different foreignKey", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker", null, "jack"))
        expect(u1.jobByName).toBe(j1)
      })
    })
    it("should resolve by non-existent different foreignKey", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker", null, "sam"))
        expect(u1.jobByName).toBe(null)
      })
    })
    it("should set value by id", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        expect(u1.job).toBe(null)
        j1.userId = "user#1"
        expect(u1.job).toBe(j1.currentEntity)
        j1.userId = "user#2"
        expect(u1.job).toBe(null)
      })
    })
    it("should enforce uniqueness by id", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        const j2 = Jobs.add(new Job("carpenter"))
        expect(u1.job).toBe(null)
        j1.userId = "user#1"
        expect(() => (j2.userId = "user#1")).toThrow(
          new Error(
            `Unique key violation: attempt to add multiple entities with key "user#1" from property "userId" in index "_indexForRelationship_Jobs.job"`
          )
        )
      })
    })
    it("should set value by a different foreignKey", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        expect(u1.jobByName).toBe(null)
        j1.userName = "jack"
        expect(u1.jobByName).toBe(j1.currentEntity)
        j1.userName = "sam"
        expect(u1.jobByName).toBe(null)
      })
    })
    it("should enforce uniqueness by foreignKey", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        const j2 = Jobs.add(new Job("carpenter"))
        expect(u1.jobByName).toBe(null)
        j1.userName = "jack"
        expect(() => (j2.userName = "jack")).toThrow(
          new Error(
            `Unique key violation: attempt to add multiple entities with key "jack" from property "userName" in index "_indexForRelationship_Jobs.jobByName"`
          )
        )
      })
    })
  })
  describe("set value", () => {
    it("should set value by id", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker"))
        const j2 = Jobs.add(new Job("carpenter"))

        expect(j1.userId).toBe(null)
        u1.job = j1
        expect(j1.userId).toBe("user#1")
        u2.job = j1
        expect(j1.userId).toBe("user#2")
        u2.job = j2
        expect(j1.userId).toBe(null)
        expect(j2.userId).toBe("user#2")
        u2.job = null
        expect(j2.userId).toBe(null)
      })
    })
    it("should set value by foreign key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker"))
        const j2 = Jobs.add(new Job("carpenter"))

        expect(j1.userName).toBe(null)
        u1.jobByName = j1
        expect(j1.userName).toBe("jack")
        u2.jobByName = j1
        expect(j1.userName).toBe("sam")
        u2.jobByName = j2
        expect(j1.userName).toBe(null)
        expect(j2.userName).toBe("sam")
        u2.jobByName = null
        expect(j2.userName).toBe(null)
      })
    })
  })
  describe("dependent", () => {
    describe("none", () => {
      it("should not remove foreign if changed but should nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"), "job#1")
          const j2 = Jobs.add(new Job("carpenter"), "job#2")

          expect(u1.dependentNone).toBe(null)
          u1.dependentNone = j1
          expect(j1.dependentNoneId).toBe("user#1")
          u1.dependentNone = j2
          expect(j1.dependentNoneId).toBe(null)
          expect(j2.dependentNoneId).toBe("user#1")
          expect(Jobs.byId["job#1"]).toBe(j1.currentEntity)
          u1.dependentNone = null
          expect(Jobs.byId["job#2"]).toBe(j2.currentEntity)
        })
      })
      it("should not remove foreign if primary removed and should not nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"), "job#1")

          u1.dependentNone = j1
          Users.remove(u1)
          expect(j1.dependentNoneId).toBe("user#1")
          expect(Jobs.byId["job#1"]).toBe(j1.currentEntity)
        })
      })
    })
    describe("nullify", () => {
      it("should not remove foreign if changed but should nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"), "job#1")
          const j2 = Jobs.add(new Job("carpenter"), "job#2")

          expect(u1.dependentNullify).toBe(null)
          u1.dependentNullify = j1
          expect(j1.dependentNullifyId).toBe("user#1")
          u1.dependentNullify = j2
          expect(j1.dependentNullifyId).toBe(null)
          expect(j2.dependentNullifyId).toBe("user#1")
          expect(Jobs.byId["job#1"]).toBe(j1.currentEntity)
          u1.dependentNullify = null
          expect(Jobs.byId["job#2"]).toBe(j2.currentEntity)
        })
      })
      it("should not remove foreign if primary removed but should nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"), "job#1")

          u1.dependentNullify = j1
          Users.remove(u1)
          expect(j1.dependentNullifyId).toBe(null)
          expect(Jobs.byId["job#1"]).toBe(j1.currentEntity)
        })
      })
    })
    describe("unspecified defaults to nullify", () => {
      it("should not remove foreign if changed but should nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"), "job#1")
          const j2 = Jobs.add(new Job("carpenter"), "job#2")

          expect(u1.dependentUnspecified).toBe(null)
          u1.dependentUnspecified = j1
          expect(j1.dependentUnspecifiedId).toBe("user#1")
          u1.dependentUnspecified = j2
          expect(j1.dependentUnspecifiedId).toBe(null)
          expect(j2.dependentUnspecifiedId).toBe("user#1")
          expect(Jobs.byId["job#1"]).toBe(j1.currentEntity)
          u1.dependentUnspecified = null
          expect(Jobs.byId["job#2"]).toBe(j2.currentEntity)
        })
      })
      it("should not remove foreign if primary removed but should nullify key", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"), "job#1")

          u1.dependentUnspecified = j1
          Users.remove(u1)
          expect(j1.dependentUnspecifiedId).toBe(null)
          expect(Jobs.byId["job#1"]).toBe(j1.currentEntity)
        })
      })
    })
    describe("remove", () => {
      it("should remove foreign if changed", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"), "job#1")
          const j2 = Jobs.add(new Job("carpenter"), "job#2")

          expect(u1.dependentRemove).toBe(null)
          u1.dependentRemove = j1
          expect(j1.dependentRemoveId).toBe("user#1")
          u1.dependentRemove = j2
          expect(j2.dependentRemoveId).toBe("user#1")
          expect(Jobs.byId["job#1"] == null).toBe(true)
          u1.dependentRemove = null
          expect(Jobs.byId["job#2"] == null).toBe(true)
        })
      })
      it("should remove foreign if primary removed", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"), "job#1")

          u1.dependentRemove = j1
          Users.remove(u1)
          expect(Jobs.byId["job#1"] == null).toBe(true)
        })
      })
    })
    describe("circular dependentRemove", () => {
      it("should not get caught in an infinite loop", () => {
        class M1 extends R.Entity {
          @R.id id!: string
          @R.hasOne(() => M2, "m1Id", {dependent: "remove"}) m2!: M2 | null
        }
        class _M1s extends R.Entities<M1> {}
        const M1s = new _M1s(M1)

        class M2 extends R.Entity {
          @R.id id!: string
          @R.belongsTo(() => M1, "m1Id", {dependent: "remove"}) m1!: M1 | null
          constructor(public m1Id: string) {
            super()
          }
        }
        class _M2s extends R.Entities<M2> {}
        const M2s = new _M2s(M2)

        const AppModel = new R.StateManager({entities: {M1s, M2s}})

        // Removing m1 should remove m2
        {
          AppModel.clearState()
          const m1 = AppModel.action(() => M1s.add(new M1()))
          const m2 = AppModel.action(() => M2s.add(new M2(m1.id)))

          expect(m1.m2).toBe(m2)
          expect(m2.m1).toBe(m1)
          expect(M1s.byId[m1.id] == null).toBe(false)
          expect(M2s.byId[m2.id] == null).toBe(false)

          expect(() => AppModel.action(() => M1s.remove(m1))).not.toThrow()

          expect(M1s.byId[m1.id] == null).toBe(true)
          expect(M2s.byId[m2.id] == null).toBe(true)
        }

        // Removing m2 should remove m1
        {
          AppModel.clearState()
          const m1 = AppModel.action(() => M1s.add(new M1()))
          const m2 = AppModel.action(() => M2s.add(new M2(m1.id)))

          expect(() => AppModel.action(() => M2s.remove(m2))).not.toThrow()

          expect(M1s.byId[m1.id] == null).toBe(true)
          expect(M2s.byId[m2.id] == null).toBe(true)
        }
      })
    })
  })
  describe("selecting indexes", () => {
    it("should use a matching index", () => {
      class M1 extends R.Entity {
        @R.hasOne(() => M2, "m1Id") r!: M2 | null
      }
      class _M1s extends R.Entities<M1> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<M2> {
        @R.uniqueIndex("=m1Id") ix1!: R.UniqueHashIndex<M2>
      }
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r")).toEqual("ix1")
    })
    it("should re-use a created index", () => {
      class M1 extends R.Entity {
        @R.hasOne(() => M2, "m1Id") r!: M2 | null
        @R.hasOne(() => M2, "m1Id") r2!: M2 | null
      }
      class _M1s extends R.Entities<M1> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<M2> {}
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r") == null).toBe(false)
      expect(M1s.getRelationshipIndexName("r")).toEqual(
        M1s.getRelationshipIndexName("r2")
      )
    })
    it("should not use an index that isn't unique", () => {
      class M1 extends R.Entity {
        @R.hasOne(() => M2, "m1Id") r!: M2 | null
      }
      class _M1s extends R.Entities<M1> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<M2> {
        @R.index("=m1Id") ix1!: R.HashIndex<R.SortIndex<M2>>
      }
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r")).not.toEqual("ix1")
    })
    it("should not use an index that's for a different property", () => {
      class M1 extends R.Entity {
        @R.hasOne(() => M2, "m1Id") r!: M2 | null
      }
      class _M1s extends R.Entities<M1> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<M2> {
        @R.uniqueIndex("=m1Name") ix1!: R.UniqueHashIndex<M2>
      }
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r")).not.toEqual("ix1")
    })
  })
})
