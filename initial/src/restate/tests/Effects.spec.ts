import * as R from "../Restate"

describe("Effects", () => {
  describe("basic calls", () => {
    class User extends R.Entity {
      @R.id id: string
      name?:string
      constructor(id: string, name: string, public age: number) {
        super()
        this.id = id
        this.name = name
        this.age = age
      }
      @R.afterAdd afterAdd1() {
        calls.push({
          type: "afterAdd1",
          id: this.entityId,
          name: this.name,
          age: this.age,
        })
      }
      @R.afterRemove afterRemove1() {
        calls.push({
          type: "afterRemove1",
          id: this.entityId,
          name: this.name,
          age: this.age,
        })
      }
      @R.afterChange afterChange1() {
        calls.push({
          type: "afterChange1",
          id: this.entityId,
          name: this.name,
          age: this.age,
        })
      }
      @R.afterPropertyChange("name") afterChangeName1(oldValue:string) {
        calls.push({
          type: "afterChangeName1",
          id: this.entityId,
          name: this.name,
          age: this.age,
          oldValue,
        })
      }
    }
    class _Users extends R.Entities<User> {}
    const Users = new _Users(User)
    const AppModel = new R.StateManager({
      entities: {Users},
    })
    beforeEach(() => AppModel.clearState())

    let calls!: Array<any>
    beforeEach(() => (calls = []))

    it("should make the call on adding", () => {
      AppModel.action(() => {
        Users.add({id: "u1", name: "user1", age: 20})
      })
      expect(calls).toEqual([
        {type: "afterAdd1", id: "u1", name: "user1", age: 20},
      ])
    })
    it("should make the call on removing", () => {
      AppModel.action(() => {
        const u1 = Users.add({id: "u1", name: "user1", age: 20})
        Users.remove(u1)
      })
      expect(calls).toEqual([
        {type: "afterAdd1", id: "u1", name: "user1", age: 20},
        {type: "afterRemove1", id: "u1", name: "user1", age: 20},
      ])
    })
    it("should make the call on changing properties", () => {
      AppModel.action(() => {
        const u1 = Users.add({id: "u1", name: "user1", age: 20})
        u1.age = 21
      })
      expect(calls).toEqual([
        {type: "afterAdd1", id: "u1", name: "user1", age: 21},
        {type: "afterChange1", id: "u1", name: "user1", age: 21},
      ])
    })
    it("should make the call on changing specific properties", () => {
      AppModel.action(() => {
        const u1 = Users.add({id: "u1", name: "user1", age: 20})
        u1.age = 21
        u1.name = "user1a"
      })
      expect(calls).toEqual([
        {type: "afterAdd1", id: "u1", name: "user1a", age: 21},
        {type: "afterChange1", id: "u1", name: "user1a", age: 21},
        {
          type: "afterChangeName1",
          id: "u1",
          name: "user1a",
          age: 21,
          oldValue: "user1",
        },
      ])
    })
    it("should make the call on deleting properties", () => {
      AppModel.action(() => {
        const u1 = Users.add({id: "u1", name: "user1", age: 20})
        delete u1.name
      })
      expect(calls).toEqual([
        {type: "afterAdd1", id: "u1", name: undefined, age: 20},
        {type: "afterChange1", id: "u1", name: undefined, age: 20},
        {
          type: "afterChangeName1",
          id: "u1",
          name: undefined,
          age: 20,
          oldValue: "user1",
        },
      ])
    })
    it("should make the call only once per decorator", () => {
      AppModel.action(() => {
        const u1 = Users.add({id: "u1", name: "user1", age: 20})
        u1.name = "user1a"
        u1.age = 22
        u1.name = "user1b"
      })
      expect(calls).toEqual([
        {type: "afterAdd1", id: "u1", name: "user1b", age: 22},
        {type: "afterChange1", id: "u1", name: "user1b", age: 22},
        {
          type: "afterChangeName1",
          id: "u1",
          name: "user1b",
          age: 22,
          oldValue: "user1",
        },
      ])
    })
    it("should make the calls for each affected entity, ordered by entity", () => {
      AppModel.action(() => {
        const u1 = Users.add({id: "u1", name: "user1", age: 20})
        const u2 = Users.add({id: "u2", name: "user2", age: 24})
        u2.age++
        u1.age++
      })
      expect(calls).toEqual([
        {type: "afterAdd1", id: "u1", name: "user1", age: 21},
        {type: "afterChange1", id: "u1", name: "user1", age: 21},
        {type: "afterAdd1", id: "u2", name: "user2", age: 25},
        {type: "afterChange1", id: "u2", name: "user2", age: 25},
      ])
    })
    it("should make multiple calls from multiple actions", () => {
      const u1 = AppModel.action(() =>
        Users.add({id: "u1", name: "user1", age: 20})
      )
      expect(calls).toEqual([
        {type: "afterAdd1", id: "u1", name: "user1", age: 20},
      ])
      calls = []
      AppModel.action(() => (u1.name = "n1"))
      expect(calls).toEqual([
        {type: "afterChange1", id: "u1", name: "n1", age: 20},
        {
          type: "afterChangeName1",
          id: "u1",
          name: "n1",
          oldValue: "user1",
          age: 20,
        },
      ])
      calls = []
      AppModel.action(() => (u1.name = "n2"))
      expect(calls).toEqual([
        {type: "afterChange1", id: "u1", name: "n2", age: 20},
        {
          type: "afterChangeName1",
          id: "u1",
          name: "n2",
          oldValue: "n1",
          age: 20,
        },
      ])
    })
  })
})
