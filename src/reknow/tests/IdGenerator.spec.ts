import * as R from "../Reknow"

describe("idGenerator", () => {
  describe("A StateManager with an idGenerator specified", () => {
    class A extends R.Entity {
      @R.id id!:string
      constructor() {
        super()
      }
    }
    class _AEntities extends R.Entities<A> {}
    new _AEntities(A)

    class B extends R.Entity {
      @R.id id!:string
      constructor() {
        super()
      }
    }
    class _BEntities extends R.Entities<B> {}
    new _BEntities(B)

    let idCounter!:number
    let calls!:Array<string>
    function idGenerator(entityType:string) {
      calls.push(entityType)
      if (entityType === "b.B") {
        return null
      }
      else {
        return `myId-${idCounter++}`
      }
    }
    
    let sm!:R.StateManager
    beforeEach(()=>{
      idCounter = 1
      calls = []
      sm = new R.StateManager({
        entities: {
          A,
          b: {
            B
          }
        },
        idGenerator
      })
    })
    
    it("should call the idGenerator for an instance added with no id", ()=>{
      const a1 = sm.action(()=>new A().addEntity())
      const a2 = sm.action(()=>new A().addEntity())
      expect(a1.entityId).toBe("myId-1")
      expect(a1.id).toBe("myId-1")
      expect(a2.entityId).toBe("myId-2")
      expect(a2.id).toBe("myId-2")
      expect(calls).toEqual([
        "A",
        "A",
      ])
    })
    it("should not call the idGenerator for an instance added with an id", ()=>{
      const a1 = sm.action(()=>new A().addEntity("aa1"))
      const a2 = sm.action(()=>new A().addEntity("aa2"))
      expect(a1.entityId).toBe("aa1")
      expect(a1.id).toBe("aa1")
      expect(a2.entityId).toBe("aa2")
      expect(a2.id).toBe("aa2")
      expect(calls).toEqual([])
    })
    it("should fall back to the default idGenerator if idGenerator returns null", ()=>{
      const b1 = sm.action(()=>new B().addEntity())
      expect(b1.entityId).toBe("1")
      expect(b1.id).toBe("1")
    })
  })
})
