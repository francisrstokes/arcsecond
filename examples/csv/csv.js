import {
  char,
  many,
  sequenceOf,
  regex,
  anythingExcept,
  sepBy,
  choice,
  between
} from '../..';

const join = separator => array => array.join(separator);
const joinedMany = parser => many(parser).map(join(''));
const joinedSequence = parsers => sequenceOf(parsers).map(join(''));

const csvString = between (char ('"')) (char ('"')) (joinedMany (choice ([
  joinedSequence ([ char ('\\'), char ('"') ]),
  anythingExcept (regex (/^["\n]/))
])));

const cell = joinedMany (choice ([
  csvString,
  anythingExcept (regex (/^[,\n]/))
]));
const cells = sepBy (char (',')) (cell);
const parser = sepBy (char ('\n')) (cells);

const data = `
1,React JS,"A declarative, efficient, and flexible JavaScript library for building user interfaces"
2,Vue.js,"Vue.js is a progressive incrementally-adoptable JavaScript framework for building UI on the web."
3,Angular,"One framework. Mobile & desktop."
4,ember.js,"Ember.js - A JavaScript framework for creating ambitious web applications"
`;

console.log(parser.run(data).value);
