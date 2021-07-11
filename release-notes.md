# Release notes

## 4.0.0

- Rewrite the library in TypeScript (still compiled to JS)
- Includes an official `index.d.ts` file

## 3.0.0

- Rewrite the internals of the library to use ArrayBuffer and DataView
  - Input can be given as a string, ArrayBuffer, TypedArray, or DataView.
  - Strings are automatically converted to an ArrayBuffer using a TextEncoder
- Modify the `everythingUntil` parser to return an array of byte values
  - Add a new parser `everyCharUntil` which acts the same as previous versions of `everythingUntil`
- Modify the `anythingExcept` parser to return a byte
  - Add a new parser `anyCharExcept` which acts the same as previous versions of `anythingExcept`
- Add a new parser `anyChar`, which matches any utf8 encoded character
- Add a new parser `peek`, which matches the next byte (in numerical form), without consuming any input
- Changed argument format of `.errorMap()` to match `.errorChain()`

## 2.0.0

- Adds in depth tutorials about practical use of arcsecond
- Adds an internal state to the Parser monad, allowing arbitrary data to be stored and retrieved alongside the parser state. Relevant new parsers and methods include:
  - `setData`
  - `getData`
  - `mapData`
  - `.mapFromData`
  - `.chainFromData`
  - `.errorChain` (the 3rd argument to `.errorChain` is the stored data)
- Refactors the internal parser state representation. There is no longer a separate Either instance - arcsecond keeps track of it's own internal error/success state.
- Renames the `whitespace` parser to `optionalWhitespace`, and adds a new parser for non-optional whitespace called `whitespace` (this is the primary breaking change of 2.0.0)
- Adds a built in do-notation parser (`coroutine`), which generally accepts a generator function which yields parsers. This parser combinator makes reading and writing state, and choosing how to parse and process data based on previous parsing very easy
- Adds an `either` parser, which can be used to make parsing errors return a "successful" parsing, but with an object that describes if it was actually successful or not, along with the result or error. This can make recovering from expected errors much easier.
- Likewise, `.errorChain` adds a chain method that only runs when there is an error. From this method you can return a regular parser, letting you redirect the parsing flow back to success and recover from errors, or return a `fail` to persist or augment the error
- Adds a `.fork` method, which accepts success and error handlers, both of which are given access to both the results/errors, as well as the internal parser state.
- Fixes some general underlying bugs