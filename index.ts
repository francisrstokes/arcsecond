// Caching compiled regexs for better performance
const reDigit = /[0-9]/;
const reDigits = /^[0-9]+/;
const reLetter = /[a-zA-Z]/;
const reLetters = /^[a-zA-Z]+/;
const reWhitespaces = /^\s+/;
const reErrorExpectation = /ParseError.+Expecting/;

export type TypedArray = Int8Array | Uint8Array | Int16Array | Uint16Array | Int32Array | Uint32Array | Uint8ClampedArray | Float32Array | Float64Array;

export type InputType = string | ArrayBuffer | DataView | TypedArray

export const isTypedArray = (x: any) => (
  x instanceof Uint8Array ||
  x instanceof Uint8ClampedArray ||
  x instanceof Int8Array ||
  x instanceof Uint16Array ||
  x instanceof Int16Array ||
  x instanceof Uint32Array ||
  x instanceof Int32Array ||
  x instanceof Float32Array ||
  x instanceof Float64Array
);

export enum InputTypes {
  STRING = 'string',
  ARRAY_BUFFER = 'arrayBuffer',
  TYPED_ARRAY = 'typedArray',
  DATA_VIEW = 'dataView'
};

const text = {Encoder: TextEncoder, Decoder: TextDecoder};

if (typeof TextEncoder !== 'undefined') {
  text.Encoder = TextEncoder;
  text.Decoder = TextDecoder;
} else {
  try {
    // const util = import('util');
    // text.Encoder = util.TextEncoder;
    // text.Decoder = util.TextDecoder;
  } catch (ex) {
    throw new Error('Arcsecond requires TextEncoder and TextDecoder to be polyfilled.');
  }
}

export const encoder = new text.Encoder();
export const decoder = new text.Decoder();

const getString = (index: number, length: number, dataView: DataView) => {
  const bytes = Uint8Array.from({length}, (_, i) => dataView.getUint8(index + i));
  const decodedString = decoder.decode(bytes);
  return decodedString;
};
const getNextCharWidth = (index: number, dataView: DataView) => {
  const byte = dataView.getUint8(index);
  if ((byte & 0x80) >> 7 === 0) return 1;
  else if ((byte & 0xe0) >> 5 === 0b110) return 2;
  else if ((byte & 0xf0) >> 4 === 0b1110) return 3;
  else if ((byte & 0xf0) >> 4 === 0b1111) return 4;
  return 1;
}
const getUtf8Char = (index: number, length: number, dataView: DataView) => {
  const bytes = Uint8Array.from({length}, (_, i) => dataView.getUint8(index + i));
  return decoder.decode(bytes);
};
const getCharacterLength = (str: string) => {
  let cp;
  let total = 0;
  let i = 0;
  while (i < str.length) {
    cp = str.codePointAt(i);
    while (cp) {
      cp = cp >> 8;
      i++;
    }
    total++;
  }
  return total;
}

//    createParserState :: x -> s -> ParserState e a s
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
    throw new Error(`Cannot process input. Must be a string, ArrayBuffer, TypedArray, or DataView. but got ${typeof target}`);
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

//    updateError :: (ParserState e a s, f) -> ParserState f a s
const updateError = <T, E, D, E2>(state: ParserState<T, E, D>, error: E2): ParserState<T, E2, D> => ({ ...state, isError: true, error });

//    updateResult :: (ParserState e a s, b) -> ParserState e b s
const updateResult = <T, E, D, T2>(state: ParserState<T, E, D>, result: T2): ParserState<T2, E, D> => ({ ...state, result });

//    updateData :: (ParserState e a s, t) -> ParserState e b t
const updateData = <T, E, D, D2>(state: ParserState<T, E, D>, data: D2): ParserState<T, E, D2> => ({ ...state, data });

//    updateResult :: (ParserState e a s, b, Integer) -> ParserState e b s
const updateParserState = <T, E, D, T2>(state: ParserState<T, E, D>, result: T2, index: number): ParserState<T2, E, D> => ({
  ...state,
  result,
  index,
});

