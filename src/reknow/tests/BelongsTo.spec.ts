import * as R from "../Reknow"

describe("BelongsTo", () => {
  class User extends R.Entity {
    constructor(public name: string) {
      super()
    }
  }
  class _Users extends R.Entities<User> {}
  const Users = new _Users(User)

  class Job extends R.Entity {
    dependentUnspecifiedId!: string | null
    dependentNoneId!: string | null
    dependentRemoveId!: string | null
    constructor(
      public name: string,
      public userId: string | null = null,
      public userName: string | null = null
    ) {
      super()
    }
    @R.belongsTo(() => User, "userId") user!: User | null
    @R.belongsTo(() => User, "userName", {foreignKey: "name"})
    userByName!: User | null

    @R.belongsTo(() => User, "dependentUnspecifiedId")
    dependentUnspecified!: User | null
    @R.belongsTo(() => User, "dependentNoneId", {dependent: "none"})
    dependentNone!: User | null
    @R.belongsTo(() => User, "dependentRemoveId", {dependent: "remove"})
    dependentRemove!: User | null
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
        expect(j1.user).toBe(u1)
      })
    })
    it("should resolve by non-existent id", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker", "user#2"))
        expect(j1.user).toBe(null)
      })
    })
    it("should resolve by a different foreignKey", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker", null, "jack"))
        expect(j1.userByName).toBe(u1)
      })
    })
    it("should resolve by non-existent different foreignKey", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker", null, "sam"))
        expect(j1.userByName).toBe(null)
      })
    })
    it("should set value by id", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        expect(j1.user).toBe(null)
        j1.userId = "user#1"
        expect(j1.user).toBe(u1)
        j1.userId = "user#2"
        expect(j1.user).toBe(null)
      })
    })
    it("should set value by a different foreignKey", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const j1 = Jobs.add(new Job("banker"))
        expect(j1.userByName).toBe(null)
        j1.userName = "jack"
        expect(j1.userByName).toBe(u1)
        j1.userName = "sam"
        expect(j1.userByName).toBe(null)
      })
    })
  })
  describe("set value", () => {
    it("should set value by id", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker"))

        expect(j1.userId).toBe(null)
        j1.user = u1
        expect(j1.userId).toBe("user#1")
        j1.user = u2
        expect(j1.userId).toBe("user#2")
        j1.user = null
        expect(j1.userId).toBe(null)
      })
    })
    it("should set value by foreign key", () => {
      action(() => {
        const u1 = Users.add(new User("jack"), "user#1")
        const u2 = Users.add(new User("sam"), "user#2")
        const j1 = Jobs.add(new Job("banker"))

        expect(j1.userName).toBe(null)
        j1.userByName = u1
        expect(j1.userName).toBe("jack")
        j1.userByName = u2
        expect(j1.userName).toBe("sam")
        j1.userByName = null
        expect(j1.userName).toBe(null)
      })
    })
  })
  describe("dependent", () => {
    describe("none", () => {
      it("should not remove foreign if changed", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const u2 = Users.add(new User("sam"), "user#2")
          const j1 = Jobs.add(new Job("banker"))

          expect(j1.dependentNone).toBe(null)
          j1.dependentNone = u1
          j1.dependentNone = u2
          expect(Users.entitiesById["user#1"]).toBe(u1)
          j1.dependentNone = null
          expect(Users.entitiesById["user#2"]).toBe(u2)
        })
      })
      it("should not remove foreign if primary removed", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"))

          j1.dependentNone = u1
          Jobs.remove(j1)
          expect(Users.entitiesById["user#1"]).toBe(u1)
        })
      })
    })
    describe("unspecified defaults to none", () => {
      it("should not remove foreign if changed", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const u2 = Users.add(new User("sam"), "user#2")
          const j1 = Jobs.add(new Job("banker"))

          expect(j1.dependentUnspecified).toBe(null)
          j1.dependentUnspecified = u1
          j1.dependentUnspecified = u2
          expect(Users.entitiesById["user#1"]).toBe(u1)
          j1.dependentUnspecified = null
          expect(Users.entitiesById["user#2"]).toBe(u2)
        })
      })
      it("should not remove foreign if primary removed", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"))

          j1.dependentUnspecified = u1
          Jobs.remove(j1)
          expect(Users.entitiesById["user#1"]).toBe(u1)
        })
      })
    })
    describe("remove", () => {
      it("should remove foreign if changed", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const u2 = Users.add(new User("sam"), "user#2")
          const j1 = Jobs.add(new Job("banker"))

          expect(j1.dependentRemove).toBe(null)
          j1.dependentRemove = u1
          j1.dependentRemove = u2
          expect(Users.entitiesById["user#1"] == null).toBe(true)
          j1.dependentRemove = null
          expect(Users.entitiesById["user#2"] == null).toBe(true)
        })
      })
      it("should not remove foreign if changed to same value", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"))

          expect(j1.dependentRemove).toBe(null)
          j1.dependentRemove = u1
          j1.dependentRemove = u1
          expect(Users.entitiesById["user#1"]).toBe(u1)
        })
      })
      it("should remove foreign if primary removed", () => {
        action(() => {
          const u1 = Users.add(new User("jack"), "user#1")
          const j1 = Jobs.add(new Job("banker"))

          j1.dependentRemove = u1
          Jobs.remove(j1)
          expect(Users.entitiesById["user#1"] == null).toBe(true)
        })
      })
    })
    describe("circular dependentRemove", () => {
      it("should not get caught in an infinite loop", () => {
        class M1 extends R.Entity {
          @R.id id!: string
          @R.belongsTo(() => M2, "m2Id", {dependent: "remove"}) m2!: M2 | null
          constructor(public m2Id: string) {
            super()
          }
        }
        class _M1s extends R.Entities<M1> {}
        const M1s = new _M1s(M1)

        class M2 extends R.Entity {
          @R.id id!: string
          @R.hasOne(() => M1, "m2Id", {dependent: "remove"}) m1!: M1 | null
        }
        class _M2s extends R.Entities<M2> {}
        const M2s = new _M2s(M2)

        const AppModel = new R.StateManager({entities: {M1s, M2s}})

        // Removing m1 should remove m2
        {
          AppModel.clearState()
          const m2 = AppModel.action(() => M2s.add(new M2()))
          const m1 = AppModel.action(() => M1s.add(new M1(m2.id)))

          expect(m1.m2).toBe(m2)
          expect(m2.m1).toBe(m1)
          expect(M1s.entitiesById[m1.id] == null).toBe(false)
          expect(M2s.entitiesById[m2.id] == null).toBe(false)

          expect(() => AppModel.action(() => M1s.remove(m1))).not.toThrow()

          expect(M1s.entitiesById[m1.id] == null).toBe(true)
          expect(M2s.entitiesById[m2.id] == null).toBe(true)
        }

        // Removing m2 should remove m1
        {
          AppModel.clearState()
          const m2 = AppModel.action(() => M2s.add(new M2()))
          const m1 = AppModel.action(() => M1s.add(new M1(m2.id)))

          expect(() => AppModel.action(() => M2s.remove(m2))).not.toThrow()

          expect(M1s.entitiesById[m1.id] == null).toBe(true)
          expect(M2s.entitiesById[m2.id] == null).toBe(true)
        }
      })
    })
  })
  describe("selecting indexes", () => {
    it("should use a matching index", () => {
      class M1 extends R.Entity {
        @R.belongsTo(() => M2, "m1Id", {foreignKey: "name"}) r!: M2 | null
      }
      class _M1s extends R.Entities<M1> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<M2> {
        @R.uniqueIndex("=name") ix1!: R.UniqueHashIndex<M2>
      }
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r")).toEqual("ix1")
    })
    it("should re-use a created index", () => {
      class M1 extends R.Entity {
        @R.belongsTo(() => M2, "m1Id", {foreignKey: "name"}) r!: M2 | null
        @R.belongsTo(() => M2, "m1Id", {foreignKey: "name"}) r2!: M2 | null
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
    it("should not use a non-unique index", () => {
      class M1 extends R.Entity {
        @R.belongsTo(() => M2, "m1Id", {foreignKey: "name"}) r!: M2 | null
      }
      class _M1s extends R.Entities<M1> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<M2> {
        @R.index("=name") ix1!: R.HashIndex<R.SortIndex<M2>>
      }
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r")).not.toEqual("ix1")
    })
    it("should not use an index for a different property", () => {
      class M1 extends R.Entity {
        @R.belongsTo(() => M2, "m1Id", {foreignKey: "name"}) r!: M2 | null
      }
      class _M1s extends R.Entities<M1> {}
      const M1s = new _M1s(M1)
      class M2 extends R.Entity {}
      class _M2s extends R.Entities<M2> {
        @R.uniqueIndex("=name2") ix1!: R.UniqueHashIndex<M2>
      }
      const M2s = new _M2s(M2)
      const AppModel = new R.StateManager({entities: {M1s, M2s}})

      expect(M1s.getRelationshipIndexName("r")).not.toEqual("ix1")
    })
  })
})
