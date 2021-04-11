import * as R from "../Reknow"

describe("StateManager", () => {
  describe("releaseClasses", ()=>{
    it("should remove all added properties from the classes", ()=>{
      class A extends R.Entity {
        constructor(public name:string, public aid:string) {
          super()
        }
        @R.hasMany(()=>A, "aid") manyas!:Array<A>
        @R.hasOne(()=>A, "aid") onea!:A|null
        @R.belongsTo(()=>A, "aid") belonga!:A|null
      }
      class _AEntities extends R.Entities<A> {
        @R.index("+name") byName!:R.SortIndex<A>
      }
      const AEntities = new _AEntities(A)
      class _S extends R.Service {
      }
      const S = new _S()

      const a1 = new A("n1", "id1")

      expect(a1.manyas).toBe(undefined)
      expect(a1.onea).toBe(undefined)
      expect(a1.belonga).toBe(undefined)
      expect(AEntities.byName).toBe(undefined)
      expect(()=>AEntities.entitiesState).toThrow()
      expect(()=>S.serviceState).toThrow()

      const sm1 = new R.StateManager({entities: {A}, services: {S}})

      expect(a1.manyas).not.toBe(undefined)
      expect(a1.onea).not.toBe(undefined)
      expect(a1.belonga).not.toBe(undefined)
      expect(AEntities.byName).not.toBe(undefined)
      expect(()=>AEntities.entitiesState).not.toThrow()
      expect(()=>S.serviceState).not.toThrow()

      sm1.releaseClasses()

      const a2 = new A("n1", "id1")

      expect(a2.manyas).toBe(undefined)
      expect(a2.onea).toBe(undefined)
      expect(a2.belonga).toBe(undefined)
      expect(AEntities.byName).toBe(undefined)
      expect(()=>AEntities.entitiesState).toThrow()
      expect(()=>S.serviceState).toThrow()
    })
  })
})