type StateTransformerFunction<T, E = any, D = null> = (state: ParserState<any, any, any>) => ParserState<T, E, D>;
export type FnReturingParserIterator<T> = () => Iterator<Parser<any>, T>;

export type ParserState<T, E, D> = {
  dataView: DataView;
  inputType: InputType;
} & InternalResultType<T, E, D>

export type InternalResultType<T, E, D> = {
  isError: boolean;
  error: E;
  index: number;
  result: T;
  data: D;
}

export type ResultType<T, E, D> = Err<E, D> | Ok<T, D>

export type Err<E, D> = {
  isError: true;
  error: E;
  index: number;
  data: D;
}

export type Ok <T, D> = {
  isError: false;
  index: number;
  result: T;
  data: D;
}



export class Parser<T, E = string, D = null> {
    p: StateTransformerFunction<T, E, D>

    constructor(p: StateTransformerFunction<T, E, D>) {
        this.p = p
    }
    
    //               run :: Parser e a s ~> x -> Either e a
run(target: InputType): ResultType<T, E, D> {
    const state = createParserState(target);
  
    const resultState = this.p(state);
  
    if (resultState.isError) {
      return {
        isError: true,
        error: resultState.error,
        index: resultState.index,
        data: resultState.data,
      }
    }
  
    return {
      isError: false,
      result: resultState.result,
      index: resultState.index,
      data: resultState.data,
    };
  };
  
  //               fork :: Parser e a s ~> x -> (e -> ParserState e a s -> f) -> (a -> ParserState e a s -> b)
  fork<F>(target: InputType, errorFn: (errorMsg: E, parsingState: ParserState<T, E, D>) => F, successFn: (result: T, parsingState: ParserState<T, E, D>) => F) {
    const state = createParserState(target);
    const newState = this.p(state);
  
    if (newState.isError) {
      return errorFn(newState.error, newState);
    }
  
    return successFn(newState.result, newState);
  };
  
  //               map :: Parser e a s ~> (a -> b) -> Parser e b s
  map<T2>(fn: (x: T) => T2): Parser<T | T2, E, D>{
    const p = this.p;
    return new Parser(function Parser$map$state(state): ParserState<T | T2, E, D> {
      const newState = p(state);
      if (newState.isError) return newState;
      return updateResult(newState, fn(newState.result));
    });
  };
  
  //                chain :: Parser e a s ~> (a -> Parser e b s) -> Parser e b s
  chain<T2>(fn: (x?: T) => Parser<T2, E, D>): Parser<T | T2, E, D> {
    const p = this.p;
    return new Parser(function Parser$chain$state(state): ParserState<T | T2, E, D> {
      const newState = p(state);
      if (newState.isError) return newState;
      return fn(newState.result).p(newState);
    });
  };
  
