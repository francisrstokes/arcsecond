export = Arcsecond;

type State<R = null, D = null> = {
  target: string;
  data: D;
  index: number;
  result: R;
};
type SuccessState<R = null, D = null> = State<R, D> & { error: null, isError: false };
type ErrorState<E = string> = State & { error: E; isError: true };

type Either<R> = { isError: boolean; value: R; }

type ExtractParserResult<P> = P extends Arcsecond.Parser<infer R, any, any> ? R : never;
type ExtractParserData<P> = P extends Arcsecond.Parser<any, infer D, any> ? D : never;
type ExtractParserError<P> = P extends Arcsecond.Parser<any, any, infer E> ? E : never;
type NamedParserTuple<R, D, E> = [string, Arcsecond.Parser<R, D, E>];
type ChainCallback<R, B extends Arcsecond.Parser<any, any, any>> = (result: R) => B;
type ChainFromDataCallback<R, B extends Arcsecond.Parser<any, any, any>, D> = (stateData: Arcsecond.StateData<R, D>) => B;
type ErrorChainCallback<R, D, E> = (errorStateData: Arcsecond.ErrorStateData<D, E>) => Arcsecond.Parser<R, D, null>;
type ForkErrorCallback<ER> = (error: string, newState: ErrorState) => ER;
type ForkSuccessCallback<R, SR, D, E> = (result: R, newState: SuccessState<R, D>) => SR;
type MapCallback<R, B> = (result: R) => B;
type MapFromDataCallback<R, B, D> = (stateData: Arcsecond.StateData<R, D>) => B;

declare namespace Arcsecond {
  export type ParserState<R = null, D = null, E = null> = SuccessState<R, D> | ErrorState<E>;

  export type StateData<R = null, D = null> = {
    result: R;
    data: D;
  };

  export type ErrorStateData<D = null, E = string> = {
    data: D,
    error: E,
    index: number;
  }

  export class Parser<R = null, D = null, E = null> {
    /**
     * Takes an value and returns a parser that always matches that value and
     * does not consume any input.
     *
     * Equivalent to `succeedWith`.
     * */
    public static ['fantasy-land/of']<X>(x: X): Parser<X>;

    /**
     * Takes an value and returns a parser that always matches that value and
     * does not consume any input.
     *
     * Equivalent to `succeedWith`.
     * */
    public static of<X>(x: X): Parser<X>;

    private constructor(p: <B, BD, BE>(state: ParserState<B, BD, BE>) => ParserState<R, D, E>);

    /**
     * Takes a function which recieves the last matched value and should return a parser.
     * That parser is then used to parse the following input, forming a chain of parsers
     * based on previous input. .chain is the fundamental way of creating *contextual parsers*.
     *
     * Equivalent to `pipeParsers ([ letters, decide (x => someOtherParser) ])`.
     */
    public ['fantasy-land/chain']<B>(chainFn: (a: R) => Parser<B, D, E>): Parser<B, D, E>;

    /**
     * `Parser e a s ~> (a -> Parser e b s) -> Parser e b s`
     *
     * Takes a function which recieves the last matched value and should return a parser.
     * That parser is then used to parse the following input, forming a chain of parsers
     * based on previous input. .chain is the fundamental way of creating *contextual parsers*.
     *
     * Equivalent to `pipeParsers ([ letters, decide (x => someOtherParser) ])`.
     */
    public chain<B extends Parser<any, any, any>>(chainFn: ChainCallback<R, B>): B;

    /**
     * `Parser e a s ~> (StateData a s -> Parser f b t) -> Parser f b t`
     *
     * Similar to `.chain`, except the function which it is passed also has access to the
     * *internal state data*, and can choose how parsing continues based on this data.
     */
    public chainFromData<B extends Parser<any, any, any>>(chainFromDataFn: ChainFromDataCallback<R, B, D>): B;

    /**
     * `Parser e a s ~> ((e, Integer, s) -> Parser f a s) -> Parser f a s`
     *
     * Similar to `.chain`, except that it only runs if there is an error in the parsing state.
     * This is a useful method when either trying to recover from errors, or for when a more
     * specific error message should be constructed.
     */
    public errorChain(errorChainFn: ErrorChainCallback<R, D, E>): Parser<R, D, null>;

