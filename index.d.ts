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

export type ParserState<T> = {
  dataView: DataView;
  inputType: InputType;
  isError: boolean;
  error: any;
  data: any;
  index: number;
  result: T;
}

export type ResultType<T> = {
  isError: boolean;
  error: any;
  index: number;
  result: T;
}

export type StateTransformerFunction<T> = (state: ParserState<any>) => ParserState<T>;

declare class Parser<T> {
  constructor(p: StateTransformerFunction<T>);
  run(target: TargetType): ResultType<T>;
  fork(target: TargetType, errorFn: (err: any) => T, successFn: (result: any) => T): T;
  map<T2>(fn: (x: T) => T2): Parser<T2>;
  chain<T2>(fn: (x: T) => Parser<T2>): Parser<T2>;
  ap<T2>(parserOfFunction: Parser<(x: T) => T2>): Parser<T2>;
  errorMap(fn: (err: any) => any): Parser<T>;
  errorChain<T2>(fn: (err: any) => Parser<T2>): Parser<T2>;
  mapFromData(fn: (data: any) => any): Parser<T>;
  chainFromData<T2>(fn: (data: any) => Parser<T2>): Parser<T2>;
  mapData(fn: (data: any) => any): Parser<T>;
  static of<T>(x: T): Parser<T>;
}

export type FnReturingParserIterator<T> = () => Iterator<Parser<any>, T>;

declare const getData: Parser<any>;
declare function setData(data: any): Parser<any>;
declare function mapData(mapFn: (data: any) => any): Parser<any>;
declare function withData<T>(parser: Parser<T>): (data: any) => Parser<T>;
declare function pipeParsers(parsers: Parser<any>[]): Parser<any>;
declare function composeParsers(parsers: Parser<any>[]): Parser<any>;
declare function tapParser(fn: (state: ParserState<any>) => void): Parser<any>;
declare function parse<T>(parser: Parser<T>): (target: TargetType) => ResultType<T>;
declare function decide<T>(fn: (state: ParserState<any>) => Parser<T>): Parser<T>;
declare function fail(errorValue: any): Parser<any>;
declare function succeedWith<T>(value: T): Parser<T>;
declare function either<T>(parser: Parser<T>): Parser<T>;
declare function coroutine<T>(fn: FnReturingParserIterator<T>): Parser<T>;
declare function exactly<T>(n: Number): (p: Parser<T>) => Parser<T[]>;
declare function many<T>(p: Parser<T>): Parser<T[]>;
declare function many1<T>(p: Parser<T>): Parser<T[]>;
declare function mapTo<T>(fn: (x: any) => T): Parser<T>;
declare function errorMapTo(fn: (err: any) => any): Parser<any>;
declare function char(c: string): Parser<string>;
declare const anyChar: Parser<string>;
declare const peek: Parser<number>;
declare function str(s: string): Parser<string>;
declare function regex(re: RegExp): Parser<string>;
declare const digit: Parser<string>;
declare const digits: Parser<string>;
declare const letter: Parser<string>;
declare const letters: Parser<string>;
declare function anyOfString(s: string): Parser<string>;
declare function namedSequenceOf(namedParserPairs: Array<[string, Parser<any>]>): Parser<any[]>;
declare function sequenceOf(parsers: Array<Parser<any>>): Parser<any[]>;
declare function sepBy<S, T>(sepParser: Parser<S>): (valueParser: Parser<T>) => Parser<T[]>;
declare function sepBy1<S, T>(sepParser: Parser<S>): (valueParser: Parser<T>) => Parser<T[]>;
declare function choice(parsers: Array<Parser<any>>): Parser<any>;
declare function between<L, T, R>(left: Parser<L>): (right: Parser<R>) => (parser: Parser<T>) => Parser<T>;
declare function everythingUntil(parser: Parser<any>): Parser<number[]>;
declare function everyCharUntil(parser: Parser<any>): Parser<string>;
declare function anythingExcept(parser: Parser<any>): Parser<number>;
declare function anyCharExcept(parser: Parser<any>): Parser<number>;
declare function lookahead<T>(parser: Parser<T>): Parser<T>;
declare function possibly<T>(parser: Parser<T>): Parser<T | null>;
declare function skip(parser: Parser<any>): Parser<null>;
declare const startOfInput: Parser<null>;
declare const endOfInput: Parser<null>;
declare const whitespace: Parser<string>;
declare const optionalWhitespace: Parser<string>;
declare function recursiveParser<T>(parserThunk: () => Parser<T>): Parser<T>;
declare function takeRight<L, R>(left: Parser<L>): (right: Parser<R>) => Parser<R>;
declare function takeLeft<L, R>(left: Parser<L>): (right: Parser<R>) => Parser<L>;
declare function toPromise<T>(result: ResultType<T>): Promise<T>;
declare function toValue<T>(result: ResultType<T>): T;