  //               ap :: Parser e a s ~> Parser e (a -> b) s -> Parser e b s
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
  };
  
  //               errorMap :: Parser e a s ~> (e -> f) -> Parser f a s
  errorMap<E2>(fn: (error: Err<E, D>) => E2): Parser<T, E | E2, D> {
    const p = this.p;
    return new Parser(function Parser$errorMap$state(state): ParserState<T, E | E2, D> {
      const nextState = p(state);
      if (!nextState.isError) return nextState;
  
      return updateError(
        nextState,
        fn({
          isError: true,
          error: nextState.error,
          index: nextState.index,
          data: nextState.data
        }),
      );
    });
  };
  
  //               errorChain :: Parser e a s ~> ((e, Integer, s) -> Parser f a s) -> Parser f a s
  errorChain<T2>(fn: (error: Err<E, D>) => Parser<T2, E, D>): Parser<T | T2, E, D> {
    const p = this.p;
    return new Parser(function Parser$errorChain$state(state): ParserState<T | T2, E, D> {
      const nextState = p(state);
      if (nextState.isError) {
        const { error, index, data } = nextState;
        const nextParser = fn({ isError: true, error, index, data });
        return nextParser.p({ ...nextState, isError: false });
      }
      return nextState;
    });
  };
  
  //               mapFromData :: Parser e a s ~> (StateData a s -> b) -> Parser e b s
  mapFromData<T2>(fn: (data: Ok<T, D>) => T2): Parser<T | T2, E, D> {
    const p = this.p;
    return new Parser((state): ParserState<T | T2, E, D> => {
      const newState = p(state);
      if (newState.isError && newState.error) return newState;
      return updateResult(
        newState,
        fn({ isError: false, result: newState.result, data: newState.data, index: newState.index }),
      );
    });
  };
  
  //               chainFromData :: Parser e a s ~> (StateData a s -> Parser f b t) -> Parser f b t
  chainFromData<T2>(fn: (data: {result: T, data: D}) => Parser<T2, E, D>): Parser<T | T2, E, D> {
    const p = this.p;
    return new Parser(function Parser$chainFromData$state(state): ParserState<T | T2, E, D> {
      const newState = p(state);
      if (newState.isError && newState.error) return newState;
      return fn({ result: newState.result, data: newState.data }).p(newState);
    });
  };
  
  //               mapData :: Parser e a s ~> (s -> t) -> Parser e a t
  mapData<D2>(fn: (data: D) => D2): Parser<T, E, D2> {
    const p = this.p;
    return new Parser(function mapData$state(state) {
      const newState = p(state);
      return updateData(newState, fn(newState.data));
    });
  };
  
  //                   of :: a -> Parser e a s
  static of<T, E = any, D = null>(x: T): Parser<T, E, D> {
    return new Parser(state => updateResult(state, x));
  };
}

//           getData :: Parser e a s
export function getData() {
  return new Parser(function getData$state(state) {
    if (state.isError) return state;
    return updateResult(state, state.data);
  })
};

//           setData :: t -> Parser e a t
export function setData<D2>(data: D2): Parser<any, any, D2> {
  return new Parser(function setData$state(state) {
    if (state.isError) return state;
    return updateData(state, data);
  });
};

//           mapData :: (s -> t) -> Parser e a t
export function mapData<D2>(fn: (data: any ) => D2): Parser<any, any, D2> {
  return new Parser(function mapData$state(state) {
    if (state.isError) return state;
    return updateData(state, fn(state.data));
  });
};

//           withData :: Parser e a x -> s -> Parser e a s
export function withData<T, D>(parser: Parser<T, any, any>): (data: D) => Parser<T, any, D> {
  return function withData$stateData(stateData) {
    return setData(stateData).chain(() => parser);
  };
};

//           pipeParsers :: [Parser * * *] -> Parser * * *
export function pipeParsers(parsers: Parser<any>[]): Parser<any> {
  return new Parser(function pipeParsers$state(state) {
    let nextState = state;
    for (const parser of parsers) {
      nextState = parser.p(nextState);
    }
    return nextState;
  });
};

//           composeParsers :: [Parser * * *] -> Parser * * *
export const composeParsers = function composeParsers(parsers: Parser<any>[]): Parser<any> {
  return new Parser(function composeParsers$state(state) {
    return pipeParsers([...parsers].reverse()).p(state);
  });
};

//           tapParser :: (a => ()) -> Parser e a s
export const tapParser = function tapParser(fn: (state: ParserState<any, any, any>) => void): Parser<any> {
  return new Parser(function tapParser$state(state) {
    fn(state);
    return state;
  });
};

//           parse :: Parser e a s -> String -> Either e a
export function parse<T, E, D>(parser: Parser<T, E, D>): (target: InputType) => ResultType<T, E, D> {
  return function parse$targetString(target) {
    return parser.run(target);
  };
};

//           decide :: (a -> Parser e b s) -> Parser e b s
export function decide<T>(fn: (state: ParserState<any, any, any>) => Parser<T>): Parser<T> {
  return new Parser(function decide$state(state) {
    if (state.isError) return state;
    const parser = fn(state.result);
    return parser.p(state);
  });
};

//           fail :: e -> Parser e a s
export function fail<E>(errorMessage: E) {
  return new Parser<any, E>(function fail$state(state) {
    if (state.isError) return state;
    return updateError(state, errorMessage);
  });
};

