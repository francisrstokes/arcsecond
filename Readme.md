# Arcsecond

<img src="./logo.png">

Arcsecond is a zero-dependency, Fantasy Land compliant JavaScript [Parser Combinator](https://en.wikipedia.org/wiki/Parser_combinator) library largely inspired by Haskell's Parsec.

The [arcsecond-binary](https://github.com/francisrstokes/arcsecond-binary) peer library includes parsers specifically for working with binary data.

---

- [Arcsecond](#arcsecond)
  - [Release Notes](#release-notes)
  - [Installation](#installation)
  - [Tutorial](#tutorials)
  - [Usage](#usage)
  - [Running the examples](#running-the-examples)
  - [API](#api)
    <details>
      <summary>Click to expand</summary>

    - [Parser Methods](#methods)
      - [.run](#run)
      - [.fork](#fork)
      - [.map](#map)
      - [.errorMap](#errorMap)
      - [.errorChain](#errorChain)
      - [.chain](#chain)
      - [.mapFromData](#mapFromData)
      - [.chainFromData](#chainFromData)
    - [Functions](#functions)
      - [setData](#setData)
      - [withData](#withData)
      - [mapData](#mapData)
      - [getData](#getData)
      - [coroutine](#coroutine)
      - [char](#char)
      - [anyChar](#anyChar)
      - [str](#str)
      - [digit](#digit)
      - [digits](#digits)
      - [letter](#letter)
      - [letters](#letters)
      - [whitespace](#whitespace)
      - [optionalWhitespace](#optionalWhitespace)
      - [peek](#peek)
      - [anyOfString](#anyOfString)
      - [regex](#regex)
      - [sequenceOf](#sequenceOf)
      - [namedSequenceOf](#namedSequenceOf)
      - [choice](#choice)
      - [lookAhead](#lookAhead)
      - [sepBy](#sepBy)
      - [sepBy1](#sepBy1)
      - [exactly](#exactly)
      - [many](#many)
      - [many1](#many1)
      - [between](#between)
      - [everythingUntil](#everythingUntil)
      - [everyCharUntil](#everyCharUntil)
      - [anythingExcept](#anythingExcept)
      - [anyCharExcept](#anyCharExcept)
      - [possibly](#possibly)
      - [startOfInput](#startOfInput)
      - [endOfInput](#endOfInput)
      - [skip](#skip)
      - [pipeParsers](#pipeParsers)
      - [composeParsers](#composeParsers)
      - [takeRight](#takeRight)
      - [takeLeft](#takeLeft)
      - [recursiveParser](#recursiveParser)
      - [tapParser](#tapParser)
      - [decide](#decide)
      - [mapTo](#mapTo)
      - [errorMapTo](#errorMapTo)
      - [fail](#fail)
      - [succeedWith](#succeedWith)
      - [either](#either)
      - [toPromise](#toPromise)
      - [toValue](#toValue)
      - [parse](#parse)
  </details>

  - [A note on recursive grammars](#a-note-on-recursive-grammars)
  - [Fantasy Land](#fantasy-land)
    - [Equivalent Operations](#equivalent-operations)
      - [of](#of)
      - [map](#map)
      - [chain](#chain)
      - [ap](#ap)
  - [Name](#name)

## Release Notes

[Since version 2.0.0, the release notes track changes to arcsecond.](./release-notes.md)

## Installation

```bash
npm i arcsecond
```

## Tutorials

The tutorials provide a practical introduction to many of the concepts in arcsecond, starting from the most basic foundations and working up to more complex topics.

- [1. Parsing weather data](tutorial/tutorial-part-1.md)
- [2. Extracting useful information](tutorial/tutorial-part-2.md)
- [3. Error handling](tutorial/tutorial-part-3.md)
- [4. Building utility parsers](tutorial/tutorial-part-4.md)
- [5. Recursive Structures](tutorial/tutorial-part-5.md)
- [6. Debugging](tutorial/tutorial-part-6.md)
- [7. Stateful parsing](tutorial/tutorial-part-7.md)

## Usage

You can use ES6 imports or CommonJS requires.

```JavaScript
const {char} = require('arcsecond');

const parsingResult = char('a').fork(
  // The string to parse
  'abc123',

  // The error handler (you can also return from this function!)
  (error, parsingState) => {
    const e = new Error(error);
    e.parsingState = parsingState;
    throw e;
  },

  // The success handler
  (result, parsingState) => {
    console.log(`Result: ${result}`);
    return result;
  }
);
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

The main "type" in arcsecond is `Parser e a s`:

- The `e` refers to a possible error which this parser may generate.
- The `a` refers to a possible value which this parser may capture.
- The `s` refers to a general user-defined state associated with the parser.

### Methods

#### .run

`.run :: Parser e a s ~> x -> Either e a`

`.run` is a method on every parser, which takes input (which may be a `string`, [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray), [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), or [`DataView`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView)), and returns the result of parsing the input using the parser.

**Example**
```JavaScript
str('hello').run('hello')
// -> {
//      isError: false,
//      result: "hello",
//      index: 5,
//      data: null
//    }
```

#### .fork

`.fork :: Parser e a s ~> x -> (e -> ParserState e a s -> f) -> (a -> ParserState e a s -> b)`

The `.fork` method is similar to `.run`. It takes input (which may be a `string`, [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray), [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), or [`DataView`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView)), an *error transforming function* and a *success transforming function*, and parses the input. If parsing was successful, the result is transformed using the *success transforming function* and returned. If parsing was not successful, the result is transformed using the *error transforming function* and returned.

**Example**
```JavaScript
str('hello').fork(
  'hello',
  (errorMsg, parsingState) => {
    console.log(errorMsg);
    console.log(parsingState);
    return "goodbye"
  },
  (result, parsingState) => {
    console.log(parsingState);
    return result;
  }
);
// [console.log] Object {isError: false, error: null, target: "hello", data: null, index: 5, …}
// -> "hello"

str('hello').fork(
  'farewell',
  (errorMsg, parsingState) => {
    console.log(errorMsg);
    console.log(parsingState);
    return "goodbye"
  },
  (result, parsingState) => {
    console.log(parsingState);
    return result;
  }
);
// [console.log] ParseError (position 0): Expecting string 'hello', got 'farew...'
// [console.log] Object {isError: true, error: "ParseError (position 0): Expecting string 'hello',…", target: "farewell", data: null, index: 0, …}
// "goodbye"
```

#### .map

`.map :: Parser e a s ~> (a -> b) -> Parser e b s`

`.map` takes a function and returns a parser does not consume input, but instead runs the provided function on the last matched value, and set that as the new last matched value. This method can be used to apply structure or transform the values as they are being parsed.

**Example**
```JavaScript
const newParser = letters.map(x => ({
  matchType: 'string',
  value: x
});

newParser.run('hello world')
// -> {
//      isError: false,
//      result: {
//        matchType: "string",
//        value: "hello"
//      },
//      index: 5,
//      data: null
//    }
```

#### .chain

`.chain :: Parser e a s ~> (a -> Parser e b s) -> Parser e b s`

`.chain` takes a function which recieves the last matched value and should return a parser. That parser is then used to parse the following input, forming a chain of parsers based on previous input. `.chain` is the fundamental way of creating *contextual parsers*.

**Example**
```JavaScript

const lettersThenSpace = sequenceOf([
  letters,
  char(' ')
]).map(x => x[0]);

const newParser = lettersThenSpace.chain(matchedValue => {
  switch (matchedValue) {
    case 'number': return digits;

    case 'string': return letters;

    case 'bracketed': return sequenceOf([
      char('('),
      letters,
      char(')')
    ]).map(values => values[1]);

    default: return fail('Unrecognised input type');
  }
});

newParser.run('string Hello')
// -> {
//      isError: false,
//      result: "Hello",
//      index: 12,
//      data: null
//    }

newParser.run('number 42')
// -> {
//      isError: false,
//      result: "42",
//      index: 9,
//      data: null
//    }

newParser.run('bracketed (arcsecond)')
// -> {
//      isError: false,
//      result: "arcsecond",
//      index: 21,
//      data: null
//    }

newParser.run('nope nothing')
// -> {
//      isError: true,
//      error: "Unrecognised input type",
//      index: 5,
//      data: null
//    }
```

#### .mapFromData

`.mapFromData :: Parser e a s ~> (StateData a s -> b) -> Parser e b s`

`.mapFromData` is almost the same as `.map`, except the function which it is passed also has access to the *internal state data*, and can thus transform values based on this data.

**Example**
```JavaScript

const parserWithData = withData(letters.mapFromData(({result, data}) => ({
  matchedValueWas: result,
  internalDataWas: data
})));

parserWithData(42).run('hello');
// -> {
//      isError: false,
//      result: {
//        matchedValueWas: "hello",
//        internalDataWas: 42
//      },
//      index: 5,
//      data: 42
//    }
```

#### .chainFromData

`.chainFromData :: Parser e a s ~> (StateData a s -> Parser f b t) -> Parser f b t`

`.chainFromData` is almost the same as `.chain`, except the function which it is passed also has access to the *internal state data*, and can choose how parsing continues based on this data.

**Example**
```JavaScript
const lettersThenSpace = sequenceOf([
  letters,
  char(' ')
]).map(x => x[0]);

const parser = withData(lettersThenSpace.chainFromData(({result, data}) => {
  if (data.bypassNormalApproach) {
    return digits;
  }

  return letters;
}));

parser({ bypassNormalApproach: false }).run('hello world');
// -> {
//      isError: false,
//      result: "world",
//      index: 11,
//      data: { bypassNormalApproach: false }
//    }

parser({ bypassNormalApproach: true }).run('hello world');
// -> {
//      isError: true,
//      error: "ParseError (position 6): Expecting digits",
//      index: 6,
//      data: { bypassNormalApproach: true }
//    }
```

#### .errorMap

`.errorMap :: Parser e a s ~> ((e, Integer, s) -> f) -> Parser f a s`

`.errorMap` is like [.map](#map) but it transforms the error value. The function passed to `.errorMap` gets an object the *current error message* (`error`) , the *index* (`index`) that parsing stopped at, and the *data* (`data`) from this parsing session.

**Example**
```JavaScript
const newParser = letters.errorMap(({error, index}) => `Old message was: [${error}] @ index ${index}`);

newParser.run('1234')
// -> {
//      isError: true,
//      error: "Old message was: [ParseError (position 0): Expecting letters] @ index 0",
//      index: 0,
//      data: null
//    }
```

#### .errorChain

`.errorChain :: Parser e a s ~> ((e, Integer, s) -> Parser f a s) -> Parser f a s`

`.errorChain` is almost the same as `.chain`, except that it only runs if there is an error in the parsing state. This is a useful method when either trying to recover from errors, or for when a more specific error message should be constructed.

**Example**
```JavaScript

const parser = digits.errorChain(({error, index, data}) => {
  console.log('Recovering...');
  return letters;
});

p.run('42');
// -> {
//      isError: false,
//      result: "42",
//      index: 2,
//      data: null
//    }

p.run('hello');
// [console.log] Recovering...
// -> {
//      isError: false,
//      result: "hello",
//      index: 5,
//      data: null
//    }

s = parser.run('');
// [console.log] Recovering...
// -> {
//     isError: true,
//     error: "ParseError (position 0): Expecting letters",
//     index: 0,
//     data: null
//   }
```

### Functions

#### setData

`setData :: t -> Parser e a t`

`setData` takes anything that should be set as the *internal state data*, and returns a parser that will perform that side effect when the parser is run. This does not consume any input. If parsing is currently in an errored state, then the data **will not** be set.

**Example**
```JavaScript
const parser = coroutine(function* () {
  const name = yield letters;

  if (name === 'Jim') {
    yield setData('The name is Jim');
  }

  return name;
});

parser.run('Jim');
// -> {
//      isError: false,
//      result: "Jim",
//      index: 3,
//      data: "The name is Jim"
//    }
```

If dealing with any complex level of state - such as an object where individual keys will be updated or required, then it can be useful to create utility parsers to assist with updating the *internal state data*.
One possible pattern that could be used is the reducer pattern, famed by redux:

**Example**
```JavaScript

const createStateReducer = reducer => action => getData.chain(state => setData(reducer(state, action)));

const updateCounterState = createStateReducer((state = 0, action) => {
  switch (action.type) {
    case 'INC': {
      return state + 1;
    }
    case 'DEC': {
      return state - 1;
    }
    case 'ADD': {
      return state + action.payload;
    }
    case 'RESET': {
      return 0;
    }
  }
});

const parser = coroutine(function* () {
  let count = yield updateCounterState({ type: 'RESET' });
  console.log(count);

  yield updateCounterState({ type: 'INC' });
  yield updateCounterState({ type: 'INC' });
  yield updateCounterState({ type: 'DEC' });
  count = yield updateCounterState({ type: 'INC' });
  console.log(count);

  return yield updateCounterState({ type: 'ADD', payload: 10 });
});

parser.run('Parser is not looking at the text!');
// [console.log] 0
// [console.log] 2
// -> {
//      isError: false,
//      result: 12,
//      index: 0,
//      data: 12
//    }
```


#### withData

`withData :: Parser e a x -> s -> Parser e a s`

`withData` takes a *provided parser*, and returns a function waiting for some *state data* to be set, and then returns a new parser. That parser, when run, ensures that the *state data* is set as the *internal state data* before the *provided parser* runs.

**Example**
```JavaScript
const parserWithoutData = letters;
const parser = withData(parserWithoutData);

parser("hello world!").run('Jim');
// -> {
//      isError: false,
//      result: "Jim",
//      index: 3,
//      data: "hello world!"
//    }

parserWithoutData.run('Jim');
// -> {
//      isError: false,
//      result: "Jim",
//      index: 3,
//      data: null
//    }
```

#### mapData

`mapData :: (s -> t) -> Parser e a t`

`mapData` takes a function that recieves and returns some *state data*, and transforms the *internal state data* using the function, without consuming any input.

**Example**
```JavaScript
const parser = withData(mapData(s => s.toUpperCase()));

parser("hello world!").run('Jim');
// -> {
//      isError: false,
//      result: null,
//      index: 0,
//      data: "HELLO WORLD!"
//    }
```

#### getData

`getData :: Parser e s s`

`getData` is a parser that will always return what is contained in the *internal state data*, without consuming any input.

**Example**
```JavaScript
const parser = withData(sequenceOf([
  letters,
  digits,
  getData
]));

parser("hello world!").run('Jim1234');
// -> {
//      isError: false,
//      result: ["Jim", "1234", "hello world!"],
//      index: 3,
//      data: "hello world!"
//    }
```

If dealing with any complex level of state - such as an object where individual keys will be updated or required, then it can be useful to create utility parsers to assist.

**Example**
```JavaScript

const selectState = selectorFn => getData.map(selectorFn);

const parser = withData(coroutine(function* () {
  // Here we can take or transform the state
  const occupation = yield selectState(({job}) => job);
  const initials = yield selectState(({firstName, lastName}) => `${firstName[0]}${lastName[0]}`);

  console.log(`${initials}: ${occupation}`);

  const first = yield letters;
  const second = yield digits;

  return `${second}${first}`;
}));

parser({
  firstName: "Francis",
  lastName: "Stokes",
  job: "Developer"
}).run('Jim1234');
// [console.log] FS: Developer
// -> {
//      isError: false,
//      result: "1234Jim",
//      index: 3,
//      data: {
//        firstName: "Francis",
//        lastName: "Stokes",
//        job: "Developer"
//      }
//    }
```

#### coroutine

`coroutine :: (() -> Iterator (Parser e a s)) -> Parser e a s`

`coroutine` takes a generator function, in which parsers are `yield`ed. `coroutine` allows you to write parsers in a more imperative and sequential way - in much the same way `async/await` allows you to write code with promises in a more sequential way.

Inside of the generator function, you can use all regular JavaScript language features, like loops, variable assignments, and conditional statements. This makes it easy to write very powerful parsers using `coroutine`, but on the other side it can lead to less readable, more complex code.

Debugging is also much easier, as breakpoints can be easily added, and values logged to the console after they have been parsed.

**Example**
```JavaScript
const parser = coroutine(function* () {
  // Capture some letters and assign them to a variable
  const name = yield letters;

  // Capture a space
  yield char(' ');

  const age = yield digits.map(Number);

  // Capture a space
  yield char(' ');

  if (age > 18) {
    yield str('is an adult');
  } else {
    yield str('is a child');
  }

  return { name, age };
});

parser.run('Jim 19 is an adult');
// -> {
//      isError: false,
//      result: { name: "Jim", age: 19 },
//      index: 18,
//      data: null
//    }

parser.run('Jim 17 is an adult');
// -> {
//      isError: true,
//      error: "ParseError (position 7): Expecting string 'is a child', got 'is an adul...'",
//      index: 7,
//      data: null
//    }
```

#### char

`char :: Char -> Parser e Char s`

`char` takes a character and returns a parser that matches that character **exactly one** time.

**Example**
```JavaScript
char ('h').run('hello')
// -> {
//      isError: false,
//      result: "h",
//      index: 1,
//      data: null
//    }
```

#### anyChar

`anyChar :: Parser e Char s`

`anyChar` matches **exactly one** utf-8 character.

**Example**
```JavaScript
anyChar.run('a')
// -> {
//      isError: false,
//      result: "a",
//      index: 1,
//      data: null
//    }

anyChar.run('😉')
// -> {
//      isError: false,
//      result: "😉",
//      index: 4,
//      data: null
//    }
```

#### str

`str :: String -> Parser e String s`

`str` takes a string and returns a parser that matches that string **exactly one** time.

**Example**
```JavaScript
str('hello').run('hello world')
// -> {
//      isError: false,
//      result: "hello",
//      index: 5,
//      data: null
//    }
```

#### digit

`digit :: Parser e String s`

`digit` is a parser that matches **exactly one** numerical digit `/[0-9]/`.

**Example**
```JavaScript
digit.run('99 bottles of beer on the wall')
// -> {
//      isError: false,
//      result: "9",
//      index: 1,
//      data: null
//    }
```

#### digits

`digits :: Parser e String s`

`digits` is a parser that matches **one or more** numerical digit `/[0-9]/`.

**Example**
```JavaScript
digits.run('99 bottles of beer on the wall')
// -> {
//      isError: false,
//      result: "99",
//      index: 2,
//      data: null
//    }
```

#### letter

`letter :: Parser e Char s`

`letter` is a parser that matches **exactly one** alphabetical letter `/[a-zA-Z]/`.

**Example**
```JavaScript
letter.run('hello world')
// -> {
//      isError: false,
//      result: "h",
//      index: 1,
//      data: null
//    }
```

#### letters

`letters :: Parser e Char s`

`letters` is a parser that matches **one or more** alphabetical letter `/[a-zA-Z]/`.

**Example**
```JavaScript
letters.run('hello world')
// -> {
//      isError: false,
//      result: "hello",
//      index: 5,
//      data: null
//    }
```

#### whitespace

`whitespace :: Parser e String s`

`whitespace` is a parser that matches **one or more** whitespace characters.

**Example**
```JavaScript
const newParser = sequenceOf ([
  str ('hello'),
  whitespace,
  str ('world')
]);

newParser.run('hello           world')
// -> {
//      isError: false,
//      result: [ "hello", "           ", "world" ],
//      index: 21,
//      data: null
//    }

newParser.run('helloworld')
// -> {
//      isError: true,
//      error: "ParseError 'many1' (position 5): Expecting to match at least one value",
//      index: 5,
//      data: null
//    }
```

#### optionalWhitespace

`optionalWhitespace :: Parser e String s`

`optionalWhitespace` is a parser that matches **zero or more** whitespace characters.

**Example**
```JavaScript
const newParser = sequenceOf ([
  str ('hello'),
  optionalWhitespace,
  str ('world')
]);

newParser.run('hello           world')
// -> {
//      isError: false,
//      result: [ "hello", "           ", "world" ],
//      index: 21,
//      data: null
//    }

newParser.run('helloworld')
// -> {
//      isError: false,
//      result: [ "hello", "", "world" ],
//      index: 10,
//      data: null
//    }
```

#### peek

`peek :: Parser e String s`

`peek` matches **exactly one** *numerical byte* without consuming any input.

**Example**
```JavaScript
peek.run('hello world')
// -> {
//      isError: false,
//      result: 104,
//      index: 0,
//      data: null
//    }

sequenceOf([
  str('hello'),
  peek
]).run('hello world')
// -> {
//      isError: false,
//      result: [ "hello", 32 ],
//      index: 5,
//      data: null
//    }
```

#### anyOfString

`anyOfString :: String -> Parser e Char s`

`anyOfString` takes a string and returns a parser that matches **exactly one** character from that string.

**Example**
```JavaScript
anyOfString('aeiou').run('unusual string')
// -> {
//      isError: false,
//      result: "u",
//      index: 1,
//      data: null
//    }
```

#### regex

`regex :: RegExp -> Parser e String s`

`regex` takes a RegExp and returns a parser that matches **as many characters** as the RegExp matches.

**Example**
```JavaScript
regex(/^[hH][aeiou].{2}o/).run('hello world')
// -> {
//      isError: false,
//      result: "hello",
//      index: 5,
//      data: null
//    }
```

#### sequenceOf

`sequenceOf :: [Parser * * *] -> Parser * [*] *`

Note: `sequenceOf` cannot have an accurate type signature in JavaScript

`sequenceOf` takes an array of parsers, and returns a new parser that matches each of them sequentially, collecting up the results into an array.

**Example**
```JavaScript
const newParser = sequenceOf ([
  str ('he'),
  letters,
  char (' '),
  str ('world'),
])

newParser.run('hello world')
// -> {
//      isError: false,
//      result: [ "he", "llo", " ", "world" ],
//      index: 11,
//      data: null
//    }
```

#### namedSequenceOf

`namedSequenceOf :: [(String, Parser * * *)] -> Parser e (StrMap *) s`

Note: `namedSequenceOf` cannot have an accurate type signature in JavaScript

`namedSequenceOf` takes an array of string/parser pairs, and returns a new parser that matches each of them sequentially, collecting up the results into an object where the key is the string in the pair.

A pair is just an array in the form: `[string, parser]`

**Example**
```JavaScript
const newParser = namedSequenceOf ([
  ['firstPart', str ('he')],
  ['secondPart', letters],
  ['thirdPart', char (' ')],
  ['forthPart', str ('world')],
])

newParser.run('hello world')
// -> {
//      isError: false,
//      result: {
//        firstPart: "he",
//        secondPart: "llo",
//        thirdPart: " ",
//        forthPart: "world"
//      },
//      index: 11,
//      data: null
//    }
```

#### choice

`choice :: [Parser * * *] -> Parser * * *`

Note: `choice` cannot have an accurate type signature in JavaScript

`choice` takes an array of parsers, and returns a new parser that tries to match each one of them sequentially, and returns the first match. If `choice` fails, then it returns the error message of the parser that matched the most from the string.

**Example**
```JavaScript
const newParser = choice ([
  digit,
  char ('!'),
  str ('hello'),
  str ('pineapple')
])

newParser.run('hello world')
// -> {
//      isError: false,
//      result: "hello",
//      index: 5,
//      data: null
//    }
```


#### lookAhead

`lookAhead :: Parser e a s -> Parser e a s`

`lookAhead` takes *look ahead* parser, and returns a new parser that matches using the *look ahead* parser, but without consuming input.

**Example**
```JavaScript
const newParser = sequenceOf ([
  str ('hello '),
  lookAhead (str ('world')),
  str ('wor')
]);

newParser.run('hello world')
// -> {
//      isError: false,
//      result: [ "hello ", "world", "wor" ],
//      index: 9,
//      data: null
//    }
```

#### sepBy

`sepBy :: Parser e a s -> Parser e b s -> Parser e [b] s`

`sepBy` takes two parsers - a *separator* parser and a *value* parser - and returns a new parser that matches **zero or more** values from the *value* parser that are separated by values of the *separator* parser. Because it will match zero or more values, this parser will *fail* if a *value* is followed by a *separator* but NOT another *value*.  If there's no *value*, the result will be an empty array, not failure.

**Example**
```JavaScript
const newParser = sepBy (char (',')) (letters)

newParser.run('some,comma,separated,words')
// -> {
//      isError: false,
//      result: [ "some", "comma", "separated", "words" ],
//      index: 26,
//      data: null
//    }

newParser.run('')
// -> {
//      isError: false,
//      result: [],
//      index: 0,
//      data: null
//    }

newParser.run('12345')
// -> {
//      isError: false,
//      result: [],
//      index: 0,
//      data: null
//    }
```

#### sepBy1

`sepBy1 :: Parser e a s -> Parser e b s -> Parser e [b] s`

`sepBy1` is the same as `sepBy`, except that it matches **one or more** occurence.

**Example**
```JavaScript
const newParser = sepBy1 (char (',')) (letters)

newParser.run('some,comma,separated,words')
// -> {
//      isError: false,
//      result: [ "some", "comma", "separated", "words" ],
//      index: 26,
//      data: null
//    }

newParser.run('1,2,3')
// -> {
//      isError: true,
//      error: "ParseError 'sepBy1' (position 0): Expecting to match at least one separated value",
//      index: 0,
//      data: null
//    }
```

#### exactly

`exactly :: (Integer) -> (Parser e s a) -> Parser e s [a]`

`exactly` takes a positive number and returns a function. That function takes a parser and returns a new parser which matches the given parser the specified number of times.

**Example**
```JavaScript
const newParser = exactly (4)(letter)

newParser.run('abcdef')
// -> {
//      isError: false,
//      result: [ "a", "b", "c", "d" ],
//      index: 4,
//      data: null
//    }

newParser.run('abc')
// -> {
//      isError: true,
//      error: 'ParseError (position 0): Expecting 4 letter, but got end of input.',
//      index: 0,
//      data: null
//    }

newParser.run('12345')
// -> {
//      isError: true,
//      error: 'ParseError (position 0): Expecting 4 letter, got '1'',
//      index: 0,
//      data: null
//    }
```

#### many

`many :: Parser e s a -> Parser e s [a]`

`many` takes a parser and returns a new parser which matches that parser **zero or more** times. Because it will match zero or more values, this parser will always match, resulting in an empty array in the zero case.

**Example**
```JavaScript
const newParser = many (str ('abc'))

newParser.run('abcabcabcabc')
// -> {
//      isError: false,
//      result: [ "abc", "abc", "abc", "abc" ],
//      index: 12,
//      data: null
//    }

newParser.run('')
// -> {
//      isError: false,
//      result: [],
//      index: 0,
//      data: null
//    }

newParser.run('12345')
// -> {
//      isError: false,
//      result: [],
//      index: 0,
//      data: null
//    }
```

#### many1

`many1 :: Parser e s a -> Parser e s [a]`

`many1` is the same as `many`, except that it matches **one or more** occurence.

**Example**
```JavaScript
const newParser = many1 (str ('abc'))

newParser.run('abcabcabcabc')
// -> {
//      isError: false,
//      result: [ "abc", "abc", "abc", "abc" ],
//      index: 12,
//      data: null
//    }

newParser.run('')
// -> {
//   isError: true,
//   error: "ParseError 'many1' (position 0): Expecting to match at least one value",
//   index: 0,
//   data: null
// }

newParser.run('12345')
// -> {
//   isError: true,
//   error: "ParseError 'many1' (position 0): Expecting to match at least one value",
//   index: 0,
//   data: null
// }
```

#### between

`between :: Parser e a s -> Parser e b s -> Parser e c s -> Parser e b s`

`between` takes 3 parsers, a *left* parser, a *right* parser, and a *value* parser, returning a new parser that matches a value matched by the *value* parser, between values matched by the *left* parser and the *right* parser.

This parser can easily be partially applied with `char ('(')` and `char (')')` to create a `betweenRoundBrackets` parser, for example.

**Example**
```JavaScript
const newParser = between (char ('<')) (char ('>')) (letters);

newParser.run('<hello>')
// -> {
//      isError: false,
//      result: "hello",
//      index: 7,
//      data: null
//    }

const betweenRoundBrackets = between (char ('(')) (char (')'));

betweenRoundBrackets (many (letters)).run('(hello world)')
// -> {
//      isError: true,
//      error: "ParseError (position 6): Expecting character ')', got ' '",
//      index: 6,
//      data: null
//    }
```

#### everythingUntil

`everythingUntil :: Parser e a s -> Parser e String s`

**Note**: Between 2.x and 3.x, the definition of the `everythingUntil` has changed. In 3.x, what was previously `everythingUntil` is now [`everyCharUntil`](#everyCharUntil).

`everythingUntil` takes a *termination* parser and returns a new parser which matches every possible *numerical byte* up until a value is matched by the *termination* parser. When a value is matched by the *termination* parser, it is not "consumed".

**Example**
```JavaScript
everythingUntil (char ('.')).run('This is a sentence.This is another sentence')
// -> {
//      isError: false,
//      result: [84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 115, 101, 110, 116, 101, 110, 99, 101],
//      index: 18,
//      data: null
//    }

// termination parser doesn't consume the termination value
const newParser = sequenceOf ([
  everythingUntil (char ('.')),
  str ('This is another sentence')
]);


newParser.run('This is a sentence.This is another sentence')
// -> {
//      isError: true,
//      error: "ParseError (position 18): Expecting string 'This is another sentence', got '.This is another sentenc...'",
//      index: 18,
//      data: null
//    }
```

#### everyCharUntil

`everyCharUntil :: Parser e a s -> Parser e String s`

`everyCharUntil` takes a *termination* parser and returns a new parser which matches every possible *character* up until a value is matched by the *termination* parser. When a value is matched by the *termination* parser, it is not "consumed".

**Example**
```JavaScript
everyCharUntil (char ('.')).run('This is a sentence.This is another sentence')
// -> {
//      isError: false,
//      result: 'This is a sentence',
//      index: 18,
//      data: null
//    }

// termination parser doesn't consume the termination value
const newParser = sequenceOf ([
  everyCharUntil (char ('.')),
  str ('This is another sentence')
]);


newParser.run('This is a sentence.This is another sentence')
// -> {
//      isError: true,
//      error: "ParseError (position 18): Expecting string 'This is another sentence', got '.This is another sentenc...'",
//      index: 18,
//      data: null
//    }
```

#### anythingExcept

`anythingExcept :: Parser e a s -> Parser e Char s`

**Note**: Between 2.x and 3.x, the definition of the `anythingExcept` has changed. In 3.x, what was previously `anythingExcept` is now [`anyCharExcept`](#anyCharExcept).

`anythingExcept` takes a *exception* parser and returns a new parser which matches **exactly one** *numerical byte*, if it is not matched by the *exception* parser.

**Example**
```JavaScript
anythingExcept (char ('.')).run('This is a sentence.')
// -> {
//   isError: false,
//   result: 84,
//   index: 1,
//   data: null
// }

const manyExceptDot = many (anythingExcept (char ('.')))
manyExceptDot.run('This is a sentence.')
// -> {
//      isError: false,
//      result: [84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 115, 101, 110, 116, 101, 110, 99, 101, 46],
//      index: 18,
//      data: null
//    }
```

#### anyCharExcept

`anyCharExcept :: Parser e a s -> Parser e Char s`

`anyCharExcept` takes a *exception* parser and returns a new parser which matches **exactly one** *character*, if it is not matched by the *exception* parser.

**Example**
```JavaScript
anyCharExcept (char ('.')).run('This is a sentence.')
// -> {
//   isError: false,
//   result: 'T',
//   index: 1,
//   data: null
// }

const manyExceptDot = many (anyCharExcept (char ('.')))
manyExceptDot.run('This is a sentence.')
// -> {
//      isError: false,
//      result: ['T', 'h', 'i', 's', ' ', 'i', 's', ' ', 'a', ' ', 's', 'e', 'n', 't', 'e', 'n', 'c', 'e'],
//      index: 18,
//      data: null
//    }
```

#### possibly

`possibly :: Parser e a s -> Parser e (a | Null) s`

`possibly` takes an *attempt* parser and returns a new parser which tries to match using the *attempt* parser. If it is unsuccessful, it returns a null value and does not "consume" any input.

**Example**
```JavaScript
const newParser = sequenceOf ([
  possibly (str ('Not Here')),
  str ('Yep I am here')
]);

newParser.run('Yep I am here')
// -> {
//      isError: false,
//      result: [ null, "Yep I am here" ],
//      index: 13,
//      data: null
//    }
```

#### startOfInput

`startOfInput :: Parser e String s`

`startOfInput` is a parser that only succeeds when the parser is at the beginning of the input.

**Example**
```JavaScript
const mustBeginWithHeading = sequenceOf([
    startOfInput,
    str("# ")
  ]);
const newParser = between(mustBeginWithHeading)(endOfInput)(everyCharUntil(endOfInput));

newParser.run('# Heading');
// -> {
//      isError: false,
//      result: "# Heading",
//      index: 9,
//      data: null
//    }

newParser.run(' # Heading');
// -> {
//      isError: true,
//      error: "ParseError (position 0): Expecting string '# ', got ' #...'",
//      index: 0,
//      data: null
//    }
```

#### endOfInput

`endOfInput :: Parser e Null s`

`endOfInput` is a parser that only succeeds when there is no more input to be parsed.

**Example**
```JavaScript
const newParser = sequenceOf ([
  str ('abc'),
  endOfInput
]);

newParser.run('abc')
// -> {
//      isError: false,
//      result: [ "abc", null ],
//      index: 3,
//      data: null
//    }

newParser.run('')
// -> {
//      isError: true,
//      error: "ParseError (position 0): Expecting string 'abc', but got end of input.",
//      index: 0,
//      data: null
//    }
```

#### skip

`skip :: Parser e a s -> Parser e a s`

`skip` takes a *skip* parser and returns a new parser which matches using the *skip* parser, but doesn't return its value, but instead the value of whatever came before it.

**Example**
```JavaScript
const newParser = pipeParsers ([
  str ('abc'),
  str('123'),
  skip (str ('def'))
])

newParser.run('abc123def')
// -> {
//      isError: false,
//      result: "123",
//      index: 9,
//      data: null
//    }
```

#### pipeParsers

`pipeParsers :: [Parser * * *] -> Parser * * *`

`pipeParsers` takes an array of parsers and composes them left to right, so each parsers return value is passed into the next one in the chain. The result is a new parser that, when run, yields the result of the final parser in the chain.

**Example**
```JavaScript
const newParser = pipeParsers ([
  str ('hello'),
  char (' '),
  str ('world')
]);

newParser.run('hello world')
// -> {
//      isError: false,
//      result: "world",
//      index: 11,
//      data: null
//    }
```

#### composeParsers

`pipeParsers :: [Parser * * *] -> Parser * * *`

`composeParsers` takes an array of parsers and composes them right to left, so each parsers return value is passed into the next one in the chain. The result is a new parser that, when run, yields the result of the final parser in the chain.

**Example**
```JavaScript
const newParser = composeParsers ([
  str ('world'),
  char (' '),
  str ('hello')
]);

newParser.run('hello world')
// -> {
//      isError: false,
//      result: "world",
//      index: 11,
//      data: null
//    }
```

#### takeRight

`takeRight :: Parser e a s -> Parser f b t -> Parser f b t`

`takeRight` takes two parsers, *left* and *right*, and returns a new parser that first matches the *left*, then the *right*, and keeps the value matched by the *right*.

**Example**
```JavaScript
const newParser = takeRight (str ('hello ')) (str ('world'))

newParser.run('hello world')
// -> {
//      isError: false,
//      result: "world",
//      index: 11,
//      data: null
//    }
```

#### takeLeft

`takeLeft :: Parser e a s -> Parser f b t -> Parser e a s`

`takeLeft` takes two parsers, *left* and *right*, and returns a new parser that first matches the *left*, then the *right*, and keeps the value matched by the *left*.

**Example**
```JavaScript
const newParser = takeLeft (str ('hello ')) (str ('world'))

newParser.run('hello world')
// -> {
//      isError: false,
//      result: "hello",
//      index: 11,
//      data: null
//    }
```

#### recursiveParser

`recursiveParser :: (() => Parser e a s) -> Parser e a s`

`recursiveParser` takes a function that returns a parser (a thunk), and returns that same parser. This is needed in order to create *recursive parsers* because JavaScript is not a "lazy" language.

In the following example both the `value` parser and the `matchArray` parser are defined in terms of each other, so one must be one **must** be defined using `recursiveParser`.

**Example**
```JavaScript
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

spaceSeparated(value).run('abc 123 [42,somethingelse] 45')
// -> {
//      isError: false,
//      result: [ "abc", "123", [ "42", "somethingelse" ], "45" ],
//      index: 29,
//      data: null
//    }
```

#### tapParser

`tapParser :: (a => ()) -> Parser e a s`

`tapParser` takes a function and returns a parser that does nothing and consumes no input, but runs the provided function on the last parsed value. This is intended as a debugging tool to see the state of parsing at any point in a sequential operation like `sequenceOf` or `pipeParsers`.

**Example**
```JavaScript
const newParser = sequenceOf ([
  letters,
  tapParser(console.log),
  char (' '),
  letters
]);

newParser.run('hello world')
// -> [console.log]: Object {isError: false, error: null, target: "hello world", data: null, index: 5, …}
// -> {
//      isError: false,
//      result: [ "hello", "hello", " ", "world" ],
//      index: 11,
//      data: null
//    }
```

#### decide

`decide :: (a -> Parser e b s) -> Parser e b s`

`decide` takes a function that recieves the last matched value and returns a new parser. It's important that the function **always** returns a parser. If a valid one cannot be selected, you can always use [fail](#fail).

`decide` allows an author to create a [context-sensitive grammar](https://en.wikipedia.org/wiki/Context-sensitive_grammar).

**Example**
```JavaScript
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

newParser.run('asDigits 1234')
// -> {
//      isError: false,
//      result: [ "asDigits", "1234" ],
//      index: 13,
//      data: null
//    }

newParser.run('asLetters hello')
// -> {
//      isError: false,
//      result: [ "asLetters", "hello" ],
//      index: 15,
//      data: null
//    }

newParser.run('asPineapple wayoh')
// -> {
//      isError: true,
//      error: "Unrecognised signifier 'asPineapple'",
//      index: 12,
//      data: null
//    }
```

#### mapTo

`mapTo :: (a -> b) -> Parser e b s`

`mapTo` takes a function and returns a parser does not consume input, but instead runs the provided function on the last matched value, and set that as the new last matched value. This function can be used to apply structure or transform the values as they are being parsed.

**Example**
```JavaScript
const newParser = pipeParsers([
  letters,
  mapTo(x => {
    return {
      matchType: 'string',
      value: x
    }
  })
]);

newParser.run('hello world')
// -> {
//      isError: false,
//      result: {
//        matchType: "string",
//        value: "hello"
//      },
//      index: 5,
//      data: null
//    }
```

#### errorMapTo

`errorMapTo :: (ParserState e a s -> f) -> Parser f a s`

`errorMapTo` is like [mapTo](#mapto) but it transforms the error value. The function passed to `errorMapTo` gets the *current error message* as its first argument and the *index* that parsing stopped at as the second.

**Example**
```JavaScript
const newParser = pipeParsers([
  letters,
  errorMapTo((message, index) => `Old message was: [${message}] @ index ${index}`)
]);

newParser.run('1234')
// -> {
//      isError: true,
//      error: "Old message was: [ParseError (position 0): Expecting letters] @ index 0",
//      index: 0,
//      data: null
//    }
```

#### fail

`fail :: e -> Parser e a s`

`fail` takes an *error message* string and returns a parser that always fails with the provided *error message*.

**Example**
```JavaScript
fail('Nope').run('hello world')
// -> {
//      isError: true,
//      error: "Nope",
//      index: 0,
//      data: null
//    }
```

#### succeedWith

`succeedWith :: a -> Parser e a s`

`succeedWith` takes an value and returns a parser that always matches that value and does not consume any input.

**Example**
```JavaScript
succeedWith ('anything').run('hello world')
// -> {
//      isError: false,
//      result: "anything",
//      data: null
//      index: 0,
//    }
```

#### either

`either :: Parser e a s -> Parser e (Either e a) s`

`either` takes a parser and returns a parser that will always succeed, but the captured value will be an Either, indicating success or failure.

**Example**
```JavaScript
either(fail('nope!')).run('hello world')
// -> {
//      isError: false,
//      result: {
//        isError: true,
//        value: "nope!"
//      },
//      index: 0,
//      data: null
//    }
```

#### toPromise

`toPromise :: ParserResult e a s -> Promise (e, Integer, s) a`

`toPromise` converts a `ParserResult` (what is returned from `.run`) into a `Promise`.

**Example**
```JavaScript
const parser = str('hello');

toPromise(parser.run('hello world'))
  .then(console.log)
  .catch(({error, index, data}) => {
    console.log(error);
    console.log(index);
    console.log(data);
  });
// -> [console.log] hello

toPromise(parser.run('goodbye world'))
  .then(console.log)
  .catch(({error, index, data}) => {
    console.log('Error!');
    console.log(error);
    console.log(index);
    console.log(data);
  });
// -> [console.log] Error!
// -> [console.log] ParseError (position 0): Expecting string 'hello', got 'goodb...'
// -> [console.log] 0
// -> [console.log] null
```

#### toValue

`toValue :: ParserResult e a s -> a`

`toValue` converts a `ParserResult` (what is returned from `.run`) into a regular value, and throws an error if the result contained one.

**Example**
```JavaScript
const result = str ('hello').run('hello worbackgroiund<hAld');

try {
  const value = toValue(result);
  console.log(value);
  // -> 'hello'
} catch (parseError) {
  console.error(parseError.message)
}
```

#### parse

`parse :: Parser e a s -> String -> s -> Either e a`

`parse` takes a parser and input (which may be a `string`, [`TypedArray`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypedArray), [`ArrayBuffer`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer), or [`DataView`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView)), and returns the result of parsing the input using the parser.

**Example**
```JavaScript
parse (str ('hello')) ('hello')
// -> {
//      isError: false,
//      result: "hello",
//      index: 5,
//      data: null
//    }
```

## A note on recursive grammars

If you're parsing a programming language, a configuration, or anything of sufficient complexity, it's likely that you'll need to define some parsers in terms of each other. You might want to do something like:

```JavaScript
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

In this example, we are trying to define `value` in terms of `matchArray`, and `matchArray` in terms of `value`. This is problematic in a language like JavaScript because it is what's known as an ["eager language"](https://en.wikipedia.org/wiki/Eager_evaluation). Because the definition of `value` is a function call to `choice`, the arguments of `choice` must be fully evaluated, and of course none of them are yet. If we just move the definition below `matchNum`, `matchStr`, and `matchArray`, we'll have the same problem with `value` not being defined before `matchArray` wants to use it.

We can get around JavaScript's eagerness by using [recursiveParser](#recursiveparser), which takes a function that returns a parser:

```JavaScript
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

```JavaScript
Parser.of(42)

// is equivalent to

succeedWith (42)
```

#### map

```JavaScript
letters.map (fn)

// is equivalent to

pipeParsers ([ letters, mapTo (fn) ])
```

#### chain

```JavaScript
letters.chain (x => someOtherParser)

// is equivalent to

pipeParsers ([ letters, decide (x => someOtherParser) ])
```

#### ap

```JavaScript
letters.ap (Parser.of (fn))

// is equivalent to

pipeParsers ([
  sequenceOf ([ succeedWith (fn), letters ]),
  mapTo (([fn, x]) => fn(x))
]);
```

## Name

The name is also derived from parsec, which in astronomical terms is an ["astronomical unit [that] subtends an angle of one arcsecond"](https://en.wikipedia.org/wiki/Parsec).
