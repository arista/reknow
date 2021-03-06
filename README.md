# Reknow

_knowledge before action_

Reknow is a state management mechanism based on relational modeling concepts, designed to support React applications written in either TypeScript or JavaScript.

An application written in Reknow will represent its state using classes that extend the base `Entity` class.  A discussion application, for example, might model its state using `Topic` and `Post` classes, which model both the content and the "view state" of individual Topics and Posts.  Each model class also defines a corresponding `Entities` class to model operations that apply to the entire set of entities, such as adding or removing Topics to the internal state.

With Reknow, entities refer to each other through property values, rather than direct object references.  For example, a Post would specify a `topicId` property referencing the id of the Topic to which it belongs.  Conceptually, a Topic then finds all of its Posts by searching for all of the Posts whose topicId corresponds to the Topic's id.  Practically, Reknow enables this by maintaining indexes of entities, and providing mechanisms for Entities to declare properties that represent `hasMany`, `hasOne`, and `belongsTo` relationships.  Using these declarations, an application can reference `topic.posts` as if the Topic directly referenced an array of Posts, while Reknow takes on the work of maintaining and consulting the appropriate indexes.

This "relational style" of modeling provides applications with the flexibility needed to evolve over time.  Tightly-coupled references between model objects may be convenient at the start of a project, but can become problematic as the application changes and grows.  The loosely-coupled nature of relational modeling may feel more cumbersome up front, but that work pays off later as the application's changing needs impact the requirements on the model.

This relational style also simplifies the concept of state changes.  Because Reknow entities don't reference each other directly, they typically end up with simple "scalar" properties (strings, numbers, booleans).  A state change in Reknow, therefore, boils down to either adding an Entity, removing an Entity, or changing the value of an Entity's property.  An application can make these changes by simply assigning values to entity properties, or by calling `add()` or `remove()` on the appropriate `Entities` classes.  There is no need to treat state as immutable, or to model state changes using actions and reducers.

Reknow manages state changes through the heavy use of JavaScript Proxies.  The Entity objects used by an application are actually Proxies to the underlying data.  Changes to Entity properties are intercepted by those Proxies and trigger various functions, such as automatically updating indexes and notifying dependents.  Changing an Entity also causes a new Proxy to be created, making the Entity appear to have changed its object identity, even though the "underlying" entity data is still the same object.  This allows Reknow to work with a system like React, which depends on changes in object identity to detect state changes.  In other words, Reknow effects object identity changes by creating new Proxies to mutable data, instead of creating new copies of immutable data.