//           succeedWith :: a -> Parser e a s
export const succeedWith = Parser.of;

//           either :: Parser e a s -> Parser e (Either e a) s
export function either<T>(parser: Parser<T>): Parser<T> {
  return new Parser(function either$state(state) {
    if (state.isError) return state;

    const nextState = parser.p(state);

    return updateResult(
      { ...nextState, isError: false },
      {
        isError: nextState.isError,
        value: nextState.isError ? nextState.error : nextState.result,
      },
    );
  });
};

//           coroutine :: (() -> Iterator (Parser e a s)) -> Parser e a s
export function coroutine<T>(g: FnReturingParserIterator<T>): Parser<T> {
  return new Parser(function coroutine$state(state) {
    const generator = g();

    let nextValue = undefined;
    let nextState = state;

    while (true) {
      const result = generator.next(nextValue);
      const value = result.value;
      const done = result.done;

      if (done) {
        return updateResult(nextState, value);
      }

      if (!(value && value instanceof Parser)) {
        throw new Error(
          `[coroutine] yielded values must be Parsers, got ${result.value}.`,
        );
      }

      nextState = value.p(nextState);
      if (nextState.isError) {
        return nextState;
      }

      nextValue = nextState.result;
    }
  });
};

//           exactly :: (Integer) -> (Parser e s a) -> Parser e s [a]
export function exactly<T>(n: number): (p: Parser<T>) => Parser<T[]> {
  if (typeof n !== 'number' || n <= 0) {
    throw new TypeError (`exactly must be called with a number > 0, but got ${n}`);
  }
  return function exactly$factory(parser) {
    return new Parser(function exactly$factory$state(state) {
      if (state.isError) return state;

      const results = [];
      let nextState = state;

      for (let i = 0; i < n; i++) {
        const out = parser.p(nextState);
        if(out.isError) {
          return out;
        } else {
          nextState = out;
          results.push(nextState.result);
        }
      }

      return updateResult(nextState, results);
    }).errorMap(({index, error}) => `ParseError (position ${index}): Expecting ${n}${error.replace(reErrorExpectation, '')}`);
  }
}

//           many :: Parser e s a -> Parser e s [a]
export const many = function many<T>(parser: Parser<T>): Parser<T[]> {
  return new Parser(function many$state(state) {
    if (state.isError) return state;

    const results = [];
    let nextState = state;

    while (true) {
      const out = parser.p(nextState);

      if (out.isError) {
        break;
      } else {
        nextState = out;
        results.push(nextState.result);

        if (nextState.index >= nextState.dataView.byteLength) {
          break;
        }
      }
    }

    return updateResult(nextState, results);
  });
};

//           many1 :: Parser e s a -> Parser e s [a]
export const many1 = function many1<T>(parser: Parser<T>): Parser<T[]> {
  return new Parser(function many1$state(state) {
    if (state.isError) return state;

    const resState = many(parser).p(state);
    if (resState.result.length) return resState;

    return updateError(
      state,
      `ParseError 'many1' (position ${state.index}): Expecting to match at least one value`,
    );
  });
};

//           mapTo :: (a -> b) -> Parser e b s
export function mapTo<T>(fn: (x: any) => T): Parser<T> {
  return new Parser(function mapTo$state(state) {
    if (state.isError) return state;
    return updateResult(state, fn(state.result));
  });
};

//           errorMapTo :: (ParserState e a s -> f) -> Parser f a s
export function errorMapTo<E, D>(fn: (error: any, index: number, data: D) => E): Parser<any, E, D> {
  return new Parser(function errorMapTo$state(state) {
    if (!state.isError) return state;
    return updateError(state, fn(state.error, state.index, state.data));
  });
};

