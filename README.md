# Billy Data - A Data Layer for Ember.js [![Build Status](https://travis-ci.org/billysbilling/billy-data.png?branch=master)](https://travis-ci.org/billysbilling/billy-data)

Billy Data is a data layer for Ember.js. It works with a standard JSON REST API.

## Open source

This library is currently open sourced mostly for display.
Since this library is brand new we make no guarantee at this time that we're going to continue to support and develop it.
But you're free to use it however you want. 

## Documentation

Documentation will soon be found at the [Wiki](https://github.com/billysbilling/billy-data/wiki).

## What's the difference to Ember Data, and why aren't we using that?

The Ember.js guys have done a tremendous job with [Ember Data](http://github.com/emberjs/data). Ember Data has great
future possibilities. We actually used Ember Data for a while.
But at the time of writing, there are too many unfinished parts, and limitations in regards to what
we exactly need. It also has a lot of features that we don't need, which just adds unnecessary complexity.
So we chose to spend a few days building Billy Data.

Here are a few of the issues we've had with Ember Data, which Billy Data solves nicely for us:

- Commit a single record.
- Get a callback when a record has been created/updated/deleted.
- Sideload specific types of hasMany records, but save them embedded.
- Automatically sideload records based on their name without the need to set up mappings.
- Validation errors attached directly to each attribute.
- Ability to reload a record from the API (by ID), with an extra query parameter. We use this to ensure that a specific record has all its relationships loaded.
- No state manager for records. The concept of a state manager is cool in theory, but in practice it has given us more problems than advantages. 

The API of Billy Data and some of the implementation has been greatly inspired by Ember Data. So big thanks and props
for that to the Ember.js guys.

## Building

Install [grunt.js](https://github.com/gruntjs/grunt/blob/0.3-stable/docs/toc.md).

Go to Terminal and `cd` into the billy-data folder and run:

```
grunt
```

The built source code can then be found at `dist/billy-data.js` and `dist/billy-data.min.js`.

## Running tests

### In a browser

Just open the `tests.html` file in your browser. The test suite uses QUnit.

### From command line

Install [PhantomJS](http://phantomjs.org/).

From within your billy-data folder run:

```
phantomjs test-runner.js
```

## Contributing

You are very welcome to contribute using pull requests, as long as the functionality is also in Billy's Billing's best interest.
