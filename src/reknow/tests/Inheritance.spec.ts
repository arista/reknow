import * as R from "../Reknow"

describe("Inheritance", () => {
  // Organization
  class Organization extends R.Entity {
    @R.id id!: string

    @R.hasMany(()=>User, "organizationId", {primaryKey: "id", sort: "+name"}) users!:Array<User>
    @R.hasMany(()=>Teacher, "organizationId", {primaryKey: "id"}) teachers!:Array<Teacher>
    @R.hasMany(()=>Administrator, "organizationId", {primaryKey: "id"}) administrators!:Array<Administrator>
  }
  class _OrganizationEntities extends R.Entities<Organization> {
  }
  const OrganizationEntities = new _OrganizationEntities(Organization)
  
  // User
  class User extends R.Entity {
    @R.id id!: string
    tripleName: string = ""
    organizationId!:string|null

    @R.belongsTo(()=>Organization, "organizationId", {foreignKey: "id"}) organization!:Organization|null

    static get entities(): _Users {
      return Users
    }
    constructor(public name: string) {
      super()
    }

    @R.action setName(val: string) {
      this.name = val
    }

    @R.query get doubleName() {
      return `${this.name}+${this.name}`
    }

    @R.reaction computeTripleName() {
      return (this.tripleName = `${this.name}+${this.name}+${this.name}`)
    }

    @R.afterAdd onAfterAdd() {
      effects.push(`User#${this.id} - onAfterAdd`)
    }

    @R.afterRemove onAfterRemove() {
      effects.push(`User#${this.id} - onAfterRemove`)
    }

    @R.afterChange onAfterChange() {
      effects.push(`User#${this.id} - onAfterChange`)
    }

    @R.afterPropertyChange("name") onAfterPropertyChange(oldValue: string) {
      effects.push(`User#${this.id} - onAfterPropertyChange ${oldValue}`)
    }
  }
  class _Users extends R.Entities<User> {
    @R.index("+name") byName!: R.SortIndex<User>
  }
  const Users = new _Users(User)

  class StaffMemberSuper extends User {}

  // StaffMember extends User
  class StaffMember extends StaffMemberSuper {
    static get staffMemberEntities(): _StaffMembers {
      return StaffMembers
    }
    constructor(name: string, public employeeNumber: string) {
      super(name)
    }

    @R.hasMany(() => Teacher, "staffMemberId") teachers!: Array<Teacher>

    @R.afterAdd onAfterAdd() {
      effects.push(`StaffMember#${this.id} - onAfterAdd`)
    }
  }
  class _StaffMembers extends R.Entities<StaffMember> {}
  const StaffMembers = new _StaffMembers(StaffMember)

  // Administrator extends StaffMember
  class Administrator extends StaffMember {
    @R.belongsTo(()=>Organization, "organizationId", {foreignKey: "id"}) organization!:Organization|null

    static get administratorEntities(): _Administrators {
      return Administrators
    }
    constructor(name: string, employeeNumber: string, office: string) {
      super(name, employeeNumber)
    }
  }
  class _Administrators extends R.Entities<Administrator> {
    @R.index("+name") byName!: R.SortIndex<User>
  }
  const Administrators = new _Administrators(Administrator)

  // Teacher extends StaffMember
  class Teacher extends StaffMember {
    static get teacherEntities(): _Teachers {
      return Teachers
    }
    constructor(
      name: string,
      employeeNumber: string,
      public classroom: string,
      public staffMemberId: string
    ) {
      super(name, employeeNumber)
    }

    @R.belongsTo(() => StaffMember, "staffMemberId")
    staffMember!: StaffMember | null
  }
  class _Teachers extends R.Entities<Teacher> {}
  const Teachers = new _Teachers(Teacher)

  let effects: Array<String> = []

  let transactions: Array<R.Transaction> = []
  const AppModel = new R.StateManager({
    entities: {Organization, Administrator, Teacher, StaffMember, User},
    listener: (t) => transactions.push(t),
    //debugListener: de=>console.log(R.stringifyDebugEvent(de))
  })
  const action = <T>(f: () => T) => {
    return AppModel.action(f)
  }
  beforeEach(() => {
    AppModel.clearState()
    transactions = []
    effects = []
  })

  describe("A class with Entity superclasses", () => {
    it("should inherit the actions from the superclasses", () => {
      const a1 = action(() =>
        new Administrator("n1", "en1", "o1").addEntity("a1")
      )
      a1.setName("n2")
      expect(a1.name).toEqual("n2")
    })

    it("should inherit the queries from the superclasses", () => {
      const a1 = action(() =>
        new Administrator("n1", "en1", "o1").addEntity("a1")
      )
      expect(a1.doubleName).toEqual("n1+n1")
      a1.setName("n2")
      expect(a1.doubleName).toEqual("n2+n2")
    })

    it("should inherit the reactions from the superclasses", () => {
      const a1 = action(() =>
        new Administrator("n1", "en1", "o1").addEntity("a1")
      )
      expect(a1.doubleName).toEqual("n1+n1")
      expect(a1.tripleName).toEqual("n1+n1+n1")
      a1.setName("n2")
      expect(a1.tripleName).toEqual("n2+n2+n2")
    })

    it("should inherit the id declaration from the superclasses", () => {
      const a1 = action(() =>
        new Administrator("n1", "en1", "o1").addEntity("a1")
      )
      expect(a1.id).toEqual("a1")
      expect(() => action(() => (a1.id = "a2"))).toThrow(
        new Error(
          "An @id property may not be modified after an Entity has been added"
        )
      )
    })

    it("should inherit a HasMany declaration from the superclasses", () => {
      const a1 = action(() =>
        new Administrator("n1", "en1", "o1").addEntity("a1")
      )
      const t1 = action(() =>
        new Teacher("n2", "en2", "c1", "a1").addEntity("t1")
      )
      expect(a1.id).toEqual("a1")
      expect(t1.id).toEqual("t1")
      expect(a1.teachers).toEqual([t1])
      expect(t1.staffMember).toEqual(a1)
    })

    it("should inherit the effects declarations from the superclasses", () => {
      const a1 = action(() =>
        new Administrator("n1", "en1", "o1").addEntity("a1")
      )
      action(() => a1.setName("n2"))
      action(() => a1.removeEntity())
      expect(effects).toEqual([
        "User#a1 - onAfterAdd",
        "StaffMember#a1 - onAfterAdd",
        "User#a1 - onAfterChange",
        "User#a1 - onAfterChange",
        "User#a1 - onAfterPropertyChange n1",
        "User#a1 - onAfterRemove",
      ])
    })

    it("should be added and removed from the byId index of all superclasses", () => {
      const a1 = action(() =>
        new Administrator("n1", "en1", "o1").addEntity("a1")
      )
      expect(Administrator.administratorEntities.byId.a1).toEqual(a1)
      expect(StaffMember.staffMemberEntities.byId.a1).toEqual(a1)
      expect(User.entities.byId.a1).toEqual(a1)

      action(() => a1.removeEntity())
      expect(Administrator.administratorEntities.byId.a1 == null).toBe(true)
      expect(StaffMember.staffMemberEntities.byId.a1 == null).toBe(true)
      expect(User.entities.byId.a1 == null).toBe(true)
    })

    it("should be added and removed from the indexes of all superclasses", () => {
      const a1 = action(() =>
        new Administrator("n1", "en1", "o1").addEntity("a1")
      )
      const t1 = action(() =>
        new Teacher("t1", "en2", "c1", "n1").addEntity("t1")
      )
      const a2 = action(() =>
        new Administrator("n2", "en1", "o1").addEntity("a2")
      )

      expect(Administrator.administratorEntities.byName).toEqual([a1, a2])
      expect(User.entities.byName).toEqual([a1, a2, t1])

      action(() => a1.removeEntity())
      expect(Administrator.administratorEntities.byName).toEqual([a2])
      expect(User.entities.byName).toEqual([a2, t1])

      action(() => t1.removeEntity())
      expect(Administrator.administratorEntities.byName).toEqual([a2])
      expect(User.entities.byName).toEqual([a2])
    })

    it("should be changed in all indexes of all superclasses", () => {
      const a1 = action(() =>
        new Administrator("n1", "en1", "o1").addEntity("a1")
      )
      const t1 = action(() =>
        new Teacher("t1", "en2", "c1", "n1").addEntity("t1")
      )
      const a2 = action(() =>
        new Administrator("n2", "en1", "o1").addEntity("a2")
      )

      expect(Administrator.administratorEntities.byName).toEqual([a1, a2])
      expect(User.entities.byName).toEqual([a1, a2, t1])

      action(() => (a1.name = "n3"))
      expect(Administrator.administratorEntities.byName).toEqual([a2, a1])
      expect(User.entities.byName).toEqual([a2, a1, t1])
    })
  })

  describe("A relationship with a superclass", () => {
    describe("assigning relationships to the base subclass", ()=>{
      let o1!:Organization
      let u1!:User
      beforeEach(()=>{
        o1 = action(() =>new Organization().addEntity())
        u1 = action(()=>new User("abc").addEntity())
      })
      it("should start with no relationship", ()=>{
        expect(o1.users).toEqual([])
        expect(o1.teachers).toEqual([])
        expect(u1.organization).toEqual(null)
      })
      it("should assign the relationship by id", ()=>{
        action(()=>u1.organizationId = o1.id)
        expect(o1.users).toEqual([u1])
        expect(o1.teachers).toEqual([])
        expect(u1.organization).toEqual(o1)
      })
      xit("should assign the relationship by reference", ()=>{
        action(()=>u1.organization = o1)
        expect(o1.users).toEqual([u1])
        expect(o1.teachers).toEqual([])
        expect(u1.organization).toEqual(o1)
      })
      it("should assign the relationship from the hasMany", ()=>{
        action(()=>o1.users.push(u1))
        expect(o1.users).toEqual([u1])
        expect(o1.teachers).toEqual([])
        expect(u1.organization).toEqual(o1)
      })
    })
    describe("assigning relationships to a subclass", ()=>{
      let o1!:Organization
      let t1!:Teacher
      let a1!:Administrator
      beforeEach(()=>{
        o1 = action(() =>new Organization().addEntity())
        t1 = action(()=>new Teacher("abc", "14323", "math", "5111").addEntity())
        a1 = action(()=>new Administrator("def", "14323", "learningCenter").addEntity())
      })
      it("should start with no relationship", ()=>{
        expect(o1.users).toEqual([])
        expect(o1.teachers).toEqual([])
        expect(t1.organization).toEqual(null)
        expect(a1.organization).toEqual(null)
      })
      it("should assign the relationship by id", ()=>{
        action(()=>t1.organizationId = o1.id)
        expect(o1.users).toEqual([t1])
        expect(o1.teachers).toEqual([t1])
        expect(o1.administrators).toEqual([])
        expect(t1.organization).toEqual(o1)
        expect(a1.organization).toEqual(null)

        action(()=>a1.organizationId = o1.id)
        expect(o1.users).toEqual([t1, a1])
        expect(o1.teachers).toEqual([t1])
        expect(o1.administrators).toEqual([a1])
        expect(t1.organization).toEqual(o1)
        expect(a1.organization).toEqual(o1)
      })
      xit("should assign the relationship by reference", ()=>{
        action(()=>t1.organization = o1)
        expect(o1.users).toEqual([t1])
        expect(o1.teachers).toEqual([t1])
        expect(o1.administrators).toEqual([])
        expect(t1.organization).toEqual(o1)
        expect(a1.organization).toEqual(null)

        action(()=>a1.organization = o1)
        expect(o1.users).toEqual([t1, a1])
        expect(o1.teachers).toEqual([t1])
        expect(o1.administrators).toEqual([a1])
        expect(t1.organization).toEqual(o1)
        expect(a1.organization).toEqual(o1)
      })
      it("should assign the relationship from the hasMany", ()=>{
        action(()=>o1.users.push(t1))
        expect(o1.users).toEqual([t1])
        expect(o1.teachers).toEqual([t1])
        expect(o1.administrators).toEqual([])
        expect(t1.organization).toEqual(o1)
        expect(a1.organization).toEqual(null)

        action(()=>o1.users.push(a1))
        expect(o1.users).toEqual([t1, a1])
        expect(o1.teachers).toEqual([t1])
        expect(o1.administrators).toEqual([a1])
        expect(t1.organization).toEqual(o1)
        expect(a1.organization).toEqual(o1)
      })
    })
  })
})