//           char :: Char -> Parser e Char s
export const char = function char(c: string): Parser<string> {
  if (!c || getCharacterLength(c) !== 1) {
    throw new TypeError(
      `char must be called with a single character, but got ${c}`,
    );
  }

  return new Parser(function char$state(state) {
    if (state.isError) return state;

    const { index, dataView } = state;
    if (index < dataView.byteLength) {
      const charWidth = getNextCharWidth(index, dataView);
      if (index + charWidth <= dataView.byteLength) {
        const char = getUtf8Char(index, charWidth, dataView);
        return char === c
          ? updateParserState(state, c, index + charWidth)
          : updateError(
              state,
              `ParseError (position ${index}): Expecting character '${c}', got '${char}'`,
            );
      }
    }
    return updateError(
      state,
      `ParseError (position ${index}): Expecting character '${c}', but got end of input.`,
    );
  });
};

//           anyChar :: Parser e Char s
export const anyChar: Parser<string> = new Parser(function anyChar$state(state) {
  if (state.isError) return state;

  const { index, dataView } = state;
  if (index < dataView.byteLength) {
    const charWidth = getNextCharWidth(index, dataView);
    if (index + charWidth <= dataView.byteLength) {
      const char = getUtf8Char(index, charWidth, dataView);
      return updateParserState(state, char, index + charWidth);
    }
  }
  return updateError(
    state,
    `ParseError (position ${index}): Expecting a character, but got end of input.`,
  );
});

//           peek :: Parser e Char s
export const peek: Parser<number> = new Parser(function peek$state(state) {
  if (state.isError) return state;

  const { index, dataView } = state;
  if (index < dataView.byteLength) {
    return updateParserState(state, dataView.getUint8(index), index);
  }
  return updateError(
    state,
    `ParseError (position ${index}): Unexpected end of input.`,
  );
});

//           str :: String -> Parser e String s
export function str(s: string): Parser<string> {
  if (!s || getCharacterLength(s) < 1) {
    throw new TypeError(
      `str must be called with a string with length > 1, but got ${s}`,
    );
  }

  const encodedStr = encoder.encode(s);

  return new Parser(function str$state(state) {
    const { index, dataView } = state;

    const remainingBytes = dataView.byteLength - index;
    if (remainingBytes < encodedStr.byteLength) {
      return updateError(
        state,
        `ParseError (position ${index}): Expecting string '${s}', but got end of input.`,
      );
    }

    const stringAtIndex = getString(index, encodedStr.byteLength, dataView);
    return s === stringAtIndex
      ? updateParserState(state, s, index + encoder.encode(s).byteLength)
      : updateError(
          state,
          `ParseError (position ${index}): Expecting string '${s}', got '${stringAtIndex}...'`,
        );
  });
};

//           regex :: RegExp -> Parser e String s
export function regex(re: RegExp): Parser<string> {
  const typeofre = Object.prototype.toString.call(re);
  if (typeofre !== '[object RegExp]') {
    throw new TypeError(
      `regex must be called with a Regular Expression, but got ${typeofre}`,
    );
  }

  if (re.toString()[1] !== '^') {
    throw new Error(`regex parsers must contain '^' start assertion.`);
  }

  return new Parser(function regex$state(state) {
    if (state.isError) return state;
    const { dataView, index } = state;
    const rest = getString(index, dataView.byteLength - index, dataView);

    if (rest.length >= 1) {
      const match = rest.match(re);
      return match
        ? updateParserState(state, match[0], index + encoder.encode(match[0]).byteLength)
        : updateError(
            state,
            `ParseError (position ${index}): Expecting string matching '${re}', got '${rest.slice(
              0,
              5,
            )}...'`,
          );
    }
    return updateError(
      state,
      `ParseError (position ${index}): Expecting string matching '${re}', but got end of input.`,
    );
  });
};

//           digit :: Parser e String s
export const digit: Parser<string> = new Parser(function digit$state(state) {
  if (state.isError) return state;

  const { dataView, index } = state;

  if (dataView.byteLength > index) {
    const charWidth = getNextCharWidth(index, dataView);
    if (index + charWidth <= dataView.byteLength) {
      const char = getUtf8Char(index, charWidth, dataView);
      return dataView.byteLength && char && reDigit.test(char)
        ? updateParserState(state, char, index + charWidth)
        : updateError(
            state,
            `ParseError (position ${index}): Expecting digit, got '${char}'`,
          );
    }
  }

  return updateError(
    state,
    `ParseError (position ${index}): Expecting digit, but got end of input.`,
  );
});