    /**
     * `Parser e a s ~> x -> (e -> ParserState e a s -> f) -> (a -> ParserState e a s -> b)`
     *
     * Takes a string, an *error transforming function* and a *success transforming function*,
     * and parses the string. If parsing was successful, the result is transformed using the
     * *success transforming function* and returned. If parsing was not successful, the result
     * is transformed using the *error transforming function* and returned.
     */
    public fork<ER, SR>(target: string, errorFn: ForkErrorCallback<ER>, successFn: ForkSuccessCallback<R, SR, D, E>): ER | SR;

    /**
     * `Parser e a s ~> (a -> b) -> Parser e b s`
     *
     * Takes a function and returns a parser does not consume input, but instead runs
     * the provided function on the last matched value, and set that as the new last
     * matched value. This method can be used to apply structure or transform the values
     * as they are being parsed.
     *
     * Equivalent to `pipeParsers ([ letters, mapTo (fn) ])`.
     */
    public ['fantasy-land/map']<B>(a: R): Parser<B, D, E>;

    /**
     * `Parser e a s ~> (a -> b) -> Parser e b s`
     *
     * Takes a function and returns a parser does not consume input, but instead runs
     * the provided function on the last matched value, and set that as the new last
     * matched value. This method can be used to apply structure or transform the values
     * as they are being parsed.
     *
     * Equivalent to `pipeParsers ([ letters, mapTo (fn) ])`.
     */
    public map<B>(mapFn: MapCallback<R, B>): Parser<B, D, E>;


    /**
     * `Parser e a s ~> (StateData a s -> b) -> Parser e b s`
     *
     * Similar to `.map`, except the function which it is passed also has access to the
     * *internal state data*, and can thus transform the result based on this data.
     */
    public mapFromData<B>(mapFromDataFn: MapFromDataCallback<R, B, D>): Parser<B, D, E>;

    /**
     * `Parser e a s ~> x -> Either e a`
     *
     * A method on every parser which takes a string, and returns the result of parsing
     * the string using the parser.
     */
    public run(target: string): ParserState<R, D, E>;
  }

  /**
   * `t -> Parser e a t`
   *
   * Takes anything that should be set as the internal state data, and returns a parser
   * that will perform that side effect when the parser is run. This does not consume any
   * input. If parsing is currently in an errored state, then the data **will not** be set.
   */
  export const setData: <D>(data: D) => Parser<null, D, null>;

  /**
   * `Parser e a x -> s -> Parser e a s`
   *
   * Takes a *provided parser*, and returns a function waiting for some state data to be set,
   * and then returns a new parser. That parser, when run, ensures that the *state data* is
   * set as the *internal state data* before the *provided parser* runs.
   */
  export const withData: <P>(parser: P) => <D>(data: D) => Parser<ExtractParserResult<P>, D, ExtractParserError<P>>;

  /**
   * `(s -> t) -> Parser e a t`
   *
   * Takes a function that recieves and returns some *state data*, and transforms the *internal
   * state data* using the function, without consuming any input.
   */
  export const mapData: <R, B>(mapDataFn: (data: R) => B) => Parser<R, B>;

  // TODO: I am not sure that it is possible to specify the types contained within the getData
  // TODO: parser without providing a specific type annotation.
  /**
   * `Parser e s s`
   *
   * A parser that will always return what is contained in the internal state data, without
   * consuming any input.
   */
  export const getData: Parser<any, any, any>;

  // TODO: Fix any types on coroutine. It will prevent yielding anything other than a parser, but the next and return types are any.
  /**
   * `(() -> Iterator (Parser e a s)) -> Parser e a s`
   *
   * Takes a generator function, in which parsers are `yield`ed. `coroutine` allows you to
   * write parsers in a more imperative and sequential way - in much the same way `async/await`
   * allows you to write code with promises in a more sequential way.
   *
   * Inside of the generator function, you can use all regular JavaScript language features,
   * like loops, variable assignments, and conditional statements. This makes it easy to write
   * very powerful parsers using `coroutine`, but on the other side it can lead to less readable,
   * more complex code.
   *
   * Debugging is also much easier, as breakpoints can be easily added, and values logged to the
   * console after they have been parsed.
   */
  export const coroutine: <P, RT>(
    generatorFn: () => Generator<P extends Parser<infer R, infer D, infer E> ? P : never, RT, any>
  ) => Parser<RT, any, any>;

