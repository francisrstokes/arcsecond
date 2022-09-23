# Tutorial Part 7: Stateful parsing

[Back to part 6](./tutorial-part-6.md)

**Goal**: To understand how to effectively track and change state over the course of parsing, and how to make parsing decisions based on state

This section could be considered an advanced topic because for many applications of parsing it is not needed. That said, sometimes you simply have to create and keep track of some state while parsing certain kinds of data.

Lets take the JavaScript language for example. JavaScript has several kinds of [expressions](<https://en.wikipedia.org/wiki/Expression_(computer_science)>) that can only be used in a particular context. Two examples of this are `await` expressions in async functions, and `yield` expressions in generator functions.

Then there is the idea of user facing errors. When you write a parser, you want the end users of that parser to be able to understand what happened when something goes wrong. Of course, arcsecond provides errors with indexes into string which point out exactly where things went wrong, these are not specific to _your_ parser; In other words, they have no context.

This is where state comes in. arcsecond has a state management mechanism built in, which is completely [pure](https://en.wikipedia.org/wiki/Pure_function) - which is to say that the side effects are pushed to the very edge of the program (runtime), and there is no mutable global state.

Let's take a look at how state can be created, queried, and updated.

```javascript
const {
  coroutine,
  sequenceOf,
  char,
  digits,
  letters,
  getData,
  mapData,
  withData,
} = require('arcsecond');

const nameParser = coroutine(tokenizer => {
  const name = tokenizer(letters);
  tokenizer(char(' '));

  tokenizer(
    mapData(data => {
      return {
        ...data,
        nameBeginsWithA: name[0] === 'A',
      };
    }),
  );

  return name;
});

const parserBasedOnState = coroutine(tokenizer => {
  const stateData = tokenizer(getData);

  const stateBasedProperty = stateData.nameBeginsWithA
    ? tokenizer(digits.errorMap(() => 'Expecting a number'))
    : tokenizer(letters.errorMap(() => 'Expecting a string'));

  return stateBasedProperty;
});

const fullParser = withData(sequenceOf([nameParser, parserBasedOnState]));

fullParser({}).run('Anthony 12345');
// -> {
//      isError: false,
//      "result": [ "Anthony", "12345" ],
//      index: 13,
//      data: { nameBeginsWithA: true }
//    }

fullParser({}).run('Anthony hello');
// -> {
//      isError: true,
//      error: "Expecting a number",
//      index: 8,
//      data: { nameBeginsWithA: true }
//    }

fullParser({}).run('Francis 12345');
// -> {
//      isError: true,
//      error: "Expecting a string",
//      index: 8,
//      data: { nameBeginsWithA: false }
//    }

fullParser({}).run('Francis hello');
// -> {
//      isError: false,
//      result: [ "Francis", "hello" ],
//      index: 13,
//      data: { nameBeginsWithA: false }
//    }
```

In this albiet very contrived example, `parserBasedOnState` has no information about the name that was parsed, other than the information it was able to take from state.

We can use the `withData` combinator to set up the initial state of the parser before we run it. It's recommended to push the actual application of state right to the edge of your your program, when you actually call `.run` or `.fork`, so that it is separated from the description of the parser. Likewise, it keep things "pure", you should try ensure that the data you pass to `withData` is immutable, which is why it's called each time with a fresh empty object.

arcsecond does not provide any more specific methods of state keeping than this, as it is intended to be as flexible as possible. For example, you may want to combine the state reads and updates with a tool like [lenses](http://randycoulman.com/blog/2016/07/12/thinking-in-ramda-lenses/), or to set up a [reducer pattern](https://redux.js.org/basics/reducers), or to use a full blown [State monad](https://npm.pkg.github.com/wearereasonablepeople/monastic). With the primitives `getData`, `setData` and `mapData`, you can choose to go bare bones or build abstractions.

## Simpler: Mapping captured values based on state

What if we just want to decorate what we've parsed based on the current state? There is a `.mapFromData` method, similar to `.map`, just for this purpose.

```javascript
const {
  sequenceOf,
  char,
  digits,
  letters,
  mapData,
  withData,
} = require('arcsecond');

const gotoStage = stageName => mapData(data => ({ ...data, stage: stageName }));
const tagWithStage = parser =>
  parser.mapFromData(({ data, result }) => ({
    stage: data.stage,
    value: result,
  }));

const nullify = parser => parser.map(() => null);

const name = tagWithStage(letters);
const age = tagWithStage(digits);
const favouriteIceCream = tagWithStage(letters);

const finalParser = withData(
  sequenceOf([
    name,
    nullify(gotoStage('Stage_2')),
    nullify(char(' ')),
    age,
    nullify(gotoStage('Stage_3')),
    nullify(char(' ')),
    favouriteIceCream,
  ]).map(values => values.filter(x => x !== null)),
);

finalParser({ stage: 'Initial_Stage' }).run('Jimmy 22 Chocolate');
// -> {
//      isError: false,
//      result: [
//        { stage: "Initial_Stage", value: "Jimmy" },
//        { stage: "Stage_2", value: "22" },
//        { stage: "Stage_3", value: "Chocolate" }
//      ],
//      index: 18,
//      data: { stage: "Stage_3" }
//    }
```

## Summary

arcsecond provides special "parsers" that allow reading/writing to internal _state data_. This data can be be used to make decisions, produce better error messages, and tag, annotate, or augment data as it is being parsed.

## End of tutorial

That brings us to the end of the arcsecond crash course! If there is a topic that you would like to see covered here, don't hesitate to open an issue. If you notice any errors, you're also welcome to open a pull request!

[Back to the API docs](../Readme.md)
