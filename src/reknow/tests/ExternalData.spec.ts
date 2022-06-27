import * as R from "../Reknow"

describe("StateManager External Data Integrations", () => {
  class User extends R.Entity {
    @R.id id!: string
    employed?: boolean
    public constructor(public name: string, public age: number | null = null) {
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

  class Teacher extends Job {
    public constructor(userId: string, name: string) {
      super(userId, name)
    }
  }
  class _TeacherEntities extends R.Entities<Teacher> {
    @R.index("+name") byName!: R.SortIndex<Teacher>
  }
  const TeacherEntities = new _TeacherEntities(Teacher)

  let transactions: Array<R.Transaction> = []
  let stateManager!: R.StateManager

  beforeEach(() => {
    stateManager = new R.StateManager({
      entities: {
        User,
        a: {
          b: {
            Job,
          },
        },
        Teacher,
      },
      listener: (t) => transactions.push(t),
    })
    transactions = []
  })

  describe("exportEntities", () => {
    it("should export an empty StateManager", () => {
      const expected = {
        entities: {
          User: {},
          Teacher: {},
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
          Teacher: {},
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
          Teacher: {},
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

    it("should export a StateManager with multiple entities with subclasses", () => {
      stateManager.action(() => {
        const u1 = new User("abc", 12).addEntity("u1")
        const j1 = new Job("u1", "job1").addEntity("j1")
        const t1 = new Teacher("u1", "job2").addEntity("j2")
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
          Teacher: {
            j2: {
              id: "j2",
              userId: "u1",
              name: "job2",
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
    it("should export a StateManager using the entityTypeFilter", () => {
      stateManager.action(() => {
        const u1 = new User("abc", 12).addEntity("u1")
        const j1 = new Job("u1", "job1").addEntity("j1")
        const t1 = new Teacher("u1", "job2").addEntity("j2")
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
          "a.b.Job": {
            j1: {
              id: "j1",
              userId: "u1",
              name: "job1",
            },
          },
        },
      }
      const entityTypeFilter = (entityTypeName: string) =>
        entityTypeName !== "Teacher"
      expect(stateManager.exportEntities(entityTypeFilter)).toEqual(expected)
    })
    it("should export a StateManager using the entity filter", () => {
      stateManager.action(() => {
        const u1 = new User("abc", 12).addEntity("u1")
        const j1 = new Job("u1", "job1").addEntity("j1")
        const t1 = new Teacher("u1", "job2").addEntity("j2")
        const t2 = new Teacher("u2", "job3").addEntity("j3")
        const t3 = new Teacher("u3", "job4").addEntity("j4")
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
          Teacher: {
            j3: {
              id: "j3",
              userId: "u2",
              name: "job3",
            },
            j4: {
              id: "j4",
              userId: "u3",
              name: "job4",
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
      const entityFilter = (
        entityTypeName: string,
        id: string,
        entity: R.EntityPropertiesExport
      ) => entityTypeName !== "Teacher" || id === "j3" || entity.name === "job4"
      expect(stateManager.exportEntities(null, entityFilter)).toEqual(expected)
    })
  })
  describe("importEntities", () => {
    it("should handle an empty exports", () => {
      const exports: R.EntitiesExport = {
        entities: {},
      }
      stateManager.importEntities(exports)
      expect(Object.keys(UserEntities.byId)).toEqual([])
      expect(Object.keys(JobEntities.byId)).toEqual([])
    })
    it("should import a single entity", () => {
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
          },
        },
      }
      stateManager.importEntities(exports)
      expect(UserEntities.byId.u1).toEqual({
        id: "u1",
        name: "N1",
        age: 20,
        employed: true,
      })
      expect(UserEntities.byId.u1 instanceof User).toBe(true)
      expect(Object.keys(JobEntities.byId)).toEqual([])
    })
    it("should import multiple entities of the same type", () => {
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
            u2: {
              name: "N2",
            },
          },
        },
      }
      stateManager.importEntities(exports)
      expect(UserEntities.byId.u1).toEqual({
        id: "u1",
        name: "N1",
        age: 20,
        employed: true,
      })
      expect(UserEntities.byId.u1 instanceof User).toBe(true)
      expect(UserEntities.byId.u2).toEqual({
        id: "u2",
        name: "N2",
      })
      expect(UserEntities.byId.u2 instanceof User).toBe(true)
      expect(Object.keys(JobEntities.byId)).toEqual([])
    })
    it("should import multiple entity types", () => {
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
            u2: {
              name: "N2",
            },
          },
          "a.b.Job": {
            j1: {
              userId: "u1",
              name: "J1",
            },
            j2: {
              userId: "u1",
              name: "J2",
            },
          },
        },
      }
      stateManager.importEntities(exports)
      expect(UserEntities.byId.u1).toEqual({
        id: "u1",
        name: "N1",
        age: 20,
        employed: true,
      })
      expect(UserEntities.byId.u1 instanceof User).toBe(true)
      expect(UserEntities.byId.u2).toEqual({
        id: "u2",
        name: "N2",
      })
      expect(UserEntities.byId.u2 instanceof User).toBe(true)
      expect(JobEntities.byId.j1).toEqual({
        id: "j1",
        userId: "u1",
        name: "J1",
      })
      expect(JobEntities.byId.j1 instanceof Job).toBe(true)
      expect(JobEntities.byId.j2).toEqual({
        id: "j2",
        userId: "u1",
        name: "J2",
      })
      expect(JobEntities.byId.j2 instanceof Job).toBe(true)
      expect(UserEntities.byId.u1.jobs).toEqual([
        JobEntities.byId.j1,
        JobEntities.byId.j2,
      ])
    })
    it("should add to existing entities", () => {
      const u2 = stateManager.action(() => new User("U2").addEntity("u2"))
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
          },
        },
      }
      stateManager.importEntities(exports)
      expect(UserEntities.byId.u1).toEqual({
        id: "u1",
        name: "N1",
        age: 20,
        employed: true,
      })
      expect(UserEntities.byId.u1 instanceof User).toBe(true)
      expect(UserEntities.byId.u2).toBe(u2)
    })
    it("should error if an entity type is not found", () => {
      const exports: R.EntitiesExport = {
        entities: {
          Job: {
            j1: {
              userId: "u1",
              name: "J1",
            },
          },
        },
      }
      expect(() => stateManager.importEntities(exports)).toThrow(
        new Error(`EntityType Job not found`)
      )
    })
    it("should error if an entity with the same id already exists", () => {
      const u2 = stateManager.action(() => new User("U2").addEntity("u2"))
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u2: {
              name: "N1",
              age: 20,
              employed: true,
            },
          },
        },
      }
      expect(() => stateManager.importEntities(exports)).toThrow(
        new Error(`An Entity has already been added to "User" with id "u2"`)
      )
    })
    it("should error if already in an action", () => {
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
          },
        },
      }
      expect(() =>
        stateManager.action(() => stateManager.importEntities(exports))
      ).toThrow(
        new Error(`An action must not be in place while making this call`)
      )
    })
    it("should not report the transaction", () => {
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
          },
        },
      }
      stateManager.importEntities(exports)
      expect(transactions).toEqual([])
    })
  })
  describe("importEntitiesForUpdate", () => {
    it("should handle an empty exports", () => {
      const exports: R.EntitiesExport = {
        entities: {},
      }
      stateManager.importEntitiesForUpdate(exports)
      expect(Object.keys(UserEntities.byId)).toEqual([])
      expect(Object.keys(JobEntities.byId)).toEqual([])
    })
    it("should import a single entity", () => {
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
          },
        },
      }
      stateManager.importEntitiesForUpdate(exports)
      expect(UserEntities.byId.u1).toEqual({
        id: "u1",
        name: "N1",
        age: 20,
        employed: true,
      })
      expect(UserEntities.byId.u1 instanceof User).toBe(true)
      expect(Object.keys(JobEntities.byId)).toEqual([])
    })
    it("should import multiple entities of the same type", () => {
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
            u2: {
              name: "N2",
            },
          },
        },
      }
      stateManager.importEntitiesForUpdate(exports)
      expect(UserEntities.byId.u1).toEqual({
        id: "u1",
        name: "N1",
        age: 20,
        employed: true,
      })
      expect(UserEntities.byId.u1 instanceof User).toBe(true)
      expect(UserEntities.byId.u2).toEqual({
        id: "u2",
        name: "N2",
      })
      expect(UserEntities.byId.u2 instanceof User).toBe(true)
      expect(Object.keys(JobEntities.byId)).toEqual([])
    })
    it("should import multiple entity types", () => {
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
            u2: {
              name: "N2",
            },
          },
          "a.b.Job": {
            j1: {
              userId: "u1",
              name: "J1",
            },
            j2: {
              userId: "u1",
              name: "J2",
            },
          },
        },
      }
      stateManager.importEntitiesForUpdate(exports)
      expect(UserEntities.byId.u1).toEqual({
        id: "u1",
        name: "N1",
        age: 20,
        employed: true,
      })
      expect(UserEntities.byId.u1 instanceof User).toBe(true)
      expect(UserEntities.byId.u2).toEqual({
        id: "u2",
        name: "N2",
      })
      expect(UserEntities.byId.u2 instanceof User).toBe(true)
      expect(JobEntities.byId.j1).toEqual({
        id: "j1",
        userId: "u1",
        name: "J1",
      })
      expect(JobEntities.byId.j1 instanceof Job).toBe(true)
      expect(JobEntities.byId.j2).toEqual({
        id: "j2",
        userId: "u1",
        name: "J2",
      })
      expect(JobEntities.byId.j2 instanceof Job).toBe(true)
      expect(UserEntities.byId.u1.jobs).toEqual([
        JobEntities.byId.j1,
        JobEntities.byId.j2,
      ])
    })
    it("should add to existing entities", () => {
      const u2 = stateManager.action(() => new User("U2").addEntity("u2"))
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
          },
        },
      }
      stateManager.importEntitiesForUpdate(exports)
      expect(UserEntities.byId.u1).toEqual({
        id: "u1",
        name: "N1",
        age: 20,
        employed: true,
      })
      expect(UserEntities.byId.u1 instanceof User).toBe(true)
      expect(UserEntities.byId.u2).toBe(u2)
    })
    it("should error if an entity type is not found", () => {
      const exports: R.EntitiesExport = {
        entities: {
          Job: {
            j1: {
              userId: "u1",
              name: "J1",
            },
          },
        },
      }
      expect(() => stateManager.importEntitiesForUpdate(exports)).toThrow(
        new Error(`EntityType Job not found`)
      )
    })
    it("should update if an entity with the same id already exists", () => {
      const u2 = stateManager.action(() => new User("U2", 18).addEntity("u2"))
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u2: {
              name: "N1",
              employed: false,
            },
          },
        },
      }
      stateManager.importEntitiesForUpdate(exports)
      expect(UserEntities.byId.u2).toEqual({
        id: "u2",
        name: "N1",
        age: 18,
        employed: false,
      })
      expect(UserEntities.byId.u2 instanceof User).toBe(true)
    })
    it("should error if already in an action", () => {
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
          },
        },
      }
      expect(() =>
        stateManager.action(() => stateManager.importEntitiesForUpdate(exports))
      ).toThrow(
        new Error(`An action must not be in place while making this call`)
      )
    })
    it("should not report the transaction", () => {
      const exports: R.EntitiesExport = {
        entities: {
          User: {
            u1: {
              name: "N1",
              age: 20,
              employed: true,
            },
          },
        },
      }
      stateManager.importEntitiesForUpdate(exports)
      expect(transactions).toEqual([])
    })
  })
})
