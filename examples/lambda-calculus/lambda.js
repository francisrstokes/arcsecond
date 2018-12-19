import {
  Variable,
  Definition,
  Application,
} from './lambda.type';

import {
  char,
  mapTo,
  pipeParsers,
  parse,
  sequenceOf,
  choice,
  between,
  letters,
  takeRight,
  recursiveParser
} from '../../index';

const variable = pipeParsers ([ letters, mapTo (Variable) ]);

const expr = recursiveParser(() => choice ([
  functionDefinition,
  variable,
  functionApplication
]));

const functionDefinition = pipeParsers ([
  sequenceOf ([
    takeRight (char ('λ')) (variable),
    takeRight (char ('.')) (expr)
  ]),
  mapTo (([v, e]) => Definition(v, e))
]);

const functionApplication = pipeParsers ([
  between (char ('('))
          (char (')'))
          (sequenceOf ([ expr, takeRight (char (' ')) (expr) ])),
  mapTo (([a, b]) => Application(a, b))
]);

console.log(
  parse (expr) ('((λx.λy.x λx.λy.x) λx.λy.y)').value.toString()
)
