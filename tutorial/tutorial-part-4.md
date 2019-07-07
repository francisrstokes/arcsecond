# Tutorial Part 4: Building utility parsers

[Back to part 3](./tutorial-part-3.md)

**Goal**: To be able to build helpful utility parsers that enhance expressivity

[arcsecond has a lot of parser combinators](https://github.com/francisrstokes/arcsecond#api) to help in building utility parsers, but you can also build your own.

A very common scenario is to build a parser which matches values that are separated by some marker. For example, we might want to build a parser combinator for matching comma separated values:

```javascript
const {
  sepBy,
  char,
  letters
} = require('arcsecond');

const commaSeparated = sepBy(char(','));

const finalParser = commaSeparated(letters);

finalParser.run('big,list,of,words');
// -> Right([ 'big', 'list', 'of', 'words' ])
```

Here we assigned `commaSeparated` as a variable, because this is a common task we might want to use to capture many different kinds of data, not only letters. While this is not necessary, it's less expressive if this is just done inline:

```javascript
const {
  sepBy,
  char,
  letters
} = require('arcsecond');

const finalParser = sepBy (char(',')) (letters);

finalParser.run('big,list,of,words');
// -> {
//      isError: false,
//      result: [ "big", "list", "of", "words" ],
//      index: 17,
//      data: null
//    }
```

`sepBy` is what is known as a [curried function](https://www.sitepoint.com/currying-in-functional-javascript/), which essentially means it takes one argument at a time, over multiple function calls. It is implemented this way in arcsecond because the major use case is building utility parsers, where you mostly want to supply the second argument later, but it can be confusing if you're not used to it.

We could make this even more flexible (depending on the situation of course!) by allowing optional whitespace:

```javascript
const {
  sepBy,
  char,
  letters,
  optionalWhitespace,
  sequenceOf
} = require('arcsecond');

const commaSeparated = sepBy(sequenceOf([ optionalWhitespace, char(','), optionalWhitespace ]));

const finalParser = commaSeparated(letters);

finalParser.run('big,       list, of,                        words');
// -> {
//      isError: false,
//      result: [ "big", "list", "of", "words" ],
//      index: 49,
//      data: null
//    }
```

Another common use case is extracting data that comes between two known endpoints, such as brackets. We can write a parser called `betweenBrackets` quite easily:

```javascript
const {
  between,
  char,
} = require('arcsecond');

const betweenBrackets = between (char('(')) (char(')'));

const finalParser = betweenBrackets(letters);

finalParser.run('(hello)');
// -> {
//      isError: false,
//      result: "hello",
//      index: 7,
//      data: null
//    }
```

## Writing custom combinators

`sepBy` is useful in a very general sense, but if you needed a combinator like `sepBy`, except you wanted to allow a trailing comma at the end, you would have to write it from scratch. Thankfully, these kinds of parsers are easy enough to write yourself in different ways.

```javascript
const {
  between,
  char,
  sequenceOf,
  possibly,
  coroutine,
  either,
} = require('arcsecond');

const customSepByWithSequenceOf = separatorParser => valueParser => sequenceOf([
  sepBy (separatorParser) (valueParser),
  possibly (separatorParser)
]).map(results => results[0]);

const customSepByWithCoroutine = separatorParser => valueParser => coroutine(function* () {
  const results = [];

  while (true) {
    const value = yield either(valueParser);

    // We can't parse more values, break from the loop
    if (value.isLeft) break;

    // Push the captured value into the results array
    results.push(value);

    const sep = yield either(separatorParser);

    // There are no more separators, break from the loop
    if (sep.isLeft) break;
  }

  // sepBy allows for zero results to be matched, so we will here too.
  // If you need *at least one* result, you should use sepBy1
  return results;
});
```

[For a full list of the built in parser combinators, you can checkout the API docs](https://github.com/francisrstokes/arcsecond#api). Building a parser of any substantial complexity will definitely require many utility parsers, so it will be worth the time to give them names and work out the range of flexibility each should offer.

## Summary

arcsecond has many built in combinators that allow you to easily create your own utility parsers with. All the parser combinators in arcsecond are curried functions, and thus only take a single argument at a time. Sometimes the general parser combinators provided in the library will not be perfectly suited to a specific need, but custom parsers can be created without too much difficulty.

## Next: Recursive Structures

[In the next section we'll explore how to parse recursive data.](./tutorial-part-5.md)