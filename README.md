# Reknow

_knowledge before action_

Reknow is a state management library based on relational modeling concepts, designed to support React applications written in either TypeScript or JavaScript.

## Introduction

Reknow organizes and maintains an application's internal state, separating that state from the application's presentation layer.  In a React application, Reknow occupies the same space as libraries like Redux or Recoil.

Reknow borrows several concepts from relational modeling systems.  Developers who have used relational databases or object/relational mapping libraries should find many of the concepts familiar.  For example, model objects in Reknow do not reference each other directly, but instead reference each other through property values, usually id's.  Reknow uses indexes and synthetic properties to expose those relationships in ways that feel natural to developers.

That "natural feel" is a guiding principle of Reknow.  Reknow is designed to enable developers to model and maintain state naturally, minimizing the patterns for updating or selecting data.  Applications can freely add and remove model instances, and even change instance property values directly.  Reknow will automatically detect these changes and take care of the downstream effects, such as updating indexes and re-rendering React components.  Applications can also compute and assemble selected values from the model using straightforward functions or getter methods.  Reknow will automatically cache the results, while tracking what model objects and properties were referenced in those calculations, allowing Reknow to invalidate the cached values when those dependencies change.

Reknow uses JavaScript Proxies to make all of this possible.  These Proxies intercept calls to get or set property values, and allow Reknow to react accordingly.  For the most part, the application is unaware that it is using Proxies, and can be coded as if it were using model classes and instances directly.

Proxies also allow Reknow to interact with React, even though Reknow uses mutable model objects and does not create new immutable copies with every state change.  When a model object is changed, Reknow creates a new Proxy to refer to that model object.  This is sufficient to signal a data change to React, because it effectively presents React with a new object identity, even though the same model object is still being used "behind" that Proxy.

Because Reknow detects state changes all the way down to the property level, it is able to provide a "stream" of state changes to applications.  The relational modeling pattern effectively boils every state change down to either adding a model object, removing a model object, or changing the property of a model object.  By adding a listener to Reknow, an application can be notified of all these state changes.  This allows applications to implement sophisticated undo/redo mechanisms, incrementally save document state as a stream of edits, or even broadcast state changes to collaborators to enable shared document viewing or editing.

The Reknow library itself has very few dependencies and can be used in Node.js or in browsers.  It works well with React, but has no direct connection to the React libraries - that connection is provided through a separate "react-reknow" library.  Reknow is designed primarily for TypeScript applications, but it can also be used effectively with JavaScript.  Reknow does make use of decorators, which are still "experimental" as of ES6, but alternatives are provided for environments where decorators are not supported.  All of Reknow's operations run synchronously, without the use of timers or Promises, and can be used from both async and non-async functions.

## Sample Application

