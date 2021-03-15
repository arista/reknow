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

Reknow will only manage Entity instances that have been added by the application.  Adding an instance will also return a Proxy that the application should use from then on to access the instance.  Typically an application will create and add an instance in a single step, so that it doesn't accidentally end up using the un-Proxied instance.  For example:

```ts
const item = new TodoListItem("buy milk").addEntity()
```

Once added, an Entity instance will remain in Reknow until it is explicitly removed by the application (or if an "owning" object is removed by the application).

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

#### Queries

A "query" is a function whose return value is cached, so that calling the function again will return the cached value without actually executing the function again.  As the query function executes, Reknow "watches" the function to see what Entity instances and properties it references.  If any of those referenced values later changes, Reknow will invalidate the query's cached value.  If the query is called after that, it will execute its function and recompute the value, generating a possibly new set of referenced Entities and properties (aka, "dependencies").

The easiest way to define a query is to use the `@R.query` decorator on an Entity getter method.

```
@R.query get completeItems() {
  return ...
}
```





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
