import * as R from "../Reknow"

describe("DebugEvents", () => {
  describe("StateManager.withDebugEvent", () => {
    describe("without a debug listener", () => {
      it("should not create the event", () => {
        const sm = new R.StateManager({})
        let efCalled = false
        const ef: () => R.DebugEvent = () => {
          efCalled = true
          return {
            type: "ActionDebugEvent",
            action: {type: "NoAction"},
          }
        }
        sm.withDebugEvent(ef, () => {})
        expect(efCalled).toBe(false)
      })
    })
    describe("with a debug listener", () => {
      it("should work with no nested event", () => {
        let events: Array<R.DebugEvent> = []
        const listener = (e: R.DebugEvent) => events.push(e)
        const sm = new R.StateManager({
          debugListener: listener,
        })
        events = []

        const ef1: () => R.DebugEvent = () => {
          return {
            type: "ActionDebugEvent",
            action: {
              type: "ServiceAction",
              service: "service1",
              name: "op1",
              args: [],
            },
          }
        }
        sm.withDebugEvent(ef1, () => {
          expect(events).toEqual([])
        })
        const expected = [
          {
            type: "ActionDebugEvent",
            action: {
              type: "ServiceAction",
              args: [],
              service: "service1",
              name: "op1",
            },
          },
        ]
        expect(events).toEqual(expected)
      })
      it("should work with a nested event", () => {
        let events: Array<R.DebugEvent> = []
        const listener = (e: R.DebugEvent) => events.push(e)
        const sm = new R.StateManager({
          debugListener: listener,
        })
        events = []

        const ef1: () => R.DebugEvent = () => {
          return {
            type: "ActionDebugEvent",
            action: {
              type: "ServiceAction",
              service: "service1",
              name: "op1",
              args: [],
            },
          }
        }
        const ef2: () => R.DebugEvent = () => {
          return {
            type: "ActionDebugEvent",
            action: {
              type: "ServiceAction",
              service: "service2",
              name: "op2",
              args: [],
            },
          }
        }
        const ef3: () => R.DebugEvent = () => {
          return {
            type: "ActionDebugEvent",
            action: {
              type: "ServiceAction",
              service: "service3",
              name: "op3",
              args: [],
            },
          }
        }
        sm.withDebugEvent(ef1, () => {
          sm.withDebugEvent(ef2, () => {
            expect(events).toEqual([])
          })
          sm.withDebugEvent(ef3, () => {
            expect(events).toEqual([])
          })
          expect(events).toEqual([])
        })
        const expected = [
          {
            type: "ActionDebugEvent",
            action: {
              type: "ServiceAction",
              args: [],
              service: "service1",
              name: "op1",
            },
            children: [
              {
                type: "ActionDebugEvent",
                action: {
                  type: "ServiceAction",
                  service: "service2",
                  name: "op2",
                  args: [],
                },
              },
              {
                type: "ActionDebugEvent",
                action: {
                  type: "ServiceAction",
                  service: "service3",
                  name: "op3",
                  args: [],
                },
              },
            ],
          },
        ]
        expect(events).toEqual(expected)
      })
    })
  })
  describe("ActionDebugEvent", () => {
    it("should report the events", () => {
      class _Service1 extends R.Service {
        @R.action action1(val: string) {
          this.action2("abc", 10)
          this.action2("def", 20)
        }
        @R.action action2(val1: string, val2: number) {}
      }
      const Service1 = new _Service1()
      let events: Array<R.DebugEvent> = []
      const listener = (e: R.DebugEvent) => events.push(e)
      const sm = new R.StateManager({
        services: {
          Service1,
        },
        debugListener: listener,
      })
      events = []

      Service1.action1("xyz")
      const expected: Array<R.DebugEvent> = [
        {
          type: "ActionDebugEvent",
          action: {
            type: "ServiceAction",
            service: "Service1",
            name: "action1",
            args: ["xyz"],
          },
          children: [
            {
              type: "ActionDebugEvent",
              action: {
                type: "ServiceAction",
                service: "Service1",
                name: "action2",
                args: ["abc", 10],
              },
            },
            {
              type: "ActionDebugEvent",
              action: {
                type: "ServiceAction",
                service: "Service1",
                name: "action2",
                args: ["def", 20],
              },
            },
          ],
        },
      ]
      expect(events).toEqual(expected)
    })
  })
  describe("Entity DebugEvents", () => {
    it("should report those events", () => {
      class E1 extends R.Entity {
        v3?: string
        constructor(public v1: string, public v2: number) {
          super()
          this.v3 = "yo"
        }
        static get entities() {
          return E1Entities
        }
        @R.action update1() {
          this.v1 = this.v1 + "!"
          this.v2 *= 2
          delete this.v3
        }
      }
      class _E1Entities extends R.Entities<E1> {
        @R.action create() {
          const v1 = this.add(new E1("abc", 10), "v1")
          const v2 = this.add(new E1("def", 15), "v2")
        }
        @R.action updateEntity() {
          this.entitiesById.v1.update1()
          this.entitiesById.v2.removeEntity()
        }
      }
      const E1Entities = new _E1Entities(E1)

      let events: Array<R.DebugEvent> = []
      const listener = (e: R.DebugEvent) => events.push(e)
      const sm = new R.StateManager({
        entities: {
          E1: E1.entities,
        },
        debugListener: listener,
      })
      events = []

      E1.entities.create()
      E1.entities.updateEntity()

      const expected =
        `Action EntitiesAction "E1.create()"\n` +
        `  Add Entity "E1#v1"\n` +
        `  Add Entity "E1#v2"\n` +
        `Action EntitiesAction "E1.updateEntity()"\n` +
        `  Action EntityAction "E1#v1.update1()"\n` +
        `    Set Entity property "E1#v1.v1" to abc!\n` +
        `    Set Entity property "E1#v1.v2" to 20\n` +
        `    Delete Entity property "E1#v1.v3"\n` +
        `  Remove Entity "E1#v2"\n`
      const eventsStr = events.map((e) => R.stringifyDebugEvent(e)).join("")
      expect(eventsStr).toEqual(expected)
    })
  })
  describe("Subscription DebugEvents", () => {
    it("should report those events", () => {
      class E1 extends R.Entity {
        v3?: string
        constructor(public v1: string, public v2: number) {
          super()
          this.v3 = "yo"
        }
        static get entities() {
          return E1Entities
        }
        @R.action update1() {
          this.v1 = this.v1 + "!"
          this.v2 *= 2
          delete this.v3
        }
        @R.query get combine2() {
          return `${this.v1}:${this.v2}`
        }
        @R.query get combine22() {
          return `${this.combine2}:${this.combine2}`
        }
        @R.reaction reaction1() {
          this.v3 = this.combine2
        }
      }
      class _E1Entities extends R.Entities<E1> {
        @R.action create() {
          const v1 = this.add(new E1("abc", 10), "v1")
          const v2 = this.add(new E1("def", 15), "v2")
        }
        @R.action updateEntity() {
          this.entitiesById.v1.update1()
          this.entitiesById.v2.removeEntity()
        }
      }
      const E1Entities = new _E1Entities(E1)

      let events: Array<R.DebugEvent> = []
      const listener = (e: R.DebugEvent) => events.push(e)
      const sm = new R.StateManager({
        entities: {
          E1: E1.entities,
        },
        debugListener: listener,
      })
      events = []

      E1.entities.create()
      E1.entities.updateEntity()

      const expected =
        `Action EntitiesAction "E1.create()"\n` +
        `  Add Entity "E1#v1"\n` +
        `    Action "NoAction"\n` +
        `      Run query "E1#v1.reaction1"\n` +
        `        Add subscriber "E1#v1.reaction1" to "E1#v1.combine2"\n` +
        `        Run query "E1#v1.combine2"\n` +
        `          Add subscriber "E1#v1.combine2" to "E1#v1.v1"\n` +
        `          Add subscriber "E1#v1.combine2" to "E1#v1.v2"\n` +
        `        Set Entity property "E1#v1.v3" to abc:10\n` +
        `  Add Entity "E1#v2"\n` +
        `    Action "NoAction"\n` +
        `      Run query "E1#v2.reaction1"\n` +
        `        Add subscriber "E1#v2.reaction1" to "E1#v2.combine2"\n` +
        `        Run query "E1#v2.combine2"\n` +
        `          Add subscriber "E1#v2.combine2" to "E1#v2.v1"\n` +
        `          Add subscriber "E1#v2.combine2" to "E1#v2.v2"\n` +
        `        Set Entity property "E1#v2.v3" to def:15\n` +
        `Action EntitiesAction "E1.updateEntity()"\n` +
        `  Action EntityAction "E1#v1.update1()"\n` +
        `    Set Entity property "E1#v1.v1" to abc!\n` +
        `      "E1#v1.v1" notify subscriber "E1#v1.combine2"\n` +
        `        Invalidate query "E1#v1.combine2"\n` +
        `          "E1#v1.combine2" notify subscriber "E1#v1.reaction1"\n` +
        `            Invalidate query "E1#v1.reaction1"\n` +
        `    Set Entity property "E1#v1.v2" to 20\n` +
        `      "E1#v1.v2" notify subscriber "E1#v1.combine2"\n` +
        `        Invalidate query "E1#v1.combine2"\n` +
        `    Delete Entity property "E1#v1.v3"\n` +
        `  Remove Entity "E1#v2"\n` +
        `    Remove subscriber "E1#v2.reaction1" from "E1#v2.combine2"\n` +
        `    Remove subscriber "E1#v2.combine2" from "E1#v2.v1"\n` +
        `    Remove subscriber "E1#v2.combine2" from "E1#v2.v2"\n` +
        `  Run onInvalidate for query "E1#v1.reaction1"\n` +
        `    Run reaction for query "E1#v1.reaction1"\n` +
        `      Remove subscriber "E1#v1.reaction1" from "E1#v1.combine2"\n` +
        `      Run query "E1#v1.reaction1"\n` +
        `        Add subscriber "E1#v1.reaction1" to "E1#v1.combine2"\n` +
        `        Remove subscriber "E1#v1.combine2" from "E1#v1.v1"\n` +
        `        Remove subscriber "E1#v1.combine2" from "E1#v1.v2"\n` +
        `        Run query "E1#v1.combine2"\n` +
        `          Add subscriber "E1#v1.combine2" to "E1#v1.v1"\n` +
        `          Add subscriber "E1#v1.combine2" to "E1#v1.v2"\n` +
        `        Set Entity property "E1#v1.v3" to abc!:20\n`

      const eventsStr = events.map((e) => R.stringifyDebugEvent(e)).join("")
      expect(eventsStr).toEqual(expected)
    })
  })
  describe("Effect DebugEvents", () => {
    it("should report those events", () => {
      class E1 extends R.Entity {
        v3?: string
        constructor(public v1: string, public v2: number) {
          super()
          this.v3 = "yo"
        }
        static get entities() {
          return E1Entities
        }
        @R.action update1() {
          this.v1 = this.v1 + "!"
          this.v2 *= 2
          delete this.v3
        }
        @R.afterAdd afterAdd1() {}
        @R.afterRemove afterRemove1() {}
        @R.afterChange afterChange1() {}
        @R.afterPropertyChange("v1") afterPropertyChange1() {}
      }
      class _E1Entities extends R.Entities<E1> {
        @R.action create() {
          const v1 = this.add(new E1("abc", 10), "v1")
          const v2 = this.add(new E1("def", 15), "v2")
        }
        @R.action updateEntity() {
          this.entitiesById.v1.update1()
          this.entitiesById.v2.removeEntity()
        }
      }
      const E1Entities = new _E1Entities(E1)

      let events: Array<R.DebugEvent> = []
      const listener = (e: R.DebugEvent) => events.push(e)
      const sm = new R.StateManager({
        entities: {
          E1: E1.entities,
        },
        debugListener: listener,
      })
      events = []

      E1.entities.create()
      E1.entities.updateEntity()

      const expected =
        `Action EntitiesAction "E1.create()"\n` +
        `  Add Entity "E1#v1"\n` +
        `  Add Entity "E1#v2"\n` +
        `  Run effect "E1#v1.afterAdd1"\n` +
        `  Run effect "E1#v2.afterAdd1"\n` +
        `Action EntitiesAction "E1.updateEntity()"\n` +
        `  Action EntityAction "E1#v1.update1()"\n` +
        `    Set Entity property "E1#v1.v1" to abc!\n` +
        `    Set Entity property "E1#v1.v2" to 20\n` +
        `    Delete Entity property "E1#v1.v3"\n` +
        `  Remove Entity "E1#v2"\n` +
        `  Run effect "E1#v1.afterChange1"\n` +
        `  Run effect "E1#v1.afterPropertyChange1"\n` +
        `  Run effect "E1#v2.afterRemove1"\n`

      const eventsStr = events.map((e) => R.stringifyDebugEvent(e)).join("")
      expect(eventsStr).toEqual(expected)
    })
  })
})
