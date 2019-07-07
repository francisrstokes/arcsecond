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
  choice,
  between,
  optionalWhitespace,
  many,
  recursiveParser
} from '../../index';

const asType = type => parser =>
  between (optionalWhitespace)
          (optionalWhitespace)
          (parser)
  .map(type);

const instructions = recursiveParser(() =>
  many (choice ([
    inc,
    dec,
    moveRight,
    moveLeft,
    printByte,
    getByte,
    loop,
  ])).map(Instructions)
);

const inc = asType (Inc) (char ('+'));
const dec = asType (Dec) (char ('-'));
const moveRight = asType (MoveRight) (char ('>'));
const moveLeft = asType (MoveLeft) (char ('<'));
const printByte = asType (PrintByte) (char ('.'));
const getByte = asType (GetByte) (char (','));
const loop = asType (Loop) (between (char ('[')) (char (']')) (instructions))

console.log(
  instructions
    .run('++++++++[>++++[>++>+++>+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.')
    .value.toString()
)
