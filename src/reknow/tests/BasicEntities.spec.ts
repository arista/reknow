import * as R from "../Reknow"

describe("Basic entity functions", () => {
  class User extends R.Entity {
    name?: string
    age?: number
    gender!: string
    constructor(name: string, age: number) {
      super()
      this.name = name
      this.age = age
    }
  }
  class _Users extends R.Entities<User> {}
  const Users = new _Users(User)
  const AppModel = new R.StateManager({
    entities: {Users},
  })

  beforeEach(() => {
    AppModel.clearState()
  })

  describe("Basic adding entities", () => {
    describe("adding a single entity", () => {
      let _u!: User
      let u!: User
      let id!: string
      let gender!: string
      beforeEach(() => {
        AppModel.action(() => {
          _u = new User("brad", 21)
          u = Users.add(_u)
          id = u.entityId
        })
      })
      it("should have created a proxy with the same contents as the User", () => {
        expect(u).toEqual(_u)
        expect(u).not.toBe(_u)
      })
      it("the proxy should expose the same properties as the User", () => {
        expect(u.name).toBe("brad")
        expect(u.age).toBe(21)
        expect(u.gender).toBeUndefined()
        expect(u.hasOwnProperty("name")).toBe(true)
        expect(u.hasOwnProperty("age")).toBe(true)
        expect(u.hasOwnProperty("gender")).toBe(false)
        const keys = Object.keys(u)
        expect(keys.length).toBe(2)
        expect(keys.indexOf("name") >= 0).toBe(true)
        expect(keys.indexOf("age") >= 0).toBe(true)
        expect(keys.indexOf("gender") >= 0).toBe(false)
      })
      it("should have generated an id and make it available through byId", () => {
        const id = u.entityId
        expect(id == null).toBe(false)
        expect(Users.entitiesById.hasOwnProperty(id)).toBe(true)
        expect(Users.entitiesById[id]).toBe(u)
      })
      describe("adding a second entity", () => {
        let _u2!: User
        let u2!: User
        let id2!: string
        beforeEach(() => {
          AppModel.action(() => {
            _u2 = new User("sue", 14)
            u2 = Users.add(_u2)
            id2 = u2.entityId
          })
        })
        it("should have created a second proxy different from the first", () => {
          expect(id == null).toBe(false)
          expect(id2 == null).toBe(false)
          expect(id).not.toBe(id2)
          expect(u).not.toBe(u2)
          expect(Users.entitiesById.hasOwnProperty(id)).toBe(true)
          expect(Users.entitiesById[id]).toBe(u)
          expect(Users.entitiesById.hasOwnProperty(id2)).toBe(true)
          expect(Users.entitiesById[id2]).toBe(u2)
        })
      })
    })
  })

  describe("Basic removing entities", () => {
    describe("with two entities added", () => {
      let _u!: User
      let u!: User
      let id!: string
      let _u2!: User
      let u2!: User
      let id2!: string
      beforeEach(() => {
        AppModel.action(() => {
          _u = new User("brad", 21)
          u = Users.add(_u)
          id = u.entityId
          _u2 = new User("sue", 14)
          u2 = Users.add(_u2)
          id2 = u2.entityId
        })
      })
      describe("removing one entity", () => {
        beforeEach(() => {
          AppModel.action(() => {
            Users.remove(u)
          })
        })
        it("should have removed the entity from byId", () => {
          expect(Users.entitiesById.hasOwnProperty(id)).toBe(false)
          expect(Users.entitiesById[id] == null).toBe(true)
        })
        it("should still contain the other entity", () => {
          expect(Users.entitiesById.hasOwnProperty(id2)).toBe(true)
          expect(Users.entitiesById[id2] == null).toBe(false)
        })
        describe("removing the other entity", () => {
          beforeEach(() => {
            AppModel.action(() => {
              Users.remove(u2)
            })
          })
          it("should have removed both entities", () => {
            expect(Users.entitiesById.hasOwnProperty(id2)).toBe(false)
            expect(Users.entitiesById[id2] == null).toBe(true)
          })
        })
      })
    })
    describe("accessing the properties of a deleted entity", () => {
      it("should be allowed", () => {
        AppModel.action(() => {
          const u = Users.add(new User("brad", 21))
          u.removeEntity()
          expect(u.isEntityRemoved).toBe(true)
          expect(u.name).toBe("brad")
          expect(u.age).toBe(21)
        })
      })
    })
    describe("mutating a deleted entity", () => {
      it("should be disallowed to set a property", () => {
        AppModel.action(() => {
          const u = Users.add(new User("brad", 21))
          u.age = 23
          u.removeEntity()
          expect(() => (u.age = 24)).toThrow(
            new Error(`A removed entity may not be mutated`)
          )
        })
      })
      it("should be disallowed to remove a property", () => {
        AppModel.action(() => {
          const u = Users.add(new User("brad", 21))
          u.age = 23
          u.removeEntity()
          expect(() => delete u.age).toThrow(
            new Error(`A removed entity may not be mutated`)
          )
        })
      })
    })
    describe("re-adding a deleted entity", () => {
      it("should be disallowed", () => {
        AppModel.action(() => {
          const _u = new User("brad", 21)
          const u = Users.add(_u)
          u.removeEntity()
          // Re-adding the proxy should throw an error
          expect(() => Users.add(u)).toThrow(
            `A removed entity may not be re-added`
          )
          // Re-adding the underlying data should also throw an error
          expect(() => Users.add(_u)).toThrow(
            `A removed entity may not be re-added`
          )
        })
      })
    })
  })

  describe("Basic setting properties", () => {
    let _u!: User
    let u!: User
    let id!: string
    let gender!: string
    beforeEach(() => {
      AppModel.action(() => {
        _u = new User("brad", 21)
        u = Users.add(_u)
        id = u.entityId
      })
    })
    describe("setting an existing property value", () => {
      beforeEach(() => {
        AppModel.action(() => {
          u.name = "june"
        })
      })
      it("should have changed the value", () => {
        expect(u.name).toBe("june")
      })
    })
    describe("adding a new property value", () => {
      beforeEach(() => {
        AppModel.action(() => {
          u.gender = "female"
        })
      })
      it("should have set the value", () => {
        expect(u.gender).toBe("female")
        expect(u.hasOwnProperty("gender")).toBe(true)
        const keys = Object.keys(u)
        expect(keys.length).toBe(3)
        expect(keys.indexOf("gender") >= 0).toBe(true)
      })
    })
    describe("deleting an existing property value", () => {
      beforeEach(() => {
        AppModel.action(() => {
          delete u.name
        })
      })
      it("should have removed the value", () => {
        expect(u.name).toBeUndefined()
        expect(u.hasOwnProperty("name")).toBe(false)
        const keys = Object.keys(u)
        expect(keys.length).toBe(1)
        expect(keys.indexOf("name") >= 0).toBe(false)
      })
    })
  })
})
