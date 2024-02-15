const b = require('benny');

const {
  char,
  sequenceOf,
  str,
  choice,
  possibly,
  sepBy,
  many,
  anythingExcept,
  digits,
  optionalWhitespace,
  between,
  anyOfString,
  recursiveParser,
  encoder,
} = require('.');

const parseJsonValue = recursiveParser(() => choice ([
  parseNumber,
  parseBool,
  parseNull,
  parseString,
  parseArray,
  parseObject,
]));

const escapedQuote = sequenceOf ([ str ('\\'), anyOfString (`"'`) ]).map(x => x.join(''));

const whitespaceSurrounded = parser => between (optionalWhitespace) (optionalWhitespace) (parser);
const commaSeparated = sepBy (whitespaceSurrounded (char (',')));
const orEmptyString = parser => possibly(parser).map(x => x ? x : '');
const join = seperator => array => array.join(seperator);

const parseBool = choice([ str ('true'), str ('false') ]).map(s => s === 'true')

const plusOrMinus = anyOfString ('+-');

const parseFloat = sequenceOf([
  orEmptyString(plusOrMinus),
  digits,
  char ('.'),
  digits
]).map(join(''));

const parseInt = sequenceOf([ orEmptyString(plusOrMinus), digits ]).map(join(''))

const parseScientificForm = sequenceOf([
  choice ([ parseFloat, parseInt ]),
  anyOfString ('eE'),
  choice ([ parseFloat, parseInt ]),
]).map(join(''));

const parseNumber = choice([
  parseScientificForm,
  parseFloat,
  parseInt,
]).map(s => Number(s));

const parseNull = str ('null').map(() => null);

const keyValueSeparator = whitespaceSurrounded (char (':'));

const parseArray = between (whitespaceSurrounded (char ('[')))
                            (whitespaceSurrounded (char (']')))
                            (commaSeparated (parseJsonValue));

const parseString = sequenceOf ([
  char ('"'),
  many (choice ([ escapedQuote, anythingExcept (char ('"')) ])).map(join('')),
  char ('"')
]).map(x => x.join(''));

const parseKeyValue = whitespaceSurrounded (sequenceOf ([
  parseString,
  keyValueSeparator,
  parseJsonValue,
])).map(([key, _, value]) => [ key, value ]);

const parseObject = between (whitespaceSurrounded (char ('{')))
                            (whitespaceSurrounded (char ('}')))
                            (commaSeparated (parseKeyValue));

const smallJson = JSON.stringify({
  a: 1,
  b: [1, 2, 3],
  c: 'hello'
});

const mediumJson = JSON.stringify({
  a: 1,
  b: [1, 2, 3],
  c: 'hello',
  d: JSON.parse(smallJson),
  dString: smallJson,
});

const largeJson = JSON.stringify(Array.from({ length: 16 }).reduce((largeJson, _, i) => {
  return {
    ...largeJson,
    [`smallJson${i}`]: JSON.parse(smallJson),
    [`smallJsonString${i}`]: smallJson,
    [`mediumJson${i}`]: JSON.parse(mediumJson),
    [`mediumJsonString${i}`]: mediumJson,
  };
}, JSON.parse(smallJson)));

for (const [ name, json ] of Object.entries({ smallJson, mediumJson, largeJson })) {
  b.suite(
    'JSON.parse vs parseJsonValue on ' + name,

    b.add('JSON.parse', () => {
      JSON.parse(json);
    }),

    b.add('parseJsonValue on string', () => {
      parseJsonValue.run(json);
    }),

    b.add('parseJsonValue on DataView', () => {
      const bytes = encoder.encode(json);
      const dataView = new DataView(bytes.buffer);

      return () => {
        parseJsonValue.run(dataView);
      };
    }),

    b.cycle(),
    b.complete(),
  )
}
