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
  recursiveParser
} from '../../index';

import path from 'path';
import {readFile} from 'fs';
import {promisify} from 'util';
const readFileAsync = promisify(readFile);

// Recursive definition for a JSON value
// This is needed because parseArray & parseObject also internally refer to parseJsonValue
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

const parseBool = choice([ str ('true'), str ('false') ]).map(JBoolean)

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
]).map(JNumber);

const parseNull = str ('null').map(JNull);

const keyValueSeparator = whitespaceSurrounded (char (':'));

const parseArray = between (whitespaceSurrounded (char ('[')))
                            (whitespaceSurrounded (char (']')))
                            (commaSeparated (parseJsonValue))
                    .map(JArray);

const parseString = sequenceOf ([
  char ('"'),
  many (choice ([ escapedQuote, anythingExcept (char ('"')) ])).map(join('')),
  char ('"')
]).map(x => JString(x.join('')));

const parseKeyValue = whitespaceSurrounded (sequenceOf ([
  parseString,
  keyValueSeparator,
  parseJsonValue,
])).map(([key, _, value]) => JKeyValuePair(key, value));

const parseObject = between (whitespaceSurrounded (char ('{')))
                            (whitespaceSurrounded (char ('}')))
                            (commaSeparated (parseKeyValue))
                    .map(JObject);

const filepath = path.join(__dirname, '../..', 'package.json');
readFileAsync(filepath, 'utf8')
  .then(x => parseJsonValue.run(x))
  .then(x => console.log(x.result.toString()))
  .catch(console.log);
