import {
  JBoolean,
  JNumber,
  JNull,
  JArray,
  JString,
  JObject,
  JKeyValuePair,
} from './json.type';

import {
  char,
  mapTo,
  pipeParsers,
  parse,
  sequenceOf,
  str,
  choice,
  possibly,
  sepBy,
  many,
  anythingExcept,
  digits,
  whitespace,
  between,
  anyOfString,
} from '../../index';

import {readFile} from 'fs';
import {promisify} from 'util';
const readFileAsync = promisify(readFile);

const K = x => _ => x;

const escapedQuote = pipeParsers ([
  sequenceOf ([ str ('\\'), anyOfString (`"'`) ]),
  mapTo (x => x.join(''))
]);

const whitespaceSurrounded = parser => between (whitespace) (whitespace) (parser);

const parseBool = pipeParsers ([
  choice([ str ('true'), str ('false') ]),
  mapTo(JBoolean)
]);

const plusOrMinus = anyOfString ('+-');

const parseFloat = pipeParsers([
  sequenceOf([
    possibly (plusOrMinus),
    digits,
    char ('.'),
    digits
  ]),
  mapTo(([sign, lhs, _, rhs]) => `${sign ? sign : ''}${lhs}.${rhs}`)
]);

const parseInt = pipeParsers([
  sequenceOf([ possibly (plusOrMinus), digits ]),
  mapTo(([sign, x]) => `${sign ? sign : ''}${x}`)
]);

const parseScientificForm = pipeParsers([
  sequenceOf([
    choice ([ parseFloat, parseInt ]),
    anyOfString ('eE'),
    choice ([ parseFloat, parseInt ]),
  ]),
  mapTo (([lhs, _, rhs]) => `${lhs}e${rhs}`)
]);

const parseNumber = pipeParsers ([
  choice([
    parseScientificForm,
    parseFloat,
    parseInt,
  ]),
  mapTo (JNumber)
]);

const parseNull = pipeParsers ([ str ('null'), mapTo (K (JNull)) ]);

const arraySeparator = whitespaceSurrounded (char (','));

const keyValueSeparator = whitespaceSurrounded (char (':'));

const parseJsonValue = () => choice ([
  parseNumber,
  parseBool,
  parseNull,
  parseString,
  parseArray,
  parseObject,
]) ();

const parseArray = pipeParsers ([
  between (whitespaceSurrounded (char ('[')))
          (whitespaceSurrounded (char (']')))
          (sepBy (parseJsonValue) (arraySeparator)),
  mapTo (JArray)
]);

const parseString = pipeParsers ([
  sequenceOf ([
    char ('"'),
    pipeParsers ([
      many (choice ([
        escapedQuote,
        anythingExcept (char ('"')),
      ])),
      mapTo (x => x.join(''))
    ]),
    char ('"')
  ]),
  mapTo (x => JString(x.join('')))
])

const parseKeyValue = pipeParsers ([
  whitespaceSurrounded (sequenceOf ([
    parseString,
    keyValueSeparator,
    parseJsonValue,
  ])),
  mapTo (([key, _, value]) => JKeyValuePair(key, value)),
]);

const parseObject = pipeParsers ([
  between (whitespaceSurrounded (char ('{')))
          (whitespaceSurrounded (char ('}')))
          (sepBy (parseKeyValue) (arraySeparator)),
  mapTo (JObject),
])

readFileAsync('../../package-lock.json', 'utf8')
  .then(parse (parseJsonValue))
  .then(x => console.log(x.value.toString()))
  .catch(console.log);
