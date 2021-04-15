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
  beforeEach(() => {
    sm = new R.StateManager({
      entities: {
        test: {
          User,
        },
      },
    })
  })

  describe("entityAdded", () => {
    it("should add an entity", () => {
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
      sm.applyTransaction(t)
      const e = UserEntities.byId.u1
      expect(e).toEqual(entity)
    })
    xit("should error if entity type not found", () => {})
    xit("should error if entity id in use", () => {})
  })
  describe("entityRemoved", () => {
    xit("should remove an entity", () => {})
    xit("should error if entity type not found", () => {})
    xit("should error if entity id not found", () => {})
  })
  describe("entityPropertyChanged", () => {
    xit("should add an entity property", () => {})
    xit("should delete an entity property", () => {})
    xit("should change an entity property", () => {})
    xit("should error if entity type not found", () => {})
    xit("should error if entity id not found", () => {})
  })
  xit("should perform multiple state changes", () => {})
  xit("should trigger reactions", () => {})
  xit("should trigger effects", () => {})
  xit("should not report to a transaction listener", () => {})
  xit("should error if an action is already in place", () => {})
})
