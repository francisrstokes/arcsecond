# Tutorial Part 5: Recursive Structures

[Back to part 4](./tutorial-part-4.md)

*Goal*: To understand how to write recursive parsers, and how to avoid the common pitfall

Recursive data is everywhere, and if you're writing parsers you will come across it before too long! Let's take a look at an example where we are parsing a string that represents some kind of list:

`[1, 2, [3, [4, 5]], 6]`

The data is actually a kind of tree, where a *list element* can be either a *number*, or a *list*. But a *list* must be made up of *list element*s, so both are actually defined in terms of each other. This is a kind of self referential recursion.

With the knowledge from the previous tutorials you might jump straight in and write the following:

```javascript
const {
  choice,
  digits,
  sepBy,
  between,
  char,
  optionalWhitespace,
} = require('arcsecond');

const surroundedBy = parser => between (parser) (parser);
const betweenSquareBrackets = between (char('[')) (char(']'));
const commaSeparated = sepBy (surroundedBy (optionalWhitespace) (char (',')));

const number = digits.map(value => ({
  type: 'number',
  value: value
}));

const listElement = choice([
  list,
  number
]);

const list = betweenSquareBrackets (commaSeparated (listElement)).map(values => ({
  type: 'list',
  value: values
}));

const result = list.run('[1, 2, [3, [4, 5]], 6]');
```

But this will throw the following error as soon as the code is evaluated:

`ReferenceError: list is not defined`

The `list` the error is referring too is the one in the `choice` of `listElement`. If we try to solve this problem by moving `listElement` below `list`, we'll see the same error again but from the other perspective. So how can we solve it? arcsecond includes a special parser combinator for exactly this problem, aptly named `recursiveParser`:

```javascript
const {
  choice,
  digits,
  sepBy,
  between,
  char,
  optionalWhitespace,
  recursiveParser
} = require('arcsecond');

const surroundedBy = parser => between (parser) (parser);
const betweenSquareBrackets = between (char('[')) (char(']'));
const commaSeparated = sepBy (surroundedBy (optionalWhitespace) (char (',')));

const number = digits.map(value => ({
  type: 'number',
  value: value
}));

// Wrapping the parser up into a recursiveParser, which takes a function that returns a parser
const listElement = recursiveParser(() => choice([
  list,
  number
]));

const list = betweenSquareBrackets (commaSeparated (listElement)).map(values => ({
  type: 'list',
  value: values
}));

const result = list.run('[1, 2, [3, [4, 5]], 6]');
// -> {
//      isError: false,
//      result: {
//        type: "list",
//        value: [
//          { type: "number", value: "1" },
//          { type: "number", value: "2" },
//          {
//            type: "list",
//            value: [
//              { type: "number", value: "3" },
//              {
//                type: "list",
//                value: [
//                  { type: "number", value: "4" },
//                  { type: "number", value: "5" }
//                ]
//              }
//            ]
//          },
//          { type: "number", value: "6" }
//        ]
//      },
//      index: 22,
//      data: null
//    }
```

The reason this works is because we can delay the execution of JavaScript searching for the `list` variable until later, when we know for sure it will be there. As a general rule, if you have two or more parsers that refer to each other, at least one of them will have to be created with `recursiveParser`. And if you want to be able to move the code around and rearrange the parsers in the file, then you can avoid headaches by creating them all with `recursiveParser`.

## Summary

Because of JavaScript's need for variables to be declared before they are referenced, parsers that refer to each other in a recursive way will need to be created with the `recursiveParser` combinator.

## Next: Debugging


[In the next section we will explore different methods for debugging and troubleshooting.](./tutorial-part-6.md)