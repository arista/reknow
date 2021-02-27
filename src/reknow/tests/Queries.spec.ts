import * as R from "../Reknow"

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

    // I1 entity - for testing SortIndex
    class I1 extends R.Entity {
      static get entities() {
        return I1Entities
      }
      amount: number = 0
      constructor(public name: string) {
        super()
      }
    }
    class _I1Entities extends R.Entities<I1> {
      @R.index("+name") byName!: R.SortIndex<I1>
    }
    const I1Entities = new _I1Entities(I1)

    // I2 entity - for testing SortIndex
    class I2 extends R.Entity {
      static get entities() {
        return I2Entities
      }
      amount: number = 0
      constructor(public name: string | null) {
        super()
      }
    }
    class _I2Entities extends R.Entities<I2> {
      @R.uniqueIndex("=name") byName!: R.UniqueHashIndex<I2>
    }
    const I2Entities = new _I2Entities(I2)

    // I3 entity - for testing SortIndex
    class I3 extends R.Entity {
      static get entities() {
        return I3Entities
      }
      constructor(public name: string, public age: number) {
        super()
      }
    }
    class _I3Entities extends R.Entities<I3> {
      @R.index("=name", "+age") byNameAndAge!: R.HashIndex<R.SortIndex<I3>>
    }
    const I3Entities = new _I3Entities(I3)

    // I4 entity - for testing @query
    class I4 extends R.Entity {
      static get entities() {
        return I4Entities
      }
      constructor(public name: string, public age: number) {
        super()
      }

      @R.query get age2() {
        i4age2Count++
        return this.age * 2
      }

      static get age2Count() {
        return i4age2Count
      }

      @R.query get age4() {
        i4age4Count++
        return this.age2 * 2
      }

      static get age4Count() {
        return i4age4Count
      }

      @R.query get entitiesCount() {
        entitiesCountCount++
        return Object.keys(I4.entities.entitiesById).length
      }

      static get entitiesCountCount() {
        return entitiesCountCount
      }
    }
    class _I4Entities extends R.Entities<I4> {
      @R.query get firstName() {
        firstNameCount++
        return this.byName[0]?.name
      }
      @R.index("+name") byName!: R.SortIndex<I4>

      get firstNameCount() {
        return firstNameCount
      }
    }
    const I4Entities = new _I4Entities(I4)
    let i4age2Count = 0
    let i4age4Count = 0
    let entitiesCountCount = 0
    let firstNameCount = 0

    class _S1 extends R.Service {
      @R.query get i4Count() {
        i4CountCount++
        return Object.keys(I4.entities.entitiesById).length
      }
      get i4CountCount() {
        return i4CountCount
      }
    }
    const S1 = new _S1()

    let i4CountCount = 0

    // StateManager
    const stateManager = new R.StateManager({
      entities: {
        User: User.entities,
        Job: Job.entities,
        I1: I1.entities,
        I2: I2.entities,
        I3: I3.entities,
        I4: I4.entities,
      },
      services: {
        S1,
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
      I1,
      I2,
      I3,
      I4,
      S1,
    }
  }
  let state!: ReturnType<typeof createState>
  let stateManager!: R.StateManager
  let User!: typeof state.User
  let Job!: typeof state.Job
  let I1!: typeof state.I1
  let I2!: typeof state.I2
  let I3!: typeof state.I3
  let I4!: typeof state.I4
  let S1!: typeof state.S1
  beforeEach(() => {
    state = createState()
    stateManager = state.stateManager
    User = state.User
    Job = state.Job
    I1 = state.I1
    I2 = state.I2
    I3 = state.I3
    I4 = state.I4
    S1 = state.S1
  })

  function testInvalidation<T>(
    queryFunc: () => T,
    actionFunc: () => void,
    shouldInvalidate: boolean,
    shouldChangeValue: boolean | null = null
  ) {
    const query = state.stateManager.createQuery(queryFunc, "TestQuery")
    expect(query.hasCachedValue).toBe(false)
    const value = query.value
    expect(query.hasCachedValue).toBe(true)

    //console.log(JSON.stringify(state.stateManager.dumpChangeSubscribers(), null, 2))
    state.action(actionFunc)

    expect(query.hasCachedValue).toBe(!shouldInvalidate)
    if (shouldChangeValue != null) {
      const value2 = query.value
      if (shouldChangeValue) {
        expect(value2).not.toBe(value)
      } else {
        expect(value2).toBe(value)
      }
    }
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
  describe("SortIndex dependencies", () => {
    describe("A Query that depends on an element of a SortIndex", () => {
      it("should invalidate if an instance is added", () => {
        const query = () => I1.entities.byName[0] != null
        const action = () => I1.entities.add(new I1("a"))
        testInvalidation(query, action, true)
      })
      it("should invalidate if an instance is removed", () => {
        const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
        const query = () => I1.entities.byName[0] != null
        const action = () => i1.removeEntity()
        testInvalidation(query, action, true)
      })
      it("should invalidate if an instance moves in the index", () => {
        const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
        const i2 = state.action(() => I1.entities.add(new I1("d"), "id2"))
        const query = () => I1.entities.byName[0] != null
        const action = () => (i1.name = "q")
        testInvalidation(query, action, true)
      })
      it("should not invalidate if an instance does not move in the index", () => {
        const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
        const i2 = state.action(() => I1.entities.add(new I1("d"), "id2"))
        const query = () => I1.entities.byName[0] != null
        const action = () => (i1.name = "b")
        testInvalidation(query, action, false)
      })
      it("should not invalidate if an instance changes a value unrelated to the index", () => {
        const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
        const query = () => I1.entities.byName[0] != null
        const action = () => i1.amount++
        testInvalidation(query, action, false)
      })
    })
    describe("A Query that depends on Object.keys of a SortIndex", () => {
      it("should invalidate if an instance is added", () => {
        const query = () => Object.keys(I1.entities.byName).length
        const action = () => I1.entities.add(new I1("a"))
        testInvalidation(query, action, true)
      })
      it("should invalidate if an instance is removed", () => {
        const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
        const query = () => Object.keys(I1.entities.byName).length
        const action = () => i1.removeEntity()
        testInvalidation(query, action, true)
      })
      it("should invalidate if an instance moves in the index", () => {
        const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
        const i2 = state.action(() => I1.entities.add(new I1("d"), "id2"))
        const query = () => Object.keys(I1.entities.byName).length
        const action = () => (i1.name = "q")
        testInvalidation(query, action, true)
      })
      it("should not invalidate if an instance does not move in the index", () => {
        const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
        const i2 = state.action(() => I1.entities.add(new I1("d"), "id2"))
        const query = () => Object.keys(I1.entities.byName).length
        const action = () => (i1.name = "b")
        testInvalidation(query, action, false)
      })
      it("should not invalidate if an instance changes a value unrelated to the index", () => {
        const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
        const query = () => Object.keys(I1.entities.byName).length
        const action = () => i1.amount++
        testInvalidation(query, action, false)
      })
    })
  })
  describe("UniqueHashIndex dependencies", () => {
    describe("A Query that depends on a property of a HashIndex", () => {
      it("should invalidate if an instance is added for that property", () => {
        const query = () => I2.entities.byName.a != null
        const action = () => I2.entities.add(new I2("a"))
        testInvalidation(query, action, true)
      })
      it("should invalidate if an instance is removed for that property", () => {
        const i1 = state.action(() => I2.entities.add(new I2("a")))
        const query = () => I2.entities.byName.a != null
        const action = () => i1.removeEntity()
        testInvalidation(query, action, true)
      })
      it("should invalidate if an instance is changed to that property", () => {
        const i1 = state.action(() => I2.entities.add(new I2("b")))
        const query = () => I2.entities.byName.a != null
        const action = () => (i1.name = "a")
        testInvalidation(query, action, true)
      })
      it("should invalidate if an instance is changed away from that property", () => {
        const i1 = state.action(() => I2.entities.add(new I2("a")))
        const query = () => I2.entities.byName.a != null
        const action = () => (i1.name = "b")
        testInvalidation(query, action, true)
      })
      it("should not invalidate if an instance is changed unrelated to that property", () => {
        const i1 = state.action(() => I2.entities.add(new I2("b")))
        const query = () => I2.entities.byName.a != null
        const action = () => (i1.name = "c")
        testInvalidation(query, action, false)
      })
      it("should not invalidate if an instance is added not for that property", () => {
        const query = () => I2.entities.byName.a != null
        const action = () => I2.entities.add(new I2("b"))
        testInvalidation(query, action, false)
      })
      it("should not invalidate if an instance is removed not for that property", () => {
        const i1 = state.action(() => I2.entities.add(new I2("a")))
        const i2 = state.action(() => I2.entities.add(new I2("b")))
        const query = () => I2.entities.byName.a != null
        const action = () => i2.removeEntity()
        testInvalidation(query, action, false)
      })
      it("should not invalidate if an instance changes an unrelated property", () => {
        const i1 = state.action(() => I2.entities.add(new I2("a")))
        const query = () => I2.entities.byName.a != null
        const action = () => (i1.amount = 10)
        testInvalidation(query, action, false)
      })
    })
    describe("A Query that depends on Object.keys of a HashIndex", () => {
      it("should invalidate if an instance is added", () => {
        const query = () => Object.keys(I2.entities.byName).length
        const action = () => I2.entities.add(new I2("a"))
        testInvalidation(query, action, true)
      })
      it("should invalidate if an instance is removed", () => {
        const i1 = state.action(() => I2.entities.add(new I2("a")))
        const query = () => Object.keys(I2.entities.byName).length
        const action = () => i1.removeEntity()
        testInvalidation(query, action, true)
      })
      it("should not invalidate if an instance is added that does not affect that index", () => {
        const query = () => Object.keys(I2.entities.byName).length
        const action = () => I2.entities.add(new I2(null))
        testInvalidation(query, action, false)
      })
    })
  })
  describe("ManyHashIndex dependencies", () => {
    describe("ManyHashIndex to SortIndex dependencies", () => {
      it("should invalidate if an instance is added", () => {
        const query = () => I3.entities.byNameAndAge.a != null
        const action = () => I3.entities.add(new I3("a", 10))
        testInvalidation(query, action, true)
      })
      it("should invalidate if an instance is added to a different name", () => {
        const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
        const query = () => I3.entities.byNameAndAge.b != null
        const action = () => I3.entities.add(new I3("b", 20))
        testInvalidation(query, action, true)
      })
      it("should not invalidate if an instance is added to an existing name", () => {
        const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
        const query = () => I3.entities.byNameAndAge.a != null
        const action = () => I3.entities.add(new I3("a", 20))
        testInvalidation(query, action, false)
      })
      it("should invalidate if the last instance is removed from an existing name", () => {
        const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
        const i2 = state.action(() => I3.entities.add(new I3("a", 20)))
        const query = () => I3.entities.byNameAndAge.a != null
        const action = () => {
          i2.removeEntity()
          i1.removeEntity()
        }
        testInvalidation(query, action, true)
      })
      it("should not invalidate if an instance is removed from an existing name that has other instances", () => {
        const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
        const i2 = state.action(() => I3.entities.add(new I3("a", 20)))
        const query = () => I3.entities.byNameAndAge.a != null
        const action = () => i2.removeEntity()
        testInvalidation(query, action, false)
      })
      it("should not invalidate if an instance's position changes within the same name", () => {
        const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
        const i2 = state.action(() => I3.entities.add(new I3("a", 20)))
        const query = () => I3.entities.byNameAndAge.a != null
        const action = () => (i1.age = 30)
        testInvalidation(query, action, false)
      })
      it("should invalidate if an instance is moved to a new name, from a name that has other instances to a name that doesn't yet have instances", () => {
        const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
        const i2 = state.action(() => I3.entities.add(new I3("a", 20)))
        const query = () =>
          I3.entities.byNameAndAge.a != null &&
          I3.entities.byNameAndAge.b != null
        const action = () => (i1.name = "b")
        testInvalidation(query, action, true)
      })
      it("should invalidate if an instance is moved to a new name, from a name that has no other instances to a name that does have instances", () => {
        const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
        const i2 = state.action(() => I3.entities.add(new I3("b", 20)))
        const query = () =>
          I3.entities.byNameAndAge.a != null &&
          I3.entities.byNameAndAge.b != null
        const action = () => (i1.name = "b")
        testInvalidation(query, action, true)
      })
      it("should invalidate if an instance is moved to a new name, from a name that has no other instances to a name that doesn't yet have instances", () => {
        const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
        const query = () =>
          I3.entities.byNameAndAge.a != null &&
          I3.entities.byNameAndAge.b != null
        const action = () => (i1.name = "b")
        testInvalidation(query, action, true)
      })
      it("should not invalidate if an instance is moved to a new name, from a name that has other instances to a name that does have instances", () => {
        const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
        const i2 = state.action(() => I3.entities.add(new I3("b", 20)))
        const i3 = state.action(() => I3.entities.add(new I3("a", 30)))
        const query = () =>
          I3.entities.byNameAndAge.a != null &&
          I3.entities.byNameAndAge.b != null
        const action = () => (i3.name = "b")
        testInvalidation(query, action, false)
      })
    })
  })
  describe("A Query that returns an entity", () => {
    it("should invalidate if a property of the instance is changed", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => u
      const action = () => u.age++
      testInvalidation(query, action, true, true)
    })
    it("should invalidate if a property of the instance is deleted", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => u
      const action = () => delete (u as any).age
      testInvalidation(query, action, true, true)
    })
    it("should invalidate if a property of the instance is added", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => u
      const action = () => (u.amount = 10)
      testInvalidation(query, action, true, true)
    })
    it("should not invalidate if a different instance is changed", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const u2 = state.action(() => User.entities.add(new User("b", 20), "id2"))
      const query = () => u
      const action = () => u2.age++
      testInvalidation(query, action, false, false)
    })
  })
  describe("A Query that returns entitiesById", () => {
    it("should invalidate if an instance is added", () => {
      const query = () => User.entities.entitiesById
      const action = () => User.entities.add(new User("a", 10), "id1")
      testInvalidation(query, action, true, true)
    })
    it("should invalidate if an instance is removed", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => User.entities.entitiesById
      const action = () => u.removeEntity()
      testInvalidation(query, action, true, true)
    })
    it("should not invalidate if an existing instance is changed", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const query = () => User.entities.entitiesById
      const action = () => u.age++
      testInvalidation(query, action, false, false)
    })
    it("should not invalidate if an instance is added to a different Entities", () => {
      const query = () => User.entities.entitiesById
      const action = () => Job.entities.add(new Job("a"), "id1")
      testInvalidation(query, action, false, false)
    })
  })
  describe("A Query that returns a SortIndex", () => {
    it("should invalidate if an instance is added", () => {
      const query = () => I1.entities.byName
      const action = () => I1.entities.add(new I1("a"))
      testInvalidation(query, action, true, true)
    })
    it("should invalidate if an instance is removed", () => {
      const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
      const query = () => I1.entities.byName
      const action = () => i1.removeEntity()
      testInvalidation(query, action, true, true)
    })
    it("should invalidate if an instance moves in the index", () => {
      const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
      const i2 = state.action(() => I1.entities.add(new I1("d"), "id2"))
      const query = () => I1.entities.byName
      const action = () => (i1.name = "q")
      testInvalidation(query, action, true, true)
    })
    it("should not invalidate if an instance does not move in the index", () => {
      const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
      const i2 = state.action(() => I1.entities.add(new I1("d"), "id2"))
      const query = () => I1.entities.byName
      const action = () => (i1.name = "b")
      testInvalidation(query, action, false, false)
    })
    it("should not invalidate if an instance changes a value unrelated to the index", () => {
      const i1 = state.action(() => I1.entities.add(new I1("a"), "id1"))
      const query = () => I1.entities.byName
      const action = () => i1.amount++
      testInvalidation(query, action, false, false)
    })
  })
  describe("A Query that returns a UniqueHashIndex", () => {
    it("should invalidate if an instance is added", () => {
      const query = () => I2.entities.byName
      const action = () => I2.entities.add(new I2("a"))
      testInvalidation(query, action, true, true)
    })
    it("should invalidate if an instance is removed", () => {
      const i1 = state.action(() => I2.entities.add(new I2("a")))
      const query = () => I2.entities.byName
      const action = () => i1.removeEntity()
      testInvalidation(query, action, true, true)
    })
    it("should not invalidate if an instance is added that does not affect that index", () => {
      const query = () => I2.entities.byName
      const action = () => I2.entities.add(new I2(null))
      testInvalidation(query, action, false, false)
    })
  })
  describe("A Query that returns a ManyHashIndex", () => {
    it("should invalidate if an instance is added", () => {
      const query = () => I3.entities.byNameAndAge
      const action = () => I3.entities.add(new I3("a", 10))
      testInvalidation(query, action, true, true)
    })
    it("should invalidate if an instance is added to a different name", () => {
      const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
      const query = () => I3.entities.byNameAndAge
      const action = () => I3.entities.add(new I3("b", 20))
      testInvalidation(query, action, true, true)
    })
    it("should not invalidate if an instance is added to an existing name", () => {
      const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
      const query = () => I3.entities.byNameAndAge
      const action = () => I3.entities.add(new I3("a", 20))
      testInvalidation(query, action, false, false)
    })
    it("should invalidate if the last instance is removed from an existing name", () => {
      const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
      const i2 = state.action(() => I3.entities.add(new I3("a", 20)))
      const query = () => I3.entities.byNameAndAge
      const action = () => {
        i2.removeEntity()
        i1.removeEntity()
      }
      testInvalidation(query, action, true, true)
    })
    it("should not invalidate if an instance is removed from an existing name that has other instances", () => {
      const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
      const i2 = state.action(() => I3.entities.add(new I3("a", 20)))
      const query = () => I3.entities.byNameAndAge
      const action = () => i2.removeEntity()
      testInvalidation(query, action, false, false)
    })
    it("should not invalidate if an instance's position changes within the same name", () => {
      const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
      const i2 = state.action(() => I3.entities.add(new I3("a", 20)))
      const query = () => I3.entities.byNameAndAge
      const action = () => (i1.age = 30)
      testInvalidation(query, action, false, false)
    })
    it("should invalidate if an instance is moved to a new name, from a name that has other instances to a name that doesn't yet have instances", () => {
      const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
      const i2 = state.action(() => I3.entities.add(new I3("a", 20)))
      const query = () => I3.entities.byNameAndAge
      const action = () => (i1.name = "b")
      testInvalidation(query, action, true, true)
    })
    it("should invalidate if an instance is moved to a new name, from a name that has no other instances to a name that does have instances", () => {
      const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
      const i2 = state.action(() => I3.entities.add(new I3("b", 20)))
      const query = () => I3.entities.byNameAndAge
      const action = () => (i1.name = "b")
      testInvalidation(query, action, true, true)
    })
    it("should invalidate if an instance is moved to a new name, from a name that has no other instances to a name that doesn't yet have instances", () => {
      const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
      const query = () => I3.entities.byNameAndAge
      const action = () => (i1.name = "b")
      testInvalidation(query, action, true, true)
    })
    it("should not invalidate if an instance is moved to a new name, from a name that has other instances to a name that does have instances", () => {
      const i1 = state.action(() => I3.entities.add(new I3("a", 10)))
      const i2 = state.action(() => I3.entities.add(new I3("b", 20)))
      const i3 = state.action(() => I3.entities.add(new I3("a", 30)))
      const query = () => I3.entities.byNameAndAge
      const action = () => (i3.name = "b")
      testInvalidation(query, action, false, false)
    })
  })
  describe("A Query that depends on another Query", () => {
    it("should invalidate if that Query is invalidated", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const q = state.stateManager.createQuery(() => u.age * 2, "q1")
      const query = () => q.value * 3
      const action = () => u.age++
      testInvalidation(query, action, true, true)
    })
    it("should not invalidate if that Query is not invalidated", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const q = state.stateManager.createQuery(() => u.age * 2, "q1")
      const query = () => q.value * 3
      const action = () => (u.name = "b")
      testInvalidation(query, action, false, false)
    })
  })
  describe("Query.remove", () => {
    it("should no longer receive notifications", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const q = state.stateManager.createQuery(() => u.age * 2, "q1")
      let callCount = 0
      q.notifyChangeSubscriber = () => {
        callCount++
        R.Query.prototype.notifyChangeSubscriber.call(q)
      }

      expect(q.value).toBe(20)
      expect(q.hasCachedValue).toBe(true)
      // A change should trigger a notification
      state.action(() => u.age++)
      expect(q.hasCachedValue).toBe(false)
      expect(callCount).toBe(1)
      expect(q.value).toBe(22)
      expect(q.hasCachedValue).toBe(true)

      q.remove()

      // A change should no longer trigger a notification
      expect(q.hasCachedValue).toBe(false)
      state.action(() => u.age++)
      expect(q.hasCachedValue).toBe(false)
      expect(callCount).toBe(1)

      // Getting the value should throw an exception
      expect(() => q.value).toThrow(
        new Error(`Attempt to evaluate Query "q1" after it has been removed`)
      )
    })
  })
  describe("Query dependencies", () => {
    it("should be regenerated with each call", () => {
      const u1 = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const u2 = state.action(() => User.entities.add(new User("b", 20), "id2"))
      let which = u1
      const query = () => which.age * 2
      const q = state.stateManager.createQuery(query, "q1")
      expect(q.hasCachedValue).toBe(false)
      expect(q.value).toBe(20)
      expect(q.hasCachedValue).toBe(true)

      // Starts off depending on u1
      state.action(() => u2.age++)
      expect(q.hasCachedValue).toBe(true)
      state.action(() => u1.age++)
      expect(q.hasCachedValue).toBe(false)

      // Switch the dependency
      which = u2
      expect(q.value).toBe(42)
      expect(q.hasCachedValue).toBe(true)
      state.action(() => u1.age++)
      expect(q.hasCachedValue).toBe(true)
      state.action(() => u2.age++)
      expect(q.hasCachedValue).toBe(false)
      expect(q.value).toBe(44)
      expect(q.hasCachedValue).toBe(true)
    })
  })
  describe("Query.notifyChangeSubscriber", () => {
    it("should be called during the transaction if there is a change", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const q = state.stateManager.createQuery(() => u.age * 2, "q1")
      let callCount = 0
      q.notifyChangeSubscriber = () => {
        callCount++
        R.Query.prototype.notifyChangeSubscriber.call(q)
      }
      let value = q.value
      expect(value).toBe(20)
      state.action(() => {
        u.age++
        expect(callCount).toBe(1)
      })
    })
    it("should be called only once during the transaction even if there are multiple changes", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const q = state.stateManager.createQuery(() => u.age * 2, "q1")
      let callCount = 0
      q.notifyChangeSubscriber = () => {
        callCount++
        R.Query.prototype.notifyChangeSubscriber.call(q)
      }
      let value = q.value
      expect(value).toBe(20)
      state.action(() => {
        u.age++
        expect(callCount).toBe(1)
        u.age++
        expect(callCount).toBe(1)
      })
    })
  })
  describe("invalidation callback", () => {
    it("should be called once after the transaction by default", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      let callCount = 0
      const query = () => u.age * 2
      const callback = () => callCount++
      const q = state.stateManager.createQuery(query, "q1", callback)

      state.action(() => {
        u.age++
        expect(q.value).toBe(22)
        expect(callCount).toBe(0)
        u.age++
        expect(q.value).toBe(24)
        expect(callCount).toBe(0)
      })
      expect(callCount).toBe(1)

      state.action(() => {
        u.age++
        expect(q.value).toBe(26)
        expect(callCount).toBe(1)
        u.age++
        expect(q.value).toBe(28)
        expect(callCount).toBe(1)
      })
      expect(callCount).toBe(2)
    })
    it("should error if the notification tries to mutate when being called after the transaction", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      let callCount = 0
      const query = () => u.age * 2
      const callback = () => {
        u.name = "b"
        callCount++
      }
      const q = state.stateManager.createQuery(query, "q1", callback)
      expect(q.value).toBe(20)

      expect(() => {
        state.action(() => {
          u.age++
        })
      }).toThrow(new Error("Attempt to mutate state outside of an action"))
    })
    it("should be called back during the transaciton if set with transactionEnd", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      let callCount = 0
      const query = () => u.age * 2
      const callback = () => {
        u.name = "b"
        callCount++
      }
      const q = state.stateManager.createQuery(
        query,
        "q1",
        callback,
        "transactionEnd"
      )
      expect(q.value).toBe(20)

      state.action(() => {
        u.age++
        expect(u.name).toBe("a")
      })
      expect(callCount).toBe(1)
      expect(u.name).toBe("b")
    })
    it("should allow query callbacks to trigger other queries", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))

      let callCount1 = 0
      const query1 = () => u.age * 2
      const callback1 = () => {
        u.name = "b"
        callCount1++
      }
      const q1 = state.stateManager.createQuery(
        query1,
        "q1",
        callback1,
        "transactionEnd"
      )
      expect(q1.value).toBe(20)

      let callCount2 = 0
      const query2 = () => u.name + "!"
      const callback2 = () => {
        callCount2++
      }
      const q2 = state.stateManager.createQuery(
        query2,
        "q2",
        callback2,
        "transactionEnd"
      )
      expect(q2.value).toBe("a!")

      state.action(() => {
        u.age++
      })
      expect(callCount1).toBe(1)
      expect(u.name).toBe("b")
      expect(callCount2).toBe(1)
    })
    it("should detect a circular reference using a single query", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))

      // This is the pattern we would see in a @reaction, where the
      // query is itself a mutator.
      const query1 = () => (u.age *= 2)
      const callback1 = () => {
        q1.value
      }
      const q1 = state.stateManager.createQuery(
        query1,
        "q1",
        callback1,
        "transactionEnd"
      )
      expect(() => {
        state.action(() => q1.value)
      }).toThrow(
        new Error(
          "Possible circular dependency detected: q1's onInvalidate called more than 20 times while resolving transaction"
        )
      )
    })
    it("should detect circular query callbacks between two queries", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))

      const query1 = () => u.age * 2
      const callback1 = () => {
        const value = q1.value
        u.name = u.name + "b"
      }
      const q1 = state.stateManager.createQuery(
        query1,
        "q1",
        callback1,
        "transactionEnd"
      )
      expect(q1.value).toBe(20)

      const query2 = () => u.name + "!"
      const callback2 = () => {
        const value = q2.value
        u.age++
      }
      const q2 = state.stateManager.createQuery(
        query2,
        "q2",
        callback2,
        "transactionEnd"
      )
      expect(q2.value).toBe("a!")

      expect(() => {
        state.action(() => {
          u.age++
        })
      }).toThrow(
        new Error(
          "Possible circular dependency detected: q1's onInvalidate called more than 20 times while resolving transaction"
        )
      )
    })
    it("should not trigger a circular query if a callback triggers an already-triggered query in its callback", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))

      let callCount1 = 0
      const query1 = () => u.name + "!"
      const callback1 = () => {
        const value = q1.value
        u.name = "b"
        u.age++
        callCount1++
      }
      const q1 = state.stateManager.createQuery(
        query1,
        "q1",
        callback1,
        "transactionEnd"
      )
      expect(q1.value).toBe("a!")

      let callCount2 = 0
      const query2 = () => u.age * 2
      const callback2 = () => {
        const value = q2.value
        callCount2++
      }
      const q2 = state.stateManager.createQuery(
        query2,
        "q2",
        callback2,
        "transactionEnd"
      )
      expect(q2.value).toBe(20)

      // q2 will be invalidated first, then q1, which will modify age
      // and trigger q2 again.  This has the potential to be
      // considered a circular dependency, but isn't actually one.
      state.action(() => {
        u.age++
        u.name = "b"
      })
    })
    it("should trigger a circular reference if a query references itself", () => {
      const u = state.action(() => User.entities.add(new User("a", 10), "id1"))
      const q1: R.Query<number> = state.stateManager.createQuery(
        () => q1.value + 1,
        "q1"
      )
      expect(() => q1.value).toThrow(
        "Circular reference - q1 directly or indirectly references itself"
      )
    })
  })
  describe("@query declarations", () => {
    describe("on an Entity class", () => {
      it("should return the expected value", () => {
        const u1 = state.action(() => I4.entities.add(new I4("a", 10), "id1"))
        expect(u1.age2).toBe(20)
        expect(I4.age2Count).toBe(1)
      })
      it("should not be re-evaluated if the dependencies don't change", () => {
        const u1 = state.action(() => I4.entities.add(new I4("a", 10), "id1"))
        expect(u1.age2).toBe(20)
        expect(u1.age2).toBe(20)
        expect(I4.age2Count).toBe(1)
      })
      it("should be re-evaluated if the dependency changes", () => {
        const u1 = state.action(() => I4.entities.add(new I4("a", 10), "id1"))
        expect(u1.age2).toBe(20)
        state.action(() => u1.age++)
        expect(I4.age2Count).toBe(1)
        expect(u1.age2).toBe(22)
        expect(I4.age2Count).toBe(2)
      })
      it("should trigger other @queries that depend on it", () => {
        const u1 = state.action(() => I4.entities.add(new I4("a", 10), "id1"))
        expect(u1.age4).toBe(40)
        state.action(() => u1.age++)
        expect(I4.age4Count).toBe(1)
        expect(u1.age4).toBe(44)
        expect(I4.age4Count).toBe(2)
      })
      it("should trigger Queries that depend on it", () => {
        const u1 = state.action(() => I4.entities.add(new I4("a", 10), "id1"))
        let callCount = 0
        const q1 = state.stateManager.createQuery(
          () => u1.age4 + 1,
          "q1",
          () => callCount++
        )
        expect(callCount).toBe(0)
        expect(I4.age4Count).toBe(0)
        expect(q1.value).toBe(41)
        expect(callCount).toBe(0)

        state.action(() => u1.age++)
        expect(callCount).toBe(1)
        expect(I4.age4Count).toBe(1)

        state.action(() => u1.age++)
        expect(callCount).toBe(1)
        expect(I4.age4Count).toBe(1)
        expect(q1.value).toBe(49)

        state.action(() => u1.age++)
        expect(callCount).toBe(2)
        expect(I4.age4Count).toBe(2)
        expect(q1.value).toBe(53)
      })
      it("should remove Queries when the Entity is removed", () => {
        // Since we're going to be removing the entity, we use a query
        // that is dependent on properties of the Entities, not the
        // Entity itself.
        const u1 = state.action(() => I4.entities.add(new I4("a", 10), "id1"))
        let callCount = 0
        const q1 = state.stateManager.createQuery(
          () => u1.entitiesCount,
          "q1",
          () => callCount++
        )
        expect(q1.value).toBe(1)
        expect(I4.entitiesCountCount).toBe(1)
        expect(callCount).toBe(0)

        const u2 = state.action(() => I4.entities.add(new I4("b", 20), "id2"))
        expect(q1.value).toBe(2)
        expect(callCount).toBe(1)
        expect(I4.entitiesCountCount).toBe(2)

        state.action(() => u1.removeEntity())
        expect(q1.value).toBe(2)
        expect(callCount).toBe(1)
        expect(I4.entitiesCountCount).toBe(2)

        const u3 = state.action(() => I4.entities.add(new I4("c", 30), "id3"))
        expect(q1.value).toBe(2)
        expect(callCount).toBe(1)
        expect(I4.entitiesCountCount).toBe(2)
      })
    })
    describe("on an Entities class", () => {
      it("should implement Query behavior of caching its value", () => {
        expect(I4.entities.firstName == null).toBe(true)
        expect(I4.entities.firstNameCount).toBe(1)
        expect(I4.entities.firstName == null).toBe(true)
        expect(I4.entities.firstNameCount).toBe(1)

        const u1 = state.action(() => I4.entities.add(new I4("m", 10), "id1"))
        expect(I4.entities.firstName).toBe("m")
        expect(I4.entities.firstNameCount).toBe(2)
        expect(I4.entities.firstName).toBe("m")
        expect(I4.entities.firstNameCount).toBe(2)

        const u2 = state.action(() => I4.entities.add(new I4("b", 20), "id2"))
        expect(I4.entities.firstName).toBe("b")
        expect(I4.entities.firstNameCount).toBe(3)
        expect(I4.entities.firstName).toBe("b")
        expect(I4.entities.firstNameCount).toBe(3)

        state.action(() => (u1.name = "a"))
        expect(I4.entities.firstName).toBe("a")
        expect(I4.entities.firstNameCount).toBe(4)
        expect(I4.entities.firstName).toBe("a")
        expect(I4.entities.firstNameCount).toBe(4)

        state.action(() => u1.removeEntity())
        expect(I4.entities.firstName).toBe("b")
        expect(I4.entities.firstNameCount).toBe(5)
        expect(I4.entities.firstName).toBe("b")
        expect(I4.entities.firstNameCount).toBe(5)

        state.action(() => u2.age++)
        expect(I4.entities.firstName).toBe("b")
        expect(I4.entities.firstNameCount).toBe(5)
        expect(I4.entities.firstName).toBe("b")
        expect(I4.entities.firstNameCount).toBe(5)
      })
      it("should implement Query behavior of relaying invalidations to other queries", () => {
        let callCount = 0
        const q1 = state.stateManager.createQuery(
          () => I4.entities.firstName,
          "q1",
          () => callCount++
        )
        expect(q1.value == null).toBe(true)
        expect(callCount).toBe(0)
        expect(I4.entities.firstNameCount).toBe(1)

        const u1 = state.action(() => I4.entities.add(new I4("m", 10), "id1"))
        expect(q1.value).toBe("m")
        expect(callCount).toBe(1)
        expect(I4.entities.firstNameCount).toBe(2)

        const u2 = state.action(() => I4.entities.add(new I4("b", 20), "id2"))
        expect(q1.value).toBe("b")
        expect(callCount).toBe(2)
        expect(I4.entities.firstNameCount).toBe(3)

        state.action(() => (u1.name = "a"))
        expect(q1.value).toBe("a")
        expect(callCount).toBe(3)
        expect(I4.entities.firstNameCount).toBe(4)

        state.action(() => u2.removeEntity())
        expect(q1.value).toBe("a")
        expect(callCount).toBe(4)
        expect(I4.entities.firstNameCount).toBe(5)

        state.action(() => u1.age++)
        expect(q1.value).toBe("a")
        expect(callCount).toBe(4)
        expect(I4.entities.firstNameCount).toBe(5)
      })
    })
    describe("on a Service instance", () => {
      it("should implement Query behavior of caching its value", () => {
        expect(S1.i4Count).toBe(0)
        expect(S1.i4CountCount).toBe(1)
        expect(S1.i4Count).toBe(0)
        expect(S1.i4CountCount).toBe(1)

        const u1 = state.action(() => I4.entities.add(new I4("m", 10), "id1"))

        expect(S1.i4Count).toBe(1)
        expect(S1.i4CountCount).toBe(2)
        expect(S1.i4Count).toBe(1)
        expect(S1.i4CountCount).toBe(2)
      })
      it("should implement Query behavior of relaying invalidations to other queries", () => {
        let callCount = 0
        const q1 = state.stateManager.createQuery(
          () => S1.i4Count,
          "q1",
          () => callCount++
        )
        expect(q1.value).toBe(0)
        expect(callCount).toBe(0)

        const u1 = state.action(() => I4.entities.add(new I4("m", 10), "id1"))
        expect(q1.value).toBe(1)
        expect(callCount).toBe(1)

        state.action(() => u1.removeEntity())
        expect(q1.value).toBe(0)
        expect(callCount).toBe(2)
      })
    })
  })
  describe("two queries referencing the same query", () => {
    it("should invalidate both of them when the referenced query invalidates", ()=>{
      const u1 = state.action(() => I4.entities.add(new I4("m", 10), "id1"))
      const q1 = stateManager.createQuery(()=>u1.age)
      const q2 = stateManager.createQuery(()=>q1.value)
      const q3 = stateManager.createQuery(()=>q1.value)

      expect(q2.value).toBe(10)
      expect(q3.value).toBe(10)

      state.action(()=>u1.age++)

      expect(q2.value).toBe(11)
      expect(q3.value).toBe(11)
    })
  })
  // FIXME - add tests for relationships?
})
