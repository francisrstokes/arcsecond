# Tutorial Part 6: Debugging

[Back to part 5](./tutorial-part-5.md)

_Goal_: To understand how to track down bugs and errors in parsers

No one writes code perfectly first time, and when trying to communicate with the computer about how you'd like it to process some text, you might find it's not very forgiving if you don't give it exactly what it's expecting. The best thing you can do is to learn some techniques for tracking down your miscommunications with the computer.

## Tapping

Let's examine a fairly simple parser

```javascript
const { sequenceOf, char, digits, letters, choice } = require('arcsecond');

const space = char(' ');

const lettersOrDigits = choice([letters, digits]);

const fullParser = sequenceOf([
  letters,
  space,
  lettersOrDigits,
  space,
  letters,
]);

fullParser.run('hello _ world').error;
// -> ParseError (position 6): Expecting letters
```

It's easy to see why this parser would cause an error, but choice doesn't always give the best error messages because it lacks context. An error like the one above might be hard to track down, so let's see how we can use taps to investigate:

```javascript
const {
  sequenceOf,
  char,
  digits,
  letters,
  choice,
  tapParser,
} = require('arcsecond');

const space = char(' ');

const lettersOrDigits = choice([letters, digits]);

const fullParser = sequenceOf([
  letters,
  tapParser(console.log),
  space,
  tapParser(console.log),
  lettersOrDigits,
  tapParser(console.log),
  space,
  tapParser(console.log),
  letters,
  tapParser(console.log),
]);

fullParser.run('hello _ world').error;
// -> [console.log] Object {isError: false, error: null, target: "hello _ world", data: null, index: 5, …}
// -> [console.log] Object {isError: false, error: null, target: "hello _ world", data: null, index: 6, …}
// -> ParseError (position 6): Expecting letters
```

`tapParser` lets us glimpse into the parser state without modifying it. In this case we see two console logs before the error, which tells us it's in the 3rd parser.

Another method we might use is to `.errorMap` the parsers. `.errorMap` is just like `.map`, but it allows us to modify the error branch. We can fashion our own `tap` function and use it with `.errorMap` to zoom in on the problem.

```javascript
const {
  sequenceOf,
  char,
  digits,
  letters,
  choice,
  tapParser,
} = require('arcsecond');

const tap = fn => x => {
  fn(x);
  return x;
};

const space = char(' ');

const lettersOrDigits = choice([letters, digits]);

const fullParser = sequenceOf([
  letters.errorMap(tap(x => console.log(1))),
  space.errorMap(tap(x => console.log(2))),
  lettersOrDigits.errorMap(tap(x => console.log(3))),
  space.errorMap(tap(x => console.log(4))),
  letters.errorMap(tap(x => console.log(5))),
]);

fullParser.run('hello _ world').error;
// -> [console.log] 3
// -> fullParser.run('hello _ world').error;
```

Again, we've zoomed in on the error. If you're a power user of JavaScript, or you come from another programming language, you might want to reach for the debugger. This is tricky with the kind of parsers we've seen above - you can use `tapParser` or `tap` with a breakpoint inside, but it's a bit cumbersome. This is another area that `coroutine` shines in!

```javascript
const {
  sequenceOf,
  char,
  digits,
  letters,
  choice,
  tapParser,
} = require('arcsecond');

const tap = fn => x => {
  fn(x);
  return x;
};

const space = char(' ');

const lettersOrDigits = choice([letters, digits]);

const fullParser = coroutine(run => {
  const first = run(letters);
  run(space);
  const second = run(lettersOrDigits);
  run(space);
  const third = run(letters);

  return [first, second, third];
});

fullParser.run('hello _ world').error;
// -> ParseError (position 6): Expecting letters
```

## Summary

When looking for bugs you can utilise `tapParser` to peer into the parsing state. With a simple `tap` function, you can do the same thing with `.map` and `.errorMap`. Writing parsers with `coroutine` will allow you to make full use of the JavaScript debugger, and so is a very powerful option.

## Next: Stateful parsing

[In next section we will see how to keep track of extra state while parsing.](./tutorial-part-7.md)
