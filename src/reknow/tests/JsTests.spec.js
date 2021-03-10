import * as R from "../Reknow"

describe("JavaScript interface", () => {
  function createState() {
    // User entity
    class User extends R.Entity {
      static get entities() {
        return UserEntities
      }
      constructor(name, age) {
        super()
        this.name = name
        this.age = age
      }

      incrementAge() {
        this.age++
      }

      get ageName() {
        counts.ageName++
        return `${this.name} is ${this.age}`
      }

      updateAge2() {
        this.age2 = this.age * 2
      }

      afterAdd() {
        counts.afterAdd++
      }

      afterRemove() {
        counts.afterRemove++
      }

      afterChange() {
        counts.afterChange++
      }

      afterNameChange() {
        counts.afterNameChange++
      }

      afterAgeChange() {
        counts.afterAgeChange++
      }
    }
    User.id("idProp")
    User.action("incrementAge")
    User.query("ageName")
    User.reaction("updateAge2")
    User.hasMany("i1s", () => I1, "userId", {sort: "name"})
    User.hasOne("i2", () => I2, "userId")
    User.afterAdd("afterAdd")
    User.afterRemove("afterRemove")
    User.afterChange("afterChange")
    User.afterPropertyChange("name", "afterNameChange")
    User.afterPropertyChange("age", "afterAgeChange")

    class _UserEntities extends R.Entities {
      createUser1() {
        return this.add(new User("name1", 10), "u1")
      }
      createUser2() {
        return this.add(new User("name2", 20), "u2")
      }

      get user1() {
        return this.byId.u1
      }

      get ageName() {
        counts.entitiesAgeName++
        return this.user1.ageName
      }

      updateAge3() {
        const u = this.user1
        if (u) {
          u.age3 = u.age * 3
        }
      }
    }
    _UserEntities.action("createUser1")
    _UserEntities.action("createUser2")
    _UserEntities.query("ageName")
    _UserEntities.reaction("updateAge3")
    _UserEntities.index("byAge", "+age")
    _UserEntities.uniqueIndex("byName", "=name")

    const UserEntities = new _UserEntities(User)

    class _UserService extends R.Service {
      createUser1() {
        return User.entities.add(new User("name1", 10), "u1")
      }

      get user1() {
        return User.entities.byId.u1
      }

      get ageName() {
        counts.serviceAgeName++
        return this.user1.ageName
      }

      updateAge4() {
        const u = this.user1
        if (u) {
          u.age4 = u.age * 4
        }
      }
    }
    _UserService.action("createUser1")
    _UserService.query("ageName")
    _UserService.reaction("updateAge4")

    const UserService = new _UserService()

    // I1 entity
    class I1 extends R.Entity {
      static get entities() {
        return I1Entities
      }
      constructor(userId, name) {
        super()
        this.userId = userId
        this.name = name
      }
    }
    I1.belongsTo("user", () => User, "userId")

    class _I1Entities extends R.Entities {}
    const I1Entities = new _I1Entities(I1)

    // I2 entity
    class I2 extends R.Entity {
      static get entities() {
        return I2Entities
      }
      constructor(userId, name) {
        super()
        this.userId = userId
        this.name = name
      }
    }
    class _I2Entities extends R.Entities {}
    const I2Entities = new _I2Entities(I2)

    // StateManager
    const stateManager = new R.StateManager({
      entities: {
        User: User.entities,
        I1: I1.entities,
        I2: I2.entities,
      },
      services: {
        UserService,
      },
    })

    const action = (f) => stateManager.action(f)

    const counts = {
      ageName: 0,
      entitiesAgeName: 0,
      serviceAgeName: 0,
      afterAdd: 0,
      afterRemove: 0,
      afterChange: 0,
      afterNameChange: 0,
      afterAgeChange: 0,
      oldName: null,
      oldAge: null,
    }

    return {
      stateManager,
      action,
      User,
      I1,
      I2,
      UserService,
      counts,
    }
  }
  let state
  let action
  let User
  let I1
  let I2
  let UserService
  let counts
  beforeEach(() => {
    state = createState()
    action = state.action
    User = state.User
    I1 = state.I1
    I2 = state.I2
    UserService = state.UserService
    counts = state.counts
  })

  describe("creating entities", () => {
    it("should allow the entities to be created", () => {
      const u1 = User.entities.createUser1()
      expect(User.entities.byId.u1).toBe(u1)
    })
  })
  describe("programmatic decorators", () => {
    describe("on Entity class", () => {
      it("should declare the id property", () => {
        const u1 = User.entities.createUser1()
        expect(u1.idProp).toBe("u1")
      })
      it("should declare an action", () => {
        const u1 = User.entities.createUser1()
        u1.incrementAge()
        expect(u1.age).toBe(11)
        expect(User.entities.byId.u1).not.toBe(u1)
      })
      it("should declare a query", () => {
        const u1 = User.entities.createUser1()
        expect(counts.ageName).toBe(0)
        expect(u1.ageName).toBe("name1 is 10")
        expect(counts.ageName).toBe(1)
        expect(u1.ageName).toBe("name1 is 10")
        expect(counts.ageName).toBe(1)

        u1.incrementAge()

        expect(u1.ageName).toBe("name1 is 11")
        expect(counts.ageName).toBe(2)
      })
      it("should declare a reaction", () => {
        const u1 = User.entities.createUser1()
        expect(u1.age2).toBe(20)
        u1.incrementAge()
        expect(u1.age2).toBe(22)
      })
      it("should declare a hasMany relationship", () => {
        const u1 = User.entities.createUser1()
        const u2 = User.entities.createUser2()
        const i1 = action(() =>
          I1.entities.add(new I1(u1.entityId, "s1"), "i1-1")
        )
        const i2 = action(() =>
          I1.entities.add(new I1(u1.entityId, "s2"), "i1-2")
        )
        const i3 = action(() =>
          I1.entities.add(new I1(u2.entityId, "s3"), "i1-3")
        )

        expect(u1.i1s).toEqual([i1, i2])
        expect(u2.i1s).toEqual([i3])

        action(() => (i1.name = "s4"))
        expect(u1.i1s).toEqual([i2, i1])

        action(() => (i3.userId = u1.entityId))
        expect(u1.i1s).toEqual([i2, i3, i1])
        expect(u2.i1s).toEqual([])
      })
      it("should declare a hasOne relationship", () => {
        const u1 = User.entities.createUser1()
        const u2 = User.entities.createUser2()
        const i1 = action(() =>
          I2.entities.add(new I2(u1.entityId, "s1"), "i1-1")
        )

        expect(u1.i2).toEqual(i1)
        expect(u2.i2 == null).toBe(true)

        action(() => (i1.userId = u2.entityId))
        expect(u1.i2 == null).toBe(true)
        expect(u2.i2).toEqual(i1)
      })
      it("should declare a BelongsTo relationship", () => {
        const u1 = User.entities.createUser1()
        const u2 = User.entities.createUser2()
        const i1 = action(() =>
          I1.entities.add(new I1(u1.entityId, "s1"), "i1-1")
        )
        const i2 = action(() =>
          I1.entities.add(new I1(u1.entityId, "s2"), "i1-2")
        )
        const i3 = action(() =>
          I1.entities.add(new I1(u2.entityId, "s3"), "i1-3")
        )

        expect(i1.user).toEqual(u1)
        expect(i2.user).toEqual(u1)
        expect(i3.user).toEqual(u2)

        action(() => (i3.userId = u1.entityId))
        expect(i1.user).toEqual(u1)
        expect(i2.user).toEqual(u1)
        expect(i3.user).toEqual(u1)
      })
      it("should declare afterAdd", () => {
        action(() => {
          User.entities.add(new User("name1", "user1"), "u1")
          expect(counts.afterAdd).toBe(0)
        })
        expect(counts.afterAdd).toBe(1)
      })
      it("should declare afterRemove", () => {
        const u1 = User.entities.createUser1()
        action(() => {
          u1.removeEntity()
          expect(counts.afterRemove).toBe(0)
        })
        expect(counts.afterRemove).toBe(1)
      })
      it("should declare afterChange", () => {
        const u1 = User.entities.createUser1()
        expect(counts.afterChange).toBe(1)
        action(() => {
          u1.name = "name1-1"
          u1.age++
          expect(counts.afterChange).toBe(1)
        })
        expect(counts.afterChange).toBe(2)
      })
      // afterPropertyChange
    })
    describe("on Entities class", () => {
      it("should declare an action", () => {
        const u1 = User.entities.createUser1()
        expect(User.entities.byId.u1).toBe(u1)
      })
      it("should declare a query", () => {
        const u1 = User.entities.createUser1()
        expect(counts.entitiesAgeName).toBe(0)
        expect(User.entities.ageName).toBe("name1 is 10")
        expect(counts.entitiesAgeName).toBe(1)
        expect(User.entities.ageName).toBe("name1 is 10")
        expect(counts.entitiesAgeName).toBe(1)

        u1.incrementAge()

        expect(User.entities.ageName).toBe("name1 is 11")
        expect(counts.entitiesAgeName).toBe(2)
      })
      it("should declare a reaction", () => {
        const u1 = User.entities.createUser1()
        expect(u1.age3).toBe(30)
        u1.incrementAge()
        expect(u1.age3).toBe(33)
      })
      it("should declare an index", () => {
        const u1 = action(() => User.entities.add(new User("name1", 10), "u1"))
        const u2 = action(() => User.entities.add(new User("name2", 5), "u2"))

        expect(User.entities.byAge[0]).toBe(User.entities.byId.u2)
        expect(User.entities.byAge[1]).toBe(User.entities.byId.u1)

        action(() => (u2.age = 15))

        expect(User.entities.byAge[0]).toBe(User.entities.byId.u1)
        expect(User.entities.byAge[1]).toBe(User.entities.byId.u2)
      })
      it("should declare a unique index", () => {
        const u1 = action(() => User.entities.add(new User("name1", 10), "u1"))
        const u2 = action(() => User.entities.add(new User("name2", 5), "u2"))

        expect(User.entities.byName.name1).toBe(User.entities.byId.u1)
        expect(User.entities.byName.name2).toBe(User.entities.byId.u2)

        action(() => (u2.name = "namename2"))

        expect(User.entities.byName.name2 == null).toBe(true)
        expect(User.entities.byName.namename2).toBe(User.entities.byId.u2)
      })
    })
    describe("on Service class", () => {
      it("should declare an action", () => {
        const u1 = UserService.createUser1()
        expect(User.entities.byId.u1).toBe(u1)
      })
      it("should declare a query", () => {
        const u1 = User.entities.createUser1()
        expect(counts.serviceAgeName).toBe(0)
        expect(UserService.ageName).toBe("name1 is 10")
        expect(counts.serviceAgeName).toBe(1)
        expect(UserService.ageName).toBe("name1 is 10")
        expect(counts.serviceAgeName).toBe(1)

        u1.incrementAge()

        expect(UserService.ageName).toBe("name1 is 11")
        expect(counts.serviceAgeName).toBe(2)
      })
      it("should declare a reaction", () => {
        const u1 = User.entities.createUser1()
        expect(u1.age4).toBe(40)
        u1.incrementAge()
        expect(u1.age4).toBe(44)
      })
    })
  })
})
