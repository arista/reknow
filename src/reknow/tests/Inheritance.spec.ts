import * as R from "../Reknow"

describe("Inheritance", () => {
  // User
  class User extends R.Entity {
    @R.id id!:string
    tripleName:string = ""
    
    static get entities(): _Users {
      return Users
    }
    constructor(public name: string) {
      super()
    }

    @R.action setName(val:string) {
      this.name = val
    }

    @R.query get doubleName() {
      return `${this.name}+${this.name}`
    }

    @R.reaction computeTripleName() {
      return this.tripleName = `${this.name}+${this.name}+${this.name}`
    }
  }
  class _Users extends R.Entities<User> {
    @R.index("+name") byName!:R.SortIndex<User>
  }
  const Users = new _Users(User)

  // StaffMember extends User
  class StaffMember extends User {
    static get staffMemberEntities(): _StaffMembers {
      return StaffMembers
    }
    constructor(name: string, public employeeNumber: string) {
      super(name)
    }

    @R.hasMany(()=>Teacher, "staffMemberId") teachers!:Array<Teacher>
  }
  class _StaffMembers extends R.Entities<StaffMember> {}
  const StaffMembers = new _StaffMembers(StaffMember)

  // Administrator extends StaffMember
  class Administrator extends StaffMember {
    static get administratorEntities(): _Administrators {
      return Administrators
    }
    constructor(name: string, employeeNumber: string, office: string) {
      super(name, employeeNumber)
    }
  }
  class _Administrators extends R.Entities<Administrator> {}
  const Administrators = new _Administrators(Administrator)

  // Teacher extends StaffMember
  class Teacher extends StaffMember {
    static get teacherEntities(): _Teachers {
      return Teachers
    }
    constructor(name: string, employeeNumber: string, public classroom: string, public staffMemberId: string) {
      super(name, employeeNumber)
    }

    @R.belongsTo(()=>StaffMember, "staffMemberId") staffMember!:StaffMember|null
  }
  class _Teachers extends R.Entities<Teacher> {}
  const Teachers = new _Teachers(Teacher)

  let transactions:Array<R.Transaction> = []
  const AppModel = new R.StateManager({
    entities: {Administrator, Teacher, StaffMember, User},
    listener: t=>transactions.push(t)
  })
  const action = <T>(f: () => T) => {
    return AppModel.action(f)
  }
  beforeEach(() => {
    AppModel.clearState()
    transactions = []
  })

  describe("A class with Entity superclasses", () => {
    it("should inherit the actions from the superclasses", () => {
      const a1 = action(() => new Administrator("n1", "en1", "o1").addEntity("a1"))
      a1.setName("n2")
      expect(a1.name).toEqual("n2")
    })

    it("should inherit the queries from the superclasses", () => {
      const a1 = action(() => new Administrator("n1", "en1", "o1").addEntity("a1"))
      expect(a1.doubleName).toEqual("n1+n1")
      a1.setName("n2")
      expect(a1.doubleName).toEqual("n2+n2")
    })

    it("should inherit the reactions from the superclasses", () => {
      const a1 = action(() => new Administrator("n1", "en1", "o1").addEntity("a1"))
      expect(a1.doubleName).toEqual("n1+n1")
      expect(a1.tripleName).toEqual("n1+n1+n1")
      a1.setName("n2")
      expect(a1.tripleName).toEqual("n2+n2+n2")
    })

    it("should inherit the id declaration from the superclasses", () => {
      const a1 = action(() => new Administrator("n1", "en1", "o1").addEntity("a1"))
      expect(a1.id).toEqual("a1")
      expect(()=>action(()=>a1.id = "a2")).toThrow(new Error("An @id property may not be modified after an Entity has been added"))
    })

    it("should inherit a HasMany declaration from the superclasses", () => {
      const a1 = action(() => new Administrator("n1", "en1", "o1").addEntity("a1"))
      const t1 = action(() => new Teacher("n2", "en2", "c1", "a1").addEntity("t1"))
      expect(a1.id).toEqual("a1")
      expect(t1.id).toEqual("t1")
      expect(a1.teachers).toEqual([t1])
      expect(t1.staffMember).toEqual(a1)
    })

    // BelongsTo
    // HasOne
    // AfterAdd
    // AfterRemove
    // AfterChange

    // ById
    // Index
    // Removing from index

    it("should be added and removed from the byId index of all superclasses when added", () => {
      const a1 = action(() => new Administrator("n1", "en1", "o1").addEntity("a1"))
      expect(Administrator.administratorEntities.byId.a1).toEqual(a1)
      expect(StaffMember.staffMemberEntities.byId.a1).toEqual(a1)
      expect(User.entities.byId.a1).toEqual(a1)

      action(()=>a1.removeEntity())
      expect(Administrator.administratorEntities.byId.a1 == null).toBe(true)
      expect(StaffMember.staffMemberEntities.byId.a1 == null).toBe(true)
      expect(User.entities.byId.a1 == null).toBe(true)
    })
  })
})
