# Arcsecond

Arcsecond is a Fantasy Land compliant javascript [Parser Combinator](https://en.wikipedia.org/wiki/Parser_combinator) library largely inspired by Haskell's Parsec.

<a href="https://github.com/francisrstokes/arcsecond-binary">For parsing binary data, `arcsecond` can be used with `arcsecond-binary`.</a>

---

- [Arcsecond](#arcsecond)
  - [Introduction](#introduction)
    - [A simple parser](#a-simple-parser)
    - [Improving the simple parser](#improving-the-simple-parser)
    - [Note on currying](#note-on-currying)
    - [Note on error handling](#note-on-error-handling)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Running the examples](#running-the-examples)
  - [API](#api)
    - [parse](#parse)
    - [char](#char)
    - [str](#str)
    - [digit](#digit)
    - [digits](#digits)
    - [letter](#letter)
    - [letters](#letters)
    - [whitespace](#whitespace)
    - [anyOfString](#anyofstring)
    - [regex](#regex)
    - [sequenceOf](#sequenceof)
    - [namedSequenceOf](#namedsequenceof)
    - [choice](#choice)
    - [lookAhead](#lookahead)
    - [sepBy](#sepby)
    - [sepBy1](#sepby1)
    - [many](#many)
    - [many1](#many1)
    - [between](#between)
    - [everythingUntil](#everythinguntil)
    - [anythingExcept](#anythingexcept)
    - [possibly](#possibly)
    - [endOfInput](#endofinput)
    - [skip](#skip)
    - [pipeParsers](#pipeparsers)
    - [composeParsers](#composeparsers)
    - [takeRight](#takeright)
    - [takeLeft](#takeleft)
    - [recursiveParser](#recursiveparser)
    - [tapParser](#tapparser)
    - [decide](#decide)
    - [mapTo](#mapto)
    - [leftMapTo](#leftmapto)
    - [fail](#fail)
    - [succeedWith](#succeedwith)
    - [either](#either)
    - [toPromise](#topromise)
    - [toValue](#tovalue)
  - [A note on recursive grammars](#a-note-on-recursive-grammars)
  - [Fantasy Land](#fantasy-land)
    - [Equivalent Operations](#equivalent-operations)
      - [of](#of)
      - [map](#map)
      - [chain](#chain)
      - [ap](#ap)
  - [Name](#name)


## Introduction

### A simple parser

A __Parser Combinator__ is a parser made by composing smaller parsers. For example, to parse strings like:

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
  mapTo (([weatherStr, space, timeStr, colonStr, weatherType]) => {
    return {
      time: timeStr,
      weatherType: weatherType
    };
  })
]);

// ...

parseWeatherData('Weather (today): Sunny').value
//  -> { time: 'today', weatherType: 'Sunny' }
```

Now we've thrown away all the useless information and only got what we really care about, in a data structure we've defined.

The parser is still a little bit weak though, because we can't parse more interesting time strings like "two weeks ago" or "three days ago". We can easily add this support by writing a `complexTimeString` parser for it:

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

// ...

parseWeatherData('Weather (three hours ago): Cloudy').value
//  -> { time: 'three hours ago', weatherType: 'Cloudy' }
```

Now we can handle more complex time strings. Of course in this example, something like "Weather (panda days ago): Sunny" is considered to be a valid string, because we don't have a parser for numbers spelled out as words. Implementing a parser to handle this case is left as an exercise for the reader.

More useful examples, like a json parser, can be found in the [examples](examples/) directory of this repository.

### Note on currying

This library makes use for curried functions, which is a fancy way of saying that all the functions this library only take one argument. If they need to take more than one argument, they instead return a new function that takes the next argument.

```javascript
/*
  Non curried function
  Takes a and b as arguments
*/
const add = (a, b) => a + b;
// add(1, 2) -> 3

/*
  Curried Version
  Takes a as an argument, then returns a function that takes b as an argument
*/
const addCurried = a => b => a + b
// addCurried(1)(2) -> 3
```

If none of this makes sense to you, [give this article a read](https://www.sitepoint.com/currying-in-functional-javascript/).

### Note on error handling

The return type of `parse (parser) (string)` is an [Either](https://github.com/folktale/data.either). This is a special data type that can represent *either* a success or a failure. It does this by actually being made of two types, called `Left` and `Right` (which you can think of as `Error` and `Success` respectively). If you understand how `Promise`s work in javascript then you already intuitively understand `Either`, because `Promises`s have a `Resolve` and a `Reject` type.

You can get at the value of the `Either` using the `fold` method it exposes:

```javascript
const value = parse(parser)(string).fold(onErrorFn, onSuccessFn);
```

If you prefer to not work with the `Either` type, you can convert it to a promise:

```javascript
toPromise(parse(parser)(string))
  .then(onSuccessFn)
  .catch(onErrorFn);
```

Or you can convert it to a value directly, where an error will be thrown if one is present:

```javascript
try {
  const value = toValue(parse(parser)(string));
} catch (ex) {
  // handle the error here
}
```

## Installation

```bash
npm i arcsecond
```

## Usage

```javascript
const {parse, char} = require('arcsecond');

parse (char ('a')) ('abc123');
```

## Running the examples

```bash
git clone git@github.com:francisrstokes/arcsecond.git
cd arcsecond
npm i

# json example
node -r esm examples/json/json.js
```

The examples are built as es6 modules, which means they need node to be launched with the `-r esm` require flag, which allows import and export statements to be used.

## API

*Non-essential note on the types:* This documentation is using [Hindley-Milner type signatures](https://en.wikipedia.org/wiki/Hindley%E2%80%93Milner_type_system) to show the types of function arguments and the return value.

The two main "types" in arcsecond are `Parser e a b` and `ParserState e a`, which are defined as:

`type ParserState e a = Either (Int, e) (Int, String, a)`

`type Parser e a b = () -> ParserState e a -> ParserState e b`

Which is to say that a `Parser e a b` is a type that describes taking a `ParserState e a` to a `ParserState e b`, where `e` is the the error.

### parse

`parse :: Parser e a b -> String -> Either (Int, e) b`

`parse` takes a parser function and a string, and returns the result of parsing the string using the parser.

**Example**
```javascript
parse (str ('hello')) ('hello')
// -> Either.Right('hello')
```

### char

`char :: Char -> Parser String a String`

`char` takes a character and returns a parser that matches that character **exactly one** time.

**Example**
```javascript
parse (char ('h')) ('hello')
// -> Either.Right('h')
```

### str

`str :: String -> Parser String a String`

`str` takes a string and returns a parser that matches that string **exactly one** time.

**Example**
```javascript
parse (str ('hello')) ('hello world')
// -> Either.Right('hello')
```

### digit

`digit :: Parser String a String`

`digit` is a parser that matches **exactly one** numerical digit `/[0-9]/`.

**Example**
```javascript
parse (digit) ('99 bottles of beer on the wall')
// -> Either.Right('9')
```

### digits

`digits :: Parser String a String`

`digits` is a parser that matches **one or more** numerical digit `/[0-9]/`.

**Example**
```javascript
parse (digits) ('99 bottles of beer on the wall')
// -> Either.Right('99')
```

### letter

`letter :: Parser String a String`

`letter` is a parser that matches **exactly one** alphabetical letter `/[a-zA-Z]/`.

**Example**
```javascript
parse (letter) ('hello world')
// -> Either.Right('h')
```

### letters

`letters :: Parser String a String`

`letters` is a parser that matches **one or more** alphabetical letter `/[a-zA-Z]/`.

**Example**
```javascript
parse (letters) ('hello world')
// -> Either.Right('hello')
```

### whitespace

`whitespace :: Parser e a String`

`whitespace` is a parser that matches **zero or more** whitespace characters.

**Example**
```javascript
const newParser = sequenceOf ([
  str ('hello'),
  whitespace,
  str ('world')
]);

parse (newParser) ('hello           world')
// -> Either.Right([ 'hello', '           ', 'world' ])

parse (newParser) ('helloworld')
// -> Either.Right([ 'hello', '', 'world' ])
```

### anyOfString

`anyOfString :: String -> Parser String a String`

`anyOfString` takes a string and returns a parser that matches **exactly one** character from that string.

**Example**
```javascript
parse (anyOfString ('aeiou')) ('unusual string')
// -> Either.Right('u')
```

### regex

`regex :: RegExp -> Parser String a String`

`regex` takes a RegExp and returns a parser that matches **as many characters** as the RegExp matches.

**Example**
```javascript
parse (regex (/[hH][aeiou].{2}o/)) ('hello world')
// -> Either.Right('hello')
```

### sequenceOf

`sequenceOf :: [Parser e a b] -> Parser e a [b]`

`sequenceOf` takes an array of parsers, and returns a new parser that matches each of them sequentially, collecting up the results into an array.

**Example**
```javascript
const newParser = sequenceOf ([
  str ('he'),
  letters,
  char (' '),
  str ('world'),
])

parse (newParser) ('hello world')
// -> Either.Right([ 'he', 'llo', ' ', 'world' ])
```

### namedSequenceOf

`namedSequenceOf :: [(String, Parser e a b)] -> Parser e a (StrMap b)`

`namedSequenceOf` takes an array of string/parser pairs, and returns a new parser that matches each of them sequentially, collecting up the results into an object where the key is the string in the pair.

A pair is just an array in the form: `[string, parser]`

**Example**
```javascript
const newParser = namedSequenceOf ([
  ['firstPart', str ('he')],
  ['secondPart', letters],
  ['thirdPart', char (' ')],
  ['forthPart', str ('world')],
])

parse (newParser) ('hello world')
// -> Either.Right({
//      firstPart: 'he',
//      secondPart: 'llo',
//      thirdPart: ' ',
//      forthPart: 'world'
//    })
```

### choice

`choice :: [Parser * a *] -> Parser * a *`

`choice` takes an array of parsers, and returns a new parser that tries to match each one of them sequentially, and returns the first match. If `choice` fails, then it returns the error message of the parser that matched the most from the string.

**Example**
```javascript
const newParser = choice ([
  digit,
  char ('!'),
  str ('hello'),
  str ('pineapple')
])

parse (newParser) ('hello world')
// -> Either.Right('hello')
```


### lookAhead

`lookAhead :: Parser e a b -> Parser e a b`

`lookAhead` takes *look ahead* parser, and returns a new parser that matches using the *look ahead* parser, but without consuming input.

**Example**
```javascript
const newParser = sequenceOf ([
  str ('hello '),
  lookAhead (str ('world')),
  str ('wor')
]);

parse (newParser) ('hello world')
// -> Either.Right([ 'hello ', 'world', 'wor' ])
```

### sepBy

`sepBy :: Parser e a c -> Parser e a b -> Parser e a [b]`

`sepBy` takes two parsers - a *separator* parser and a *value* parser - and returns a new parser that matches **zero or more** values from the *value* parser that are separated by values of the *separator* parser. Because it will match zero or more values, this parser will always match, resulting in an empty array in the zero case.

**Example**
```javascript
const newParser = sepBy (char (',')) (letters)

parse (newParser) ('some,comma,separated,words')
// -> Either.Right([ 'some', 'comma', 'separated', 'words' ])

parse (newParser) ('')
// -> Either.Right([])

parse (newParser) ('12345')
// -> Either.Right([])
```

### sepBy1

`sepBy1 :: Parser e a c -> Parser e a b -> Parser e a [b]`

`sepBy1` is the same as `sepBy`, except that it matches **one or more** occurence.

**Example**
```javascript
const newParser = sepBy1 (char (',')) (letters)

parse (newParser) ('some,comma,separated,words')
// -> Either.Right([ 'some', 'comma', 'separated', 'words' ])

parse (newParser) ('1,2,3')
// -> Either.Left([0, 'ParseError \'sepBy1\' (position 0): Expecting to match at least one separated value'])
```

### many

`many :: Parser e a b -> Parser e a [b]`

`many` takes a parser and returns a new parser which matches that parser **zero or more** times. Because it will match zero or more values, this parser will always match, resulting in an empty array in the zero case.

**Example**
```javascript
const newParser = many (str ('abc'))

parse (newParser) ('abcabcabcabc')
// -> Either.Right([ 'abc', 'abc', 'abc', 'abc' ])

parse (newParser) ('')
// -> Either.Right([])

parse (newParser) ('12345')
// -> Either.Right([])
```

### many1

`many1 :: Parser e a b -> Parser e a [b]`

`many1` is the same as `many`, except that it matches **one or more** occurence.

**Example**
```javascript
const newParser = many (str ('abc'))

parse (newParser) ('abcabcabcabc')
// -> Either.Right([ 'abc', 'abc', 'abc', 'abc' ])

parse (newParser) ('')
// -> Either.Left('ParseError \'many1\' (position 0): Expecting to match at least one value')

parse (newParser) ('12345')
// -> Either.Left([0, 'ParseError \'many1\' (position 0): Expecting to match at least one value'])
```



### between

`between :: Parser e a b -> Parser f a c -> Parser g a d -> Parser g a d`

`between` takes 3 parsers, a *left* parser, a *right* parser, and a *value* parser, returning a new parser that matches a value matched by the *value* parser, between values matched by the *left* parser and the *right* parser.

This parser can easily be partially applied with `char ('(')` and `char (')')` to create a `betweenBrackets` parser, for example.

**Example**
```javascript
const newParser = between (char ('<')) (char ('>')) (letters);

parse (newParser) ('<hello>')
// -> Either.Right('hello')

const betweenBrackets = between (char ('(')) (char (')'));

parse (betweenBrackets (many (letters))) ('(hello world)')
// -> Either.Right([ 'hello', 'world' ])
```


### everythingUntil

`everythingUntil :: Parser e a b -> Parser String a c`

`everythingUntil` takes a *termination* parser and returns a new parser which matches everything up until a value is matched by the *termination* parser. When a value is matched by the *termination* parser, it is not "consumed".

**Example**
```javascript
parse (everythingUntil (char ('.'))) ('This is a sentence.This is another sentence')
// -> Either.Right('This is a sentence')

// termination parser doesn't consume the termination value
const newParser = sequenceOf ([
  everythingUntil (char ('.')),
  str ('This is another sentence')
]);


parse (newParser) ('This is a sentence.This is another sentence')
// -> Either.Left([18, 'ParseError (position 18): Expecting string \'This is another sentence\', got \'.This is another sentenc...\''])
```

### anythingExcept

`anythingExcept :: Parser e a b -> Parser String a c`

`anythingExcept` takes a *exception* parser and returns a new parser which matches **exactly one** character, if it is not matched by the *exception* parser.

**Example**
```javascript
parse (anythingExcept (char ('.'))) ('This is a sentence.')
// -> Either.Right('T')

const manyExceptDot = many (anythingExcept (char ('.')))
parse (manyExceptDot) ('This is a sentence.')
// -> Either.Right([ 'T', 'h', 'i', 's', ' ', 'i', 's', ' ', 'a', ' ', 's', 'e', 'n', 't', 'e', 'n', 'c', 'e' ])
```

### possibly

`possibly :: Parser e a b -> Parser e a (b|null)`

`possibly` takes an *attempt* parser and returns a new parser which tries to match using the *attempt* parser. If it is unsuccessful, it returns a null value and does not "consume" any input.

**Example**
```javascript
const newParser = sequenceOf ([
  possibly (str ('Not Here')),
  str ('Yep I am here')
]);

parse (newParser) ('Yep I am here')
// -> Either.Right([ null, 'Yep I am here' ])
```

### endOfInput

`endOfInput :: Parser e a b`

`endOfInput` is a parser that only succeeds when there is no more input to be parsed.

**Example**
```javascript
const newParser = sequenceOf ([
  str ('abc'),
  endOfInput
]);

parse (newParser) ('abc')
// -> Either.Right([ 'abc', null ])

parse (newParser) ('abcd')
// -> Either.Left([ 3, 'ParseError \'endOfInput\' (position 3): Expected end of input but got \'d\'' ])
```

### skip

`skip :: Parser e a b -> Parser e a a`

`skip` takes a *skip* parser and returns a new parser which matches using the *skip* parser, but doesn't return its value, but instead the value of whatever came before it.

**Example**
```javascript
const newParser = pipeParsers ([
  str ('abc'),
  str('123'),
  skip (str ('def'))
])

parse (newParser) ('abc123def')
// -> Either.Right('123')
```

### pipeParsers

`pipeParsers :: [Parser * * *] -> Parser * * *`

`pipeParsers` takes an array of parsers and composes them left to right, so each parsers return value is passed into the next one in the chain. The result is a new parser that, when run, yields the result of the final parser in the chain.

**Example**
```javascript
const newParser = pipeParsers ([
  str ('hello'),
  char (' '),
  str ('world')
]);

parse (newParser) ('hello world')
// -> Either.Right('world')
```

### composeParsers

`pipeParsers :: [Parser * * *] -> Parser * * *`

`composeParsers` takes an array of parsers and composes them right to left, so each parsers return value is passed into the next one in the chain. The result is a new parser that, when run, yields the result of the final parser in the chain.

**Example**
```javascript
const newParser = composeParsers ([
  str ('world'),
  char (' '),
  str ('hello')
]);

parse (newParser) ('hello world')
// -> Either.Right('world')
```

### takeRight

`takeRight :: Parser e a b -> Parser f b c -> Parser f a c`

`takeRight` takes two parsers, *left* and *right*, and returns a new parser that first matches the *left*, then the *right*, and keeps the value matched by the *right*.

**Example**
```javascript
const newParser = takeRight (str ('hello ')) (str ('world'))

parse (newParser) ('hello world')
// -> Either.Right('world')
```

### takeLeft

`takeLeft :: Parser e a b -> Parser f b c -> Parser e a b`

`takeLeft` takes two parsers, *left* and *right*, and returns a new parser that first matches the *left*, then the *right*, and keeps the value matched by the *left*.

**Example**
```javascript
const newParser = takeLeft (str ('hello ')) (str ('world'))

parse (newParser) ('hello world')
// -> Either.Right('hello ')
```

### recursiveParser

`recursiveParser :: (() => Parser e a b) -> Parser e a b`

`recursiveParser` takes a function that returns a parser (a thunk), and returns that same parser. This is needed in order to create *recursive parsers* because javascript is not a "lazy" language.

In the following example both the `value` parser and the `matchArray` parser are defined in terms of each other, so one must be one **must** be defined using `recursiveParser`.

**Example**
```javascript
const value = recursiveParser (() => choice ([
  matchNum,
  matchStr,
  matchArray
]));

const betweenSquareBrackets = between (char ('[')) (char (']'));
const commaSeparated = sepBy (char (','));
const spaceSeparated = sepBy (char (' '));

const matchNum = digits;
const matchStr = letters;
const matchArray = betweenSquareBrackets (commaSeparated (value));

parse (spaceSeparated (value)) ('abc 123 [42,somethingelse] 45')
// -> Either.Right([ 'abc', '123', [ '42', 'somethingelse' ], '45' ])
```

### tapParser

`tapParser :: (a => void) -> Parser e a a`

`tapParser` takes a function and returns a parser that does nothing and consumes no input, but runs the provided function on the last parsed value. This is intended as a debugging tool to see the state of parsing at any point in a sequential operation like `sequenceOf` or `pipeParsers`.

**Example**
```javascript
const newParser = sequenceOf ([
  letters,
  tapParser(console.log),
  char (' '),
  letters
]);

parse (newParser) ('hello world')
// -> [console.log]: 'hello'
// -> Either.Right([ 'hello', ' ', 'world' ])
```

### decide

`decide :: (a -> Parser e b c) -> Parser e b c`

`decide` takes a function that recieves the last matched value and returns a new parser. It's important that the function **always** returns a parser. If a valid one cannot be selected, you can always use [fail](#fail).

`decide` allows an author to create a [context-sensitive grammar](https://en.wikipedia.org/wiki/Context-sensitive_grammar).

**Example**
```javascript
const newParser = sequenceOf ([
  takeLeft (letters) (char (' ')),
  decide (v => {
    switch (v) {
      case 'asLetters': return letters;
      case 'asDigits': return digits;
      default: return fail(`Unrecognised signifier '${v}'`);
    }
  })
]);

parse (newParser) ('asDigits 1234')
// -> Either.Right([ 'asDigits', '1234' ])

parse (newParser) ('asLetters hello')
// -> Either.Right([ 'asLetters', 'hello' ])

parse (newParser) ('asPineapple wayoh')
// -> Either.Left([12, 'Unrecognised signifier \'asPineapple\''])
```

### mapTo

`mapTo :: (a -> b) -> Parser e a b`

`mapTo` takes a function and returns a parser does not consume input, but instead runs the provided function on the last matched value, and set that as the new last matched value. This function can be used to apply structure or transform the values as they are being parsed.

**Example**
```javascript
const newParser = pipeParsers([
  letters,
  mapTo(x => {
    return {
      matchType: 'string',
      value: x
    }
  });
]);

parse (newParser) ('hello world')
// -> Either.Right({
//      matchType: 'string',
//      value: 'hello'
//    })
```

### leftMapTo

`leftMapTo :: ((e, Int) -> f) -> Parser f a b`

`leftMapTo` is like [mapTo](#mapto) but it transforms the error value. The function passed to `leftMapTo` gets the *current error message* as its first argument and the *index* that parsing stopped at as the second.

**Example**
```javascript
const newParser = pipeParsers([
  letters,
  leftMapTo((message, index) => `Old message was: [${message}] @ index ${index}`)
]);

parse (newParser) ('1234')
// -> Either.Left([
//      0,
//      'Old message was: [ParseError \'many1\' (position 0): Expecting to match at least on value] @ index 0'
//    ])
```

### fail

`fail :: String -> Parser String a b`

`fail` takes an *error message* string and returns a parser that always fails with the provided *error message*.

**Example**
```javascript
parse (fail ('Nope')) ('hello world')
// -> Either.Left([0, 'Nope'])
```

### succeedWith

`succeedWith :: b -> Parser e a b`

`succeedWith` takes an value and returns a parser that always matches that value and does not consume any input.

**Example**
```javascript
parse (succeedWith ('anything')) ('hello world')
// -> Either.Right('anything')
```

### either

`either :: Parser e a b -> Parser e (Either f b) c`

`either` takes a parser and returns a parser that will always succeed, but the captured value will be an Either, indicating success or failure.

**Example**
```javascript
parse (either (fail('nope!')) ('hello world')
// -> Either.Right(Either.Left([0, 'nope!']))
```

### toPromise

`toPromise :: Either a b -> Promise a b`

`toPromise` converts an `Either` type value (such as the one returned by `parse`), and converts it into a `Promise`.

**Example**
```javascript
const resultAsEither = parse (str ('hello')) ('hello world');
const resultAsPromise = toPromise(resultAsEither);

resultAsPromise
  .then(console.log)
  .catch(console.error);
// -> 'hello'
```

### toValue

`toValue :: Either a b -> b`

`toValue` converts an `Either` type value (such as the one returned by `parse`), and converts it into a regular value. If there was a parsing error, it will be thrown, and must be handled in a try/catch block.

**Example**
```javascript
const resultAsEither = parse (str ('hello')) ('hello world');

try {
  const value = toValue(resultAsEither);
} catch (parseError) {
  console.error(parseError.message)
}

resultAsPromise
  .then(console.log)
  .catch(console.error);
// -> 'hello'
```

## A note on recursive grammars

If you're pasrsing a programming language, a configuration, or anything of sufficient complexity, it's likely that you'll need to define some parsers in terms of each other. You might want to do something like:

```javascript
const value = choice ([
  matchNum,
  matchStr,
  matchArray
]);

const betweenSquareBrackets = between (char ('[')) (char (']'));
const commaSeparated = sepBy (char (','));

const matchNum = digits;
const matchStr = letters;
const matchArray = betweenSquareBrackets (commaSeparated (value));
```

In this example, we are trying to define `value` in terms of `matchArray`, and `matchArray` in terms of `value`. This is problematic in a language like javascript because it is what's known as an ["eager language"](https://en.wikipedia.org/wiki/Eager_evaluation). Because the definition of `value` is a function call to `choice`, the arguments of `choice` must be fully evaluated, and of course none of them are yet. If we just move the definition below `matchNum`, `matchStr`, and `matchArray`, we'll have the same problem with `value` not being defined before `matchArray` wants to use it.

We can get around javascript's eagerness by using [recursiveParser](#recursiveparser), which takes a function that returns a parser:

```javascript
const value = recursiveParser(() => choice ([
  matchNum,
  matchStr,
  matchArray
]));

const betweenSquareBrackets = between (char ('[')) (char (']'));
const commaSeparated = sepBy (char (','));

const matchNum = digits;
const matchStr = letters;
const matchArray = betweenSquareBrackets (commaSeparated (value));
```

## Fantasy Land

This library implements the following Fantasy Land (v3) interfaces:

- [Functor](https://github.com/fantasyland/fantasy-land#functor)
- [Apply](https://github.com/fantasyland/fantasy-land#apply)
- [Applicative](https://github.com/fantasyland/fantasy-land#applicative)
- [Chain](https://github.com/fantasyland/fantasy-land#chain)

Every parser, or parser made from composing parsers has a `.of`, `.map`, `.chain`, and `.ap` method.

### Equivalent Operations

#### of

```javascript
Parser.of(42)

// is equivalent to

succeedWith (42)
```

#### map

```javascript
letters.map (fn)

// is equivalent to

pipeParsers ([ letters, mapTo (fn) ])
```

#### chain

```javascript
letters.chain (x => someOtherParser)

// is equivalent to

pipeParsers ([ letters, decide (x => someOtherParser) ])
```

#### ap

```javascript
letters.ap (Parser.of (fn))

// is equivalent to

pipeParsers ([
  sequenceOf ([ succeedWith (fn), letters ]),
  mapTo (([fn, x]) => fn(x))
]);
```

## Name

The name is also derrived from parsec, which in astronomical terms is an ["astronomical unit [that] subtends an angle of one arcsecond"](https://en.wikipedia.org/wiki/Parsec).