//           digits :: Parser e String s
export const digits: Parser<string> = regex(reDigits).errorMap(
  ({index}) => `ParseError (position ${index}): Expecting digits`,
);

//           letter :: Parser e Char s
export const letter: Parser<string> = new Parser(function letter$state(state) {
  if (state.isError) return state;

  const { index, dataView } = state;

  if (dataView.byteLength > index) {
    const charWidth = getNextCharWidth(index, dataView);
    if (index + charWidth <= dataView.byteLength) {
      const char = getUtf8Char(index, charWidth, dataView);
      return dataView.byteLength && char && reLetter.test(char)
        ? updateParserState(state, char, index + charWidth)
        : updateError(
            state,
            `ParseError (position ${index}): Expecting letter, got '${char}'`,
          );
    }
  }

  return updateError(
    state,
    `ParseError (position ${index}): Expecting letter, but got end of input.`,
  );
});

//           letters :: Parser e String s
export const letters: Parser<string> = regex(reLetters).errorMap(
  ({index}) => `ParseError (position ${index}): Expecting letters`,
);

//           anyOfString :: String -> Parser e Char s
export function anyOfString(s: string): Parser<string> {
  return new Parser(function anyOfString$state(state) {
    if (state.isError) return state;

    const { dataView, index } = state;

    if (dataView.byteLength > index) {
      const charWidth = getNextCharWidth(index, dataView);
      if (index + charWidth <= dataView.byteLength) {
        const char = getUtf8Char(index, charWidth, dataView);
        return s.includes(char)
          ? updateParserState(state, char, index + charWidth)
          : updateError(
              state,
              `ParseError (position ${index}): Expecting any of the string "${s}", got ${char}`,
            );
      }
    }

    return updateError(
      state,
      `ParseError (position ${index}): Expecting any of the string "${s}", but got end of input.`,
    );
  });
};

//           namedSequenceOf :: [(String, Parser * * *)] -> Parser e (StrMap *) s
export function namedSequenceOf(pairedParsers: Array<[string, Parser<any>]>): Parser<any[]> {
  return new Parser(function namedSequenceOf$state(state) {
    if (state.isError) return state;

    const results: Record<string, any> = {};
    let nextState = state;

    for (const [key, parser] of pairedParsers) {
      const out = parser.p(nextState);
      if (out.isError) {
        return out;
      } else {
        nextState = out;
        results[key] = out.result;
      }
    }

    return updateResult(nextState, results);
  });
};

//           sequenceOf :: [Parser * * *] -> Parser * [*] *
export function sequenceOf(parsers: Parser<any>[]): Parser<any[]> {
  return new Parser(function sequenceOf$state(state) {
    if (state.isError) return state;

    const length = parsers.length;
    const results = new Array(length);
    let nextState = state;

    for (let i = 0; i < length; i++) {
      const out = parsers[i].p(nextState);

      if (out.isError) {
        return out;
      } else {
        nextState = out;
        results[i] = out.result;
      }
    }

    return updateResult(nextState, results);
  });
};

//           sepBy :: Parser e a s -> Parser e b s -> Parser e [b] s
export function sepBy<S, T>(sepParser: Parser<S>): (valueParser: Parser<T>) => Parser<T[]> {
  return function sepBy$valParser(valueParser) {
    return new Parser(function sepBy$valParser$state(state) {
      if (state.isError) return state;

      let nextState = state;
      let error = null;
      const results = [];

      while (true) {
        const valState = valueParser.p(nextState);
        const sepState = sepParser.p(valState);

        if (valState.isError) {
          error = valState;
          break;
        } else {
          results.push(valState.result);
        }

        if (sepState.isError) {
          nextState = valState;
          break;
        }

        nextState = sepState;
      }

      if (error) {
        if (results.length === 0) {
          return updateResult(state, results);
        }
        return error;
      }

      return updateResult(nextState, results);
    });
  };
};

