// Type definitions for arcsecond
// Project: http://https://github.com/francisrstokes/arcsecond
/* eslint-disable */
declare namespace Arcsecond {

    type ParserState<TResult = null, TData = null> = {
        isError: boolean;
        error: string | null;
        target: string;
        data: TData;
        index: number;
        result: TResult;
    };

    type SuccessState<TResult, TData> = ParserState<TResult, TData> & { isError: false };
    type ErrorState<TResult, TData> = ParserState<TResult, TData> & { isError: true };

    type StateData<TResult, TData> = {
        result: TResult;
        data: TData;
    };

    type ChainCallback<TInput, TOutput> = (result: TInput) => Parser<TOutput>;
    type ChainFromDataCallback<TInput, TOutput, TData> = (state: StateData<TInput, TData>) => Parser<TOutput, TData>;
    type ErrorChainCallback<TInput, TOutput, TData> = (state: ErrorState<TInput, TData>) => Parser<TOutput, TData>;
    type ErrorMapCallback = (error: string, index: number, data) => string;
    type ForkErrorCallback<TResult, TErrorResult, TData> = (error: string, newState: ErrorState<TResult, TData>) => ParserState<TErrorResult, TData>;
    type ForkSuccessCallback<TResult, TSuccessResult, TData> = (result: TResult, newState: SuccessState<TResult, TData>) => ParserState<TSuccessResult, TData>;
    type MapCallback<TInput, TOutput> = (result: TInput) => TOutput;
    type MapDataCallback<TData> = (data: TData) => TData;
    type MapFromDataCallback<TInput, TData, TOutput> = (state: StateData<TInput, TData>) => Parser<TOutput, TData>;

    interface Parser<TResult = string, TData = null> {
        ['fantasy-land/ap']<TOutput>(parserOfFunction: Parser<(result: TResult) => TOutput>): Parser<TOutput>;
        ['fantasy-land/chain']<TOutput>(fn: ChainCallback<TResult, TOutput>): Parser<TOutput>;
        ['fantasy-land/map']<TOutput>(fn: MapCallback<TResult, TOutput>): Parser<TOutput>;
        ap<TOutput>(parserOfFunction: Parser<(result: TResult) => TOutput, TData>): Parser<TOutput, TData>;
        chain<TOutput>(fn: ChainCallback<TResult, TOutput>): Parser<TOutput, TData>;
        chainFromData<TOutput>(fn: ChainFromDataCallback<TResult, TOutput, TData>): Parser<TOutput, TData>;
        errorChain<TOutput>(fn: ErrorChainCallback<TResult, TOutput, TData>): Parser<TOutput, TData>;
        errorMap(fn: ErrorMapCallback): Parser<TResult, TData>;
        fork<TErrorResult, TSuccessResult>(targetString: string, errorFn: ForkErrorCallback<TResult, TErrorResult, TData>, successFn: ForkSuccessCallback<TResult, TSuccessResult, TData>): SuccessState<TResult, TData> | ErrorState<TResult, TData>;
        map<TOutput>(fn: MapCallback<TResult, TOutput>): Parser<TResult, TData>;
        mapData(fn: MapDataCallback<TData>): Parser<TResult, TData>;
        mapFromData<TOutput>(fn: MapFromDataCallback<TResult, TData, TOutput>): Parser<TOutput, TData>;
        run(targetString: string): ParserState<TResult, TData>;
    }

    type GetDataParser<T> = T extends Parser<any, infer D> ? Parser<D, D> : never;
    type CoroutineNext<T> = T extends Parser<infer TResult> ? TResult : never;
    type NamedParserTuple<K extends string, P extends Parser<any, any>> = [K, P];
    type Either<TResult> = { isError: boolean; value: TResult; }

    interface ParserConstructor<TResult = string, TData = null> {
        ['fantasy-land/of']<TOutput>(x: TOutput): Parser<TOutput>;
        of<TOutput>(x: TOutput): Parser<TOutput>;
        new(p: <TInput>(state: ParserState<TInput, TData>) => ParserState<TResult, TData>): Parser<TResult, TData>;
        readonly prototype: Parser<TResult, TData>;
    }

    interface ArcsecondParsers {
        digit: Parser;
        digits: Parser;
        getData: GetDataParser<Parser>;
        endOfInput: Parser<null>;
        letter: Parser;
        letters: Parser;
        optionalWhitespace: Parser;
        whitespace: Parser;
        anyOfString(s: string): Parser;
        anythingExcept(parser: Parser): Parser;
        between(leftParser: Parser): (rightParser: Parser) => (parser: Parser) => Parser;
        char(c: string): Parser;
        choice(parsers: Iterable<Parser>): Parser;
        composeParsers(parsers: Iterable<Parser>): Parser;
        coroutine<P extends Parser<any, any>, TResult>(g: () => Generator<P, TResult, CoroutineNext<P>>): Parser<TResult>;
        decide<TResult>(fn: (result: TResult) => Parser<TResult>): Parser<TResult>;
        either<TResult>(parser: Parser): Parser<Either<TResult>>;
        errorMapTo<TResult = string, TData = void>(fn: (message: string, index: number, data: TData) => string): Parser<TResult, TData>;
        everythingUntil(parser: Parser): Parser;
        fail(errorMessage: string): Parser;
        lookAhead(parser: Parser): Parser;
        many<TResult>(parser: Parser<TResult>): Parser<TResult[]>;
        many1<TResult>(parser: Parser<TResult>): Parser<TResult[]>;
        mapTo<TInput, TOutput>(fn: (data: TInput) => TOutput): Parser<TOutput>;
        mapData<TData, TResult>(fn: (data: TData) => TData): Parser<TResult, TData>;
        namedSequenceOf<K extends string[], P extends Parser<any, any>[]>(pairedParsers: NamedParserTuple<K[number], P[number]>[]): Parser<{ [A in K[number]]: P[number] }>;
        parse<TResult, TData>(parser: Parser<TResult, TData>): (target: string) => TResult;
        pipeParsers(parsers: Iterable<Parser>): Parser;
        possibly<TResult>(parser: Parser<TResult>): Parser<TResult | null>;
        recursiveParser(parserThunk: () => Parser): Parser;
        regex(re: RegExp): Parser;
        sepBy(parser: Parser): (parser: Parser) => Parser;
        sepBy1(parser: Parser): (parser: Parser) => Parser;
        sequenceOf(parsers: Iterable<Parser>): Parser;
        setData<TData, TResult = string>(data: TData): Parser<TResult, TData>;
        skip(parser: Parser): Parser;
        str(s: string): Parser;
        succeedWith<TResult>(value: TResult): Parser<TResult>;
        takeLeft(parser: Parser): (parser: Parser) => Parser;
        takeRight(parser: Parser): (parser: Parser) => Parser;
        tapParser<TData = null, TResult = string>(fn: (state: ParserState<TResult, TData>) => void): Parser<TResult, TData>;
        toPromise<TResult, TData>(result: ParserState<TResult, TData>): Promise<TResult>;
        toValue<TResult, TData>(result: ParserState<TResult, TData>): TResult;
        withData<TData, TResult = string>(parser: Parser<TResult, TData>): (stateData: TData) => Parser<TResult, TData>;
    }

    type ArcsecondAPI = {
        Parser: ParserConstructor
    }

    type ArcsecondStatic = ArcsecondParsers & ArcsecondAPI;
}

declare const arcsecond: Arcsecond.ArcsecondStatic;

declare module "arcsecond" {
    export = arcsecond;
}
