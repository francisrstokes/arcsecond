import {
  Variable,
  Definition,
  Application,
} from './lambda.type';

import {
  char,
  sequenceOf,
  choice,
  between,
  letters,
  takeRight,
  recursiveParser
} from '../../index';

const variable = letters.map(Variable);

const expr = recursiveParser(() => choice ([
  functionDefinition,
  variable,
  functionApplication
]));

const functionDefinition = sequenceOf ([
  takeRight (char ('λ')) (variable),
  takeRight (char ('.')) (expr)
]).map(([v, e]) => Definition(v, e));

const functionApplication = between (char ('('))
                                    (char (')'))
                                    (sequenceOf ([ expr, takeRight (char (' ')) (expr) ]))
                            .map(([a, b]) => Application(a, b))

console.log(
  expr.run('((λx.λy.x λx.λy.x) λx.λy.y)').value.toString()
)