  /**
   * `Char -> Parser e Char s`
   *
   * Takes a character and returns a parser that matches that character **exactly one** time.
   */
  export const char: (char: string) => Parser<string>;

  /**
   * `String -> Parser e String s`
   *
   * Takes a string and returns a parser that matches that string **exactly one** time.
   */
  export const str: (str: string) => Parser<string>;

  /**
   * `Parser e String s`
   *
   * A parser that matches **exactly one** numerical digit `/[0-9]/`.
   */
  export const digit: Parser<string>;

  /**
   * `Parser e String s`
   *
   * A parser that matches **one or more** numerical digits `/[0-9]/`.
   */
  export const digits: Parser<string>;

  /**
   * `Parser e Char s`
   *
   * A parser that matches **exactly one** alphabetical letter `/[a-zA-Z]/`.
   */
  export const letter: Parser<string>;

  /**
   * `Parser e Char s`
   *
   * A parser that matches **one or more** alphabetical letters `/[a-zA-Z]/`.
   */
  export const letters: Parser<string>;

  /**
   * `Parser e String s`
   *
   * A parser that matches **one or more** whitespace characters.
   */
  export const whitespace: Parser<string>;

  /**
   * `Parser e String s`
   *
   * A parser that matches **zero or more** whitespace characters.
   */
  export const optionalWhitespace: Parser<string>;

  /**
   * `String -> Parser e Char s`
   *
   * Takes a string and returns a parser that matches exactly one character from that string.
   */
  export const anyOfString: (str: string) => Parser<string>;

  /**
   * `RegExp -> Parser e String s`
   *
   * Takes a RegExp and returns a parser that matches **as many characters** as the RegExp matches.
   */
  export const regex: (regex: RegExp) => Parser<string>;

  // TODO: I am not really sure what the proper way to type this is
  /**
   * `[Parser * * *] -> Parser * [*] *`
   *
   * Note: `sequenceOf` cannot have an accurate type signature in JavaScript.
   *
   * Takes an array of parsers, and returns a new parser that matches each of them sequentially,
   * collecting up the results into an array.
   */
  export const sequenceOf: <R = string, D = null>(parsers: Iterable<Parser<any, any>>) => Parser<R[], D>;

  // TODO: The R, D, and E types are all unknown in the return result from the example.
  // TODO: Therefore, an explicit type signature is required.
  // TODO: Not sure if there is a better way to do this.
  /**
   * `[(String, Parser * * *)] -> Parser e (StrMap *) s`
   *
   * Note: `namedSequenceOf` cannot have an accurate type signature in JavaScript.
   *
   * Takes an array of string/parser pairs, and returns a new parser that matches each
   * of them sequentially, collecting up the results into an object where the key is the
   * string in the pair.
   *
   * A pair is just an array in the form: `[string, parser]`.
   */
  export const namedSequenceOf: <N, P, R, D, E>(
    namedParsers: N extends [string, P extends Parser<R, D, E> ? P : unknown][] ? N : never
  ) => Parser<{ [key: string]: R }, D, E>;

  // TODO: I am not really sure what the proper way to type this is
  /**
   * `[Parser * * *] -> Parser * * *`
   *
   * Note: `choice` cannot have an accurate type signature in JavaScript.
   *
   * Takes an array of parsers, and returns a new parser that tries to match each one
   * of them sequentially, and returns the first match. If `choice` fails, then it returns
   * the error message of the parser that matched the most from the string.
   */
  export const choice: <R = string, D = null>(parsers: Iterable<Parser<any, any>>) => Parser<R, D>;

  /**
   * `Parser e a s -> Parser e a s`
   *
   * Takes a *look ahead* parser, and returns a new parser that matches using the *look ahead*
   * parser, but without consuming input.
   */
  export const lookAhead: <R, D>(lookAheadParser: Parser<R, D>) => Parser<R, D>;

  /**
   * `Parser e a s -> Parser e b s -> Parser e [b] s`
   *
   * Takes two parsers - a *separator* parser and a *value* parser - and returns a new parser
   * that matches **zero or more values** from the *value* parser that are separated by values
   * of the *separator* parser.
   *
   * Because it will match zero or more values, this parser will *fail* if a *value* is followed
   * by a *separator* but NOT another *value*. If there's no *value*, the result will be an empty
   * array, not failure.
   */
  export const sepBy: <SR, SD>(separatorParser: Parser<SR, SD>) => <R, D>(valueParser: Parser<R, D>) => Parser<R[], D>;

