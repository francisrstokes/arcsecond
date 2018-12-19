# Arcsecond

Arcsecond is a javascript [Parser Combinator](https://en.wikipedia.org/wiki/Parser_combinator) library largely inspired by Haskell's Parsec.

The name is also derrived from parsec, which in astronimical terms is an ["astronomical unit subtends an angle of one arcsecond"](https://en.wikipedia.org/wiki/Parsec).

## Introduction

### A simple parser

A __Parser Combinator__ is a parser made by composing smaller parsers. For example, to parse strings like:

```
"Weather (today): Sunny"
"Weather (yesterday): Cloudy"
"Weather (one week ago): Rainy"
```

We might break this down into a few different parser:

- One that can identify the literal string "Weather"
- One that can identify a known time string inside brackets
- One that can identify a known weather type

These 3 parsers can then be combined into a single parser that is able to identify all those parts correctly as a structure. The following is how this would look using arcsecond:

```javascript
const {
  str,
  sequenceOf,
  choice,
  char,
  parse
} = require('arcsecond');

const weatherString = str ('Weather');

const timeString = sequenceOf ([
  char ('('),
  choice ([
    str ('today'),
    str ('yesterday'),
    str ('one week ago')
  ]),
  char (')')
]);

const weatherType = choice ([
  str ('Sunny'),
  str ('Cloudy'),
  str ('Rainy')
]);

const fullParser = sequenceOf ([
  weatherString,
  char (' '),
  timeString,
  str (': '),
  weatherType
]);

// Create a function that can take a string and run our parser
const parseWeatherData = parse(fullParser);

parseWeatherData('Weather (today): Sunny').value
//  -> [ 'Weather', ' ', [ '(', 'today', ')' ], ': ', 'Sunny' ]

```


This gives us all the data that the different parsers extracted. The `sequenceOf` function collects values from each parser in the sequence and places it into an array. Since the `timeString` parser also uses `sequenceOf`, its return value is also an array.

### Improving the simple parser

There are a couple of changes that would already improve this parser a lot. The first is that we are keeping all the data we are parsing, even though we don't need most of it. All we really need is the "time" string and the "weather type" string. First of all, let's make the `timeString` parser only return the string we care about.

```javascript
const {
  str,
  sequenceOf,
  choice,
  char,
  parse,
  pipeParsers,  // +added
  mapTo,        // +added
} = require('arcsecond');

// ...

const timeString = pipeParsers ([
  sequenceOf ([
    char ('('),
    choice ([
      str ('today'),
      str ('yesterday'),
      str ('one week ago')
    ]),
    char (')')
  ]),
  mapTo (([lbracket, timeStr, rbracket]) => timeStr)
])

// ...

parseWeatherData('Weather (today): Sunny').value
//  -> [ 'Weather', ' ', 'today', ': ', 'Sunny' ]
```

So the change uses `pipeParsers`, which takes an array of parsers, in order to pass the result of one parser to the next one in the list. `mapTo` lets us get get at the value and map it to something else. In this case we can deconstruct the array that `sequenceOf` returned and just give back the string.

Running the same string again, we just get the string we were interested in. Since we also don't care about the "Weather" string, and all the separators, we can use the same technique of `pipeParsers` + `mapTo` to rewrite `fullParser`:

```javascript

// ...

const fullParser = pipeParsers ([
  sequenceOf ([
    weatherString,
    char (' '),
    timeString,
    str (': '),
    weatherType
  ]),
  mapTo (([weatherStr, space, timeStr, colonStr, weatherType]) => [timeStr, weatherType])
]);

// ...

parseWeatherData('Weather (today): Sunny').value
//  -> [ 'today', 'Sunny' ]
```

Now we've thrown away all the useless information and only got what we really care about. The parser is still a little bit weak though, because we can't parse more interesting time strings like "two weeks ago" or "three days ago". We can easily add this support by writing one more little parser for it:

```javascript
const {
  str,
  sequenceOf,
  choice,
  char,
  parse,
  pipeParsers,
  mapTo,
  letters   // +added
} = require('arcsecond');

// ...

const pluralTime = pipeParsers ([
  sequenceOf ([
    letters,
    char (' '),
    choice ([
      str ('hours'),
      str ('days'),
      str ('weeks')
    ])
  ]),
  mapTo (strings => strings.join(''))
]);

const complexTimeString = pipeParsers ([
  sequenceOf ([
    choice ([
      str ('one hour'),
      str ('one day'),
      str ('one week'),
      pluralTime
    ]),
    str (' ago')
  ]),
  mapTo (strings => strings.join(''))
]);

const timeString = pipeParsers ([
  sequenceOf ([
    char ('('),
    choice ([
      str ('today'),
      str ('yesterday'),
      complexTimeString
    ]),
    char (')')
  ]),
  mapTo (([lbracket, timeStr, rbracket]) => timeStr)
]);
```

Now we can handle more complex time strings. Of course in this example, something like "Weather (panda days ago): Sunny" is considered to be a valid string, because we don't have a parser for numbers spelled out as words. Implementing a parser to handle this case is left as an exercise for the reader.

More useful examples, like a json parser, can be found in the [examples](examples/) directory of this repository.

## Installation

```bash
npm i arcsecond
```

## Usage

```javascript
const arc = require('arcsecond');

arc.parse (arc.char ('a')) ('abc123');
```

## API

## Recursive Grammars