Reknow includes a sample [TodoApp](https://github.com/arista/reknow/tree/main/docs/todoapp/src) ([demo](https://arista.github.io/reknow/docs/todoapp/index.html)), a simple unstlyed React Todo list manager that allows the user to add lists, add items to those lists, mark items as "done", and to remove entire lists.  Items in each list are ordered by their creation time, most recent first.  Items marked as "done" are displayed with a strikethrough at the bottom of the list.  The lists offer a choice of ordering - either by creation time, alphabetically by list name, or by number of items in the list.

Before diving into the code, it helps to understand the Reknow concepts in some detail.  This guide will come back to the sample application after covering those concepts.

### Building the Todo Application

If you want to build and run the sample application locally, you can do so using create-react-app:

```
npx create-react-app todoapp --template typescript
cd todoapp
npm install --save reknow
npm install --save react-reknow

cp -r {path to reknow}/docs/todoapp/* src/
```
Edit `tsconfig.json` to enable `experimentalDecorators`:

```
{
  "compilerOptions": {
    ...
    "experimentalDecorators": true
}
```
Optionally, add a `.env` file to set the port of the development server, to enable https, etc:

```
HTTPS=true
BROWSER=none
PORT=8929
```
Then start the create-react-app server:
```
npm start
```
When it comes up, you should be able to point your browser at the server and run the application.

## Building An Application With Reknow

### Typical Development Process

The steps to build a typical Reknow application look something like this:

* Design the classes that will model as much of the application's state as possible.  This includes both the data that the application manipulates (Topics, Posts, ShoppingCartItems, etc.), as well as the "view state" of the application (NavigationBreadcrumb, ErrorDialog, etc.).  Keep object properties as simple as possible, preferably sticking to strings, numbers, and booleans, remembering that more complex structures can be defined using Reknow's relational facilities.
  * Add `@hasMany`, `@hasOne`, and `@belongsTo` declarations to the model classes to surface their relationships expressed through matching property values.
  * Add `@index` declarations to create automatically-maintained "hash" and "sort" structures of model objects
  * Add `@query` decorators to mark out methods that generate computed values from the model objects, automatically invalidating their cached values when their dependencies change.  Keep those methods "pure" without side effects or state changes.
  * Add `@action` decorators to declare state-changing methods in the model classes.  Keep those methods "pure", free of side effects or dependencies on anything outside the model.
  * Add `@afterAdd`, `@afterRemove`, and `@afterChange` decorators to methods that invoke side effects in response to the state changes in `@action` methods.
  * Add `@reaction` decorators to methods that perform state changes in response to other state changes (typically used to maintain "computed" properties that then feed into indexes).
* Create a Reknow `StateManager` instance, passing it a list of all the model classes that it will be managing.
* Build the presentation layer.  Assuming it is a React application:
  * Apply the `useQuery` hook from the `react-reknow` library to pull data directly from model objects.  `useQuery` will automatically trigger a component re-render whenever the underlying model object data changes.
  * Apply the `useComponentyEntity` hook to automatically create and remove model objects tied to a React component's life cycle.
  * Invoke `@action` methods directly on model objects in response to user actions
  * Inovke `@action` methods at any time, actually, even in response to asynchronous events like Timers, within async methods, etc.

### Concepts

#### Importing Reknow

Applications typically import Reknow into its own namespace:

```
import * as R from "reknow"
```

A Reknow model file typically uses many reknow exports, so it's often more convenient to import the whole namespace rather than importing individual exports.  The file can then reference Reknow exports off of that namespace, for example: `extends R.Entity` or `@R.hasMany` (a decorator).

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

#### Entities `byId` Index

Every Entities class (the singleton associated with each model class) has a built-in `byId` property that maps Entity id to Entity instance.  For example:

```
const item = TodoListItemEntities.byId["item22424"]
```

This property is read-only, is updated automatically, and contains those instances that have been added.  This facility is always available, although it is not often used by applications since indexes and relationships (described later) provide more convenient ways to access data.

#### Entity Properties

Entity instances can arbitrarily get and set properties as they normally would in JavaScript, without requiring any special declarations.  TypeScript applications must continue to declare their property types, as they normally would.

In practice, Entities should stick to "simple" properties as much as possible: strings, numbers, and booleans.  If an Entity needs to refer to other Entities, it should do so using id's and "relationships" rather than direct references.  Data structures like ordered lists (arrays) or key/value collections (objects), should also be implemented relationally if possible.

Having said that, Reknow doesn't specify or enforce restrictions on property types.  An application is free to use whatever values it wants for properties.  However, the only changes Reknow will detect and react to are new values being assigned to properties.  For a string, number, or boolean value, this will work naturally.  But if a property value is an array, then Reknow will only detect if the property is assigned a completely new array - it will not detect if the array itself is mutated.

In some cases, this may be perfectly fine.  If a complex structure is read-only, or is treated as immutable, then it should work fine as a property value.  Or if the application has other ways to detect changes in the value, such as callbacks registered with the value, then it would be appropriate to store that as a property value.  This would be the case for system-provided objects, like an `XMLHttpRequest`, or a DOM `Node`, or a `Promise`.  An application is free to store such objects in Entity instances, keeping in mind that Reknow will not automatically respond to changes in those objects.

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

The `@R.action` decorator declares that a method will be making state changes.  It also declares that the action will leave all affected instances in consistent and valid states, and that it will pass any declared validations once the action completes (FIXME - see the section later on validations).

All of the state changes that occur while executing an `@R.action` method will be collected into a single "action", whether it's a single property change on one instance or a more complex sequence of changes spanning multiple instances.  Reknow will wait until the end of the application's action before taking its own actions in response, such as reporting the action to its listeners, notifying the application of invalidated cached values, updating the affected React components, or running validators on the affected Entities (coming soon).

It is fine for `action` methods to call other `action` methods - only the "outermost" `action` will apply.  But before going and marking every method as an `action`, be aware that conceptually, an action should represent a "top-level" operation and should leave all affected model instances in valid and consistent states.

Action methods should be "pure", meaning that they depend only their inputs and the current state of the model, and they should have no side effects other than to make state changes to the model.

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

The `@R.index` line declares that `TodoListItemEntities.byName` will be an array of all the `TodoListItem` instances that have been added to Reknow, sorted by `name` in ascending order.  There's a lot packed into that line, so to break it down:

* `@R.index("+name")` is the decorator that declares the index
* `byName!` is the name of the property that will provide access to the index.  The property will be "synthesized" by Reknow, so the `!` tells Typescript not to complain that its value isn't being set explicitly in the constructor.
* `R.SortIndex<TodoListItem>` is the property's type.  This is effectively an alias for `TodoListItem[]`.

This is an example of a "SortIndex", exposed to the application as an Array.  Reknow will automatically keep this Array sorted in ascending order by each instance's `name` property, updating it as instances are added, removed, or modified.  The application may read this structure freely, but is prevented from modifying it.

A SortIndex can sort by any number of properties, each in either ascending or descending order.  For example, `@R.index("+name", "-age")` will sort instances first by `name` in ascending order, then by `age` in descending order for instances that have the same `name`.  If instances have the same `name` and `age`, then Reknow will sort by entity id (ascending) as the last resort.

Only `string`, `number`, and `boolean` (`false` < `true`) values can be sorted.  Attempts to sort by other types, or by values of different types, will result in an error.  The `null` value can also be included in sorts, and is considered to be less than any other value.

Beyond sorting, an index can also be directed to group instances with the same property value.  This is called a "HashIndex", and is declared by using `=` with the property name:

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

As mentioned previously, Entities refer to each other through properties and id's rather than direct pointers.  For example, a `TodoList` may "own" multiple `TodoListItem` instances.  This can be implemented by defining a `todoListId` property on `TodoListItem`, which holds the id of the `TodoList` to which the item belongs.  When a TodoList wishes to get a list of its items, it effectively searches through all TodoListItems to find those whose `todoListId` match its id.  Behind the scenes, Reknow would use a HashIndex to turn this search into a quick lookup.

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
* The `sort` option declares that the resulting list of items should be sorted by each item's `createdAt` (ascending).  Without this option, the items would be sorted by id.
* The `dependent` option declares that if the TodoList is removed, all of its items should also be removed automatically.  Other options are `nullify`, meaning that all of its items will have their `todoListId` set to `null`, and `none` (the default), meaning that the items won't be modified if the instance is removed.

With this declaration in place, the application can simply refer to `myTodoList.items` and receive an array of items whose `todoListId` has the same value as `myTodoList.id`, ordered by `item.createdAt`.  If another item sets its `todoListId` to that same list, then it will immediately "appear" in the array at the correct position.

The array is also somewhat mutable.  `items.push(item)` will "add" an item to the array by setting its `todoListId` appropriately, with the caveat that the new item will appear in the index correctly sorted, not necessarily at the end.  Similarly, `items.pop()` will "remove" the last item from the list by setting its `todoListId` appropriately, or removing it from Reknow altogether if `dependent: "remove"` is specified.

Underneath, there is no actual array representing the relationship.  The `items` property simply performs a lookup in the appropriate index, wrapping the result with a Proxy to make the array appear mutable.

To find the "appropriate index", the relationship will look through the indexes defined on `TodoListItemEntities`, specifically looking for one whose terms start with `("=todoListId", "+createdAt")`.  If it doesn't find such an index, then it will create an index itself and add it to the class.  All of this is a one-time process that happens at startup.  This process allows the application to define and use relationships without the burden of managing the associated indexes.

An Entity can declare as many relationships as it wants.  It can even have multiple relationships to the same "foreign" Entity class, perhaps sorting them in different ways, although at most one of those relationships should define a `dependent` option.

The `@R.hasOne` declaration is similar to `@R.hasMany`, except that it results in only a single Entity (or null), and it uses a UniqueHashIndex underneath.  `@R.belongsTo` is similar to `@R.hasOne`, except that the notion of "primary" and "foreign" are swapped.

#### Proxies and Object Identity

As described previously, Reknow relies heavily on Javascript Proxies to implement its functionality.  Entity instances retrieved from Reknow by the application are presented through Proxies, so that Reknow is able to monitor how the application is reading or modifying the properties of those Entities.  Indexes and relationships also follow this pattern, presenting data to the application through Proxies that mediate access and mutation.  All of this happens automatically without the application needing to do anything special to use those Proxies.

Underneath all the Proxies, Reknow maintains the "real" data structures internally, and those data structures are mutable.  When the application changes an Entity's property, that change eventually makes its way through the Proxy to the underlying instance, and that instance's property really is changed.  Reknow is not maintaining immutable structures or using a copy-on-write strategy.  This is true of Reknow's indexes as well.

This may seem to run counter to React's requirements, which rely on value changes to trigger visual changes.  More specifically, React will not take action on a new value unless `newValue !== oldValue`.  Treating data as immutable is one way to meet that requirement, creating new copies of objects to represent data changes.

Reknow takes a different approach, using new Proxy instances to present React with new object identities that satisfy the `newValue !== oldValue` requirement.  Both `oldValue` and `newValue` are Proxies that "point" to the same underlying Entity or index structure, and accessing the data through either Proxy will yield the exact same results.  React doesn't actually care that the underlying object is the same - it just sees a new object identity show up and concludes that the underlying data has changed.

Reknow supports this approach by automatically using a new Proxy instance when an Entity or index is changed.  From the application's perspective, all of those Proxies are equivalent, and it's perfectly fine for the application to use multiple Proxies to the same Entity.  But once the data reaches React, the application should make sure that React is seeing the "latest" Proxy associated with an Entity.

The `Entity.currentEntity` property will return the most recent Proxy associated with an Entity.  However, it's unusual for applications to need this method, as Reknow provides more convenient ways to keep React synchronized with the most up-to-date Proxies, described below.

#### Queries

A "query" is a function whose return value is cached, so that calling the query again will return the cached value without executing the function again.  As the query function executes, Reknow "watches" to see what Entity instances, properties, indexes, relationships, and other queries are referenced.  If any of those referenced values later changes, Reknow will invalidate the query's cached value.  If the query is called after that, it will execute its function and recompute the value, generating a possibly new set of referenced Entities and properties.

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

Queries have a special case: if a query function returns an Entity, then the query will be invalidated if any property of the Entity is changed.  This is a convenience that supports simplified usage in React, as will be described later.

A query must be a "pure" function, depending solely on the current state of the model and avoiding any side effects.  It cannot take any inputs, and when declared with the `@R.query` decorator, it must be defined on a getter.  An `@R.query` may be defined on either an `Entity` or an `Entities` class.

#### Reactions

A "reaction" is a combination of a query and an action.  Like a query, it is a function that Reknow "watches" to find its dependencies.  Unlike a query, Reknow will automatically call the function initially, and will automatically call the function again if a dependency changes.  Also unlike a query, a reaction is allowed, and even encouraged, to change model state when it is called.

The most common use of a reaction is to set an Entity property that is computed from other values, usually for the purpose of indexing on that property.  Indexes can only operate on property values, not getter functions, so a reaction provides an equivalent solution.  For example:

```ts
export class TodoList extends R.Entity {
  ...
  @R.reaction computeItemCount() {
    this.itemCount = this.items.length
  }
```
This effectively defines `itemCount` to be a "computed" property that is kept in sync with the number of items in its relationship.  An index can then be defined that allows all lists to be sorted by the number of items they contain.  Whenever the set of items changes, `computeItemCount` will be called to update `itemCount`, which will in turn trigger updates to the indexes.

While reactions may modify state, they still should be kept free of other side effects.  Reactions also need to be wary of creating circular dependencies that trigger an endless cycle of updates.

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

`StateManager` is Reknow's central class.  Every Reknow application must create a single `StateManager`, passing it all of the Entity classes and Service instances to be managed by Reknow.  Additional options can also be passed to the `StateManager`.  Applications typically create the `StateManager` in a `Models.ts` file:

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

The namespaces do show up when the StateManager reports actions and debugging to its assigned listeners (described below).  For example, a property change on a TodoListItem  would be reported as a change to a "todo.TodoListItem".

#### Running Multiple StateManagers

A simple application will typically register all of its Entity classes with a single StateManager instance.  However, Reknow doesn't prevent an application from running multiple StateManagers.  A complex application with multiple subsystems developed by multiple teams could end up with many independently-created StateManagers.  Or a Reknow application could include a library of React components that happens to use Reknow to manage its state in its own StateManager instance.

All of this is perfectly fine, as long as it's understood that each StateManager manages its own "domain" of Entity classes independently.  Practically speaking, this means:

* Each Entity class must be registered with at most one StateManager
* Relationships (`hasMany`, `hasOne`, `belongsTo`) can only be established between Entity classes managed by the same StateManager.
* An `@R.action` managed by a StateManager should not "span" Entities across different StateManagers
* An `@R.query` managed by a StateManager will not track dependencies on Entities associated with other StateManagers

There is no practical limit to the number of Entity classes, either minimum or maximum, that can be associated with a StateManager.  Even the simplest stateful React component can take advantage of Reknow, using a StateManager that manages a single Entity class.

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

##### useQuery

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
This component is passed a TodoListItem, and will rerender if the item's `name` or `isComplete` properties are changed.

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

Note that no special facility is needed for React components to invoke actions on the Reknow model.  Here a component simply calls `item.setComplete()` in response to a UI action.  Calling that method will likely involve some state changes (such as setting a `complete` flag to `true`), and if the `TodoListItem` is changed in the process, then the `TodoListItemView` will automatically be forced to re-render.

##### useComponentEntity

The `useComponentEntity` hook associates an Entity with the life cycle of a component.  It takes a function that returns an Entity, typically created as a new instance.  The hook will automatically add the Entity to Reknow (if it hasn't been already), and will remove it when the component is unmounted.  Like `useQuery`, the component is forced to re-render if that Entity is changed.

For example:

```ts
export const TextInputView: React.FC<{}> = (params) => {
  const textInput = useComponentEntity(() => new TextInput()))
  ...
}
```

Here a `TextInputView` React component is using a `TextInput` Reknow Entity to handle its state.  The `useComponentEntity` hook creates the `TextInput` instance, adds it to Reknow, and sets the `TextInputView` to be re-rendered whenever the `TextInput` is changed.  Later, when the `TextInputView` is removed from the component tree, the `TextInput` will also be removed from Reknow.

This is useful for re-usable components, like this `TextInputView`, that are intended to be "dropped in" to an application without exposing the application to Reknow.

This is also useful for "top-level" components that are intended represent the "root" state of the overall application:

```ts
export const TodoAppView: React.FC<{}> = (params) => {
  const todoApp = useComponentEntity(() => new TodoApp())
  ...
}
```

The `TodoApp` Entity might have relationships and queries that ultimately provide access to all of the application's state, and the React component can pass those values to its children as appropriate.

##### Named Hooks

Both the `useQuery` and `useComponentEntity` hooks take an optional name as a second argument.  For example:

```
  const item = useQuery(() => p.item, "TodoListItemView.item")
```

This name doesn't impact the behavior of the application, but it does appear in the events sent to the StateManager's `debugListener`.  Most applications won't use this facility until they are trying to understand why some component is or is not updating.  In that scenario, the application can enable the `debugListener` on the StateManager and start adding names to narrow down the behavior.

## Examining the Sample TodoApp

With the main Reknow concepts covered, we see how they are applied in the sample application.  As described previously, the sample application is a Todo list manager with multiple todo lists and items and the ability to sort lists in a few different ways.

### Modeling the Application's Data

The application's data is modeled using `TodoApp`, `TodoList`, and `TodoListItem` classes, with one-to-many relationships between them:

```
TodoApp --< TodoList --< TodoListItem
```

A `TextInput` is also modeled, to demonstrate the use of a "standalone" reusable stateful component.

We start by sketching out what properties are needed in each class:

* _TodoApp_: id, listSortOrder
* _TodoList_: id, todoAppId, name, itemCount
* _TodoListItem_: id, todoListId, name, createdAt, complete

Remember that model objects reference each other indirectly, typically through id's.  So a TodoList, for example, has no property that directly references its items - rather, the TodoListItem has a `todoListId` property that references the TodoList that contains it.

The `TextInput` demonstrates a reusable component, in this case a simple text box with a button for taking action on that text.  Its data model consists of the currently-entered value, and the function to be called when the user clicks the button:

* _TextInput_: value, onValue

### Create the Model Classes

Once we've designed our basic data model, we can create the "skeleton" of each class, deciding what properties need to be provided in the constructor, what properties will be set later, and what properties will be computed from other properties.

Starting with [TodoListItem](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoListItem.ts), the "skeleton" of that class' file looks something like this:

```
import * as R from "reknow"

export class TodoListItem extends R.Entity {
  @R.id id!: string
  todoListId!: string
  complete = false

  constructor(public name: string, public createdAt = new Date().toISOString()) {
    super()
  }
}

class Entities extends R.Entities<TodoListItem> {}
new Entities(TodoListItem)
```

Both `name` and `createdAt` are set in the constructor (createdAt defaulting to the current Date in stringified form), while `id` will be set automatically by Reknow and `todoListId` will be set later by the application.  We expect `complete` to be set based on a user interaction.

We also start with a blank skeleton for the corresponding `Entities` class.

The [TodoList](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoList.ts) class looks similar:

```
import * as R from "reknow"

export class TodoList extends R.Entity {
  @R.id id!: string
  todoAppId!: string
  itemCount = 0

  constructor(public name: string) {
    super()
  }
}

class Entities extends R.Entities<TodoList> {}
new Entities(TodoList)
```

The `itemCount` will be computed dynamically, and will be used to populate an index for sorting purposes.

The [TodoApp](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoApp.ts) follows the same pattern.  We also see a `ListSortOrder` type acting as a TypeScript enumeration:

```
import * as R from "reknow"

export type ListSortOrder = "byCreatedAt" | "byName" | "byItemCount"

export class TodoApp extends R.Entity {
  @R.id id!: string
  listSortOrder: ListSortOrder = "byCreatedAt"
}

class Entities extends R.Entities<TodoApp> {}
new Entities(TodoApp)
```

### Define Relationships

With the properties defined, we can give the data some structure by defining relationships:

```
TodoApp --< TodoList --< TodoListItem
```

Starting with [TodoList](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoList.ts):

```
  @R.hasMany(() => TodoListItem, "todoListId", {
    sort: "+createdAt",
    dependent: "remove",
  })
  items!: Array<TodoListItem>
```

This declares that a TodoList has many TodoListItems, each identified by a `todoListId` property that matches the TodoList's id.  Those items will appear in an `items` property as an array of TodoListItems.  That property will be managed by Reknow and won't be set explicitly by the application, hence the `!` in the declaration.  Furthermore, the resulting array will be sorted by each item's `createdAt` property in ascending order, and if the list is removed, all of its items will also be removed.

Behind the scenes, Reknow will create and maintain an index on `TodoListItem` organized by `("=todoListId", "+createdAt")`.  The `items` property effectively acts like a getter that looks up the appropriate `todoListId` in that index.  A `TodoList` instance itself contains no `items`.

The [TodoApp](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoApp.ts) is similar in that it "owns" a list of TodoLists, but it defines multiple relationships for accessing that same list with different orderings:

```
  @R.hasMany(() => TodoList, "todoAppId", {dependent: "remove"})
  todoLists!: Array<TodoList>

  @R.hasMany(() => TodoList, "todoAppId", {sort: "+name"})
  todoListsByName!: Array<TodoList>

  @R.hasMany(() => TodoList, "todoAppId", {sort: "+createdAt"})
  todoListsByCreatedAt!: Array<TodoList>

  @R.hasMany(() => TodoList, "todoAppId", {sort: "-itemCount"})
  todoListsByItemCount!: Array<TodoList>
```

The first declaration will be the "main" relationship - it's the one that the application will use to add new items, and is also responsible for removing the lists when the TodoApp is removed.  The remaining relationships retrieve the same items using different sort orderings.  Again, none of these relationships are actual data on the `TodoApp` - each acts as a lookup into an index that Reknow automatically creates on `TodoList`.

For completeness, we also define `@R.belongsTo` relationships that go in the "opposite" direction, so that a [TodoList](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoList.ts) can reference its "owning" `TodoApp`:

```
  @R.belongsTo(() => TodoApp, "todoAppId") todoApp!: TodoApp
```

and a [TodoListItem](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoListItem.ts) can reference its "owning" list:

```
  @R.belongsTo(() => TodoList, "todoListId") todoList!: TodoList
```

The application doesn't actually use these values, but it's good to declare them since they help give more structure to the data.

### Define Actions

With the data modeled and structured, we can now define the actions we expect the application to take on the data.  In our case, those are:

* add a new list
* add an item to a list
* mark an item as complete
* select a different sort ordering for the lists

To add a new list, [TodoApp](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoApp.ts) defines this method, marking it with `@R.action` since it will be modifying state:

```
  @R.action addList(value: string) {
    const todoList = new TodoList(value).addEntity()
    this.todoLists.push(todoList)
  }
```
It uses the pattern of creating and adding the model object to Reknow in a single step, which again is good practice so that the application doesn't accidentally use a "raw" unproxied `TodoList`.  It then sets up the relationship between the TodoApp and the new TodoList by `push`ing it into the relationship.  Behind the scenes, all that `push` call does is set the `todoAppId` property of the `TodoList`.  The `TodoApp` could do that instead of calling `push` with the exact same effect, but the `push` call makes the intention a little clearer for someone reading the code later.

Adding an item to a list is similar, as shown in [TodoList](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoList.ts):

```
  @R.action addItem(value: string) {
    const item = new TodoListItem(value).addEntity()
    this.items.push(item)
  }
```

Marking an item as complete is found in [TodoListItem](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoListItem.ts):

```
  @R.action setComplete() {
    this.complete = true
  }
```

Note that `@R.action` can be used with setters, but that can be awkward, since you need to define a corresponding getter and a different "backing" property:

```
  this._complete = false

  @R.action set complete(complete:boolean) {
    this._complete = complete
  }

  get complete() {
    return this._complete
  }
```

Selecting a sort ordering for the TodoLists is found in [TodoApp](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoApp.ts)
```
  @R.action setListSortOrder(val: ListSortOrder) {
    this.listSortOrder = val
  }
```

Note that this only sets a property.  We'll see in the next section how the sort order is actually changed.

### Select Data

The app's UI will by driven by the data in the model.  Most of the data we need is already defined: the relationships allow the UI to step through lists and items in each list, while each model's properties provide the data to be displayed for each list and item.

There are a couple special cases to note.  The first is the sort ordering of the lists, which the user can select by name, creation time, or number of items.  We've chosen to implement that by defining three separate relationships, each referencing the same list of items but ordered in different ways.  The choice of sort order is specified in the `listSortOrder` property.  To implement this, we'll define a getter on [TodoApp](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoApp.ts) that does what we want:

```
  @R.query get sortedTodoLists() {
    switch (this.listSortOrder) {
      case "byName":
        return this.todoListsByName
      case "byItemCount":
        return this.todoListsByItemCount
      default:
        return this.todoListsByCreatedAt
    }
  }
```
Here we've chosen to mark the method as an `@R.query` just as an illustration.  As a reminder, that causes the getter to cache its value, so that the next time it is called, it will return the same value.  But if any of its dependents change, such as the value of `listSortOrder`, or the list of items held by the returned relationship, then the query will be invalidated and recalculated when next called.  In this case, the caching behavior isn't particularly helpful since the method is just doing a simple lookup, but for more expensive calculations the declaration may be worthwhile.

The other interesting case is the way each list displays its items, with the incomplete items at the top and the complete items at the bottom, with each sub-list sorted by creation time.  There are several ways to implement this, but in our case we'll use this as an opportunity to demonstrate custom indexes.

In [TodoListItem](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoListItem.ts) we define an index:

```
class Entities extends R.Entities<TodoListItem> {
  @R.index("=todoListId", "=complete", "+createdAt") byComplete!: R.HashIndex<
    R.HashIndex<R.SortIndex<TodoListItem>>
  >
}

export const TodoListItemEntities = new Entities(TodoListItem)
```

As described previously, this causes Reknow to maintain a structure of objects indexed by "todoListId", each pointing to an object indexed by the value of "complete", each pointing to a list of TodoListItems.  Keeping in mind that all object keys are converted to strings, that structure might look like this:

```
{
  "13": {
    "true": [
      <<TodoListItem>>,
      <<TodoListItem>>,
      ...
      ...
    ],
    "false": [
      <<TodoListItem>>,
      <<TodoListItem>>,
      ...
      ...
    ],
  },
  ...
}
```
The class also now exports `TodoListItemEntities` (the singleton, not the `Entities` class), since it now has something in it that may be of interest to the application.

With this index in place, each [TodoList](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoList.ts) can return its complete and incomplete items by traversing that index structure:

```
  @R.query get completeItems() {
    return TodoListItemEntities.byComplete[this.id]?.true || []
  }

  @R.query get incompleteItems() {
    return TodoListItemEntities.byComplete[this.id]?.false || []
  }
```
Note the `?.` and `|| []` used to protect against values not being found in the index, since Reknow will not keep empty objects or arrays around in its indexes.  Also note the `.true` and `.false`, which shouldn't be confused with actual boolean values - they're just shorthand for `["true"]` and `["false"]`.

Once again we mark the method with `@R.query` just for illustration.  Because the methods are simple lookups, caching their values probably isn't a big help.  On the other hand, if we had chosen to implement the methods using some computation without an index, then caching the result might make more sense.  For example:

```
  @R.query get completeItems() {
    return this.items.filter(item => item.complete)
  }

  @R.query get incompleteItems() {
    return this.items.filter(item => !item.complete)
  }
```

### Reactions

We have one remaining function, which is the ability to sort lists by the number of items they contain.  We want to use an index to do this so it can be expressed as a simple `todoListsByItemCount` relationship.  Indexes can only operate on actual properties of an instance, which means that we need to maintain an `itemCount` property for each list, keeping that property up to date whenever the list of items changes.

[TodoList](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoList.ts) shows how to do this with a `@R.reaction`:

```
  @R.reaction computeItemCount() {
    this.itemCount = this.items.length
  }
```

### TextInput

We haven't spent much time looking at [TextInput](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TextInput.ts), except to note that it's an example of a reusable React component using Reknow for its state.  Beyond holding data, there isn't much else to note about it, except that its `onValue` property is a Function.  This is perfectly fine with Reknow, as long as it's understood that Reknow will only consider that property to have changed if it is assigned a new Function - the Function returning a new value, for example, would not be considered a property change by Reknow.

### Models class

The [Models](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/Models.ts) file is where the Entities are registered with a Reknow `StateManager`.  Each Entity class is imported and included in the `entities` initializer (in this case, placed in a `todo` namespace just for illustration).

The `StateManager` is also configured with a couple listeners that let you see some of the inner workings of Reknow in the console.  These outputs are formatted for readability - if you want to the see the "raw" JSON being emitted, you can replace them with `(e) => console.log(JSON.stringify(e, null, 2))`.

```
  listener: (e) => console.log(R.stringifyTransaction(e)),
  debugListener: (e) => console.log(R.stringifyDebugEvent(e)),
```

The Models fils also handles the connection to react-reknow, setting up the `useQuery` and `useComponentEntity` hooks that will be used by the application's React components.

```
export const {useQuery, useComponentEntity} = ReactReknow(models)
```

### React components

Building React components with Reknow is fairly straightforward.  Components can directly access Entities, properties, relationships, indexes, etc. out of Reknow, and components are free to invoke actions on model objects directly.

Where things get tricky is reacting to changes in Reknow model objects.  When a model object changes, Reknow tends to minimize the impact on the resulting React components, so as to avoid needless re-rendering.  In exchange for this efficiency, React components must explicitly subscribe to the model object changes that will cause them to re-render.

This is where the `useQuery` hook comes into play.  `useQuery` will evaluate a function, and if any dependency of that function changes, the component will re-render.  Consider [TodoListView](https://github.com/arista/reknow/tree/main/docs/todoapp/src/app/TodoListView.tsx), which takes a `TodoList` as a parameter:

```
export const TodoListView: React.FC<{todoList: TodoList}> = (params) => {
  const todoList = useQuery(() => params.todoList)
  const incompleteItems = useQuery(() => todoList.incompleteItems)
  const completeItems = useQuery(() => todoList.completeItems)
  ...
```

We'll explain in a bit why those particular `useQuery` calls are needed.

#### Rendering and Invoking Actions

With the above data available, the component can now render its HTML using the usual React techniques:

```
  return (
    <li>
      <div>
        List {todoList.name}
        <button onClick={() => todoList.remove()}>Remove</button>
      </div>
      <ul>
        {incompleteItems.map((item) => (
          <TodoListItemView item={item} key={item.id} />
        ))}
        {completeItems.map((item) => (
          <TodoListItemView item={item} key={item.id} />
        ))}
        Add new todo:
        <TextInputView
          caption="Add Item"
          onValue={(v) => todoList.addItem(v)}
        />
      </ul>
    </li>
  )
```
A few things to note:

* Values extracted from Entities can be used directly:

```
List {todoList.name}
```

* Actions on Reknow objects can be called directly in response to user actions:

```
<button onClick={() => todoList.remove()}>Remove</button>
```

* Reknow values can be passed to other components:
```
        {incompleteItems.map((item) => (
          <TodoListItemView item={item} key={item.id} />
        ))}
```

* When iterating over lists, React requires each nested list item to specify a `key`.  If the item is a Reknow object, the item's `id` can serve as that `key`.

```
          <TodoListItemView item={item} key={item.id} />
```

#### When to use `useQuery`

As described earlier, Reknow tends to minimize the re-renderings that take place in response to a data change.  Components need to explicitly subscribe to data changes using `useQuery`, which will force a re-render if the `useQuery` references or returns Reknow data that later changes.

The trick is understanding what causes Reknow data to appear to "change", and therefore trigger a re-render.  In general, changes are localized, and do not "ripple up" through structures like relationships and indexes.  For example, consider `TodoList`, and its relationship to `TodoListItem`:

```
TodoList
  "own" properties: id, todoAppId, name, itemCount
  items: HasMany TodoListItem
    TodoListItem
      "own" properties: id, todoListId, name, createdAt, complete
```

A `TodoList` has its "own" properties which it stores directly.  If any of those properties changes, then the `TodoList` is considered changed.  A `useQuery` that returns a `TodoList` will force a re-render in that case.

```
const todoList = useQuery(() => params.todoList)
return <>The list's name is {todoList.name}</>
```

A `TodoList` also has an `items` relationship, but changes in that relationship are not considered changes in the `TodoList` itself.  If an item is added or removed, the `TodoList` is not considered changed, and a `useQuery` listening to just the `TodoList` will not trigger a re-render.  This code, for example, will not properly re-render:

```
const todoList = useQuery(() => params.todoList)
return <>
  The list's name is {todoList.name}
  {todoList.items.map(item => <div>An item</div>)}
</>
```
This component is only listening for changes on `todoList`, so changes to the `items` relationship will not trigger a re-render.  If the component wants to be re-rendered whenever the list of items changes, then it needs to subscribe to that list explicitly:

```
const todoList = useQuery(() => params.todoList)
const items = useQuery(() => params.todoList.items)
return <>
  The list's name is {todoList.name}
  {items.map(item => <div>An item</div>)}
</>
```

The `items` relationship will be considered "changed" if the list of items changes or the ordering of those items changes.  So adding or removing items, or pointing elements at different items, will be considered "changes" and will force a re-render.

But changes within each `TodoListItem` are not automatically considered changes to the `items` relationship.  For example, if one of the items changes its `name`, the `items` relationship will not be considered changed, and no re-render will be forced.  The `items` relationship is only considered changed if a `TodoListItem` changes a property that affects its membership or ordering in the `items` list.

So this code will not re-render properly:

```
const todoList = useQuery(() => params.todoList)
const items = useQuery(() => params.todoList.items)
return <>
  The list's name is {todoList.name}
  {items.map(item => <div>Item: {item.name}</div>)}
</>
```


If a component wants to display the most up-to-date `name` of each `TodoListItem`, then it needs to wrap each item in its own `useQuery` to explicitly signal that it wants to be notified on changes to the item.



An Entity is considered "changed" only if one of its "own" properties changes.  For a `TodoList`, those "own" properties are only `id`, `todoAppId`, `name`, and `itemCount`.

Changes in an Entity's relationships do not consider the Entity itself to have changed.




There are a few caveats:

* If your `useQuery` returns an Entity, then it will force a re-render if any of the Entity's "own" properties change.  Keep in mind that an Entity's "own" properties do not include "synthetic" properties like relationships and queries.  For example, `TodoList` only has a handful of "own" properties: `id`, `todoAppId`, `name`, and `itemCount`, and a `useQuery` returning the `TodoList` will force a re-render if any of those properties changes.  But it will not force a re-render if.



In general, each component is responsible for wrapping its change-sensitive data with `useQuery`.  This is true even if the component is passed a Reknow model object as a parameter.

Even if the underlying `todoList` is changed, the component will not necessarily re-render (we'll see why in a bit).  Instead, the `TodoListView` needs to explicitly declare what data should cause it to rerender, which it does through `useQuery`.

The first `useQuery` takes the `todoList` parameter and simply returns it.  This will cause the component to re-render if any "own" property of `todoList` changes.  So if the list's `name` changes, the component will re-render.

Keep in mind that `TodoList` only has a few "own" properties: `id`, `todoAppId`, `name`, and `itemCount`.  `TodoList` does have relationships like `incompleteItems` and `completeItems` which the component will use to render the lists of items.  But those relationships are not "own" properties - they're synthetic getters that perform lookups on indexes.  So that first `useQuery` won't capture the dependency on those lists.  Instead, each of those relationships must be wrapped in its own `useQuery`.

And even then, `useQuery` on a relationship will only cause a re-render if the list changes.  For example, if an item is added to or removed from `completeItems`, or if the order of `incompleteItems` changes, then the component will re-render.  But if an item in one of those lists just changes its `name`, that won't trigger a re-render on the component, since that won't affect the lists themselves.



Relationships like `incompleteItems` and `completeItems`, are not considered "own" properties - they are synthetic getters that turn into index lookups behind the scenes.  So they each need their own `useQuery` wrapper.

And even then, if 


This component is called  by the `TodoAppView` like this:

```
export const TodoAppView: React.FC<{}> = (params) => {
  ...
          {lists.map((l) => (
            <TodoListView key={l.id} todoList={l} />
          ))}
```


## Reference

### Invalidation Rules

These are the rules that govern what dependencies are formed when evaluating an `@R.query` or `useQuery`, and what data changes will trigger those dependencies, resulting in the invalidation of an `@R.query` or a re-rendering of a `useQuery`.

These rules are easier to understand if you know how Reknow stores its data internally.  From the perspective of dependencies and invalidation, Reknow only uses a few data structures, which it categorized into either "Reknow Objects" (key/value pairs) or "Reknow Arrays":

* _Entities_ - these are considered to be "Objects", holding only the Entity's "own" properties.  The Entity's relationships, queries, etc. are not considered part of the "own" properties.
* _HashIndexes_ - these are considered to be "Objects", in which each key maps to either an Entity, another HashIndex, or a SortIndex.  This includes the `byId` index automatically created for each `Entities`, indexes declared by the application, and indexes created implicitly by relationships.
* _SortIndexes_ - these are considered to be "Arrays", in which the elements are Entity instances.

With that in mind, here are the dependency and invalidation rules:

* If a query accesses a property of a Reknow Object (Entity or HashIndex), then the query will be invalidated if that property changes.

    * "Accessing a property" means:
        * Retrieving the property's value (`myEntity.name`)
        * Referencing the property with `Object.hasOwnProperty()`
        * Retrieving the property's descriptor with `Object.getOwnPropertyDescriptor()`

    * "Property changes" means:
        * The property is added to the Object
        * The property is removed from the Object (`delete myEntity.name`)
        * The property's value changes (where `newValue !== oldValue`)

    * This only applies to properties whose names are strings.  `Symbol` property names are effectively ignored by Reknow - they are passed straight to the underlying Entity without any dependency detection.

* If a query accesses the keys of a Reknow Object (Entity or HashIndex), then the query will be invalidated if the Object's list of keys changes.

    * "Accesses the keys of an Object" means:
        * Iterating over the keys using a `for...in` loop
        * Implicitly iterating over the keys using a `for...of` loop
        * Calling methods that implicitly iterate over the keys, such as `JSON.stringify`
        * Using `Object.keys()` on the Object
        * Using `Object.getOwnPropertyNames()` on the Object
        * Using `Reflect.ownKeys()` on the Object

    * "List of keys changes" means:
        * A new property is added to the Object
        * An existing property is deleted from the Object

* If a query returns a Reknow Object (Entity or HashIndex), then the query will be invalidated if any property of the Object changes, or if the Object's list of keys changes.

* If a query accesses a Reknow Array (SortIndex), then the query will be invalidated if the Array changes.

    * "Accesing a Reknow Array" means:
        * Retrieving the length of the Array
        * Retrieving an indexed element of the Array (`myArray[12]`)
        * Retrieving the keys of the Array (same as "accesses the keys of an Object" above)

    * "Array changes" means:
        * The length of the Array changes
        * An element of the Array changes value (where `newValue !== oldValue`)

* If a query retrieves the value of a another query, then the original query will be invalidated if the retrieved query is invalidated.

These rules have several implications:

* Entity properties only trigger invalidation if they are assigned a new value.
* FIXME - relationships don't change an Entity
* FIXME - relationships aren't changed by an member Entity changing

