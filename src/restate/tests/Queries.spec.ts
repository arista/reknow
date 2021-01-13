import * as R from "../Restate"

describe("Query", () => {
  function createState() {
    class User extends R.Entity {
      static get entities() { return UserEntities }
      amount!:number
      constructor(public name:string, public age:number) {super()}
    }
    class _UserEntities extends R.Entities<User> {
    }
    const UserEntities = new _UserEntities(User)

    const stateManager = new R.StateManager({
      entities: {
        User: User.entities
      },
    })

    const action = <T>(f: () => T): T => {
      return stateManager.action(f)
    }

    return {
      stateManager,
      action,
      User,
    }
  }
  let state!:ReturnType<typeof createState>
  beforeEach(()=>{
    state = createState()
  })

  function testInvalidation<T>(queryFunc: ()=>T, actionFunc: ()=>void, shouldInvalidate: boolean) {
    const query = state.stateManager.createQuery(queryFunc, "TestQuery")
    expect(query.hasCachedValue).toBe(false)
    const value = query.value
    expect(query.hasCachedValue).toBe(true)

    state.action(actionFunc)

    expect(query.hasCachedValue).toBe(!shouldInvalidate)
  }
  
  describe("A Query that depends on an instance's property", ()=>{
    it("should invalidate if that property changes", ()=>{
      const User = state.User
      const u = state.action(()=>User.entities.add(new User("a", 10), "id1"))
      const query = ()=>u.age * 2
      const action = ()=>u.age++
      testInvalidation(query, action, true)
    })
    it("should invalidate if that property is deleted", ()=>{
      const User = state.User
      const u = state.action(()=>User.entities.add(new User("a", 10), "id1"))
      const query = ()=>(u.age || 0) * 2
      const action = ()=>delete (u as any).age
      testInvalidation(query, action, true)
    })
    it("should not invalidate if a different property is changed", ()=>{
      const User = state.User
      const u = state.action(()=>User.entities.add(new User("a", 10), "id1"))
      const query = ()=>u.age * 2
      const action = ()=>u.name = "xyz"
      testInvalidation(query, action, false)
    })
    it("should not invalidate if the property changes on a different instance", ()=>{
      const User = state.User
      const u = state.action(()=>User.entities.add(new User("a", 10), "id1"))
      const u2 = state.action(()=>User.entities.add(new User("b", 20), "id2"))
      const query = ()=>u.age * 2
      const action = ()=>u2.age++
      testInvalidation(query, action, false)
    })
  })
  describe("A Query that depends on multiple properties of an instance", ()=>{
    it("should invalidate if either property changes", ()=>{
      const User = state.User
      const u = state.action(()=>User.entities.add(new User("a", 10), "id1"))
      const query = ()=>`${u.name} = ${u.age}`
      const action1 = ()=>u.age++
      const action2 = ()=>u.name = "xyz"
      testInvalidation(query, action1, true)
      testInvalidation(query, action2, true)
    })
    it("should invalidate if either property is deleted", ()=>{
      const User = state.User
      const u = state.action(()=>User.entities.add(new User("a", 10), "id1"))
      const query = ()=>`${u.name} = ${u.age}`
      const action1 = ()=>delete (u as any).age
      const action2 = ()=>delete (u as any).name
      testInvalidation(query, action1, true)
      testInvalidation(query, action2, true)
    })
    it("should not invalidate if a different property changes", ()=>{
      const User = state.User
      const u = state.action(()=>User.entities.add(new User("a", 10), "id1"))
      const query = ()=>`${u.name} = ${u.age}`
      const action = ()=>u.amount = 20
      testInvalidation(query, action, false)
    })
    it("should not invalidate if either property changes on a different instance", ()=>{
      const User = state.User
      const u = state.action(()=>User.entities.add(new User("a", 10), "id1"))
      const u2 = state.action(()=>User.entities.add(new User("b", 20), "id2"))
      const query = ()=>`${u.name} = ${u.age}`
      const action1 = ()=>u2.age++
      const action2 = ()=>u2.name = "xyz"
      testInvalidation(query, action1, false)
      testInvalidation(query, action2, false)
    })
  })

/*

A query that uses Object.keys
does not invalidate if a property changes
invalidates if a property is added
invalidates if a property is removed
does not invalidate if a property changes on a different instance

A query that depends on a property of entitiesById
invalidates if an instance is added with that id
invalidates if an instance is removed with that id
does not invalidate if the instance with that id changes
does not invalidate if an instance with a different id is added
does not invalidate if an instance with a different id is removed
does not invalidate if an instance with same id is added to a different Entities

A query that depends on Object.keys of entitiesById
invalidates if an instance is added
invalidates if an instance is removed
does not invalidate if an existing instance is changed
does not invalidate if an instance is added to a different Entities

Index dependencies
SortIndex
A query that depends on an index of a SortIndex
It should invalidate if an instance is added that would affect that instance
It should not invalidate if an instance is added that would affect that instance
It should invalidate if an instance is removed that would affect that instance
It should not invalidate if an instance is removed that would affect that instance
It should invalidate if the instance changes such that that index's value changes
It should not invalidate if the instance changes such that that index's value does not change
A query that depends on Object.keys of a SortIndex
It should invalidate if an instance is added
It should invalidate if an instance is removed
It should invalidate if an instance changes a property that would reorder the index
It should invalidate if an instance changes a property that would not reorder the index

UniqueHashIndex
A query that depends on a property of a HashIndex
It should invalidate if an instance is added for that property
It should invalidate if an instance is removed for that property
It should invalidate if an instance replaces that property
It should not invalidate if an instance is added not for that property
It should not invalidate if an instance is removed not for that property
A query that depends on Object.keys of a HashIndex
It should invalidate if an instance is added
It should invalidate if an instance is removed
It should not invalidate if an instance is added that does not affect that index

HashIndex to secondary SortIndex
FIXME

HashIndex to secondary HashIndex
FIXME




Query returning an instance
FIXME

Depends on other Queries
FIXME

Invalidates only once
FIXME

*/  
})
