# Tutorial Part 3: Error handling

[Back to part 2](./tutorial-part-2.md)

**Goal**: To be able to handle different types of errors effectively.

So far, in order to get the core idea of parser combinators, we haven't mentioned error handling. But it is incredibly important.

## Internal error tracking

arcsecond internally keeps track of whether parser resulted in an error. This does not include syntax or reference errors of course, only errors caused by expecting certain kinds of input to a parser which wasn't found.

Just like a Promise can be either `Resolved` or `Rejected`, the parsing result can be in an *errored* or *not errored* state.

```javascript
const {
  str
} = require('arcsecond');

const fullParser = str('hello');

fullParser.run('goodbye')
// -> {
//      isError: true,
//      error: "ParseError (position 0): Expecting string 'hello', got 'goodb...'",
//      index: 0,
//      data: null
//    }
```

Previously when we called `.run`, we immediately used `.result`. But because an error in parsing was encountered we no longer have a `.result` property, but rather a `.error` property that describes what went wrong. We can check if parsing was successful by looking at the `.isError` property.

Also notice that there is more information inside the *parsing result object* object than just the error - we also have the index at which the error occurred within the string, and there is another property called `data` which will be explained in more detail in part 7 of this tutorial.

## Fork

So how should errors be handled? There are a few different options. The first is simply to use `.run` - as shown above - and to check for `parsingResult.isError` and act accordingly. The second is `.fork`, which lets us handle the possible result or possible error with handler functions:

```javascript
const {
  str
} = require('arcsecond');

const fullParser = str('hello');

const myResult = fullParser.fork(
  // The string to parse
  'goodbye',

  // An error handler
  (error, parsingResult) => {
    // Here we can throw the error...
    throw new Error(error);

    // ...Or maybe we could try to recover
    if (error === somethingICanRecoverFrom) {
      return someOtherValue;
    }
  },
  
  // A success handler
  (result, parsingResult) => {
    console.log(`The final result: ${result}`);
    return result;
  }
);
```

## Working with Promises

The *parsing result object* can be converted to a Promise without losing any information, because they can both have a possible error or success state. arcsecond has a built in utility for this called `toPromise`

```javascript
const {
  str,
  toPromise
} = require('arcsecond');

const fullParser = str('hello');

const result = toPromise(fullParser.run('goodbye'))
  .then(result => {
    console.log(result);
    return result;
  })
  .catch(({error}) => {
    throw new Error(error);
  });
```

This can be useful if your program is already based on Promise chains.

## Expected failures

Sometimes you're parsing some text, and it might or might not contain some data. Let's imagine we have a string like:

`Hello [name]`

Perhaps this string sometimes comes in the form:

`Hello, [name]`

where the comma is optional.

```javascript
const {
  sequenceOf,
  str,
  letters,
  possibly,
  char
} = require('arcsecond');

const fullParser = sequenceOf([
  str('Hello'),
  possibly(char(',')),
  char(' '),
  letters
]);

fullParser.run('Hello, francis');
// -> {
//      isError: false,
//      result: [ "Hello", ",", " ", "francis" ],
//      index: 14,
//      data: null
//    }

fullParser.run('Hello francis');
// -> {
//      isError: false,
//      result: [ "Hello", null, " ", "francis" ],
//      index: 14,
//      data: null
//    }
```

Here we used the `possibly` parser combinator to indicate that we shouldn't error if we cannot parse the comma. This approach works well when you know how/why a parser might fail, but what about when don't? For those kinds of situations, the `either` parser combinator can be used. [The name is a reference to the Either data structure, which can hold a possible error instead of explicitly failing](http://hackage.haskell.org/package/base-4.12.0.0/docs/Data-Either.html). It works well in conjunction with a `coroutine` parser because we can use regular JavaScript code to perform checks:

```javascript
const {
  coroutine,
  either,
  str,
  letters,
  possibly,
  fail,
  char
} = require('arcsecond');

const fullParser = coroutine(function* () {
  yield str('Hello');
  yield possibly(char(','));
  yield char(' ');

  const name = yield either(letters);

  if (name.isError) {
    // Instead of a cryptic message about where parsing went wrong, we can instead make a better message
    yield fail('Names must be made of alphabet characters');
  }

  return name.value;
});

fullParser.run('Hello, francis');
// -> {
//      isError: false,
//      result: "francis",
//      index: 14,
//      data: null
//    }

fullParser.run('Hello, 013733');
// -> {
//      isError: true,
//      error: "Names must be made of alphabet characters",
//      index: 7,
//      data: null
//    }
```

This is a very simple example, but this method comes in handy when using more complex composed parsers, where there could be many different context dependent ways of failing. Notice we also used the `fail` parser combinator, which as the name implies always returns an error with the provided message.

## Summary

When a parser is run using `.run`, it returns a *parsing result object*, which encodes a possible error/result. If we use `.fork` instead, we can explicitly handle the errors and successes.

Expected errors can be anticipated in the parser itself using `possibly` and `either`.

## Next: Building utility parsers

[In the next section](./tutorial-part-4.md), we will explore how we can build our own utility parsers, which can lead to a more expressive description of our parser and allow us to write less code.
