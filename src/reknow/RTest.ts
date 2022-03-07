import * as R from "./Reknow"
import {Proxied} from "./Proxied"

export class Organization extends R.Entity {
  @R.id id!: string

  @R.hasMany(()=>User, "organizationId", {primaryKey: "id", sort: "+name"}) users!:Array<User>
}
class _OrganizationEntities extends R.Entities<Organization> {
}
const OrganizationEntities = new _OrganizationEntities(Organization)

// User
export class User extends R.Entity {
  @R.id id!: string
  organizationId!:string|null

  @R.belongsTo(()=>Organization, "organizationId", {foreignKey: "id"}) organization!:Organization|null

  static get entities(): _Users {
    return Users
  }
  constructor(public name: string) {
    super()
  }
}
class _Users extends R.Entities<User> {
  @R.index("+name") byName!: R.SortIndex<User>
}
const Users = new _Users(User)

const AppModel = new R.StateManager({
  entities: {Organization, /*Administrator, Teacher, StaffMember,*/ User},
})
const action = <T>(f: () => T) => {
  return AppModel.action(f)
}

export function runTest() {
  const o1 = action(() =>new Organization().addEntity())
  const u1 = action(()=>new User("abc").addEntity())

  console.log(`o1 proxy: ${Proxied.getProxied(o1)}`)
  console.log(`u1 proxy: ${Proxied.getProxied(u1)}`)

  console.log(`setting organization by reference`)
  //action(()=>u1.organizationId = o1.id)
  action(()=>u1.organization = o1)
  console.log(`done setting organization by reference`)

  console.log()
  console.log(`u1.organizationId == o1.id: ${u1.organizationId == o1.id}`)
  console.log(`o1.users.length == 1: ${o1.users.length == 1}`)
  console.log(`o1.users[0]?.id == u1.id: ${o1.users[0]?.id == u1.id}`)
}
