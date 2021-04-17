import * as R from "../Reknow"

describe("StateManager External Data Integrations", () => {
  class User extends R.Entity {
    @R.id id!: string
    employed?: boolean
    public constructor(
      public name: string,
      public age: number | null = null
    ) {
      super()
    }

    @R.hasMany(() => Job, "userId") jobs!: Array<Job>
  }
  class _UserEntities extends R.Entities<User> {}
  const UserEntities = new _UserEntities(User)

  class Job extends R.Entity {
    @R.id id!: string
    public constructor(public userId: string, public name: string) {
      super()
    }
  }
  class _JobEntities extends R.Entities<Job> {
    @R.index("+name") byName!: R.SortIndex<Job>
  }
  const JobEntities = new _JobEntities(Job)

  const stateManager = new R.StateManager({
    entities: {
      User,
      a: {
        b: {
          Job,
        },
      },
    },
  })

  beforeEach(() => {
    stateManager.clearState()
  })

  describe("exportEntities", () => {
    it("should export an empty StateManager", () => {
      const expected = {
        entities: {
          User: {},
          "a.b.Job": {},
        },
      }
      expect(stateManager.exportEntities()).toEqual(expected)
    })

    it("should export a StateManager with one entity", () => {
      stateManager.action(() => {
        const u1 = new User("abc", 12).addEntity("u1")
      })
      const expected = {
        entities: {
          User: {
            u1: {
              id: "u1",
              name: "abc",
              age: 12,
            },
          },
          "a.b.Job": {},
        },
      }
      expect(stateManager.exportEntities()).toEqual(expected)
    })

    it("should export a StateManager with multiple entities", () => {
      stateManager.action(() => {
        const u1 = new User("abc", 12).addEntity("u1")
        const u2 = new User("def").addEntity("u2")
        u2.employed = true
        const j1 = new Job("u1", "job1").addEntity("j1")
      })
      const expected = {
        entities: {
          User: {
            u1: {
              id: "u1",
              name: "abc",
              age: 12,
            },
            u2: {
              id: "u2",
              name: "def",
              age: null,
              employed: true,
            },
          },
          "a.b.Job": {
            j1: {
              id: "j1",
              userId: "u1",
              name: "job1",
            },
          },
        },
      }
      expect(stateManager.exportEntities()).toEqual(expected)
    })
  })
  describe("importEntities", () => {
    xit("should handle an empty exports", () => {})
    xit("should import a single entity", () => {})
    xit("should import multiple entities of the same type", () => {})
    xit("should import multiple entity types", () => {})
    xit("should error if an entity type is not found", () => {})
    xit("should error if an entity with the same id already exists", () => {})
    xit("should error if already in an action", () => {})
    xit("should not report the transaction", () => {})
  })
  describe("importEntitiesForUpdate", () => {
    xit("should handle an empty exports", () => {})
    xit("should import a single entity", () => {})
    xit("should import multiple entities of the same type", () => {})
    xit("should import multiple entity types", () => {})
    xit("should error if an entity type is not found", () => {})
    xit("should update if an entity with the same id already exists", () => {})
    xit("should error if already in an action", () => {})
    xit("should not report the transaction", () => {})
  })
})
