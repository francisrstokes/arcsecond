import { encoder } from './unicode';
import { InputType, InputTypes, isTypedArray } from './inputTypes';
import { clearCache, memoize } from './cache';

// createParserState :: x -> s -> ParserState e a s
const createParserState = <D>(target: InputType, data: D | null = null): ParserState<null, string | null, D | null> => {
  let dataView: DataView;
  let inputType;

  if (typeof target === 'string') {
    const bytes = encoder.encode(target);
    dataView = new DataView(bytes.buffer);
    inputType = InputTypes.STRING;
  } else if (target instanceof ArrayBuffer) {
    dataView = new DataView(target);
    inputType = InputTypes.ARRAY_BUFFER;
  } else if (isTypedArray(target)) {
    dataView = new DataView(target.buffer);
    inputType = InputTypes.TYPED_ARRAY;
  } else if (target instanceof DataView) {
    dataView = target;
    inputType = InputTypes.DATA_VIEW;
  } else {
    throw new Error(
      `Cannot process input. Must be a string, ArrayBuffer, TypedArray, or DataView. but got ${typeof target}`,
    );
  }

  return {
    dataView,
    inputType,

    isError: false,
    error: null,
    result: null,
    data,
    index: 0,
  };
};

// updateError :: (ParserState e a s, f) -> ParserState f a s
export const updateError = <T, E, D, E2>(state: ParserState<T, E, D>, error: E2): ParserState<T, E2, D> => ({ ...state, isError: true, error });

// updateResult :: (ParserState e a s, b) -> ParserState e b s
export const updateResult = <T, E, D, T2>(state: ParserState<T, E, D>, result: T2): ParserState<T2, E, D> => ({ ...state, result });

// updateData :: (ParserState e a s, t) -> ParserState e b t
export const updateData = <T, E, D, D2>(state: ParserState<T, E, D>, data: D2): ParserState<T, E, D2> => ({ ...state, data });

// updateResult :: (ParserState e a s, b, Integer) -> ParserState e b s
export const updateParserState = <T, E, D, T2>(state: ParserState<T, E, D>, result: T2, index: number): ParserState<T2, E, D> => ({
  ...state,
  result,
  index,
});


type StateTransformerFunction<T, E = any, D = any> = (state: ParserState<any, any, any>) => ParserState<T, E, D>;
export type FnReturingParserIterator<T> = () => Iterator<Parser<any>, T>;

export type ParserState<T, E, D> = {
  dataView: DataView;
  inputType: InputType;
} & InternalResultType<T, E, D>;

export type InternalResultType<T, E, D> = {
  isError: boolean;
  error: E;
  index: number;
  result: T;
  data: D;
};

export type ResultType<T, E, D> = Err<E, D> | Ok<T, D>;

export type Err<E, D> = {
  isError: true;
  error: E;
  index: number;
  data: D;
};

export type Ok<T, D> = {
  isError: false;
  index: number;
  result: T;
  data: D;
};

export class Parser<T, E = string, D = any> {
  p: StateTransformerFunction<T, E, D>;

  constructor(p: StateTransformerFunction<T, E, D>) {
    this.p = memoize(p);
  }

  // run :: Parser e a s ~> x -> Either e a
  run(target: InputType): ResultType<T, E, D> {
    const state = createParserState(target);

    clearCache();

    const resultState = this.p(state);

    if (resultState.isError) {
      return {
        isError: true,
        error: resultState.error,
        index: resultState.index,
        data: resultState.data,
      };
    }

    return {
      isError: false,
      result: resultState.result,
      index: resultState.index,
      data: resultState.data,
    };
  }

  // fork :: Parser e a s ~> x -> (e -> ParserState e a s -> f) -> (a -> ParserState e a s -> b)
  fork<F>(
    target: InputType, errorFn: (errorMsg: E, parsingState: ParserState<T, E, D>) => F, successFn: (result: T, parsingState: ParserState<T, E, D>) => F
  ) {
    const state = createParserState(target);
    const newState = this.p(state);

    clearCache();

    if (newState.isError) {
      return errorFn(newState.error, newState);
    }

    return successFn(newState.result, newState);
  }

