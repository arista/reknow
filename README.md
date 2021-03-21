# Reknow

_knowledge before action_

Reknow is a state management library based on relational modeling concepts, designed to support React applications written in either TypeScript or JavaScript.

## Introduction

Reknow organizes and maintains an application's internal state, separating that state from the application's presentation layer.  In a React application, Reknow occupies the same space as libraries like Redux or Recoil.

Reknow borrows several concepts from relational modeling systems.  Developers who have used relational databases or object/relational mapping libraries should find many of the concepts familiar.  For example, a basic rule in Reknow is that model objects must not reference each other directly, but instead reference each other by id (or other property value).  Reknow uses indexes and synthetic properties to expose those relationships in ways that feel natural to developers.

That "natural feel" is a guiding principle of Reknow.  Reknow is designed to enable developers to model and maintain state naturally, while minimizing the patterns for updating or selecting data.  Applications can freely add and remove model instances, and even change instance property values directly.  Reknow will automatically detect these changes and take care of the downstream effects, such as notifying the appropriate React components.  Applications can also compute and assemble selected values from the model using straightforward functions or getter methods.  Reknow will automatically cache the results, while tracking what model objects and properties were referenced in those calculations, allowing Reknow to invalidate the cached values when those dependencies change.

Reknow uses JavaScript Proxies to make all of this possible.  These Proxies intercept calls to get or set property values, and allow Reknow to react accordingly.  For the most part, the application is unaware that it is using Proxies, and can be coded as if it were using model classes and instances directly.

Reknow also uses these Proxies to interact with frameworks like React.  In Reknow, the underlying data is mutable, and new immutable copies are not created with each state change.  Instead, when a model object is changed, Reknow creates a new Proxy to refer to that model object.  This is sufficient to signal a data change to React, because it effectively presents React with a new object identity.  In other words, Reknow effects object identity changes by creating new Proxies to mutable data, instead of creating new copies of immutable data.

Because Reknow detects state changes all the way down to the property level, it is able to provide a "stream" of state changes to applications that desire it.  The relational modeling pattern effectively boils every state change down to either adding a model object, removing a model object, or changing the property of a model object.  By adding a listener to Reknow, an application can be notified of all these state changes.  This allows applications to implement sophisticated undo/redo mechanisms, incrementally save document state as a stream of edits, or even broadcast state changes to collaborators to enable shared document viewing or editing.

The Reknow library itself has very few dependencies and can be used in Node.js or in browsers.  It works well with React, but has no direct connection to the React libraries - that connection is provided through a separate "react-reknow" library.  Reknow is designed primarily for TypeScript applications, but it can be used just as effectively with JavaScript.  It does make use of decorators, which are still "experimental" as of ES6, but also provides alternatives for environments where decorators are not supported.  All of Reknow's operations run synchronously, without the use of timers or Promises, and can be used from both async and non-async functions.

## Building An Application With Reknow

The steps to build a Reknow application typically look something like this:

* Design the classes that will model as much of the application's state as possible.  This includes both the data that the application manipulates (Topics, Posts, ShoppingCartItems, etc.), as well as the "view state" of the application (NavigationBreadcrumb, ErrorDialog, etc.).  Keep object properties as simple as possible, preferably sticking to strings, numbers, and booleans, remembering that more complex structures can be defined using Reknow's relational facilities.
  * Add `@hasMany`, `@hasOne`, and `@belongsTo` declarations to the model classes to surface their various relationships.
  * Add `@index` declarations to support other ways the application might access the data.
  * Add `@query` decorators to mark out methods in the model classes that supply processed data to other application layers (such as React components).  These methods will cache their return values and invalidate automatically in response to the appropriate state changes.  Keep those methods as pure as possible without side effects or state changes.
  * Add `@action` decorators to mark out "top-level" state-changing methods in the model classes.  Try to keep those methods as "pure" as possible, without side effects.
  * Add `@afterAdd`, `@afterRemove`, and `@afterChange` decorators to methods that invoke side effects in response to the state changes in `@action` methods.
  * Add `@reaction` decorators to methods that perform state changes in response to other state changes (typically used to maintain "computed" properties that then feed into indexes).
* Create a Reknow `StateManager` instance, passing it a list of all the model classes that it will be managing.
* Build the presentation layer.  Assuming it is a React application:
  * Apply the `useQuery` hook from the `react-reknow` library to pull data directly from model objects.  `useQuery` will automatically trigger a component re-render whenever the underlying model object data changes.
  * Invoke `@action` methods directly on model objects in response to user actions
  * Inovke `@action` methods at any time, actually, even in response to asynchronous events like Timers, within async methods, etc.

## Sample Todo Application

```
npx create-react-app todoapp --template typescript
npm install --save reknow
npm install --save react-reknow
npm start
```
add experimentalDecorators to tsconfig

