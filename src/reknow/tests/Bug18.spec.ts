import * as R from "../Reknow"

// Test case for https://github.com/arista/reknow/issues/18
//
// A reaction sets "z" to be the same as "y", "y" is a relationship
// that depends on "w" as its primary key.  When the reaction first
// runs, it should add a dependency on "w", since it's accessing "y"
// and "y" calls on "w" to get the primary key.  The bug is that the
// dependency wasn't being established, so the reaction wasn't being
// re-invoked, and "z" wasn't being set to the same as "y".
//
// This happens for all 3 forms of relationships
//
// The fix was to force the relationships to go through the proxy when
// getting the primary key.

describe("Bug18", () => {
  it("should trigger the reaction that depends on a relationship that depends on another property", () => {
    class A extends R.Entity {
      w!: string
      x!: string

      @R.belongsTo(() => A, "w", {foreignKey: "x"}) y1!: A
      z1!: A
      @R.reaction setZ1() {
        this.z1 = this.y1
      }

      @R.hasMany(() => A, "x", {primaryKey: "w"}) y2!: Array<A>
      z2!: Array<A>
      @R.reaction setZ2() {
        this.z2 = this.y2
      }

      @R.hasOne(() => A, "x", {primaryKey: "w"}) y3!: A
      z3!: A
      @R.reaction setZ3() {
        this.z3 = this.y3
      }
    }

    class _AEntities extends R.Entities<A> {}
    const AEntities = new _AEntities(A)
    const Entities = {A}
    const stateManager = new R.StateManager({entities: Entities})

    let _a1!: A
    let a1!: A
    let a2!: A
    stateManager.action(() => {
      _a1 = new A()
      a1 = _a1.addEntity()
      a1.w = "abc"

      a2 = new A().addEntity()
      a2.x = "abc"
    })

    expect(a1.y1).toBe(a1.z1)
    expect(a1.y2).toBe(a1.z2)
    expect(a1.y3).toBe(a1.z3)
  })
})