//           sepBy1 :: Parser e a s -> Parser e b s -> Parser e [b] s
export const sepBy1 = function sepBy1<S, T>(sepParser: Parser<S>): (valueParser: Parser<T>) => Parser<T[]> {
  return function sepBy1$valParser(valueParser) {
    return new Parser(function sepBy1$valParser$state(state) {
      if (state.isError) return state;

      const out = sepBy(sepParser)(valueParser).p(state);
      if (out.isError) return out;
      if (out.result.length === 0) {
        return updateError(
          state,
          `ParseError 'sepBy1' (position ${state.index}): Expecting to match at least one separated value`,
        );
      }
      return out;
    });
  };
};

//           choice :: [Parser * * *] -> Parser * * *
export const choice = function choice(parsers: Parser<any>[]): Parser<any> {

  if(parsers.length === 0) throw new Error(`List of parsers can't be empty.`)

  return new Parser(function choice$state(state) {
    if (state.isError) return state;

    let error = null;
    for (const parser of parsers) {
      const out = parser.p(state);

      if (!out.isError) return out;

      if (error === null || (error && out.index > error.index)) {
        error = out;
      }
    }

    return error as ParserState<any, any, any>;
  });
};

//           between :: Parser e a s -> Parser e b s -> Parser e c s -> Parser e b s
export function between<L, T, R>(leftParser: Parser<L>): (rightParser: Parser<R>) => (parser: Parser<T>) => Parser<T> {
  return function between$rightParser(rightParser) {
    return function between$parser(parser) {
      return sequenceOf([leftParser, parser, rightParser]).map(([_, x]) => x);
    };
  };
};

//           everythingUntil :: Parser e a s -> Parser e String s
export function everythingUntil(parser: Parser<any>): Parser<number[]> {
  return new Parser(state => {
    if (state.isError) return state;

    const results = [];
    let nextState = state;

    while (true) {
      const out = parser.p(nextState);

      if (out.isError) {
        const { index, dataView } = nextState;

        if (dataView.byteLength <= index) {
          return updateError(
            nextState,
            `ParseError 'everythingUntil' (position ${nextState.index}): Unexpected end of input.`,
          );
        }

        const val = dataView.getUint8(index);
        if (val) {
          results.push(val);
          nextState = updateParserState(nextState, val, index + 1);
        }
      } else {
        break;
      }
    }

    return updateResult(nextState, results);
  });
};

//           everyCharUntil :: Parser e a s -> Parser e String s
export const everyCharUntil = (parser: Parser<any>) => everythingUntil(parser)
  .map(results => decoder.decode(Uint8Array.from(results)));

//           anythingExcept :: Parser e a s -> Parser e Char s
export const anythingExcept = function anythingExcept(parser: Parser<any>): Parser<number> {
  return new Parser(function anythingExcept$state(state) {
    if (state.isError) return state;
    const { dataView, index } = state;

    const out = parser.p(state);
    if (out.isError) {
      return updateParserState(state, dataView.getUint8(index), index + 1);
    }

    return updateError(
      state,
      `ParseError 'anythingExcept' (position ${index}): Matched '${out.result}' from the exception parser`,
    );
  });
};

//           anyCharExcept :: Parser e a s -> Parser e Char s
export const anyCharExcept = function anyCharExcept(parser: Parser<any>): Parser<number> {
  return new Parser(function anyCharExcept$state(state) {
    if (state.isError) return state;
    const { dataView, index } = state;

    const out = parser.p(state);
    if (out.isError) {
      if (index < dataView.byteLength) {
        const charWidth = getNextCharWidth(index, dataView);
        if (index + charWidth <= dataView.byteLength) {
          const char = getUtf8Char(index, charWidth, dataView);
          return updateParserState(state, char, index + charWidth);
        }
      }
      return updateError(
        state,
        `ParseError 'anyCharExcept' (position ${index}): Unexpected end of input`,
      );
    }

    return updateError(
      state,
      `ParseError 'anyCharExcept' (position ${index}): Matched '${out.result}' from the exception parser`,
    );
  });
};