The example is a simple Todo list manager.  It allows the user to add lists, add items to those lists, mark items as "done", and to remove entire lists.  Items in each list are ordered by their creation time, most recent first.  Items marked as "done" are displayed with a strikethrough at the bottom of the list.  The lists offer a choice of ordering - either by creation time, alphabetically by list name, or by number of items in the list.

The application's data is modeled using `TodoApp`, `TodoList`, and `TodoListItem`, with one-to-many relationships between them:

```
TodoApp --< TodoList --< TodoListItem
```

A `TextInput` is also modeled, to demonstrate the use of a "standalone" reusable component with state.

### Concepts

#### Importing Reknow

The sample app uses the pattern of importing Reknow into its own namespace:

```
import * as R from "reknow"
```

A Reknow model file typically uses many reknow exports, so it's often more convenient to import the whole namespace rather than importing individual exports.  The file can then reference Reknow exports off of that namespace, for example: `@R.hasMany`.

#### Entity and Entities classes

Each model class extends the `Entity` base class, and has an associated singleton instance that extends the `Entities` base class.  The `Entity` class represents individual instances of the model, while the `Entities` singleton refers to the whole collection of instances.  Each model is typically defined in its own file, containing both the `Entity` class and the `Entities` singleton.  Often just the `Entity` class is exported, but if the model has also added useful definitions to the `Entities` class (indexes, finders, etc.), then its singleton would also be exported and made available to the rest of the application.

A minimal model file would look like this:

```ts
import * as R from "reknow"

export class TodoListItem extends R.Entity {
  constructor() {
    super()
  }
}

class Entities extends R.Entities<TodoListItem> {
}

new Entities(TodoListItem)

// OR, if the Entities class contains definitions the rest of
// the application will find useful:
export const TodoListItemEntities = new Entities(TodoListItem)
```

#### Adding and Removing Entity Instances

Reknow will only manage Entity instances that have been added by the application.  Adding an instance will also return a Proxy that the application should use from then on to access the instance.  Typically an application will create and add an instance in a single step, so that it doesn't accidentally end up using an un-Proxied instance.  For example:

```ts
const item = new TodoListItem("buy milk").addEntity()
```

Once added, an Entity instance will remain in Reknow until it is removed by the application:

```ts
item.removeEntity()
```


#### Entity Id's

Every entity added to Reknow is assigned a permanent id.  This id can be accessed with the `entityId` property:

```ts
const item = new TodoListItem("buy milk").addEntity()
const itemId = item.entityId
```

An entity can use the `@R.id` decorator to declare an id property, in which case Reknow will automatically copy the entity's id into that property.  Or, if that property has a value when the Entity is added, Reknow will use that value as the id.  For example, if Reknow is assigning the id:

```ts
export class TodoListItem extends R.Entity {
  @R.id id!:string

  constructor() {
    super()
  }
}
```

