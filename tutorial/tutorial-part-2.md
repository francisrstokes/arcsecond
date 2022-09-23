# Tutorial Part 2: Extracting useful information

[Back to part 1](./tutorial-part-1.md)

**Goal**: To understand how to extract, shape, and transform the parsed data.

[In the previous part](./tutorial-part-1), we created a simple parser to process weather data. The final result was the following array:

```javascript
['Weather', ' ', ['(', 'today', ')'], ': ', 'Sunny'];
```

This result contains all the information in a structured form, but still far more information than we actually need. Instead, it would be great to get a result like:

```javascript
{
  weather: 'Sunny',
  time: 'today'
}
```

arcsecond provides different ways to process data as it is being parsed. Let's take a look at one of those ways in isolation before getting back to the weather example.

## Mapping

```javascript
const { letters } = require('arcsecond');

const finalParser = letters.map(result => {
  return {
    data: result,
  };
});

finalParser.run('hello').result;
// -> { data: 'hello' }
```

Here the parser is extremely simple; it uses the `letters` parser to capture any characters _[a-zA-Z]_, and then uses the the `.map` method to transform the result into a structured object. `.map` works a lot like it does for an array - it allows you to run a function on the _value inside the parser_ (when it is eventually run, of course!). It can be used with any parser, and most importantly, the result of mapping is still an other parser, which means it can be further composed!

## Coroutines

The next example is perhaps the most powerful tool in the arcsecond library, not only because of how expressive it is, but because the idea of _contextual parsing_ falls out of it for free. The `coroutine` parser takes a parserFn function which provides `run` function as argument, and allows parsing data using the \run function.

```javascript
const { letters, coroutine, char } = require('arcsecond');

const fullParser = coroutine(run => {
  const firstWord = run(letters);

  run(char(' '));

  const secondWord = run(letters);

  return {
    type: 'word list',
    words: [firstWord.toUpperCase(), secondWord.toUpperCase()],
  };
});

fullParser.run('hello world').result;
// -> { type: 'word list', words: ['HELLO', 'WORLD'] }
```

As you can see from the example above, `coroutine` can be used to both express sequences of parsing operations and data transformations, in this case replacing both the need to use `sequenceOf` and `.map`. This was previously done using generator function which resulted in uncertain and forced typing. This new approach will provide better typings.

## Rewriting the weather data parser

There are a couple of changes that would already improve this parser a lot. Let's rewrite it using `coroutine`s and `.map`s

```javascript
const {
  str,
  coroutine, // +replaced sequenceOf
  choice,
  char,
} = require('arcsecond');

const weatherString = str('Weather');

const timeString = coroutine(run => {
  // Parse and ignore '('
  run(char('('));

  // Parse and store the time string
  const time = run(
    choice([str('today'), str('yesterday'), str('one week ago')]),
  );

  // Parse and ignore ')'
  run(char(')'));

  return time;
});

const weatherType = choice([str('Sunny'), str('Cloudy'), str('Rainy')]);

const fullParser = coroutine(run => {
  // Parse the weather string and the space character
  run(weatherString);
  run(char(' '));

  // Store the time string for later
  const time = run(timeString);

  // Parse and ignore the separator
  run(str(': '));

  // Store the weather string
  const weather = run(weatherType);

  // Return the data in a structured way
  return {
    time: time,
    weather: weather,
  };
});

fullParser.run('Weather (today): Sunny').result;
//  -> { time: 'today', weather: 'Sunny' }
```

Now we've thrown away all the useless information and only got what we really care about, in a data structure we've defined.

The parser is still a little bit weak though, because we can't parse more interesting time strings like "two weeks ago" or "three days ago". We can easily add this support by writing a `complexTimeString` parser for it:

```javascript
const {
  str,
  coroutine,
  choice,
  char,
  letters, // +added
} = require('arcsecond');

// ...

// This parser will match data like:
// - ten minutes
// - nine hours
// - four days
const pluralTime = coroutine(run => {
  const pluralQuantifier = run(letters);
  run(char(' '));
  const timeQuantifier = run(choice([str('hours'), str('days'), str('weeks')]));

  return `${pluralQuantifier} ${timeQuantifier}`;
});

const complexTimeString = sequenceOf([
  choice([str('one hour'), str('one day'), str('one week'), pluralTime]),
  str(' ago'),
]).map(strings => strings.join(''));

const timeString = coroutine(run => {
  run(char('('));

  const time = run(choice([str('today'), str('yesterday'), complexTimeString]));

  run(char(')'));

  return time;
});

// ...
fullParser.run('Weather (three hours ago): Cloudy').result;
//  -> { time: 'three hours ago', weather: 'Cloudy' }
```

Now we can handle more complex time strings. Notice that the `pluralTime` parser and the `complexTimeString` parser both return the matches as concatenated string. In this simple case, using a simple parser with .sequenceOf and .map is just as expressive as a coroutine.

### Limitations

Of course in this example, something like "Weather (panda days ago): Sunny" is considered to be a valid string, because we don't have a parser for numbers spelled out as words. Implementing a parser to handle this case is left as an exercise for the reader!

## Summary

Parsers can extract and transform the data they parse using the `.map` method. `coroutines` can also be used to to capture sequences of data and process them all in one place, much like `async/await` does for promises in `async` functions.

## Next: Error handling

So far there has been no mention of error handling! [This will covered in the next section.](./tutorial-part-3.md)
