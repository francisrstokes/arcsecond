import {
  Inc,
  Dec,
  MoveRight,
  MoveLeft,
  PrintByte,
  GetByte,
  Loop,
  Instructions
} from './bf.type';

import {
  char,
  mapTo,
  pipeParsers,
  parse,
  choice,
  between,
  whitespace,
  many
} from '../../index';

const asType = type => parser => pipeParsers ([
  between (whitespace) (whitespace) (parser),
  mapTo (type)
]);

const instructions = () => pipeParsers ([
  many (choice ([
    inc,
    dec,
    moveRight,
    moveLeft,
    printByte,
    getByte,
    loop,
  ])),
  mapTo (Instructions)
]) ();

const inc = asType (Inc) (char ('+'));
const dec = asType (Dec) (char ('-'));
const moveRight = asType (MoveRight) (char ('>'));
const moveLeft = asType (MoveLeft) (char ('<'));
const printByte = asType (PrintByte) (char ('.'));
const getByte = asType (GetByte) (char (','));
const loop = asType (Loop) (between (char ('[')) (char (']')) (instructions))

console.log(
  parse (instructions) ('++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.').value.toString()
)
