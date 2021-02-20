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
    }
    User.id("idProp")
    User.action("incrementAge")
    User.query("ageName")
    User.reaction("updateAge2")

    class _UserEntities extends R.Entities {
      createUser1() {
        return this.add(new User("name1", 10), "u1")
      }

      get user1() {
        return this.entitiesById.u1
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
        return User.entities.entitiesById.u1
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

    // Job entity
    class Job extends R.Entity {
      static get entities() {
        return JobEntities
      }
      constructor(name) {
        super()
        this.name = name
      }
    }
    class _JobEntities extends R.Entities {}
    const JobEntities = new _JobEntities(Job)

    // StateManager
    const stateManager = new R.StateManager({
      entities: {
        User: User.entities,
        Job: Job.entities,
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
    }

    return {
      stateManager,
      action,
      User,
      Job,
      UserService,
      counts,
    }
  }
  let state
  let action
  let User
  let Job
  let UserService
  let counts
  beforeEach(() => {
    state = createState()
    action = state.action
    User = state.User
    Job = state.Job
    UserService = state.UserService
    counts = state.counts
  })

  describe("creating entities", () => {
    it("should allow the entities to be created", () => {
      const u1 = User.entities.createUser1()
      expect(User.entities.entitiesById.u1).toBe(u1)
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
        expect(User.entities.entitiesById.u1).not.toBe(u1)
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
      // hasMany
      // hasOne
      // belongsTo
      // afterAdd
      // afterRemove
      // afterChange
      // afterPropertyChange
    })
    describe("on Entities class", () => {
      it("should declare an action", () => {
        const u1 = User.entities.createUser1()
        expect(User.entities.entitiesById.u1).toBe(u1)
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

        expect(User.entities.byAge[0]).toBe(User.entities.entitiesById.u2)
        expect(User.entities.byAge[1]).toBe(User.entities.entitiesById.u1)

        action(() => (u2.age = 15))

        expect(User.entities.byAge[0]).toBe(User.entities.entitiesById.u1)
        expect(User.entities.byAge[1]).toBe(User.entities.entitiesById.u2)
      })
      it("should declare a unique index", () => {
        const u1 = action(() => User.entities.add(new User("name1", 10), "u1"))
        const u2 = action(() => User.entities.add(new User("name2", 5), "u2"))

        expect(User.entities.byName.name1).toBe(User.entities.entitiesById.u1)
        expect(User.entities.byName.name2).toBe(User.entities.entitiesById.u2)

        action(() => (u2.name = "namename2"))

        expect(User.entities.byName.name2 == null).toBe(true)
        expect(User.entities.byName.namename2).toBe(
          User.entities.entitiesById.u2
        )
      })
    })
    describe("on Service class", () => {
      it("should declare an action", () => {
        const u1 = UserService.createUser1()
        expect(User.entities.entitiesById.u1).toBe(u1)
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
