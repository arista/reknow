import * as R from "../Reknow"

describe("reverseTransaction", () => {
  it("should reverse an empty transaction", () => {
    const t: R.Transaction = {
      action: {type: "UnnamedAction"},
      stateChanges: [],
    }
    const expected = {
      action: {
        type: "ReverseAction",
        action: {type: "UnnamedAction"},
      },
      stateChanges: [],
    }
    expect(R.reverseTransaction(t)).toEqual(expected)
  })
  describe("with a single state change", () => {
    it("should reverse an EntityAdded", () => {
      const t: R.Transaction = {
        action: {type: "UnnamedAction"},
        stateChanges: [
          {
            type: "EntityAdded",
            entityType: "A",
            id: "123",
            entity: {
              name: "N",
              age: 10,
            },
          },
        ],
      }
      const expected = {
        action: {
          type: "ReverseAction",
          action: {type: "UnnamedAction"},
        },
        stateChanges: [
          {
            type: "EntityRemoved",
            entityType: "A",
            id: "123",
            entity: {
              name: "N",
              age: 10,
            },
          },
        ],
      }
      expect(R.reverseTransaction(t)).toEqual(expected)
    })
    it("should reverse an EntityRemoved", () => {
      const t: R.Transaction = {
        action: {type: "UnnamedAction"},
        stateChanges: [
          {
            type: "EntityRemoved",
            entityType: "A",
            id: "123",
            entity: {
              name: "N",
              age: 10,
            },
          },
        ],
      }
      const expected = {
        action: {
          type: "ReverseAction",
          action: {type: "UnnamedAction"},
        },
        stateChanges: [
          {
            type: "EntityAdded",
            entityType: "A",
            id: "123",
            entity: {
              name: "N",
              age: 10,
            },
          },
        ],
      }
      expect(R.reverseTransaction(t)).toEqual(expected)
    })
    it("should throw if an EntityRemoved doesn't contain an entity", () => {
      const t: R.Transaction = {
        action: {type: "UnnamedAction"},
        stateChanges: [
          {
            type: "EntityRemoved",
            entityType: "A",
            id: "123",
          },
        ],
      }
      expect(() => R.reverseTransaction(t)).toThrow(
        new Error(
          `Cannot reverse a transction containing an EntityRemoved with no "entity"`
        )
      )
    })
    it("should reverse an EntityPropertyChanged", () => {
      const t: R.Transaction = {
        action: {type: "UnnamedAction"},
        stateChanges: [
          {
            type: "EntityPropertyChanged",
            entityType: "A",
            id: "123",
            property: "x",
            oldValue: 1,
            newValue: 2,
          },
        ],
      }
      const expected = {
        action: {
          type: "ReverseAction",
          action: {type: "UnnamedAction"},
        },
        stateChanges: [
          {
            type: "EntityPropertyChanged",
            entityType: "A",
            id: "123",
            property: "x",
            oldValue: 2,
            newValue: 1,
          },
        ],
      }
      expect(R.reverseTransaction(t)).toEqual(expected)
    })
    it("should reverse an EntityPropertyChanged with no oldValue", () => {
      const t: R.Transaction = {
        action: {type: "UnnamedAction"},
        stateChanges: [
          {
            type: "EntityPropertyChanged",
            entityType: "A",
            id: "123",
            property: "x",
            newValue: 2,
          },
        ],
      }
      const expected = {
        action: {
          type: "ReverseAction",
          action: {type: "UnnamedAction"},
        },
        stateChanges: [
          {
            type: "EntityPropertyChanged",
            entityType: "A",
            id: "123",
            property: "x",
            oldValue: 2,
          },
        ],
      }
      expect(R.reverseTransaction(t)).toEqual(expected)
    })
    it("should reverse an EntityPropertyChanged with no newValue", () => {
      const t: R.Transaction = {
        action: {type: "UnnamedAction"},
        stateChanges: [
          {
            type: "EntityPropertyChanged",
            entityType: "A",
            id: "123",
            property: "x",
            oldValue: 1,
          },
        ],
      }
      const expected = {
        action: {
          type: "ReverseAction",
          action: {type: "UnnamedAction"},
        },
        stateChanges: [
          {
            type: "EntityPropertyChanged",
            entityType: "A",
            id: "123",
            property: "x",
            newValue: 1,
          },
        ],
      }
      expect(R.reverseTransaction(t)).toEqual(expected)
    })
  })
  it("should reverse multiple state changes in reverse order", () => {
    const t: R.Transaction = {
      action: {type: "UnnamedAction"},
      stateChanges: [
        {
          type: "EntityAdded",
          entityType: "A",
          id: "123",
          entity: {
            name: "N",
            age: 10,
          },
        },
        {
          type: "EntityRemoved",
          entityType: "A",
          id: "123",
          entity: {
            name: "N",
            age: 10,
          },
        },
        {
          type: "EntityPropertyChanged",
          entityType: "A",
          id: "123",
          property: "x",
          oldValue: 1,
          newValue: 2,
        },
      ],
    }
    const expected = {
      action: {
        type: "ReverseAction",
        action: {type: "UnnamedAction"},
      },
      stateChanges: [
        {
          type: "EntityPropertyChanged",
          entityType: "A",
          id: "123",
          property: "x",
          oldValue: 2,
          newValue: 1,
        },
        {
          type: "EntityAdded",
          entityType: "A",
          id: "123",
          entity: {
            name: "N",
            age: 10,
          },
        },
        {
          type: "EntityRemoved",
          entityType: "A",
          id: "123",
          entity: {
            name: "N",
            age: 10,
          },
        },
      ],
    }
    expect(R.reverseTransaction(t)).toEqual(expected)
  })
})
