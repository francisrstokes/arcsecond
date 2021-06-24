// Type definitions for Arcsecond
// Project: https://github.com/francisrstokes/Arcsecond
// Definitions by:
//  - Francis Stokes <https://github.com/francisrstokes/

type InputType =
  | 'string'
  | 'arrayBuffer'
  | 'typedArray'
  | 'dataView';

type TargetType =
  | string
  | DataView
  | ArrayBuffer
  | Uint8Array
  | Uint8ClampedArray
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array;

export type ParserState = {
  dataView: DataView;
  inputType: InputType;
  isError: boolean;
  error: any;
  data: any;
  index: number;
  result: any;
}

export type ResultType<T> = {
  isError: boolean;
  error: any;
  index: number;
  result: T;
}

export type StateTransformerFunction = (state: ParserState) => ParserState;

declare class Parser {
  constructor(p: StateTransformerFunction);
  run<T>(target: TargetType): ResultType<T>;
  fork<T>(target: TargetType, errorFn: (err: any) => T, successFn: (result: any) => T): T;
  map(fn: (x: any) => any): Parser;
  chain(fn: (x: any) => Parser): Parser;
  ap(parserOfFunction: Parser): Parser;
  errorMap(fn: (err: any) => any): Parser;
  errorChain(fn: (err: any) => Parser): Parser;
  mapFromData(fn: (data: any) => any): Parser;
  chainFromData(fn: (data: any) => Parser): Parser;
  mapData(fn: (data: any) => any): Parser;
  of(x: any): Parser;
}

export type FnReturingParserIterator = () => Iterator<Parser, any>;

declare const getData: Parser;
declare function setData(data: any): Parser;
declare function mapData(mapFn: (data: any) => any): Parser;
declare function withData(parser: Parser): (data: any) => Parser;
declare function pipeParsers(parsers: Parser[]): Parser;
declare function composeParsers(parsers: Parser[]): Parser;
declare function tapParser(fn: (state: ParserState) => void): Parser;
declare function parse<T>(parser: Parser): (target: TargetType) => ResultType<T>;
declare function decide(fn: (state: ParserState) => Parser): Parser;
declare function fail(errorValue: any): Parser;
declare function succeedWith(value: any): Parser;
declare function either(parser: Parser): Parser;
declare function coroutine(fn: FnReturingParserIterator): Parser;
declare function exactly(n: Number): (p: Parser) => Parser;
declare function many(p: Parser): Parser;
declare function many1(p: Parser): Parser;
declare function mapTo(fn: (x: any) => any): Parser;
declare function errorMapTo(fn: (err: any) => any): Parser;
declare function char(c: string): Parser;
declare const anyChar: Parser;
declare const peek: Parser;
declare function str(s: string): Parser;
declare function regex(re: RegExp): Parser;
declare const digit: Parser;
declare const digits: Parser;
declare const letter: Parser;
declare const letters: Parser;
declare function anyOfString(s: string): Parser;
declare function namedSequenceOf(namedParserPairs: Array<[string, Parser]>): Parser;
declare function sequenceOf(parsers: Array<Parser>): Parser;
declare function sepBy(sepParser: Parser): (valueParser: Parser) => Parser;
declare function sepBy1(sepParser: Parser): (valueParser: Parser) => Parser;
declare function choice(parsers: Array<Parser>): Parser;
declare function between(left: Parser): (right: Parser) => (parser: Parser) => Parser;
declare function everythingUntil(parser: Parser): Parser;
declare function everyCharUntil(parser: Parser): Parser;
declare function anythingExcept(parser: Parser): Parser;
declare function anyCharExcept(parser: Parser): Parser;
declare function lookahead(parser: Parser): Parser;
declare function possibly(parser: Parser): Parser;
declare function skip(parser: Parser): Parser;
declare const startOfInput: Parser;
declare const endOfInput: Parser;
declare const whitespace: Parser;
declare const optionalWhitespace: Parser;
declare function recursiveParser(parserThunk: () => Parser): Parser;
declare function takeRight(left: Parser): (right: Parser) => Parser;
declare function takeLeft(left: Parser): (right: Parser) => Parser;
declare function toPromise<T>(result: ResultType<T>): Promise<T>;
declare function toValue<T>(result: ResultType<T>): T;