(Note: the `!` in the property declaration tells Typescript not to complain that the property hasn't been assigned in the constructor.  This notation will show up with other "synthetic" properties used by Reknow)

Or if the application is providing the id in the constructor, then the declaration might look like this:

```ts
export class TodoListItem extends R.Entity {
  @R.id id:string

  constructor(id:string) {
    super()
    this.id = id
  }
}
```

The final way to assign an id is with the `addEntity()` method, which takes an optional id argument:

```ts
const item = new TodoListItem("buy milk").addEntity("Item22424")
```

Entity id's must be strings, and they must be unique among all instances of a given Entity type.

By default, if Reknow is generating the id, it will use a very simple counter to generate id's like "1", "2", etc.  The application can provide an alternate id generator (FIXME), which will be consulted whenever Reknow needs a new id.

#### Entity Properties

Entity classes should stick to "simple" properties as much as possible: strings, numbers, and booleans.  If an Entity needs to refer to other Entities, it should do so using id's and "relationships" rather than direct references.  Data structures like ordered lists (arrays) or key/value collections (objects), should also be implemented relationally.

Having said that, Reknow doesn't specify or enforce restrictions on property types.  An application is free to use whatever values it wants for properties.  However, the only changes Reknow will detect and react to are new values being assigned to properties.  For a string, number, or boolean value, this will work naturally.  But if a property value is an array, then Reknow will only detect if the property is assigned a completely new array - it will not detect if the array itself is mutated.

In some cases, this may be perfectly fine.  If a complex structure is read-only, or is treated as immutable, then it should work fine as a property value.  Or if the application has other ways to detect changes in the value, such as callbacks registered with the value, then it would be appropriate to store that value in Reknow.  This would be the case for system-provided objects, like an `XMLHttpRequest`, or a DOM `Node`, or a `Promise`.

#### State Changes and Actions

From Reknow's perspective, all of its state is contained in Entity instances that have been added to it, and all of an Entity's state is contained in simple or (from Reknow's perspective) immutable property values.  This means that there are only 3 kinds of state changes in Reknow:

* Adding an Entity
* Removing an Entity
* Changing an Entity's property value

The `addEntity()` method, seen earlier, will add Entity instances to Reknow.  Similarly, `removeEntity()` will remove an instance.  Property changes are effected by simply assigning the property: `todoItem.complete = true`.

All of these state changes can be invoked at nearly any time: at the start of an application, in response to user input, in response to a callback, as part of an `async` method, etc.  The one consistent rule is that all state changes must take place within an "Action".  The easiest way to do this is to use a decorator to mark an Entity method as an action:

```ts
import * as R from "reknow"

export class TodoListItem extends R.Entity {
  ...
  @R.action setComplete() {
    this.complete = true
  }
...
```

(alternatives to decorators are described later)

All of the state changes that occur while executing an `@R.action` method will be collected into a single "action", whether it's a single property change or a more complex sequence of changes.  Reknow will wait until the end of the application's action before taking its own actions in response, such as reporting the action to its listeners, notifying the application of invalidated cached values, updating the affected React components, or running validators on the affected Entities (coming soon).

It is fine for `action` methods to call other `action` methods - only the "outermost" `action` will apply.  But before going and marking every method as an `action`, be aware that conceptually, an action should represent a "top-level" operation.  It should leave all affected model instances in valid and consistent states.

Also be aware that action methods should be "pure", meaning that they depend only their inputs and the current state of the model, and they should have no side effects other than to make state changes to the model.

#### Indexes

Indexes organize all of the Entities of a given class into orderly structures that facilitate rapid lookups by the application.  Indexes are declared on the `Entities` class using decorators.  For example:

```ts
export class TodoListItem extends R.Entity {
  ...
}

class Entities extends R.Entities {
  @R.index("+name") byName!:R.SortIndex<TodoListItem>
}

export const TodoListItemEntities = new Entities(TodoListItem)
```

That line declares that `TodoListItemEntities.byName` will be an array of all the `TodoListItem` instances that have been added to Reknow, sorted by `name` in ascending order.  There's a lot packed into that line, so to break it down:

* `@R.index("+name")` is the decorator that declares the index
* `byName!` is the name of the property that will provide access to the index.  The property will be "synthesized" by Reknow, so the `!` tells Typescript not to complain that its value isn't being set explicitly in the constructor.
* `R.SortIndex<TodoListItem>` is the property's type.  This is effectively an alias for `TodoListItem[]`.

This is an example of a "SortIndex", exposed to the application as an Array.  Reknow will automatically keep this Array sorted in ascending order by each instance's `name` property, updating it as instances are added, removed, or modified.  The application read access this structure freely, but is prevented from modifyin it.

A SortIndex can sort by any number of properties, each in either ascending or descending order.  For example, `@R.index("+name", "-age")` will sort instances first by `name` in ascending order, then by `age` in descending order for instances that have the same `name`.  If instances have the same `name` and `age`, then Reknow will sort by entity id (ascending) as the last resort.

An index can be directed to group instances with the same property value.  This is called a "HashIndex", and is declared by using `=` with the property name:

```ts
@R.index("=name", "+age") byNameAndAge!:R.HashIndex<SortIndex<TodoListItem>>
```

Instead of a single array, `byNameAndAge` is now an Object whose keys are names, and whose values are arrays of instances with those names, with each array ordered by age.  For example:

```ts
{
  "name1": [...],
  "name2": [...],
  ...
}
```
An application can use `TodoListItemEntities.byNameAndAge.name1 || []` to get a list of all TodoListItems with `name` property set to "name1".  Note that if no instances had a `name` with "name1", then it won't have an entry in the object, hence the `|| []`.

A HashIndex can also declare multiple levels of grouping.  For example:

```ts
@R.index("=name", "=status") byNameAndStatus!:R.HashIndex<R.HashIndex<SortIndex<TodoListItem>>>
```

This will maintain a "multi-level" object, something like this:

```ts
{
  "name1": {
    "complete": [...],
    "incomplete": [...],
  },
  "name2": {
    "complete": [...],
    "incomplete": [...],
  },
  ...
}
```

Which an application can access with `TodoListItemEntities.byNameAndStatus.name2?.complete || []`.  Again, the `?.` and `|| []` are to protect against keys that might not exist in the object.

This example doesn't specify any sort terms, but as always, entity id is always used as the sort term of "last resort".

An index may specify any number of hash (`=`) and sort (`+`/`-`) terms.  The only rule is that all of the hash terms must appear before all sort terms.

The final type of index is a "UniqueHashIndex".  This is similar to a HashIndex, except that the final values are instances, as opposed to arrays of instances:

```ts
@R.uniqueIndex("=name", "=status") byNameAndStatus!:R.HashIndex<R.UniqueHashIndex<TodoListItem>>
```

Note the use of `@R.uniqueIndex` instead of `@R.index`.  This causes the resulting structure to look like this:

```ts
{
  "name1": {
    "complete": TodoListItem,
    "incomplete": TodoListItem,
  },
  "name2": {
    "complete": TodoListItem,
  },
  ...
}
```

Declaring a UniqueHashIndex also enforces a uniqueness constraint on entity instances.  For example, attempting to add or update two instances with the same `name` and `status` will throw an exception.

Indexes will only work on actual properties of Entity instances - they will not work correctly if they refer to getter methods.  This is important for applications that want to create indexes based on "computed values".  Reknow provides a "reaction" facility, described later, to help with that.

#### Relationships

As mentioned previously, Entities refer to each other through properties and id's rather than direct pointers.  For example, a `TodoList` may "own" multiple `TodoListItem` instances.  This can be implemented by defining a `todoListId` property on `TodoListItem`, which holds the id of the `TodoList` to which the item belongs.  When a TodoList wishes to get a list of its items, it effectively searches through all TodoListItems to find those whose `todoListId` match its id.  Practically, a HashIndex would be used to turn this search into a quick lookup.

Reknow provides `@R.hasMany`, `@R.hasOne`, and `@R.belongsTo` decorators that simplify the implementation of relationships.  For example:

```ts
export class TodoList extends R.Entity {
  @R.hasMany(() => TodoListItem, "todoListId", {
    sort: "+createdAt",
    dependent: "remove",
  })
  items!: Array<TodoListItem>
  ...
```
These declarations can look confusing at first, so to break it down:

```
@R.hasMany(...) items!: Array<TodoListItem>
```
The decorator is ultimately declaring an `items` property which will be an array of the items that belong to the `TodoList`.  The `!` in the declaration effectively tells Typescript that this is a "synthetic" property, and Typescript shouldn't complain that the property isn't set in the constructor.

The `hasMany` decorator has three arguments: the "foreign" Entity class, the "foreign key", and a set of options.
* The foreign Entity class is expressed indirectly through the return value of a Function, so as to avoid circular references during startup.
* The "foreign key" is the property on the foreign Entity that is used to refer back to the TodoList's id - `todoListId` in our case.
* The `sort` option declare that the resulting list of items should be sorted by each item's `createdAt` (ascending).
* The `dependent` option declares that if the TodoList is removed, all of its items should also be removed automatically.

With this declaration in place, the application can simply refer to `myTodoList.items` and receive an array of items whose `todoListId` has the same value as `myTodoList.id`, ordered by `item.createdAt`.  If another item sets its `todoListId` to that same list, then it will immediately "appear" in the array at the correct position.

The array is also somewhat mutable.  `items.push(item)` will "add" an item to the array by setting its `todoListId` appropriately, with the caveat that the new item will appear in the index correctly sorted, not necessarily at the end.  Similarly, `items.pop()` will "remove" the last item from the list by setting its `todoListId` appropriately, or removing it from Reknow altogether if `dependent: "remove"` is specified.

Underneath, there is no actual array representing the relationship.  The `items` property simply performs a lookup in the appropriate index, wrapping the result with a Proxy to make the array appear mutable.

To find the "appropriate index", the relationship will look through the indexes defined on `TodoListItemEntities`, specifically looking for one whose terms start with `("=todoListId", "+createdAt")`.  If it doesn't find such an index, then it will create an index itself and add it to the class.  All of this is a one-time process that happens at startup.  This process allows the application to define and use relationships without the burden of managing the associated indexes.

An Entity can declare as many relationships as it wants.  It can even have multiple relationships to the same "foreign" Entity class, perhaps sorting them in different ways, although at most one of those relationships should define a `dependent` option.

The `@R.hasOne` declaration is similar to `@R.hasMany`, except that it results in only a single Entity (or null), and it uses a UniqueHashIndex underneath.  `@R.belongsTo` is similar to `@R.hasOne`, except that the notion of "primary" and "foreign" are swapped.

#### Proxies and Object Identity

As described previously, Reknow relies heavily on Javascript Proxies to implement its functionality.  Entity instances retrieved by the application are presented through Proxies, so that Reknow is able to monitor how the application is reading or modifying the properties of those Entities.  Indexes and relationships also follow this pattern, presenting data to the application through Proxies that mediate access and mutation.  All of this happens automatically without the application needing to do anything special to use those Proxies.

Underneath all the Proxies, Reknow maintains the "real" data structures internally, and those data structures are mutable.  When the application changes an Entity's property, that change eventually makes its way through the Proxy to the underlying instance, and that instance's property really is changed.  Reknow is not maintaining immutable structures or using a copy-on-write strategy.  This is true of Reknow's indexes as well.

This may seem to run counter to React's requirements, which rely on value changes to trigger visual changes.  More specifically, React will not take action on a new value unless `newValue !== oldValue`.  Treating data as immutable is one way to meet that requirement, creating new copies of objects to represent data changes.

Reknow takes a different approach, using new Proxy instances to present React with new object identities that satisfy the `newValue !== oldValue` requirement.  Both `oldValue` and `newValue` are Proxies that "point" to the same underlying Entity or index structure, and accessing the data through either Proxy will yield the exact same results.  React doesn't actually care that the underlying object is the same - it just sees a new object identity show up and concludes that the underlying data has changed.

Reknow supports this approach by automatically using a new Proxy instance when an Entity or index is changed.  From the application's perspective, all of those Proxies are equivalent, and it's perfectly fine for the application to use multiple Proxies to the same Entity.  But once the data reaches React, the application should make sure that React is seeing the "latest" Proxy associated with an Entity.

The `Entity.currentEntity` property will return the most recent Proxy associated with an Entity.  However, it's unusual for applications to need this method, as Reknow provides more convenient ways to keep React synchronized with the most up-to-date Proxies, described below.

#### Queries

A "query" is a function whose return value is cached, so that calling the function again will return the cached value without executing the function again.  As the query function executes, Reknow "watches" the function to see what Entity instances, properties, indexes, relationships, and other queries it references.  If any of those referenced values later changes, Reknow will invalidate the query's cached value.  If the query is called after that, it will execute its function and recompute the value, generating a possibly new set of referenced Entities and properties.

(Note: there is no "query language" or other special facility for reading data from Entity instances and indexes.  The term "Query" has been appropriated from other relational systems, where it might have a different meaning)

An application can also associate a callback function with a query, which will be called after Reknow invalidates the Query.  This is how `react-reknow`, for example, knows when to re-render a React component in response to a change in Reknow data.

The easiest way to define a query is to use the `@R.query` decorator on an Entity getter method.

```
@R.query get completeItems() {
  return this.items.filter(item => item.complete === true)
}
```
The first time this is called on a `TodoList`, it will search through that list for all of the items marked as "complete" and return the result.  That result will be cached and returned the next time `completeItems` is called on that list.

While the getter was running, Reknow was building up a list of "dependencies", noting that the list of `items` was referenced (or more accurately, that the appropriate entry in the index underlying the `items` relationship was accessed), and that the `complete` property of each item was also referenced.  Internally, Reknow keeps track of all those dependencies and watches them all for changes.  For example, if one of the list's items changes its `complete` property, then the query would be invalidated.  If the list itself changes by adding or removing an item, the query will also be invalidated.

A query can reference other queries as part of its computation.  Reknow will track those references as dependencies, and if any of those dependent queries is invalidated, the referring query will also be invalidated.

Queries have a special case: if a query returns an Entity, then the query will be invalidated if any property of the Entity is changed.  This is a convenience that supports simplified usage in React, as will be described later.

A query must be a "pure" function, depending solely on the current state of the model and avoiding any side effects.  It cannot take any inputs, and when declared with the `@R.query` decorator, it must be defined on a getter.  An `@R.query` may be defined on either an `Entity` or an `Entities` class.

#### Reactions

A "reaction" is a combination of a query and an action.  Like a query, it is a function that Reknow "watches" to find its dependencies.  Unlike a query, Reknow will automatically call the function initially, and will automatically call the function again if a dependency changes.  Also unlike a query, a reaction is allowed, and even encouraged, to change model state when it is called.

The most common use of a reaction is to set an Entity property that is computed from other values, solely for the purpose of indexing on that property.  For example:

```ts
export class TodoList extends R.Entity {
  ...
  @R.reaction computeItemCount() {
    this.itemCount = this.items.length
  }
```
This effectively defines `itemCount` to be a "computed" property that is kept in sync with the number of items in its relationship.  An index can then be defined that allows all lists to be sorted by the number of items they contain.

While reactions may modify state, they still should be kept free of other side effects.

#### Side Effects

Reknow's actions, queries, and reactions should all be kept free of side effects, such as network requests, timers, DOM changes, etc.  Real-world applications, of course, need to do all of these things.  For applications that wish for side effects to be "model-driven", Reknow provides "effects" decorators that allow side effects to be triggered in response to state changes.  These decorators are `@R.afterAdd`, `@R.afterRemove`, `@R.afterChange`, and `@R.afterPropertyChange`:

```
export class TodoListItem extends R.Entity {
  @R.afterAdd sendNetworkRequest() {
    ...
  }
```

Effects are called at the end of an action, after all the state changes have been made.  For example, `sendNetworkRequest` would be called on the item if it was added to Reknow during the action.  Similarly, an `@R.afterRemove` method would be called if the item was removed from Reknow, and an `@R.afterChange` method would be called if any property of the Entity is changed during the action.

The `@R.afterPropertyChange` decorator can narrow the effect to a specific property.  For example:

```
export class TodoListItem extends R.Entity {
  @R.afterPropertyChange("name") onNameChange(oldName:string) {
    ...
  }
```

This would only be called if the "name" property changes during an action, and the method will be passed the old value of "name".

Effect methods are encouraged to invoke side effects.  They should, however, be careful about changing model state, especially in a way that could trigger an endless loop of effects and model changes.

Effects allow an application to be entirely "model-driven", meaning that all application activity flows through changes to the model.  This enables functions like undo/redo, saving and loading application state, and even collaborative editing.

#### Services

Services are singleton instances of classes that provide access to the model without being tied to a specific Entity.  Just like Entity and Entities classes, a Service can use `@R.action`, `@R.reaction`, and `@R.query` decorators.

A Service is typically implemented using this pattern:

```ts
class ShoppingCartServiceClass extends @R.Service {
}

export const ShoppingCartService = new ShoppingCartServiceClass()
```

#### StateManager

`StateManager` is Reknow's central class.  Every Reknow application must create a single `StateManager`, passing it all of the Entity classes and Service instances.  Additional options can also be invoked through the `StateManager`.  Applications typically create the `StateManager` in a `Models.ts` class:

```ts
import * as R from "reknow"
import {TodoList} from "./TodoList"
import {TodoListItem} from "./TodoListItem"
import {ShoppingCartService} from "./ShoppingCartService"

export const models = new R.StateManager({
  entities: {
    TodoList,
    TodoListItem
  }
  services: {
    ShoppingCartService
  }
})
```

Once this is run, the application can start invoking actions, queries, etc. directly on Entity, Entities, and Service instances.  Applications rarely need to access the StateManager directly after creating it.

As an application grows, the central StateManager might end up becoming very large, as it imports and declares every Entity and Service in the application.  Reknow allows those declarations to be modularized, by simply declaring them in nested "namespaces".  For example:

```ts
export const models = new R.StateManager({
  entities: {
    todo: {
      TodoList,
      TodoListItem
    },
    shoppingCart: {
      ShoppingCart,
      ShoppingCartItem,
    }
  }
  services: {
    shoppingCart: {
      ShoppingService
    }
  }
})
```

These "modules" can then be broken out into separate files to make them easier to maintain.  For example:

```ts
import {todo} from "./todo"
import {shoppingCart, shoppingCartServices} from "./shoppingCart"

export const models = new R.StateManager({
  entities: {
    todo,
    shoppingCart
  }
  services: {
    shoppingCart: shoppingCartServices
  }
})
```

And `todo.ts` might look like this:

```ts
import {TodoList} from "./TodoList"
import {TodoListItem} from "./TodoListItem"

export const todo = {
  TodoList,
  TodoListItem
}
```

The "namespaces" can be nested to any level within the StateManager declaration.  These namespaces are only an organizing tool - they don't affect the application directly, which is still directly accessing classes like `TodoList` and `TodoListItem`.

However, the namespaces do show up when the StateManager reports actions and debugging to its assigned listeners (described below).  For example, a property change on a TodoListItem  would be reported as a change to a "todo.TodoListItem".

#### Transaction and Debug Listeners

When a StateManager is created, it can optionally be assigned a TransactionListener and a DebugListener:

```ts
export const models = new R.StateManager({
  entities: {
    todo: {
      ...
    }
  },
  listener: (e) => console.log(R.stringifyTransaction(e)),
  debugListener: (e) => console.log(R.stringifyDebugEvent(e))
})
```

The `listener` is notified at the end of every action with a "Transaction" object that describes the `@R.action` that triggered it, along with the complete list of resulting entity state changes.  For example:

```json
{
  "action": {
    "type": "EntityAction",
    "entityType": "todo.TextInput",
    "id": "2",
    "name": "notifyValue",
    "args": []
  },
  "stateChanges": [
    {
      "type": "EntityAdded",
      "entityType": "todo.TodoList",
      "id": "1",
      "entity": {
        "name": "Groceries",
        "id": "1",
        "itemCount": 0
      }
    },
    {
      "type": "EntityPropertyChanged",
      "entityType": "todo.TodoList",
      "id": "1",
      "property": "todoAppId",
      "newValue": "2"
    },
    {
      "type": "EntityPropertyChanged",
      "entityType": "todo.TextInput",
      "id": "2",
      "property": "value",
      "newValue": "",
      "oldValue": "Groceries"
    }
  ]
}
```

This stream of reported transactions is sufficient to completely rebuild the application state "from scratch".  It can also be used to create "reversing" transactions that implement an undo/redo system.

The listener can also be used to print to the console to help debug an application.  The `R.stringifyTransaction` function will format Transactions into a more compact format:

```ts
todo.TextInput#2.notifyValue()
  Added todo.TodoList#1: {"name":"Groceries","id":"1","itemCount":0}
  Changed todo.TodoList#1.todoAppId from undefined to 2
  Changed todo.TextInput#2.value from Groceries to
```

This format uses a shorthand for referring to entities, in the form `{entity type (with "namespace")}#{entity id}.{property name}`.

The `debugListener`, if specified, will be passed detailed events about the inner workings of Reknow, particularly around assigning and notifying subscribers of state changes.

```
Models.ts:18 Run useQuery "useQuery at TodoListView (https://192.168.56.102:8929/static/js/main.chunk.js:6453:83)"
  Run query "useQuery at TodoListView (https://192.168.56.102:8929/static/js/main.chunk.js:6453:83)"
    Add subscriber "useQuery at TodoListView (https://192.168.56.102:8929/static/js/main.chunk.js:6453:83)" to "todo.TodoList#1.incompleteItems"
    Run query "todo.TodoList#1.incompleteItems"
      Add subscriber "todo.TodoList#1.incompleteItems" to "todo.TodoList#1.id"
      Add subscriber "todo.TodoList#1.incompleteItems" to "byComplete.1"
```

This tends to be an overwhelming amount of information (especially when viewing the raw JSON form), but it can occasionally be useful when tracking down unexpected behavior in the application.

#### Reknow and React

Reknow is a complete internal data management system unto itself.  Although it is designed to be useful with React, it has no direct connection to React.  That connection is provided by the `react-reknow` package, which provides React hooks `useQuery` and `useComponentEntity`.

An application will typically set up the connection when creating the StateManager, like this:

```ts
import * as R from "reknow"
import {ReactReknow} from "react-reknow"
...

export const models = new R.StateManager({
 ...
})

export const {useQuery, useComponentEntity} = ReactReknow(models)
```

The `useQuery` hook takes a function as an argument, and returns the result of executing that function.  It uses Reknow's query facility to determine the function's dependencies, and forces the component to re-render if any of those dependencies changes.  For example:

```tsx
import React from "react"
import {useQuery} from "./Models"
import {TodoListItem} from "./TodoListItem"

export const TodoListItemView: React.FC<{item: TodoListItem}> = (p) => {
  const name = useQuery(() => p.item.name)
  const isComplete = useQuery(() => p.item.isComplete)

  return (
    <>
      <div>Don't forget to {name}</div>
      { !isComplete? :
        <button onClick={() => item.setComplete()}>
          Done!
        </button>
        : null
      }
    </>
  )
}
```
This component is passed a TodoListItem, and will rerender if the item's name changes.

For convenience, the `useQuery` hook can also return the full Entity, in which case it will re-render the component if any property of the Entity changes:

```tsx
export const TodoListItemView: React.FC<{item: TodoListItem}> = (p) => {
  const item = useQuery(() => p.item)

  return (
    <>
      <div>Don't forget to {item.name}</div>
      { !item.isComplete? :
        <button onClick={() => item.setComplete()}>
          Done!
        </button>
        : null
      }
      ...
```

Note that no special facility is needed for React components to invoke actions on the Reknow model.  Here a component simply calls `item.setComplete()` in response to a UI action.




## First Impressions

This is a simple example that doesn't do much, but illustrates some of the basics involved with using Reknow.  These code samples can be pasted directly into node, once you've installed Reknow with `npm install --save reknow`.

We'll start with a simple model class that represents a single Counter with a name and a value.  Before getting Reknow involved, it might look like this:

```ts
class Counter {
  constructor(name, value) {
    this.name = name
    this.value = value
  }

  increment() {
    this.value++
  }
}
```

And using that class would look something like this:

```ts
c1 = new Counter("counter1", 10)

console.log(c1.value)
// prints "10"

c1.increment()
console.log(c1.value)
// prints "11"
```

Now let's rewrite this as a Reknow model class:

```ts
R = require("reknow")

class Counter extends R.Entity {
  constructor(name, value) {
    super()
    this.name = name
    this.value = value
  }

  increment() {
    this.value++
  }

  static get entities() {
    return CounterEntities
  }
}

class _CounterEntities extends R.Entities {
}

CounterEntities = new _CounterEntities(Counter)
```

The `Counter` class looks pretty much the same, except that it extends `R.Entity` (note that for convenience, we import all of Reknow under the `R` namespace).  But the most obvious difference is the introduction of the `_CounterEntities` class, and its singleton `CounterEntities` instance which is exposed by `Counter.entities`.  This singleton represents the full collection of `Counter` instances that have been added to Reknow.  It's where methods would be defined that apply to that full collection, such as adding a Counter, indexing Counters, etc.  The `Counter` class, on the other hand, should define methods that apply to a single `Counter` instance.

Note that the names `_CounterEntities` and `CounterEntities` don't really matter - they're just a convention.  All that really matters is that `Counter.entities` return the singleton `Entities` instance associated with the `Counter` class.  Typically the rest of the application wouldn't even see the `_CounterEntities` and `CounterEntities` names since `Counter` would be the only name exported from the model's source file.

Now that we've set up our model class, we can create a Reknow `StateManager` that will manage all of our entity classes (which is just `Counter` in our case):

```ts
models = new R.StateManager({
  entities: {
    Counter: Counter.entities
  },
  listener: e => console.log(`ACTION!: ${R.stringifyTransaction(e)}`)
})
```

Here we gather all of the entity classes that our application will use (just `Counter` for us), and create a `StateManager` to handle them.  This `StateManager` is effectively the central class in Reknow, but an application will hardly use it beyond this initial creation step.  Most of an application's interaction with the model will happen directly through the Entity classes.

Just for fun, we've also defined a listener that will print out each "transaction".  This will help us see how Reknow tracks state changes.  In fact, it should have printed "InitializeAction" right off the bat.

Let's create a Counter and add it to Reknow.  This will let Reknow manage that Counter and track any changes to its properties:

```ts
_c1 = new Counter("counter1", 10)
c1 = Counter.entities.add(_c1)
// Error: Attempt to mutate state outside of an action
```

We've run into an error!  Adding an instance is a state change, and all state changes in Reknow must occur within an "action" (we'll explain why in a moment).  For now, we can fix it by putting our state changes in a function and passing it to `models.action`:

```ts
c1 = models.action(()=>Counter.entities.add(_c1))
```



```
ACTION!: UnnamedAction
  Added Counter#1: {"name":"counter1","value":10}
```




## Overview

An application written in Reknow will represent its state using classes that extend the base `Entity` class.  A discussion application, for example, might model its state using `Topic` and `Post` classes, which model both the content and the "view state" of individual Topics and Posts.  Each model class also defines a corresponding `Entities` class to model operations that apply to the entire set of entities, such as adding or removing Topics to the internal state.

With Reknow, entities refer to each other through property values, rather than direct object references.  For example, a Post would specify a `topicId` property referencing the id of the Topic to which it belongs.  Conceptually, a Topic then finds all of its Posts by searching for all of the Posts whose topicId corresponds to the Topic's id.  Practically, Reknow enables this by maintaining indexes of entities, and providing mechanisms for Entities to declare properties that represent `hasMany`, `hasOne`, and `belongsTo` relationships.  Using these declarations, an application can reference `topic.posts` as if the Topic directly referenced an array of Posts, while Reknow takes on the work of maintaining and consulting the appropriate indexes.

This "relational style" of modeling provides applications with the flexibility needed to evolve over time.  Tightly-coupled references between model objects may be convenient at the start of a project, but can become problematic as the application changes and grows.  The loosely-coupled nature of relational modeling may feel more cumbersome up front, but that work pays off later as the application's changing needs impact the requirements on the model.

This relational style also simplifies the concept of state changes.  Because Reknow entities don't reference each other directly, they typically end up with simple "scalar" properties (strings, numbers, booleans).  A state change in Reknow, therefore, boils down to either adding an Entity, removing an Entity, or changing the value of an Entity's property.  An application can make these changes by simply assigning values to entity properties, or by calling `add()` or `remove()` on the appropriate `Entities` classes.  There is no need to treat state as immutable, or to model state changes using actions and reducers.

Reknow manages state changes through JavaScript Proxies.  The Entity objects used by an application are actually Proxies to the underlying data.  Changes to Entity properties are intercepted by those Proxies and trigger various functions, such as automatically updating indexes and notifying dependents.  Changing an Entity also causes a new Proxy to be created for the same model object, making the Entity appear to have changed its object identity, even though the "underlying" entity data is still the same object.  This allows Reknow to work with a system like React, which depends on changes in object identity to detect state changes.  In other words, Reknow effects object identity changes by creating new Proxies to mutable data, instead of creating new copies of immutable data.

Reknow also uses Proxies to handle dependency tracking.  A Reknow `Query` will execute a function provided by the application, while recording the entities, properties, and indexes that the function references.  If any of those dependencies changes, Reknow will respond appropriately, such as invoking a callback function provided by the application.

State changes in Reknow must occur in an `action`, which involves passing Reknow a function that executes the desired state changes.  An action effectively groups a set of state changes into a single logical unit corresponding to some "high-level" operation.  It gives Reknow an opportunity to perform certain operations and notifications at the end of each action.  It also allows Reknow to report every action through a callback, in which every action and its corresponding state changes are made available to the application, allowing the application to perform undo/redo operations, or even implement a shared document in which state changes are distributed to multiple participants.

Reknow has very few dependencies and can work in both node and browser environments.

## A Simple Example

The following is a simple example that illustrates what Reknow code looks like.  For simplicity, this code is in JavaScript, and is intended to be run directly in node.  A TypeScript version will be shown later.  It's assumed that you have already installed Reknow with `npm install --save reknow`.

```
const R = require("./dist/index")

class Counter extends R.Entity {
  static get entities() { return CounterEntities }

  constructor(name, value) {
    super()
    this.name = name
    this.value = value
  }
}

class _CounterEntities extends R.Entities {
}

const CounterEntities = new _CounterEntities(Counter)

const models = new R.StateManager({
  entities: {
    Counter: Counter.entities
  },
  listener: e => console.log(JSON.stringify(e))
})

const counter1 = models.action(()=>Counter.entities.add(new Counter("c1", 10)))
const counter2 = models.action(()=>Counter.entities.add(new Counter("c2", 20)))
```
