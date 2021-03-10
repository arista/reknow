import * as R from "../Reknow"

describe("Indexes", () => {
  describe("SortIndex", () => {
    class User extends R.Entity {
      static get entities(): _Users {
        return Users
      }
      constructor(public name: string | null, public age: number | null) {
        super()
      }
    }
    class _Users extends R.Entities<User> {
      @R.index("+name") index1!: R.SortIndex<User>
      @R.index("-age") index2!: R.SortIndex<User>
      @R.index("+name", "-age") index3!: R.SortIndex<User>
    }
    const Users = new _Users(User)
    const AppModel = new R.StateManager({entities: {Users}})
    const action = <T>(f: () => T) => {
      AppModel.action(f)
    }
    beforeEach(() => {
      AppModel.clearState()
    })

    it("should update itself as expected with entity changes", () => {
      action(() => {
        // Empty index
        expect(Users.index1).toEqual([])
        expect(Users.index2).toEqual([])

        // Adding entities
        const u1 = Users.add(new User("sam", 41), "u1")
        expect(Users.index1).toEqual([u1])
        expect(Users.index2).toEqual([u1])
        expect(Users.index3).toEqual([u1])

        const u2 = Users.add(new User("maggie", 16), "u2")
        expect(Users.index1).toEqual([u2, u1])
        expect(Users.index2).toEqual([u1, u2])
        expect(Users.index3).toEqual([u2, u1])

        const u3 = Users.add(new User("dave", 29), "u3")
        expect(Users.index1).toEqual([u3, u2, u1])
        expect(Users.index2).toEqual([u1, u3, u2])
        expect(Users.index3).toEqual([u3, u2, u1])

        const u4 = Users.add(new User("tim", 76), "u4")
        expect(Users.index1).toEqual([u3, u2, u1, u4])
        expect(Users.index2).toEqual([u4, u1, u3, u2])
        expect(Users.index3).toEqual([u3, u2, u1, u4])

        // null/undefined is considered less than all other values
        const u5 = Users.add(new User(null, null), "u5")
        expect(Users.index1).toEqual([u5, u3, u2, u1, u4])
        expect(Users.index2).toEqual([u4, u1, u3, u2, u5])
        expect(Users.index3).toEqual([u5, u3, u2, u1, u4])

        // Change entity properties
        u3.name = "nora"
        u3.age = 12
        expect(Users.index1).toEqual([u5, u2, u3, u1, u4])
        expect(Users.index2).toEqual([u4, u1, u2, u3, u5])
        expect(Users.index3).toEqual([u5, u2, u3, u1, u4])

        // Entities use id as the final sorting property
        u3.name = "tim"
        u3.age = 29
        expect(Users.index1).toEqual([u5, u2, u1, u3, u4])
        expect(Users.index2).toEqual([u4, u1, u3, u2, u5])
        expect(Users.index3).toEqual([u5, u2, u1, u4, u3])

        // Remove entities
        Users.remove(u3)
        expect(Users.index1).toEqual([u5, u2, u1, u4])
        expect(Users.index2).toEqual([u4, u1, u2, u5])
        expect(Users.index3).toEqual([u5, u2, u1, u4])

        Users.remove(u2)
        expect(Users.index1).toEqual([u5, u1, u4])
        expect(Users.index2).toEqual([u4, u1, u5])
        expect(Users.index3).toEqual([u5, u1, u4])

        Users.remove(u5)
        expect(Users.index1).toEqual([u1, u4])
        expect(Users.index2).toEqual([u4, u1])
        expect(Users.index3).toEqual([u1, u4])

        Users.remove(u1)
        expect(Users.index1).toEqual([u4])
        expect(Users.index2).toEqual([u4])
        expect(Users.index3).toEqual([u4])

        Users.remove(u4)
        expect(Users.index1).toEqual([])
        expect(Users.index2).toEqual([])
        expect(Users.index3).toEqual([])
      })
    })
  })

  describe("UniqueHashIndex", () => {
    class User extends R.Entity {
      static get entities(): _Users {
        return Users
      }
      constructor(public name: string | null) {
        super()
      }
    }
    class _Users extends R.Entities<User> {
      @R.uniqueIndex("=name") index1!: R.UniqueHashIndex<User>
    }
    const Users = new _Users(User)
    const AppModel = new R.StateManager({entities: {Users}})
    const action = <T>(f: () => T) => {
      AppModel.action(f)
    }
    beforeEach(() => {
      AppModel.clearState()
    })

    it("should update itself as expected with entity changes", () => {
      action(() => {
        expect(Users.index1).toEqual({})

        // Adding entities
        const u1 = Users.add(new User("steve"))
        expect(Users.index1).toEqual({steve: u1})

        const u2 = Users.add(new User("kim"))
        expect(Users.index1).toEqual({steve: u1, kim: u2})

        const u3 = Users.add(new User(null))
        expect(Users.index1).toEqual({steve: u1, kim: u2})

        // Changing entity values
        u2.name = "vanya"
        expect(Users.index1).toEqual({steve: u1, vanya: u2})

        u3.name = "art"
        expect(Users.index1).toEqual({steve: u1, vanya: u2, art: u3})

        u1.name = null
        expect(Users.index1).toEqual({vanya: u2, art: u3})

        // Removing entities
        Users.remove(u1)
        expect(Users.index1).toEqual({vanya: u2, art: u3})

        Users.remove(u2)
        expect(Users.index1).toEqual({art: u3})

        Users.remove(u3)
        expect(Users.index1).toEqual({})
      })
    })
    it("should enforce uniqueness constraint when adding", () => {
      action(() => {
        const u1 = Users.add(new User("kim"))
        expect(() => Users.add(new User("kim"))).toThrow(
          new Error(
            `Unique key violation: attempt to add multiple entities with key "kim" from property "name" in index "index1"`
          )
        )
      })
    })
    it("should enforce uniqueness constraint when changing property", () => {
      action(() => {
        const u1 = Users.add(new User("kim"))
        const u2 = Users.add(new User("jay"))
        expect(() => (u2.name = "kim")).toThrow(
          new Error(
            `Unique key violation: attempt to add multiple entities with key "kim" from property "name" in index "index1"`
          )
        )
      })
    })
  })

  describe("HashIndex to SortIndex", () => {
    class User extends R.Entity {
      static get entities(): _Users {
        return Users
      }
      constructor(public name: string | null, age: number | null) {
        super()
      }
    }
    class _Users extends R.Entities<User> {
      @R.index("=name", "+age") index1!: R.UniqueHashIndex<User>
    }
    const Users = new _Users(User)
    const AppModel = new R.StateManager({entities: {Users}})
    const action = <T>(f: () => T) => {
      AppModel.action(f)
    }
    beforeEach(() => {
      AppModel.clearState()
    })

    it("should update itself as expected with entity changes", () => {
      action(() => {
        expect(Users.index1).toEqual({})

        // Adding entities
        const u1 = Users.add(new User("steve", 15))
        expect(Users.index1).toEqual({steve: [u1]})

        const u2 = Users.add(new User("chris", 28))
        expect(Users.index1).toEqual({steve: [u1], chris: [u2]})

        const u3 = Users.add(new User("chris", 19))
        expect(Users.index1).toEqual({steve: [u1], chris: [u3, u2]})

        const u4 = Users.add(new User("amy", 63))
        expect(Users.index1).toEqual({steve: [u1], chris: [u3, u2], amy: [u4]})

        // Changing entity values
        u3.name = "steve"
        expect(Users.index1).toEqual({steve: [u1, u3], chris: [u2], amy: [u4]})

        u2.name = "bob"
        expect(Users.index1).toEqual({steve: [u1, u3], bob: [u2], amy: [u4]})

        u4.name = null
        expect(Users.index1).toEqual({steve: [u1, u3], bob: [u2]})

        // Removing entities
        Users.remove(u1)
        expect(Users.index1).toEqual({steve: [u3], bob: [u2]})

        Users.remove(u2)
        expect(Users.index1).toEqual({steve: [u3]})

        Users.remove(u3)
        expect(Users.index1).toEqual({})

        Users.remove(u4)
        expect(Users.index1).toEqual({})
      })
    })
  })

  describe("HashIndex to UniqueHashIndex", () => {
    class User extends R.Entity {
      static get entities(): _Users {
        return Users
      }
      constructor(public job: string | null, public name: string | null) {
        super()
      }
    }
    class _Users extends R.Entities<User> {
      @R.uniqueIndex("=job", "=name") index1!: R.HashIndex<
        R.UniqueHashIndex<User>
      >
    }
    const Users = new _Users(User)
    const AppModel = new R.StateManager({entities: {Users}})
    const action = <T>(f: () => T) => {
      AppModel.action(f)
    }
    beforeEach(() => {
      AppModel.clearState()
    })

    it("should update itself as expected with entity changes", () => {
      action(() => {
        expect(Users.index1).toEqual({})

        // Adding entities
        const u1 = Users.add(new User("teacher", "grant"))
        expect(Users.index1).toEqual({teacher: {grant: u1}})

        const u2 = Users.add(new User("teacher", "sam"))
        expect(Users.index1).toEqual({teacher: {grant: u1, sam: u2}})

        const u3 = Users.add(new User("banker", "sam"))
        expect(Users.index1).toEqual({
          teacher: {grant: u1, sam: u2},
          banker: {sam: u3},
        })

        const u4 = Users.add(new User("doctor", "kim"))
        expect(Users.index1).toEqual({
          teacher: {grant: u1, sam: u2},
          banker: {sam: u3},
          doctor: {kim: u4},
        })

        const u5 = Users.add(new User("doctor", null))
        expect(Users.index1).toEqual({
          teacher: {grant: u1, sam: u2},
          banker: {sam: u3},
          doctor: {kim: u4},
        })
        const u6 = Users.add(new User(null, "steve"))
        expect(Users.index1).toEqual({
          teacher: {grant: u1, sam: u2},
          banker: {sam: u3},
          doctor: {kim: u4},
        })

        // Changing entities
        u1.name = "bob"
        expect(Users.index1).toEqual({
          teacher: {bob: u1, sam: u2},
          banker: {sam: u3},
          doctor: {kim: u4},
        })
        u1.job = "fireman"
        expect(Users.index1).toEqual({
          fireman: {bob: u1},
          teacher: {sam: u2},
          banker: {sam: u3},
          doctor: {kim: u4},
        })

        u1.job = "youtuber"
        expect(Users.index1).toEqual({
          youtuber: {bob: u1},
          teacher: {sam: u2},
          banker: {sam: u3},
          doctor: {kim: u4},
        })

        u1.name = null
        expect(Users.index1).toEqual({
          teacher: {sam: u2},
          banker: {sam: u3},
          doctor: {kim: u4},
        })

        u4.name = null
        expect(Users.index1).toEqual({teacher: {sam: u2}, banker: {sam: u3}})

        u2.name = "steve"
        u2.job = "banker"
        expect(Users.index1).toEqual({banker: {sam: u3, steve: u2}})

        // Removing entities
        Users.remove(u1)
        Users.remove(u4)
        expect(Users.index1).toEqual({banker: {sam: u3, steve: u2}})

        Users.remove(u2)
        expect(Users.index1).toEqual({banker: {sam: u3}})

        Users.remove(u3)
        expect(Users.index1).toEqual({})
      })
    })
    it("should enforce uniqueness constraint when adding", () => {
      action(() => {
        const u1 = Users.add(new User("teacher", "bob"))
        expect(() => Users.add(new User("teacher", "bob"))).toThrow(
          new Error(
            `Unique key violation: attempt to add multiple entities with key "bob" from property "name" in index "index1"`
          )
        )
      })
    })
    it("should enforce uniqueness constraint when changing first property", () => {
      action(() => {
        const u1 = Users.add(new User("teacher", "bob"))
        const u2 = Users.add(new User("librarian", "bob"))
        expect(() => (u2.job = "teacher")).toThrow(
          new Error(
            `Unique key violation: attempt to add multiple entities with key "bob" from property "name" in index "index1"`
          )
        )
      })
    })
    it("should enforce uniqueness constraint when changing the second property", () => {
      action(() => {
        const u1 = Users.add(new User("teacher", "bob"))
        const u2 = Users.add(new User("teacher", "chris"))
        expect(() => (u1.name = "chris")).toThrow(
          new Error(
            `Unique key violation: attempt to add multiple entities with key "chris" from property "name" in index "index1"`
          )
        )
      })
    })
  })

  describe("HashIndex to SortIndex", () => {
    class User extends R.Entity {
      static get entities(): _Users {
        return Users
      }
      constructor(public name: string | null, public age: number | null) {
        super()
      }
    }
    class _Users extends R.Entities<User> {
      @R.index("=name", "+age") index1!: R.HashIndex<R.SortIndex<User>>
    }
    const Users = new _Users(User)
    const AppModel = new R.StateManager({entities: {Users}})
    const action = <T>(f: () => T) => {
      AppModel.action(f)
    }
    beforeEach(() => {
      AppModel.clearState()
    })

    it("should update itself as expected with entity changes", () => {
      action(() => {
        expect(Users.index1).toEqual({})

        // Adding entities
        const u1 = Users.add(new User("darien", 14))
        expect(Users.index1).toEqual({darien: [u1]})

        const u2 = Users.add(new User("selma", 16))
        expect(Users.index1).toEqual({darien: [u1], selma: [u2]})

        const u3 = Users.add(new User("darien", 41))
        expect(Users.index1).toEqual({darien: [u1, u3], selma: [u2]})

        // Changing property values
        u3.name = "selma"
        expect(Users.index1).toEqual({darien: [u1], selma: [u2, u3]})

        u3.age = 12
        expect(Users.index1).toEqual({darien: [u1], selma: [u3, u2]})

        u1.name = "dominic"
        expect(Users.index1).toEqual({dominic: [u1], selma: [u3, u2]})

        // Removing entities
        Users.remove(u1)
        expect(Users.index1).toEqual({selma: [u3, u2]})

        Users.remove(u3)
        expect(Users.index1).toEqual({selma: [u2]})

        Users.remove(u2)
        expect(Users.index1).toEqual({})
      })
    })
  })

  describe("HashIndex to HashIndex to SortIndex", () => {
    class User extends R.Entity {
      static get entities(): _Users {
        return Users
      }
      constructor(
        public job: string | null,
        public name: string | null,
        public age: number | null
      ) {
        super()
      }
    }
    class _Users extends R.Entities<User> {
      @R.index("=job", "=name", "+age") index1!: R.HashIndex<
        R.HashIndex<R.SortIndex<User>>
      >
    }
    const Users = new _Users(User)
    const AppModel = new R.StateManager({entities: {Users}})
    const action = <T>(f: () => T) => {
      AppModel.action(f)
    }
    beforeEach(() => {
      AppModel.clearState()
    })

    it("should update itself as expected with entity changes", () => {
      action(() => {
        expect(Users.index1).toEqual({})

        // Adding entities
        const u1 = Users.add(new User("banker", "darien", 14))
        expect(Users.index1).toEqual({banker: {darien: [u1]}})

        const u2 = Users.add(new User("welder", "sue", 18))
        expect(Users.index1).toEqual({
          banker: {darien: [u1]},
          welder: {sue: [u2]},
        })

        const u3 = Users.add(new User("banker", "cynthia", 21))
        expect(Users.index1).toEqual({
          banker: {darien: [u1], cynthia: [u3]},
          welder: {sue: [u2]},
        })

        const u4 = Users.add(new User("banker", "cynthia", 17))
        expect(Users.index1).toEqual({
          banker: {darien: [u1], cynthia: [u4, u3]},
          welder: {sue: [u2]},
        })

        const u5 = Users.add(new User("welder", "cynthia", 34))
        expect(Users.index1).toEqual({
          banker: {darien: [u1], cynthia: [u4, u3]},
          welder: {sue: [u2], cynthia: [u5]},
        })

        // Changing property values
        u4.age = 30
        expect(Users.index1).toEqual({
          banker: {darien: [u1], cynthia: [u3, u4]},
          welder: {sue: [u2], cynthia: [u5]},
        })

        u4.job = "welder"
        expect(Users.index1).toEqual({
          banker: {darien: [u1], cynthia: [u3]},
          welder: {sue: [u2], cynthia: [u4, u5]},
        })

        u4.name = "sue"
        expect(Users.index1).toEqual({
          banker: {darien: [u1], cynthia: [u3]},
          welder: {sue: [u2, u4], cynthia: [u5]},
        })

        u4.job = "banker"
        expect(Users.index1).toEqual({
          banker: {darien: [u1], cynthia: [u3], sue: [u4]},
          welder: {sue: [u2], cynthia: [u5]},
        })

        u2.job = "banker"
        expect(Users.index1).toEqual({
          banker: {darien: [u1], cynthia: [u3], sue: [u2, u4]},
          welder: {cynthia: [u5]},
        })

        u5.job = "banker"
        expect(Users.index1).toEqual({
          banker: {darien: [u1], cynthia: [u3, u5], sue: [u2, u4]},
        })

        // Removing entities
        Users.remove(u1)
        expect(Users.index1).toEqual({
          banker: {cynthia: [u3, u5], sue: [u2, u4]},
        })

        Users.remove(u2)
        expect(Users.index1).toEqual({banker: {cynthia: [u3, u5], sue: [u4]}})

        Users.remove(u3)
        expect(Users.index1).toEqual({banker: {cynthia: [u5], sue: [u4]}})

        Users.remove(u4)
        expect(Users.index1).toEqual({banker: {cynthia: [u5]}})

        Users.remove(u5)
        expect(Users.index1).toEqual({})
      })
    })
  })
})
