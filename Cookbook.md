## [Recipes](#recipes)

- [`cookies`](#parse-document.cookie) - Parse `document.cookie`.
- [operator associativity and precedence](#parse-expressions-while-respecting-operator-associativity-and-precedence) - Parse expressions while respecting operator associativity and precedence.

#### Parse `document.cookie`

A lenient parser for `document.cookie`. It uses [`fromPairs`](https://ramdajs.com/docs/#fromPairs) from [Ramda](https://ramdajs.com).

```javascript
import { char, everythingUntil, regex, sepBy, sequenceOf, str, takeRight } from 'arcsecond';
import { fromPairs } from 'ramda';

const validCharacters = /^[^;,\s]*/;
const percentEncoded = /(%[0-9A-Za-z]{2})+/g;
const percentDecode = value => value.replace(percentEncoded, decodeURIComponent);
const equalsSign = char('=');
const cookie = sequenceOf([
    everythingUntil(equalsSign).map(percentDecode),
    takeRight(equalsSign)(regex(validCharacters)).map(percentDecode)
]);
const cookies = sepBy(str('; '))(cookie).map(fromPairs);

cookies.run('a=123; b=456; c=%20').result //=> { "a": "123", "b": "456", "c": " " }
```

#### Parse expressions while respecting operator associativity and precedence

Ambiguity in the construction of [context-free grammars](https://en.wikipedia.org/wiki/Context-free_grammar) can pose significant obstacles to the use of recursive-descent parser combinators. In particular, ambiguity in grammars used to describe the [precedence](https://en.wikipedia.org/wiki/Order_of_operations) and [associativity](https://en.wikipedia.org/wiki/Operator_associativity) of expressions can lead to one of the more notorious issues in top-down parsing, namely infinite [left recursion](https://en.wikipedia.org/wiki/Left_recursion).

To avoid infinite left recursion, the methodology described below for handling operator precedence and associativity uses the concept of sets of equal precedence terms, with a fall through to the next highest precedence term. In addition, certain grammar rules are written to avoid left-recursion entirely. For a more detailed discussion of this methodology, see [this](https://blog.jcoglan.com/2017/07/07/precedence-and-associativity-in-recursive-descent/) blog post.

```javascript
import { between, char, choice, digits, optionalWhitespace, many, many1, recursiveParser, sequenceOf } from "arcsecond";

const whitespaceSurrounded = parser =>
  between(optionalWhitespace)(optionalWhitespace)(parser);

const betweenParentheses = parser =>
  between(whitespaceSurrounded(char('(')))(whitespaceSurrounded(char(')')))(parser);

const plus = char('+');
const minus = char('-');
const times = char('*');
const divide = char('/');

// Utilize repetition instead of recursion to define binary expressions
const binaryExpression = operator => parser =>
  sequenceOf([
    whitespaceSurrounded(parser),
    many1(sequenceOf([whitespaceSurrounded(operator), whitespaceSurrounded(parser)]))
  ]).map(([initialTerm, expressions]) =>
    // Flatten the expressions
    [initialTerm, ...expressions].reduce((acc, curr) =>
      // Reduce the array into a left-recursive tree
      Array.isArray(curr) ? [curr[0], acc, curr[1]] : curr
    )
  );

// Each precedence group consists of a set of equal precedence terms,
// followed by a fall-through to the next level of precedence
const expression = recursiveParser(() =>
    choice([additionOrSubtraction, term])
);
const term = recursiveParser(() =>
    choice([multiplicationOrDivision, factor])
);
const factor = recursiveParser(() =>
    choice([digits, betweenParentheses(expression)])
);

// Group operations of the same precedence together
const additionOrSubtraction = binaryExpression(choice([plus, minus]))(term);
const multiplicationOrDivision = binaryExpression(choice([times, divide]))(factor);

// Multiplication and division have precedence over addition and subtraction
many(expression).run('9 + 5 - 4 * 4 / 3').result;
//=> [ [ '-', [ '+', '9', '5' ], [ '/', [ '*', '4', '4' ], '3' ] ] ]

// Expressions in parentheses have precedence over all other expressions
many(expression).run('9 + (5 - 4) * (4 / 3)').result;
//=> [ [ '+', '9', [ '*', [ '-', '5', '4' ], [ '/', '4', '3' ] ] ] ]
```
