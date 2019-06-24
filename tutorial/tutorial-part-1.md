# Tutorial Part 1: Parsing weather data

**Goal**: Understand what parser combinators are, and how they can be used to parse data

A __Parser Combinator__ is a parser made by composing smaller parsers. A parser created this way is itself also *composable*. For example, to parse strings like:

```
"Weather (today): Sunny"
"Weather (yesterday): Cloudy"
"Weather (one week ago): Rainy"
```

We might break this down into a few different parsers:

- One that can identify the literal string "Weather"
- One that can identify a known time string inside brackets
- One that can identify a known weather type

These 3 parsers can then be combined into a single parser that is able to identify all those parts correctly as a structure. The following is how this would look using arcsecond:

```javascript
const {
  str,
  sequenceOf,
  choice,
  char
} = require('arcsecond');

const weatherString = str('Weather');

const timeString = sequenceOf([
  char('('),
  choice([
    str('today'),
    str('yesterday'),
    str('one week ago')
  ]),
  char(')')
]);

const weatherType = choice([
  str('Sunny'),
  str('Cloudy'),
  str('Rainy')
]);

const fullParser = sequenceOf([
  weatherString,
  char(' '),
  timeString,
  str(': '),
  weatherType
]);

fullParser.run('Weather (today): Sunny').result
//  -> [ 'Weather', ' ', [ '(', 'today', ')' ], ': ', 'Sunny' ]

```

There are four parser combinators being used here: `str`, `char`, `choice`, and `sequenceOf`. `str` and `char` are both functions that accept a string to match exactly. `choice` is a function that accepts an array of parsers, which will try to match at least one of them. Finally `sequenceOf` takes an array of parsers and collects up the results of parsing with all of them; It's an extremely powerful parser combinator that allows you to glue all of the smaller parsers together into a larger structure.

This gives us all the data that the different parsers extracted. The final result is an array, because the `fullParser` is based on `sequenceOf`, which will eventually provide an array of the results. Interestingly, since the `timeString` parser also uses `sequenceOf`, its return value is also an array.

## Summary

Parser combinators are a kind of parser that is made by composing smaller parsers. By utilising parsers that can extract data (such as `str` and `char`), and others that can glue them together (such as `sequenceOf` and `choice`), complex data can be structurally extracted.

## Next: Extracting useful information

There are a couple of changes that would already improve this parser a lot. We will explore those in the next section: [Extracting useful information](./tutorial-part-2.md).