  // map :: Parser e a s ~> (a -> b) -> Parser e b s
  map<T2>(fn: (x: T) => T2): Parser<T2, E, D> {
    const p = this.p;
    return new Parser(function Parser$map$state(
      state,
    ): ParserState<T2, E, D> {
      const newState = p(state);
      if (newState.isError) return newState as unknown as ParserState<T2, E, D>;
      return updateResult(newState, fn(newState.result));
    });
  }

  // chain :: Parser e a s ~> (a -> Parser e b s) -> Parser e b s
  chain<T2>(fn: (x?: T) => Parser<T2, E, D>): Parser<T2, E, D> {
    const p = this.p;
    return new Parser(function Parser$chain$state(
      state,
    ): ParserState<T2, E, D> {
      const newState = p(state);
      if (newState.isError) return newState as unknown as ParserState<T2, E, D>;
      return fn(newState.result).p(newState);
    });
  }

  // ap :: Parser e a s ~> Parser e (a -> b) s -> Parser e b s
  ap<T2>(parserOfFunction: Parser<(x: T) => T2, E, D>): Parser<T2, E, D> {
    const p = this.p;
    return new Parser(function Parser$ap$state(state) {
      if (state.isError) return state;

      const argumentState = p(state);
      if (argumentState.isError) return argumentState;

      const fnState = parserOfFunction.p(argumentState);
      if (fnState.isError) return fnState;

      return updateResult(fnState, fnState.result(argumentState.result));
    });
  }

  // errorMap :: Parser e a s ~> (e -> f) -> Parser f a s
  errorMap<E2>(fn: (error: Err<E, D>) => E2): Parser<T, E2, D> {
    const p = this.p;
    return new Parser(function Parser$errorMap$state(
      state,
    ): ParserState<T, E2, D> {
      const nextState = p(state);
      if (!nextState.isError) return nextState as unknown as ParserState<T, E2, D>;

      return updateError(
        nextState,
        fn({
          isError: true,
          error: nextState.error,
          index: nextState.index,
          data: nextState.data,
        }),
      );
    });
  }

  // errorChain :: Parser e a s ~> ((e, Integer, s) -> Parser f a s) -> Parser f a s
  errorChain<T2, E2>(
    fn: (error: Err<E, D>) => Parser<T2, E2, D>,
  ): Parser<T2, E2, D> {
    const p = this.p;
    return new Parser(function Parser$errorChain$state(
      state,
    ): ParserState<T2, E2, D> {
      const nextState = p(state);
      if (nextState.isError) {
        const { error, index, data } = nextState;
        const nextParser = fn({ isError: true, error, index, data });
        return nextParser.p({ ...nextState, isError: false });
      }
      return nextState as unknown as ParserState<T2, E2, D>;
    });
  }

  // mapFromData :: Parser e a s ~> (StateData a s -> b) -> Parser e b s
  mapFromData<T2>(fn: (data: Ok<T, D>) => T2): Parser<T2, E, D> {
    const p = this.p;
    return new Parser(
      (state): ParserState<T2, E, D> => {
        const newState = p(state);
        if (newState.isError && newState.error) return newState as unknown as ParserState<T2, E, D>;
        return updateResult(
          newState,
          fn({
            isError: false,
            result: newState.result,
            data: newState.data,
            index: newState.index,
          }),
        );
      },
    );
  }

  // chainFromData :: Parser e a s ~> (StateData a s -> Parser f b t) -> Parser f b t
  chainFromData<T2, E2>(
    fn: (data: { result: T; data: D }) => Parser<T2, E2, D>,
  ): Parser<T2, E2, D> {
    const p = this.p;
    return new Parser(function Parser$chainFromData$state(
      state,
    ): ParserState<T2, E2, D> {
      const newState = p(state);
      if (newState.isError && newState.error) return newState as unknown as ParserState<T2, E2, D>;
      return fn({ result: newState.result, data: newState.data }).p(newState);
    });
  }

  // mapData :: Parser e a s ~> (s -> t) -> Parser e a t
  mapData<D2>(fn: (data: D) => D2): Parser<T, E, D2> {
    const p = this.p;
    return new Parser(function mapData$state(state) {
      const newState = p(state);
      return updateData(newState, fn(newState.data));
    });
  }

  // of :: a -> Parser e a s
  static of<T, E = any, D = null>(x: T): Parser<T, E, D> {
    return new Parser(state => updateResult(state, x));
  }
}
