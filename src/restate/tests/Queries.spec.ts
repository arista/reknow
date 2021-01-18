import * as R from "../Restate"

describe("Query", () => {
  function createState() {
    // User entity
    class User extends R.Entity {
      static get entities() {
        return UserEntities
      }
      amount!: number
      constructor(public name: string, public age: number) {
        super()
      }
    }
    class _UserEntities extends R.Entities<User> {}
    const UserEntities = new _UserEntities(User)

    // Job entity
    class Job extends R.Entity {
      static get entities() {
        return JobEntities
      }
      constructor(public name: string) {
        super()
      }
    }
    class _JobEntities extends R.Entities<Job> {}
    const JobEntities = new _JobEntities(Job)

    // StateManager
    const stateManager = new R.StateManager({
      entities: {
        User: User.entities,
        Job: Job.entities,
      },
    })

    const action = <T>(f: () => T): T => {
      return stateManager.action(f)
    }

    return {
      stateManager,
      action,
      User,
      Job,
    }
  }
  let state!: ReturnType<typeof createState>
  let User!: typeof state.User
  let Job!: typeof state.Job
  beforeEach(() => {
    state = createState()
    User = state.User
    Job = state.Job
  })

  function testInvalidation<T>(
    queryFunc: () => T,
    actionFunc: () => void,
    shouldInvalidate: boolean
  ) {
    const query = state.stateManager.createQuery(queryFunc, "TestQuery")
    expect(query.hasCachedValue).toBe(false)
    const value = query.value
    expect(query.hasCachedValue).toBe(true)

    state.action(actionFunc)

    expect(query.hasCachedValue).toBe(!shouldInvalidate)
  }

  describe("A Query that depends on an instance's property", () => {
    it("should invalidate if that property changes", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => u.age * 2
      const action = () => u.age++
      testInvalidation(query, action, true)
    })
    it("should invalidate if that property is deleted", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => (u.age || 0) * 2
      const action = () => delete (u as any).age
      testInvalidation(query, action, true)
    })
    it("should invalidate if that property is added", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => (u.amount || 0) * 2
      const action = () => (u.amount = 20)
      testInvalidation(query, action, true)
    })
    it("should not invalidate if a different property is changed", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => u.age * 2
      const action = () => (u.name = "xyz")
      testInvalidation(query, action, false)
    })
    it("should not invalidate if the property changes on a different instance", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const u2 = state.action(() => User.entities.add(new User("b", 20), "id2"))
      const query = () => u.age * 2
      const action = () => u2.age++
      testInvalidation(query, action, false)
    })
  })
  describe("A Query that depends on multiple properties of an instance", () => {
    it("should invalidate if either property changes", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => `${u.name} = ${u.age}`
      const action1 = () => u.age++
      const action2 = () => (u.name = "xyz")
      testInvalidation(query, action1, true)
      testInvalidation(query, action2, true)
    })
    it("should invalidate if either property is deleted", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => `${u.name} = ${u.age}`
      const action1 = () => delete (u as any).age
      const action2 = () => delete (u as any).name
      testInvalidation(query, action1, true)
      testInvalidation(query, action2, true)
    })
    it("should not invalidate if a different property changes", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => `${u.name} = ${u.age}`
      const action = () => (u.amount = 20)
      testInvalidation(query, action, false)
    })
    it("should not invalidate if either property changes on a different instance", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const u2 = state.action(() => User.entities.add(new User("b", 20), "id2"))
      const query = () => `${u.name} = ${u.age}`
      const action1 = () => u2.age++
      const action2 = () => (u2.name = "xyz")
      testInvalidation(query, action1, false)
      testInvalidation(query, action2, false)
    })
  })
  describe("A Query that uses Object.getOwnPropertyNames on an entity", () => {
    it("should not invalidate if a property changes", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => Object.getOwnPropertyNames(u).length
      const action = () => (u.name = "b")
      testInvalidation(query, action, false)
    })
    it("should invalidate if a property is added", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => Object.getOwnPropertyNames(u).length
      const action = () => (u.amount = 20)
      testInvalidation(query, action, true)
    })
    it("should invalidate if a property is removed", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => Object.getOwnPropertyNames(u).length
      const action = () => delete (u as any).age
      testInvalidation(query, action, true)
    })
    it("should not invalidate if a property is added to a different instance", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const u2 = state.action(() => User.entities.add(new User("a", 10), "id2"))
      const query = () => Object.getOwnPropertyNames(u).length
      const action = () => (u2.amount = 20)
      testInvalidation(query, action, false)
    })
  })
  describe("A Query that uses Object.keys on an entity or otherwise enumerates them", () => {
    // This is unfortunate.  Ideally just calling Object.keys wouldn't
    // introduce dependencies on the values of those properties.  But
    // underneath, JavaScript implements this by getting the property
    // descriptors (to see which ones are enumerable), and for some
    // reason accesses the values of those property descriptors.  This
    // means that we can't distinguish between accessing a property
    // value, and calling Object.keys() or for(x in ...).  Note that
    // getOwnPropertyNames doesn't have this issue, since it isn't
    // limited to enumerable properties.
    it("should invalidate if a property changes", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => Object.keys(u).length
      const action = () => (u.name = "b")
      testInvalidation(query, action, true)
    })
  })
  describe("A Query that depends on a property of entitiesById", () => {
    it("should invalidate if an instance is added with that id", () => {
      const query = () => User.entities.entitiesById.id1 != null
      const action = () => User.entities.add(new User("a", 10), "id1")
      testInvalidation(query, action, true)
    })
    it("should invalidate if an instance is removed with that id", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => User.entities.entitiesById.id1 != null
      const action = () => u.removeEntity()
      testInvalidation(query, action, true)
    })
    it("should not invalidate if an instance with that id is changed", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => User.entities.entitiesById.id1 != null
      const action = () => u.age++
      testInvalidation(query, action, false)
    })
    it("should not invalidate if an instance is added with a different id", () => {
      const query = () => User.entities.entitiesById.id1 != null
      const action = () => User.entities.add(new User("a", 10), "id2")
      testInvalidation(query, action, false)
    })
    it("should not invalidate if an instance is removed with a different id", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id2"))
      const query = () => User.entities.entitiesById.id1 != null
      const action = () => u.removeEntity()
      testInvalidation(query, action, false)
    })
    it("should not invalidate if an instance is added to a different Entities with the same id", () => {
      const query = () => User.entities.entitiesById.id1 != null
      const action = () => Job.entities.add(new Job("a"), "id1")
      testInvalidation(query, action, false)
    })
  })
  describe("A Query that depends on Object.getPropertyNames of entitiesById", () => {
    it("should invalidate if an instance is added", () => {
      const query = () =>
        Object.getOwnPropertyNames(User.entities.entitiesById).length
      const action = () => User.entities.add(new User("a", 10), "id1")
      testInvalidation(query, action, true)
    })
    it("should invalidate if an instance is removed", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () =>
        Object.getOwnPropertyNames(User.entities.entitiesById).length
      const action = () => u.removeEntity()
      testInvalidation(query, action, true)
    })
    it("should not invalidate if an existing instance is changed", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () =>
        Object.getOwnPropertyNames(User.entities.entitiesById).length
      const action = () => u.age++
      testInvalidation(query, action, false)
    })
    it("should not invalidate if an instance is added to a different Entities", () => {
      const query = () =>
        Object.getOwnPropertyNames(User.entities.entitiesById).length
      const action = () => Job.entities.add(new Job("a"), "id1")
      testInvalidation(query, action, false)
    })
  })
  describe("A Query that depends on Object.keys of entitiesById", () => {
    it("should invalidate if an instance is added", () => {
      const query = () => Object.keys(User.entities.entitiesById).length
      const action = () => User.entities.add(new User("a", 10), "id1")
      testInvalidation(query, action, true)
    })
    it("should invalidate if an instance is removed", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => Object.keys(User.entities.entitiesById).length
      const action = () => u.removeEntity()
      testInvalidation(query, action, true)
    })
    it("should not invalidate if an existing instance is changed", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => Object.keys(User.entities.entitiesById).length
      const action = () => u.age++
      testInvalidation(query, action, false)
    })
    it("should not invalidate if an instance is added to a different Entities", () => {
      const query = () => Object.keys(User.entities.entitiesById).length
      const action = () => Job.entities.add(new Job("a"), "id1")
      testInvalidation(query, action, false)
    })
  })

  /*

Index dependencies
SortIndex
A query that depends on an index of a SortIndex
It should invalidate if an instance is added that would affect that instance
It should not invalidate if an instance is added that would affect that instance
It should invalidate if an instance is removed that would affect that instance
It should not invalidate if an instance is removed that would affect that instance
It should invalidate if the instance changes such that that index's value changes
It should not invalidate if the instance changes such that that index's value does not change
A query that depends on Object.keys of a SortIndex
It should invalidate if an instance is added
It should invalidate if an instance is removed
It should invalidate if an instance changes a property that would reorder the index
It should invalidate if an instance changes a property that would not reorder the index

UniqueHashIndex
A query that depends on a property of a HashIndex
It should invalidate if an instance is added for that property
It should invalidate if an instance is removed for that property
It should invalidate if an instance replaces that property
It should not invalidate if an instance is added not for that property
It should not invalidate if an instance is removed not for that property
A query that depends on Object.keys of a HashIndex
It should invalidate if an instance is added
It should invalidate if an instance is removed
It should not invalidate if an instance is added that does not affect that index

HashIndex to secondary SortIndex
FIXME

HashIndex to secondary HashIndex
FIXME




Query returning an instance
  should invalidate on any change to the instance
Query returning an entitiesById
  should invalidate on any change to entitiesByID
Query returning an index
  should invalidate on any change to the index
FIXME

Depends on other Queries
FIXME

Invalidates only once
FIXME

*/
})
