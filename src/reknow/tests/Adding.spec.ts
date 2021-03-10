import * as R from "../Reknow"
import {notNull} from "../Utils"

describe("Adding Entities", () => {
  describe("assigning id's", () => {
    describe("with no id property declared", () => {
      it("should assign an id to an entity that has no id property declared", () => {
        class User extends R.Entity {
          static get entities(): _Users {
            return Users
          }
        }
        class _Users extends R.Entities<User> {}
        const Users = new _Users(User)
        const AppModel = new R.StateManager({
          entities: {Users},
        })

        const u1 = AppModel.action(() => Users.add(new User()))
        expect(u1.entityId == null).toBe(false)
        const u2 = AppModel.action(() => Users.add(new User()))
        expect(u2.entityId == null).toBe(false)

        expect(u1).not.toBe(u2)
        expect(Users.byId[u1.entityId]).toBe(u1)
        expect(Users.byId[u2.entityId]).toBe(u2)
      })
      it("should allow the id to be specified when adding", () => {
        class User extends R.Entity {
          static get entities(): _Users {
            return Users
          }
        }
        class _Users extends R.Entities<User> {}
        const Users = new _Users(User)
        const AppModel = new R.StateManager({
          entities: {Users},
        })

        const u1 = AppModel.action(() => Users.add(new User(), "u1"))
        expect(u1.entityId).toBe("u1")
        const u2 = AppModel.action(() => Users.add(new User(), "u2"))
        expect(u2.entityId).toBe("u2")

        expect(Users.byId.u1).toBe(u1)
        expect(Users.byId.u2).toBe(u2)
      })
    })
    describe("with an id property declared", () => {
      class User extends R.Entity {
        static get entities(): _Users {
          return Users
        }
        @R.id id?: string
        constructor(id: string | null = null) {
          super()
          if (id != null) {
            this.id = id
          }
        }
      }
      class _Users extends R.Entities<User> {}
      const Users = new _Users(User)
      const AppModel = new R.StateManager({
        entities: {Users},
      })
      beforeEach(() => AppModel.clearState())

      it("should generate an id and assign it to the property if one is not specified", () => {
        const u1 = AppModel.action(() => Users.add(new User()))
        expect(u1.entityId == null).toBe(false)
        expect(u1.entityId).toBe(u1.id)
        const u2 = AppModel.action(() => Users.add(new User()))
        expect(u2.entityId == null).toBe(false)
        expect(u2.entityId).toBe(u2.id)

        expect(u1).not.toBe(u2)
        expect(Users.byId[u1.entityId]).toBe(u1)
        expect(Users.byId[u2.entityId]).toBe(u2)
      })
      it("should use the id specified in the property", () => {
        const u1 = AppModel.action(() => Users.add(new User("user1")))
        expect(u1.entityId).toBe("user1")
        const u2 = AppModel.action(() => Users.add(new User("user2")))
        expect(u2.entityId).toBe("user2")

        expect(Users.byId.user1).toBe(u1)
        expect(Users.byId.user2).toBe(u2)
      })
      it("id specified when adding should override the id property", () => {
        const u1 = AppModel.action(() => Users.add(new User("user1"), "u1"))
        expect(u1.entityId).toBe("u1")
        const u2 = AppModel.action(() => Users.add(new User("user2"), "u2"))
        expect(u2.entityId).toBe("u2")

        expect(Users.byId.u1).toBe(u1)
        expect(Users.byId.u2).toBe(u2)
      })
      it("id should be unique", () => {
        const u1 = AppModel.action(() => Users.add(new User("user1")))
        expect(() =>
          AppModel.action(() => Users.add(new User("user1")))
        ).toThrow(
          new Error(
            'An Entity has already been added to "Users" with id "user1"'
          )
        )
      })
      it("id should not be mutable", () => {
        const u1 = AppModel.action(() => Users.add(new User("user1")))
        expect(() => AppModel.action(() => (u1.id = "user2"))).toThrow(
          new Error(
            "An @id property may not be modified after an Entity has been added"
          )
        )
      })
      it("id should not be deleteable", () => {
        const u1 = AppModel.action(() => Users.add(new User("user1")))
        expect(() => AppModel.action(() => delete u1.id)).toThrow(
          new Error(
            "An @id property may not be deleted after an Entity has been added"
          )
        )
      })
    })
  })
  describe("adding with a relationship", () => {
    describe("belongsTo", () => {
      it("should assign the relationship", () => {
        class User extends R.Entity {
          static get entities(): _Users {
            return Users
          }
          departmentId!: string | null
          @R.belongsTo(() => Department, "departmentId")
          department!: Department | null
          constructor(public name: string) {
            super()
          }
        }
        class _Users extends R.Entities<User> {}
        const Users = new _Users(User)

        class Department extends R.Entity {
          static get entities(): _Departments {
            return Departments
          }
          constructor(public name: string) {
            super()
          }
        }
        class _Departments extends R.Entities<Department> {}
        const Departments = new _Departments(Department)

        const AppModel = new R.StateManager({
          entities: {Users, Departments},
        })

        const u1 = AppModel.action(() => {
          const uu1 = new User("user1")
          uu1.department = new Department("department1")
          return Users.add(uu1)
        })

        const u1id = u1.entityId
        const d1id = notNull(u1.department).entityId
        expect(Users.byId[u1id]).toEqual({
          name: "user1",
          departmentId: d1id,
        })
        expect(Departments.byId[d1id]).toEqual({
          name: "department1",
        })
      })
    })
    describe("hasOne", () => {
      it("should assign the relationship", () => {
        class User extends R.Entity {
          static get entities(): _Users {
            return Users
          }
          departmentId!: string | null
          constructor(public name: string) {
            super()
          }
        }
        class _Users extends R.Entities<User> {}
        const Users = new _Users(User)

        class Department extends R.Entity {
          static get entities(): _Departments {
            return Departments
          }
          @R.hasOne(() => User, "departmentId") user!: User | null
          constructor(public name: string) {
            super()
          }
        }
        class _Departments extends R.Entities<Department> {}
        const Departments = new _Departments(Department)

        const AppModel = new R.StateManager({
          entities: {Users, Departments},
        })

        const d1 = AppModel.action(() => {
          const dd1 = new Department("department1")
          dd1.user = new User("user1")
          return Departments.add(dd1)
        })

        const d1id = d1.entityId
        const u1id = notNull(d1.user).entityId
        expect(Users.byId[u1id]).toEqual({
          name: "user1",
          departmentId: d1id,
        })
        expect(Departments.byId[d1id]).toEqual({
          name: "department1",
        })
      })
    })
    describe("hasMany", () => {
      it("should assign the relationship", () => {
        class User extends R.Entity {
          static get entities(): _Users {
            return Users
          }
          departmentId!: string | null
          constructor(public name: string) {
            super()
          }
        }
        class _Users extends R.Entities<User> {}
        const Users = new _Users(User)

        class Department extends R.Entity {
          static get entities(): _Departments {
            return Departments
          }
          @R.hasMany(() => User, "departmentId", {sort: "name"})
          users!: Array<User>
          constructor(public name: string) {
            super()
          }
        }
        class _Departments extends R.Entities<Department> {}
        const Departments = new _Departments(Department)

        const AppModel = new R.StateManager({
          entities: {Users, Departments},
        })

        const d1 = AppModel.action(() => {
          const dd1 = new Department("department1")
          dd1.users = [new User("user1"), new User("user2")]
          return Departments.add(dd1)
        })

        const d1id = d1.entityId
        const u1id = d1.users[0].entityId
        const u2id = d1.users[1].entityId
        expect(Users.byId[u1id]).toEqual({
          name: "user1",
          departmentId: d1id,
        })
        expect(Users.byId[u2id]).toEqual({
          name: "user2",
          departmentId: d1id,
        })
        expect(Departments.byId[d1id]).toEqual({
          name: "department1",
        })
      })
    })
  })
  describe("adding a graph of objects", () => {
    it("should add each object only once", () => {
      class User extends R.Entity {
        static get entities(): _Users {
          return Users
        }
        departmentId!: string | null
        @R.belongsTo(() => Department, "departmentId")
        department!: Department | null
        constructor(public name: string) {
          super()
        }
      }
      class _Users extends R.Entities<User> {}
      const Users = new _Users(User)

      class Department extends R.Entity {
        static get entities(): _Departments {
          return Departments
        }
        @R.hasMany(() => User, "departmentId", {sort: "name"})
        users!: Array<User>
        constructor(public name: string) {
          super()
        }
      }
      class _Departments extends R.Entities<Department> {}
      const Departments = new _Departments(Department)

      const AppModel = new R.StateManager({
        entities: {Users, Departments},
      })

      const d1 = AppModel.action(() => {
        const dd1 = new Department("department1")
        const u1 = new User("user1")
        const u2 = new User("user2")
        dd1.users = [u1, u2]
        u1.department = dd1
        u2.department = dd1
        return Departments.add(dd1)
      })

      const d1id = d1.entityId
      const u1id = d1.users[0].entityId
      const u2id = d1.users[1].entityId
      expect(Users.byId[u1id]).toEqual({
        name: "user1",
        departmentId: d1id,
      })
      expect(Users.byId[u2id]).toEqual({
        name: "user2",
        departmentId: d1id,
      })
      expect(Departments.byId[d1id]).toEqual({
        name: "department1",
      })
    })
  })
  describe("adding plain objects", () => {
    it("should convert the objects to the appropriate class", () => {
      class User extends R.Entity {
        static get entities(): _Users {
          return Users
        }
        constructor(public name: string, public age: number) {
          super()
        }
      }
      class _Users extends R.Entities<User> {}
      const Users = new _Users(User)
      const AppModel = new R.StateManager({
        entities: {Users},
      })

      const _u1 = {name: "user1", age: 20}
      const u1 = AppModel.action(() => {
        return Users.addObject(_u1)
      })
      expect(u1 instanceof User).toBe(true)
      expect(u1).not.toBe(_u1)
      const u1id = u1.entityId
      expect(Users.byId[u1id]).toBe(u1)
      expect(Users.byId[u1id]).toEqual({
        name: "user1",
        age: 20,
      })
    })
    it("should convert a mixture of objects in a graph", () => {
      class User extends R.Entity {
        static get entities(): _Users {
          return Users
        }
        departmentId!: string | null
        @R.belongsTo(() => Department, "departmentId")
        department!: Department | null
        constructor(public name: string) {
          super()
        }
      }
      class _Users extends R.Entities<User> {}
      const Users = new _Users(User)

      class Department extends R.Entity {
        static get entities(): _Departments {
          return Departments
        }
        @R.hasMany(() => User, "departmentId", {sort: "name"})
        users!: Array<User>
        constructor(public name: string) {
          super()
        }
      }
      class _Departments extends R.Entities<Department> {}
      const Departments = new _Departments(Department)

      const AppModel = new R.StateManager({
        entities: {Users, Departments},
      })

      const d1 = AppModel.action(() => {
        const u1: any = {name: "user1"}
        const u2: any = {name: "user2"}
        const dd1 = {name: "department1", users: [u1, u2]}
        u1.department = dd1
        u2.department = dd1
        return Departments.addObject(dd1)
      })

      expect(d1 instanceof Department).toBe(true)
      expect(d1.users[0] instanceof User).toBe(true)
      expect(d1.users[1] instanceof User).toBe(true)
      const d1id = d1.entityId
      const u1id = d1.users[0].entityId
      const u2id = d1.users[1].entityId
      expect(Users.byId[u1id]).toEqual({
        name: "user1",
        departmentId: d1id,
      })
      expect(Users.byId[u2id]).toEqual({
        name: "user2",
        departmentId: d1id,
      })
      expect(Departments.byId[d1id]).toEqual({
        name: "department1",
      })
    })
  })
  describe("error checking", () => {
    class User extends R.Entity {
      static get entities(): _Users {
        return Users
      }
      departmentId!: string | null
      @R.belongsTo(() => Department, "departmentId")
      department!: Department | null
      constructor(public name: string) {
        super()
      }
    }
    class _Users extends R.Entities<User> {}
    const Users = new _Users(User)

    class Department extends R.Entity {
      static get entities(): _Departments {
        return Departments
      }
      @R.hasMany(() => User, "departmentId", {sort: "name"}) users!: Array<User>
      constructor(public name: string) {
        super()
      }
    }
    class _Departments extends R.Entities<Department> {}
    const Departments = new _Departments(Department)

    const AppModel = new R.StateManager({
      entities: {Users, Departments},
    })
    beforeEach(() => AppModel.clearState())

    it("should not allow an object of the wrong class", () => {
      AppModel.action(() => {
        const d = new Department("d1")
        expect(() => Users.add(d as any)).toThrow(
          new Error(
            "Attempt to add entity of unexpected class Department to Users"
          )
        )
      })
    })
    it("should not allow an object of the wrong class in a relationship", () => {
      AppModel.action(() => {
        const d1 = Departments.add(new Department("d1"))
        const _d2 = new Department("d2")
        expect(() => d1.users.push(_d2 as any)).toThrow(
          new Error(
            "Attempt to add entity of unexpected class Department to Users"
          )
        )
      })
    })
    it("should allow an object a subclass", () => {
      class Worker extends User {
        constructor(name: string) {
          super(name)
        }
      }
      AppModel.action(() => {
        expect(() => Users.add(new Worker("w1"))).not.toThrow()
      })
    })
    it("should allow an already-added object", () => {
      AppModel.action(() => {
        const _u1 = new User("u1")
        const u1 = Users.add(_u1)
        const u2 = Users.add(_u1)
        expect(u1).toBe(u2)
      })
    })
    it("should allow the proxy of an already-added object", () => {
      AppModel.action(() => {
        const _u1 = new User("u1")
        const u1 = Users.add(_u1)
        const u2 = Users.add(u1)
        expect(u1).toBe(u2)
      })
    })
    it("should allow an object referencing an already-added object", () => {
      AppModel.action(() => {
        const u1 = Users.add(new User("u1"))
        const d1 = Departments.addObject({name: "d1", users: [u1]})
        expect(u1.departmentId).toBe(d1.entityId)
      })
    })
  })
  describe("update", () => {
    class User extends R.Entity {
      static get entities(): _Users {
        return Users
      }
      @R.id id!: string
      departmentId!: string | null
      @R.belongsTo(() => Department, "departmentId")
      department!: Department | null
      constructor(public name: string) {
        super()
      }
    }
    class _Users extends R.Entities<User> {}
    const Users = new _Users(User)

    class Department extends R.Entity {
      static get entities(): _Departments {
        return Departments
      }
      @R.id id!: string
      @R.hasMany(() => User, "departmentId", {sort: "name"}) users!: Array<User>
      constructor(public name: string) {
        super()
      }
    }
    class _Departments extends R.Entities<Department> {}
    const Departments = new _Departments(Department)

    const AppModel = new R.StateManager({
      entities: {Users, Departments},
    })
    beforeEach(() => AppModel.clearState())

    it("should modify an existing entity", () => {
      AppModel.action(() => {
        const u1 = Users.add(new User("u1"))
        const u2 = Users.update(new User("u1a"), u1.id)
        expect(u1.currentEntity).toBe(u2)
        expect(u1.name).toBe("u1a")
      })
    })
    it("should create new entities if they don't exist", () => {
      AppModel.action(() => {
        const u1 = Users.update(new User("u1"))
        const u1id = u1.id
        const uu1 = Users.byId[u1id]
        expect(uu1).toBe(u1)
        expect(uu1.name).toEqual("u1")
      })
    })
    it("should process relationships with new entities", () => {
      AppModel.action(() => {
        const u1 = Users.add(new User("u1"))

        const u1a = Users.updateObject({
          id: u1.id,
          name: "u1a",
          department: {
            name: "d1",
          },
        })

        expect(u1.currentEntity).toBe(u1a)
        const d1 = u1.department
        expect(d1 == null).toBe(false)
        expect(Departments.byId[notNull(d1).id]).toBe(d1)
      })
    })
    it("should process relationships with existing entities", () => {
      AppModel.action(() => {
        const d1 = Departments.add(new Department("d1"))
        const u1 = Users.add(new User("u1"))

        const d1a = Departments.updateObject({
          id: d1.id,
          name: "d1a",
          users: [u1],
        })

        expect(d1.currentEntity).toBe(d1a)
        expect(d1.id == null).toBe(false)
        expect(d1.name).toBe("d1a")

        const uu1 = d1.users[0]
        expect(uu1.departmentId).toBe(d1.id)
        expect(uu1.name).toBe("u1")
      })
    })
    it("should process relationships with new and existing", () => {
      AppModel.action(() => {
        const d1 = Departments.add(new Department("d1"))
        const u1 = Users.add(new User("u1"))
        const d1a = Departments.updateObject({
          id: d1.id,
          name: "d1a",
          users: [u1, {name: "u2"}],
        })

        expect(d1.currentEntity).toBe(d1a)
        expect(d1.id == null).toBe(false)
        expect(d1.name).toBe("d1a")

        const uu1 = d1.users[0]
        expect(uu1.departmentId).toBe(d1.id)
        expect(uu1.name).toBe("u1")

        const uu2 = d1.users[1]
        expect(uu2.departmentId).toBe(d1.id)
        expect(uu2.name).toBe("u2")
      })
    })
  })
})
