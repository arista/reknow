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
    }
    _UserEntities.action("createUser1")

    const UserEntities = new _UserEntities(User)

    class _UserService extends R.Service {
      createUser1() {
        return User.entities.add(new User("name1", 10), "u1")
      }
    }
    _UserService.action("createUser1")

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
      // query
      // reaction
      // index
      // uniqueIndex
    })
    describe("on Service class", () => {
      it("should declare an action", () => {
        const u1 = UserService.createUser1()
        expect(User.entities.entitiesById.u1).toBe(u1)
      })
      // query
      // reaction
    })
  })
})
