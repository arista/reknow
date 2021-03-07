# Reknow

_knowledge before action_

Reknow is a state management library based on relational modeling concepts, designed to support React applications written in either TypeScript or JavaScript.

## Introduction

Reknow organizes and maintains an application's internal state, separating that state from the application's presentation layer.  In a React application, Reknow occupies the same space as libraries like Redux or Recoil.

Reknow borrows several concepts from relational modeling systems.  Developers who have used relational databases or object/relational mapping libraries should find many of the concepts familiar.  For example, a basic rule in Reknow is that model objects must not reference each other directly, but instead reference each other by id (or other property value).  Reknow uses indexes and special properties to expose those relationships in ways that feel natural to developers.

That "natural feel" is a guiding principle of Reknow.  It is a goal of Reknow to allow applications to model and maintain state naturally, without introducing separate patterns for updating or selecting data.  Applications can freely add and remove model instances, and even change instance property values directly.  Reknow will automatically detect these changes and take care of the downstream effects, such as notifying the appropriate React components.  Applications can also compute and assemble selected values from the model using straightforward functions or getter methods.  Reknow will automatically cache the results, while tracking what model objects and properties were referenced in those calculations, allowing Reknow to invalidate the cached values when those dependencies change.

Reknow uses JavaScript Proxies to make all of this possible.  These Proxies intercept calls to get or set property values, and allow Reknow to react accordingly.  For the most part, the application is unaware that it is using Proxies, and can be coded as if it were using model classes and instances directly.

Reknow also uses these Proxies to interact with frameworks like React.  In Reknow, the underlying data is mutable, and new immutable copies are not created with each state change.  Instead, when a model object is changed, Reknow creates a new Proxy to refer to that model object.  This is sufficient to signal a data change to React, because it effectively presents React with a new object identity.  In other words, Reknow effects object identity changes by creating new Proxies to mutable data, instead of creating new copies of immutable data.

(As an aside - it is perfectly fine for an application to end up with multiple Proxies that "point" at the same underlying data, so long as React always sees the "latest" Proxy.  Reknow provides techniques to make sure this is the case.)

Because Reknow detects state changes all the way down to the property level, it is able to provide a "stream" of state changes to applications that desire it.  The relational modeling pattern effectively boils every state change down to either adding a model object, removing a model object, or changing the property of a model object.  By adding a listener to Reknow, an application can be notified of all these state changes.  This allows applications to implement sophisticated undo/redo mechanisms, incrementally save document state as a stream of edits, or even broadcast state changes to collaborators to allow shared document viewing or editing.

The Reknow library itself has very few dependencies and can be used in Node.js or in browsers.  It works well with React, but has no direct connection to the React libraries - that connection is provided through a separate "react-reknow" library.  Reknow is designed primarily for TypeScript applications, but it can be used just as effectively with JavaScript.  It does make use of decorators, which are still "experimental" as of ES6, but also provides alternatives for environments where decorators are not supported.

## Tutorial


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
