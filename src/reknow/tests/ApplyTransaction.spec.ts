import * as R from "../Reknow"

describe("applyTransaction", () => {
  class User extends R.Entity {
    constructor(public name: string) {
      super()
    }
  }
  class _UserEntities extends R.Entities<User> {}
  const UserEntities = new _UserEntities(User)
  const action: R.UnnamedAction = {type: "UnnamedAction"}

  let sm!: R.StateManager
  let transactions!: Array<R.Transaction>
  beforeEach(() => {
    transactions = []
    sm = new R.StateManager({
      entities: {
        test: {
          User,
        },
      },
      listener: (t) => transactions.push(t),
    })
  })

  describe("entityAdded", () => {
    const entity = {
      name: "abc",
      age: 23,
      employed: false,
      x: null,
    }
    it("should add an entity", () => {
      const t: R.Transaction = {
        action,
        stateChanges: [
          {
            type: "EntityAdded",
            entityType: "test.User",
            id: "u1",
            entity,
          },
        ],
      }
      sm.applyTransaction(t)
      const e = UserEntities.byId.u1
      expect(e).toEqual(entity)
    })
    it("should error if entity type not found", () => {
      const t: R.Transaction = {
        action,
        stateChanges: [
          {
            type: "EntityAdded",
            entityType: "test.User2",
            id: "u1",
            entity,
          },
        ],
      }
      expect(() => sm.applyTransaction(t)).toThrow(
        new Error("EntityType test.User2 not found")
      )
    })
    it("should error if entity id in use", () => {
      const t: R.Transaction = {
        action,
        stateChanges: [
          {
            type: "EntityAdded",
            entityType: "test.User",
            id: "u1",
            entity,
          },
        ],
      }
      sm.action(() => new User("abc").addEntity("u1"))
      expect(() => sm.applyTransaction(t)).toThrow(
        new Error(
          `An Entity has already been added to "test.User" with id "u1"`
        )
      )
    })
  })
  describe("entityRemoved", () => {
    it("should remove an entity", () => {
      const t: R.Transaction = {
        action,
        stateChanges: [
          {
            type: "EntityRemoved",
            entityType: "test.User",
            id: "u1",
          },
        ],
      }
      const u = sm.action(() => new User("abc").addEntity("u1"))
      expect(u.isEntityRemoved).toBe(false)
      expect(UserEntities.byId.u1 == null).toBe(false)
      sm.applyTransaction(t)
      expect(u.isEntityRemoved).toBe(true)
      expect(UserEntities.byId.u1 == null).toBe(true)
    })
    it("should error if entity type not found", () => {
      const t: R.Transaction = {
        action,
        stateChanges: [
          {
            type: "EntityRemoved",
            entityType: "test.User2",
            id: "u1",
          },
        ],
      }
      const u = sm.action(() => new User("abc").addEntity("u1"))
      expect(() => sm.applyTransaction(t)).toThrow(
        new Error(`EntityType test.User2 not found`)
      )
    })
    it("should error if entity id not found", () => {
      const t: R.Transaction = {
        action,
        stateChanges: [
          {
            type: "EntityRemoved",
            entityType: "test.User",
            id: "u2",
          },
        ],
      }
      const u = sm.action(() => new User("abc").addEntity("u1"))
      expect(() => sm.applyTransaction(t)).toThrow(
        new Error(`Entity test.User#u2 not found`)
      )
    })
  })
  describe("entityPropertyChanged", () => {
    it("should add an entity property", () => {
      const t: R.Transaction = {
        action,
        stateChanges: [
          {
            type: "EntityPropertyChanged",
            entityType: "test.User",
            id: "u1",
            property: "age",
            newValue: 20,
          },
        ],
      }
      const u = sm.action(() => new User("abc").addEntity("u1"))
      expect(u.hasOwnProperty("age")).toBe(false)
      sm.applyTransaction(t)
      expect(u.hasOwnProperty("age")).toBe(true)
    })
    it("should delete an entity property", () => {
      const t: R.Transaction = {
        action,
        stateChanges: [
          {
            type: "EntityPropertyChanged",
            entityType: "test.User",
            id: "u1",
            property: "name",
          },
        ],
      }
      const u = sm.action(() => new User("abc").addEntity("u1"))
      expect(u.hasOwnProperty("name")).toBe(true)
      sm.applyTransaction(t)
      expect(u.hasOwnProperty("name")).toBe(false)
    })
    it("should change an entity property", () => {
      const t: R.Transaction = {
        action,
        stateChanges: [
          {
            type: "EntityPropertyChanged",
            entityType: "test.User",
            id: "u1",
            property: "name",
            newValue: "def",
          },
        ],
      }
      const u = sm.action(() => new User("abc").addEntity("u1"))
      expect(u.name).toBe("abc")
      sm.applyTransaction(t)
      expect(u.name).toBe("def")
    })
    it("should error if entity type not found", () => {
      const t: R.Transaction = {
        action,
        stateChanges: [
          {
            type: "EntityPropertyChanged",
            entityType: "test.User2",
            id: "u1",
            property: "name",
            newValue: "def",
          },
        ],
      }
      const u = sm.action(() => new User("abc").addEntity("u1"))
      expect(() => sm.applyTransaction(t)).toThrow(
        new Error(`EntityType test.User2 not found`)
      )
    })
    it("should error if entity id not found", () => {
      const t: R.Transaction = {
        action,
        stateChanges: [
          {
            type: "EntityPropertyChanged",
            entityType: "test.User",
            id: "u2",
            property: "name",
            newValue: "def",
          },
        ],
      }
      const u = sm.action(() => new User("abc").addEntity("u1"))
      expect(() => sm.applyTransaction(t)).toThrow(
        new Error(`Entity test.User#u2 not found`)
      )
    })
  })
  it("should perform multiple state changes", () => {
    const entity = {
      name: "abc",
      age: 23,
      employed: false,
      x: null,
    }
    const t: R.Transaction = {
      action,
      stateChanges: [
        {
          type: "EntityAdded",
          entityType: "test.User",
          id: "u2",
          entity: {},
        },
        {
          type: "EntityRemoved",
          entityType: "test.User",
          id: "u2",
        },
        {
          type: "EntityAdded",
          entityType: "test.User",
          id: "u1",
          entity,
        },
        {
          type: "EntityPropertyChanged",
          entityType: "test.User",
          id: "u1",
          property: "name",
          newValue: "def",
        },
        {
          type: "EntityPropertyChanged",
          entityType: "test.User",
          id: "u1",
          property: "age",
          newValue: 14,
        },
      ],
    }
    sm.applyTransaction(t)
    expect(UserEntities.byId.u2 == null).toBe(true)
    const u = UserEntities.byId.u1
    expect(u == null).toBe(false)
    expect(u.name).toBe("def")
    expect((u as any).age).toBe(14)
  })
  it("should trigger reactions and effects", () => {
    const calls: Array<string> = []

    class A extends R.Entity {
      name2!: string
      constructor(public name: string) {
        super()
      }

      @R.reaction setName2() {
        calls.push(`setName2 ${this.entityName}`)
        this.name2 = `${this.name}${this.name}`
      }

      @R.afterAdd afterAdd() {
        calls.push(`afterAdd ${this.entityName}`)
      }
    }
    class _AEntities extends R.Entities<A> {}
    const AEntities = new _AEntities(A)
    const sm2 = new R.StateManager({entities: {A}})

    const t: R.Transaction = {
      action,
      stateChanges: [
        {
          type: "EntityAdded",
          entityType: "A",
          id: "u1",
          entity: {},
        },
      ],
    }
    sm2.applyTransaction(t)
    expect(calls).toEqual(["setName2 A#u1", "afterAdd A#u1"])
  })
  it("should error if an action is already in place", () => {
    const entity = {
      name: "abc",
      age: 23,
      employed: false,
      x: null,
    }
    const t: R.Transaction = {
      action,
      stateChanges: [
        {
          type: "EntityAdded",
          entityType: "test.User",
          id: "u1",
          entity,
        },
      ],
    }
    expect(() => sm.action(() => sm.applyTransaction(t))).toThrow(
      new Error(`An action must not be in place while making this call`)
    )
  })
  it("should not report to a transaction listener", () => {
    const entity = {
      name: "abc",
      age: 23,
      employed: false,
      x: null,
    }
    const t: R.Transaction = {
      action,
      stateChanges: [
        {
          type: "EntityAdded",
          entityType: "test.User",
          id: "u1",
          entity,
        },
      ],
    }
    transactions = []
    sm.applyTransaction(t)
    expect(transactions).toEqual([])
  })
})