  /**
   * `Parser e a s -> Parser e b s -> Parser e [b] s`
   *
   * The same as `sepBy`, except that it matches **one or more** occurences of the *value* parser.
   */
  export const sepBy1: <SR, SD>(separatorParser: Parser<SR, SD>) => <R, D>(valueParser: Parser<R, D>) => Parser<R[], D>;

  /**
   * `Parser e s a -> Parser e s [a]`
   *
   * Takes a parser and returns a new parser which matches that parser **zero or more times**.
   * Because it will match zero or more values, this parser will always match, resulting in an
   * empty array in the zero case.
   */
  export const many: <R, D>(parser: Parser<R, D>) => Parser<R[], D>;

  /**
   * `Parser e s a -> Parser e s [a]`
   *
   * The same as `many`, except that it matches **one or more occurence**.
   */
  export const many1: <R, D>(parser: Parser<R, D>) => Parser<R[], D>;

  /**
   * `Parser e a s -> Parser e b s -> Parser e c s -> Parser e b s`
   *
   * Takes 3 parsers, a *left* parser, a *right* parser, and a *value* parser, returning a new
   * parser that matches a value matched by the *value* parser, between values matched by the
   * *left* parser and the *right* parser.
   *
   * This parser can easily be partially applied with `char ('(')` and `char (')')` to create
   * a `betweenRoundBrackets` parser, for example.
   */
  export const between: <L, LD>(leftParser: Parser<L, LD>) =>
    <RR, RD>(rightParser: Parser<RR, RD>) => <LR, LD>(valueParser: Parser<LR, LD>) => Parser<LR, LD>;

  /**
   * `Parser e a s -> Parser e String s`
   *
   * Takes a *termination* parser and returns a new parser which matches everything up until a
   * value is matched by the *termination* parser. When a value is matched by the termination
   * parser, it is not "consumed".
   */
  export const everythingUntil: <D>(terminationParser: Parser<any, any>) => Parser<string, D>;

  /**
   * `Parser e a s -> Parser e Char s`
   *
   * Takes an *exception* parser and returns a new parser which matches **exactly one**
   * character, if it is not matched by the *exception* parser.
   */
  export const anythingExcept: <D>(exceptionParser: Parser<any, any>) => Parser<string, D>;

  /**
   * `Parser e a s -> Parser e (a | Null) s`
   *
   * Takes an *attempt* parser and returns a new parser which tries to match using the *attempt*
   * parser. If it is unsuccessful, it returns a null value and does not "consume" any input.
   */
  export const possibly: <R, D>(attemptParser: Parser<R, D>) => Parser<R | null, D>;

  /**
   * `Parser e Null s`
   *
   * A parser that only succeeds when there is no more input to be parsed.
   */
  export const endOfInput: Parser<null>;

  /**
   * `Parser e a s -> Parser e a s`
   *
   * Takes a *skip* parser and returns a new parser which matches using the *skip* parser, but
   * doesn't return its value, but instead the value of whatever came before it.
   */
  export const skip: <R, D>(parser: Parser<any, any>) => Parser<R, D>;

  // TODO: I am not really sure what the proper way to type this is
  /**
   * `[Parser * * *] -> Parser * * *`
   *
   * Takes an array of parsers and composes them left to right, so each parsers return value
   * is passed into the next one in the chain. The result is a new parser that, when run, yields
   * the result of the final parser in the chain.
   */
  export const pipeParsers: <R, D = null>(parsers: Iterable<Parser<any, any>>) => Parser<R, D>;

  /**
   * `[Parser * * *] -> Parser * * *`
   *
   * Takes an array of parsers and composes them right to left, so each parsers return value
   * is passed into the next one in the chain. The result is a new parser that, when run, yields
   * the result of the final parser in the chain.
   */
  export const composeParsers: <R, D = null>(parsers: Iterable<Parser<any, any>>) => Parser<R, D>;

