import * as R from "../Reknow"

describe("Transactions", () => {
  class User extends R.Entity {
    gender!: string
    name?: string
    constructor(name: string, public age: number) {
      super()
      this.name = name
    }
    @R.action setAge(age: number) {
      this.age = age
    }
  }
  class _Users extends R.Entities<User> {
    @R.action createUser() {
      const user = new User("brad", 21)
      return this.add(user, "user1")
    }
    @R.action createUser2() {
      const user = new User("june", 28)
      return this.add(user, "user2")
    }
    @R.action createTwoUsers() {
      const user1 = this.createUser()
      const user2 = this.createUser2()
    }
    @R.action deleteUser() {
      this.remove(this.entitiesById.user1)
    }
    @R.action setName(name: string) {
      this.entitiesById.user1.name = name
    }
    @R.action setGender(gender: string) {
      this.entitiesById.user1.gender = gender
    }
    @R.action deleteName() {
      delete this.entitiesById.user1.name
    }
  }
  const Users = new _Users(User)
  class _UsersService extends R.Service {
    @R.action createUser() {
      Users.createUser()
    }
    @R.action createUserWithParams(name: string, age: number) {
      return Users.add(new User(name, age), "user1")
    }
  }
  const UsersService = new _UsersService()
  let transactions: Array<R.Transaction> = []
  const AppModel = new R.StateManager({
    entities: {Users},
    services: {UsersService},
    listener: (t) => transactions.push(t),
  })

  beforeEach(() => {
    transactions = []
    AppModel.clearState()
  })

  describe("Entities actions", () => {
    describe("adding an entity", () => {
      it("should report the expected transaction", () => {
        Users.createUser()
        const expected = [
          {
            action: {
              type: "EntitiesAction",
              entityType: "Users",
              name: "createUser",
              args: [],
            },
            stateChanges: [
              {
                type: "EntityAdded",
                entityType: "Users",
                id: "user1",
                entity: {
                  name: "brad",
                  age: 21,
                },
              },
            ],
          },
        ]
        expect(transactions).toEqual(expected)
      })
    })
    describe("adding two entities", () => {
      describe("in two separate actions", () => {
        it("should report two transactions", () => {
          Users.createUser()
          Users.createUser2()
          const expected = [
            {
              action: {
                type: "EntitiesAction",
                entityType: "Users",
                name: "createUser",
                args: [],
              },
              stateChanges: [
                {
                  type: "EntityAdded",
                  entityType: "Users",
                  id: "user1",
                  entity: {
                    name: "brad",
                    age: 21,
                  },
                },
              ],
            },
            {
              action: {
                type: "EntitiesAction",
                entityType: "Users",
                name: "createUser2",
                args: [],
              },
              stateChanges: [
                {
                  type: "EntityAdded",
                  entityType: "Users",
                  id: "user2",
                  entity: {
                    name: "june",
                    age: 28,
                  },
                },
              ],
            },
          ]
          expect(transactions).toEqual(expected)
        })
      })
      describe("in one action that makes two nested action calls", () => {
        it("should report one transaction", () => {
          Users.createTwoUsers()
          const expected = [
            {
              action: {
                type: "EntitiesAction",
                entityType: "Users",
                name: "createTwoUsers",
                args: [],
              },
              stateChanges: [
                {
                  type: "EntityAdded",
                  entityType: "Users",
                  id: "user1",
                  entity: {
                    name: "brad",
                    age: 21,
                  },
                },
                {
                  type: "EntityAdded",
                  entityType: "Users",
                  id: "user2",
                  entity: {
                    name: "june",
                    age: 28,
                  },
                },
              ],
            },
          ]
          expect(transactions).toEqual(expected)
        })
      })
    })
    describe("removing an entity", () => {
      beforeEach(() => {
        Users.createUser()
        transactions = []
      })
      it("should report the removed entity", () => {
        Users.deleteUser()
        const expected = [
          {
            action: {
              type: "EntitiesAction",
              entityType: "Users",
              name: "deleteUser",
              args: [],
            },
            stateChanges: [
              {
                type: "EntityRemoved",
                entityType: "Users",
                id: "user1",
                entity: {
                  name: "brad",
                  age: 21,
                },
              },
            ],
          },
        ]
        expect(transactions).toEqual(expected)
      })
    })
    describe("setting property values", () => {
      beforeEach(() => {
        Users.createUser()
        transactions = []
      })
      it("changing an existing property should report the change", () => {
        Users.setName("thalia")
        const expected = [
          {
            action: {
              type: "EntitiesAction",
              entityType: "Users",
              name: "setName",
              args: ["thalia"],
            },
            stateChanges: [
              {
                type: "EntityPropertyChanged",
                entityType: "Users",
                id: "user1",
                property: "name",
                newValue: "thalia",
                oldValue: "brad",
              },
            ],
          },
        ]
        expect(transactions).toEqual(expected)
      })
      it("changing an existing property to the same value should not report any state changes", () => {
        Users.setName("brad")
        const expected = [
          {
            action: {
              type: "EntitiesAction",
              entityType: "Users",
              name: "setName",
              args: ["brad"],
            },
            stateChanges: [],
          },
        ]
        expect(transactions).toEqual(expected)
      })
      it("setting a previously-nonexistent property should report the change with no oldValue", () => {
        Users.setGender("male")
        const expected = [
          {
            action: {
              type: "EntitiesAction",
              entityType: "Users",
              name: "setGender",
              args: ["male"],
            },
            stateChanges: [
              {
                type: "EntityPropertyChanged",
                entityType: "Users",
                id: "user1",
                property: "gender",
                newValue: "male",
              },
            ],
          },
        ]
        expect(transactions).toEqual(expected)
      })
      it("deleting a property should report the change with no newValue", () => {
        Users.deleteName()
        const expected = [
          {
            action: {
              type: "EntitiesAction",
              entityType: "Users",
              name: "deleteName",
              args: [],
            },
            stateChanges: [
              {
                type: "EntityPropertyChanged",
                entityType: "Users",
                id: "user1",
                property: "name",
                oldValue: "brad",
              },
            ],
          },
        ]
        expect(transactions).toEqual(expected)
      })
    })
  })
  describe("Entity actions", () => {
    let user!: User
    beforeEach(() => {
      user = Users.createUser()
      transactions = []
    })
    it("should report a transaction with an EntityAction", () => {
      user.setAge(25)
      const expected = [
        {
          action: {
            type: "EntityAction",
            entityType: "Users",
            id: "user1",
            name: "setAge",
            args: [25],
          },
          stateChanges: [
            {
              type: "EntityPropertyChanged",
              entityType: "Users",
              id: "user1",
              property: "age",
              newValue: 25,
              oldValue: 21,
            },
          ],
        },
      ]
      expect(transactions).toEqual(expected)
    })
  })
  describe("Service actions", () => {
    it("should report a transaction with an ServiceAction", () => {
      UsersService.createUser()
      const expected = [
        {
          action: {
            type: "ServiceAction",
            service: "UsersService",
            name: "createUser",
            args: [],
          },
          stateChanges: [
            {
              type: "EntityAdded",
              entityType: "Users",
              id: "user1",
              entity: {
                name: "brad",
                age: 21,
              },
            },
          ],
        },
      ]
      expect(transactions).toEqual(expected)
    })
  })
  describe("No actions", () => {
    it("should report a transaction with an ServiceAction", () => {
      AppModel.action(() => {
        Users.add(new User("brad", 21), "user1")
      })
      const expected = [
        {
          action: {
            type: "NoAction",
          },
          stateChanges: [
            {
              type: "EntityAdded",
              entityType: "Users",
              id: "user1",
              entity: {
                name: "brad",
                age: 21,
              },
            },
          ],
        },
      ]
      expect(transactions).toEqual(expected)
    })
  })
  describe("Action with parameters", () => {
    it("should report the parameters as args", () => {
      UsersService.createUserWithParams("brad", 21)
      const expected = [
        {
          action: {
            type: "ServiceAction",
            service: "UsersService",
            name: "createUserWithParams",
            args: ["brad", 21],
          },
          stateChanges: [
            {
              type: "EntityAdded",
              entityType: "Users",
              id: "user1",
              entity: {
                name: "brad",
                age: 21,
              },
            },
          ],
        },
      ]
      expect(transactions).toEqual(expected)
    })
  })
})