//           lookAhead :: Parser e a s -> Parser e a s
export function lookAhead<T>(parser: Parser<T>): Parser<T> {
  return new Parser(function lookAhead$state(state) {
    if (state.isError) return state;
    const nextState = parser.p(state);
    return nextState.isError
      ? updateError(state, nextState.error)
      : updateResult(state, nextState.result);
  });
};

//           possibly :: Parser e a s -> Parser e (a | Null) s
export function possibly<T>(parser: Parser<T>): Parser<T | null> {
  return new Parser(function possibly$state(state) {
    if (state.isError) return state;

    const nextState = parser.p(state);
    return nextState.isError ? updateResult(state, null) : nextState;
  });
};

//           skip :: Parser e a s -> Parser e a s
export function skip(parser: Parser<any>): Parser<null> {
  return new Parser(function skip$state(state) {
    if (state.isError) return state;
    const nextState = parser.p(state);
    if (nextState.isError) return nextState;

    return updateResult(nextState, state.result);
  });
};

//           startOfInput :: Parser e String s
export const startOfInput: Parser<null> = new Parser(function startOfInput$state(state) {
  if (state.isError) return state;
  const { index } = state;
  if (index > 0) {
    return updateError(
      state,
      `ParseError 'startOfInput' (position ${index}): Expected start of input'`,
    );
  }

  return state;
});

//           endOfInput :: Parser e Null s
export const endOfInput: Parser<null> = new Parser(function endOfInput$state(state) {
  if (state.isError) return state;
  const { dataView, index, inputType } = state;
  if (index !== dataView.byteLength) {
    const errorByte = inputType === InputTypes.STRING
      ? String.fromCharCode(dataView.getUint8(index))
      : `0x${dataView.getUint8(index).toString(16).padStart(2, '0')}`;

    return updateError(
      state,
      `ParseError 'endOfInput' (position ${index}): Expected end of input but got '${errorByte}'`,
    );
  }

  return updateResult(state, null);
});

//           whitespace :: Parser e String s
export const whitespace: Parser<string> = regex(reWhitespaces)
  // Keeping this error even though the implementation no longer uses many1. Will change it to something more appropriate in the next major release.
  .errorMap(
    ({index}) =>
      `ParseError 'many1' (position ${index}): Expecting to match at least one value`,
  );

//           optionalWhitespace :: Parser e String s
export const optionalWhitespace: Parser<string | null> = possibly(whitespace).map(x => x || '');

//           recursiveParser :: (() => Parser e a s) -> Parser e a s
export function recursiveParser<T>(parserThunk: () => Parser<T>): Parser<T> {
  return new Parser(function recursiveParser$state(state) {
    return parserThunk().p(state);
  });
};

//           takeRight :: Parser e a s -> Parser f b t -> Parser f b t
export function takeRight<L, R>(leftParser: Parser<L>) {
  return function takeRight$rightParser(rightParser: Parser<R>) {
    return leftParser.chain(() => rightParser);
  };
};

//           takeLeft :: Parser e a s -> Parser f b t -> Parser e a s
export const takeLeft = function takeLeft<L, R>(leftParser: Parser<L>) {
  return function takeLeft$rightParser(rightParser: Parser<R>) {
    return leftParser.chain(x => rightParser.map(() => x));
  };
};

//           toPromise :: ParserResult e a s -> Promise (e, Integer, s) a
export function toPromise<T, E, D>(result: ResultType<T, E, D>) {
  return result.isError
    ? Promise.reject({
        error: result.error,
        index: result.index,
        data: result.data,
      })
    : Promise.resolve(result.result);
};

//           toValue :: ParserResult e a s -> a
export function toValue<T, E, D>(result: ResultType<T, E, D>): T {
  if (result.isError) {
    const e = new Error(String(result.error) || 'null') as any;
    e.parseIndex = result.index; 
    e.data = result.data;
    throw e;
  }
  return result.result;
};