  /**
   * `Parser e a s -> Parser f b t -> Parser f b t`
   *
   * TakeRight takes two parsers, *left* and *right*, and returns a new parser that first matches
   * the *left*, then the *right*, and keeps the value matched by the *right*.
   */
  export const takeRight: <LR, LD>(leftParser: Parser<LR, LD>) => <RR, RD>(rightParser: Parser<RR, RD>) => Parser<RR, RD>;

  /**
   * `Parser e a s -> Parser f b t -> Parser e a s`
   *
   * TakeRight takes two parsers, *left* and *right*, and returns a new parser that first matches
   * the *left*, then the *right*, and keeps the value matched by the *left*.
   */
  export const takeLeft: <LR, LD>(leftParser: Parser<LR, LD>) => <RR, RD>(rightParser: Parser<RR, RD>) => Parser<LR, LD>;

  /**
   * `(() => Parser e a s) -> Parser e a s`
   *
   * Takes a function that returns a parser (a thunk), and returns that same parser. This is
   * needed in order to create *recursive* parsers because JavaScript is not a "lazy" language.
   */
  export const recursiveParser: <R, D = null>(recursiveParserFn: () => Parser<R, D>) => Parser<R, D>;

  /**
   * `(a => ()) -> Parser e a s`
   *
   * Takes a function and returns a parser that does nothing and consumes no input, but runs
   * the provided function on the last parsed value. This is intended as a debugging tool to
   * see the state of parsing at any point in a sequential operation like `sequenceOf` or `pipeParsers`.
   */
  export const tapParser: <R, D = null>(tapParserFn: (state: ParserState<R>) => void) => Parser<R, D>;

  // TODO: Improve types here - need to include Data type and also restrict P to extend Parser
  /**
   * `(a -> Parser e b s) -> Parser e b s`
   *
   * Takes a function that recieves the last matched value and returns a new parser. It's
   * important that the function **always** returns a parser. If a valid one cannot be selected,
   * you can always use fail.
   */
  export const decide: <R, P>(decideFn: (result: R) => P) => P;

  /**
   * `(a -> b) -> Parser e b s`
   *
   * Takes a function and returns a parser does not consume input, but instead runs the provided
   * function on the last matched value, and set that as the new last matched value. This function
   * can be used to apply structure or transform the values as they are being parsed.
   */
  export const mapTo: <A, B, D>(mapToFn: (a: A) => B) => Parser<B, D>;

  /**
   * `(ParserState e a s -> f) -> Parser f a s`
   *
   * Similar to `mapTo` but it transforms the error value. The function passed to `errorMapTo` gets
   * the current error message as its first argument and the index that parsing stopped at as the second.
   */
  export const errorMapTo: <A, E = any, D = null>(
    errorMapToFn: (error: string, index: number, data: D
  ) => E) => Parser<A, D, E>;

  /**
   * `e -> Parser e a s`
   *
   * Takes an *error message* string and returns a parser that always fails with the provided *error message*.
   */
  export const fail: (errorMessage: string) => Parser<null, null, string>;

  /**
   * `a -> Parser e a s`
   *
   * Takes an value and returns a parser that always matches that value and does not consume any input.
   */
  export const succeedWith: <X>(x: X) => Parser<X>;

  /**
   * `Parser e a s -> Parser e (Either e a) s`
   *
   * Takes a parser and returns a parser that will always succeed, but the captured value will
   * be an `Either`, indicating success or failure.
   */
  export const either: <A, D, E>(parser: Parser<A, D, E>) => Parser<Either<A>, D, null>;

  /**
   * `ParserResult e a s -> Promise (e, Integer, s) a`
   *
   * Converts a `ParserResult` (what is returned from `.run`) into a `Promise`.
   */
  export const toPromise: <A, D>(parser: ParserState<A, D>) => Promise<A | ErrorStateData<D>>;

  /**
   * `ParserResult e a s -> a`
   *
   * Converts a `ParserResult` (what is returned from `.run`) into a regular value, and throws
   * an error if the result contained one.
   */
  export const toValue: <A, D>(parserResult: ParserState<A, D>) => A;

  /**
   * `Parser e a s -> String -> Either e a`
   *
   * Takes a parser and a string, and returns the result of parsing the string using the parser.
   */
  export const parse: <R, D, E>(parser: Parser<R, D, E>) => (target: string) => ParserState<R, D, E>;
}