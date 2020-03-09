// data ParserState e a s
// data Parser e a s = { p: ParserState e a s }
// data StateData a s = { result: a, data: s }
// data ParsingResult e a = Ok a | Error e

// Caching compiled regexs for better performance
const reDigit = /[0-9]/;
const reDigits = /^[0-9]+/;
const reLetter = /[a-zA-Z]/;
const reLetters = /^[a-zA-Z]+/;
const reWhitespaces = /^\s+/;

//    createParserState :: x -> s -> ParserState e a s
const createParserState = (target, data = null) => ({
  isError: false,
  error: null,
  target,
  data,
  index: 0,
  result: null,
});

//    updateError :: (ParserState e a s, f) -> ParserState f a s
const updateError = (state, error) => ({ ...state, isError: true, error });

//    updateResult :: (ParserState e a s, b) -> ParserState e b s
const updateResult = (state, result) => ({ ...state, result });

//    updateData :: (ParserState e a s, t) -> ParserState e b t
const updateData = (state, data) => ({ ...state, data });

//    updateResult :: (ParserState e a s, b, Integer) -> ParserState e b s
const updateParserState = (state, result, index) => ({
  ...state,
  result,
  index,
});

//         data Parser e a s
export function Parser(p) {
  this.p = p;
}

//               run :: Parser e a s ~> x -> Either e a
Parser.prototype.run = function Parser$run(targetString) {
  const state = createParserState(targetString, null);

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
};

//               fork :: Parser e a s ~> x -> (e -> ParserState e a s -> f) -> (a -> ParserState e a s -> b)
Parser.prototype.fork = function Parser$fork(targetString, errorFn, successFn) {
  const state = createParserState(targetString);
  const newState = this.p(state);

  if (newState.isError) {
    return errorFn(newState.error, newState);
  }

  return successFn(newState.result, newState);
};

//               map :: Parser e a s ~> (a -> b) -> Parser e b s
Parser.prototype['fantasy-land/map'] = function Parser$map(fn) {
  const p = this.p;
  return new Parser(function Parser$map$state(state) {
    const newState = p(state);
    if (newState.isError) return newState;
    return updateResult(newState, fn(newState.result));
  });
};

//                chain :: Parser e a s ~> (a -> Parser e b s) -> Parser e b s
Parser.prototype['fantasy-land/chain'] = function Parser$chain(fn) {
  const p = this.p;
  return new Parser(function Parser$chain$state(state) {
    const newState = p(state);
    if (newState.isError) return newState;
    return fn(newState.result).p(newState);
  });
};

//               ap :: Parser e a s ~> Parser e (a -> b) s -> Parser e b s
Parser.prototype['fantasy-land/ap'] = function Parser$ap(parserOfFunction) {
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
Parser.prototype.errorMap = function Parser$errorMap(fn) {
  const p = this.p;
  return new Parser(function Parser$errorMap$state(state) {
    const nextState = p(state);
    if (!nextState.isError) return nextState;

    return updateError(
      nextState,
      fn(nextState.error, nextState.index, nextState.data),
    );
  });
};

//               errorChain :: Parser e a s ~> ((e, Integer, s) -> Parser f a s) -> Parser f a s
Parser.prototype.errorChain = function Parser$errorChain(fn) {
  const p = this.p;
  return new Parser(function Parser$errorChain$state(state) {
    const nextState = p(state);
    if (nextState.isError) {
      const { error, index, data } = nextState;
      const nextParser = fn({ error, index, data });
      return nextParser.p({ ...nextState, isError: false });
    }
    return nextState;
  });
};

//               mapFromData :: Parser e a s ~> (StateData a s -> b) -> Parser e b s
Parser.prototype.mapFromData = function Parser$mapFromData(fn) {
  const p = this.p;
  return new Parser(function Parser$mapFromData$state(state) {
    const newState = p(state);
    if (newState.error) return newState;
    return updateResult(
      newState,
      fn({ result: newState.result, data: newState.data }),
    );
  });
};

//               chainFromData :: Parser e a s ~> (StateData a s -> Parser f b t) -> Parser f b t
Parser.prototype.chainFromData = function Parser$chainFromData(fn) {
  const p = this.p;
  return new Parser(function Parser$chainFromData$state(state) {
    const newState = p(state);
    if (newState.error) return newState;
    return fn({ result: newState.result, data: newState.data }).p(newState);
  });
};

//               mapData :: Parser e a s ~> (s -> t) -> Parser e a t
Parser.prototype.mapData = function Parser$mapData(fn) {
  const p = this.p;
  return new Parser(function mapData$state(state) {
    const newState = p(state);
    return updateData(newState, fn(newState.data));
  });
};

//                   of :: a -> Parser e a s
Parser['fantasy-land/of'] = function Parser$of(x) {
  return new Parser(state => updateResult(state, x));
};

Parser.prototype.map = Parser.prototype['fantasy-land/map'];
Parser.prototype.ap = Parser.prototype['fantasy-land/ap'];
Parser.prototype.chain = Parser.prototype['fantasy-land/chain'];
Parser.of = Parser['fantasy-land/of'];

//           getData :: Parser e a s
export const getData = new Parser(function getData$state(state) {
  if (state.isError) return state;
  return updateResult(state, state.data);
});

//           setData :: t -> Parser e a t
export const setData = function setData(x) {
  return new Parser(function setData$state(state) {
    if (state.isError) return state;
    return updateData(state, x);
  });
};

//           mapData :: (s -> t) -> Parser e a t
export const mapData = function mapData(fn) {
  return new Parser(function mapData$state(state) {
    if (state.isError) return state;
    return updateData(state, fn(state.data));
  });
};

//           withData :: Parser e a x -> s -> Parser e a s
export const withData = function withData(parser) {
  return function withData$stateData(stateData) {
    return setData(stateData).chain(() => parser);
  };
};

//           pipeParsers :: [Parser * * *] -> Parser * * *
export const pipeParsers = function pipeParsers(parsers) {
  return new Parser(function pipeParsers$state(state) {
    let nextState = state;
    for (const parser of parsers) {
      nextState = parser.p(nextState);
    }
    return nextState;
  });
};

//           composeParsers :: [Parser * * *] -> Parser * * *
export const composeParsers = function composeParsers(parsers) {
  return new Parser(function composeParsers$state(state) {
    return pipeParsers([...parsers].reverse()).p(state);
  });
};

//           tapParser :: (a => ()) -> Parser e a s
export const tapParser = function tapParser(fn) {
  return new Parser(function tapParser$state(state) {
    fn(state);
    return state;
  });
};

//           parse :: Parser e a s -> String -> Either e a
export const parse = function parse(parser) {
  return function parse$targetString(targetString) {
    return parser.run(targetString);
  };
};

//           decide :: (a -> Parser e b s) -> Parser e b s
export const decide = function decide(fn) {
  return new Parser(function decide$state(state) {
    if (state.isError) return state;
    const parser = fn(state.result);
    return parser.p(state);
  });
};

//           fail :: e -> Parser e a s
export const fail = function fail(errorMessage) {
  return new Parser(function fail$state(state) {
    if (state.isError) return state;
    return updateError(state, errorMessage);
  });
};

//           succeedWith :: a -> Parser e a s
export const succeedWith = Parser.of;

//           either :: Parser e a s -> Parser e (Either e a) s
export const either = function either(parser) {
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
export const coroutine = function coroutine(g) {
  return Parser.of().chain(_ => {
    const generator = g();

    const step = nextValue => {
      const result = generator.next(nextValue);
      const value = result.value;
      const done = result.done;

      if (!done && (!value || typeof value.chain !== 'function')) {
        throw new Error(
          `[coroutine] yielded values must be Parsers, got ${result.value}.`,
        );
      }

      return done ? Parser.of(value) : value.chain(step);
    };

    return step();
  });
};

//           many :: Parser e s a -> Parser e s [a]
export const many = function many(parser) {
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

        if (nextState.index >= nextState.target.length) {
          break;
        }
      }
    }

    return updateResult(nextState, results);
  });
};

//           many1 :: Parser e s a -> Parser e s [a]
export const many1 = function many1(parser) {
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
export const mapTo = function mapTo(fn) {
  return new Parser(function mapTo$state(state) {
    if (state.isError) return state;
    return updateResult(state, fn(state.result));
  });
};

//           errorMapTo :: (ParserState e a s -> f) -> Parser f a s
export const errorMapTo = function errorMapTo(fn) {
  return new Parser(function errorMapTo$state(state) {
    if (!state.isError) return state;
    return updateError(state, fn(state.error, state.index, state.data));
  });
};

//           char :: Char -> Parser e Char s
export const char = function char(c) {
  if (!c || c.length !== 1) {
    throw new TypeError(
      `char must be called with a single character, but got ${c}`,
    );
  }

  return new Parser(function char$state(state) {
    if (state.isError) return state;

    const { target, index } = state;
    if (index < target.length) {
      return target[index] === c
        ? updateParserState(state, c, index + 1)
        : updateError(
            state,
            `ParseError (position ${index}): Expecting character '${c}', got '${target[index]}'`,
          );
    }
    return updateError(
      state,
      `ParseError (position ${index}): Expecting character '${c}', but got end of input.`,
    );
  });
};

//           str :: String -> Parser e String s
export const str = function str(s) {
  if (!s || s.length < 1) {
    throw new TypeError(
      `str must be called with a string with length > 1, but got ${s}`,
    );
  }

  return new Parser(function str$state(state) {
    const { target, index } = state;
    const rest = target.slice(index);

    if (rest.length >= 1) {
      return rest.startsWith(s)
        ? updateParserState(state, s, index + s.length)
        : updateError(
            state,
            `ParseError (position ${index}): Expecting string '${s}', got '${rest.slice(
              0,
              s.length,
            )}...'`,
          );
    }

    return updateError(
      state,
      `ParseError (position ${index}): Expecting string '${s}', but got end of input.`,
    );
  });
};

//           regex :: RegExp -> Parser e String s
export const regex = function regex(re) {
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
    const { target, index } = state;
    const rest = target.slice(index);

    if (rest.length >= 1) {
      const match = rest.match(re);
      return match
        ? updateParserState(state, match[0], index + match[0].length)
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
export const digit = new Parser(function digit$state(state) {
  if (state.isError) return state;

  const { target, index } = state;

  if (target.length > index) {
    return target.length && target[index] && reDigit.test(target[index])
      ? updateParserState(state, target[index], index + 1)
      : updateError(
          state,
          `ParseError (position ${index}): Expecting digit, got '${target[index]}'`,
        );
  }
  return updateError(
    state,
    `ParseError (position ${index}): Expecting digit, but got end of input.`,
  );
});

//           digits :: Parser e String s
export const digits = regex(reDigits).errorMap(
  (_, index) => `ParseError (position ${index}): Expecting digits`,
);

//           letter :: Parser e Char s
export const letter = new Parser(function letter$state(state) {
  if (state.isError) return state;

  const { index, target } = state;

  if (target.length > index) {
    return target.length && target[index] && reLetter.test(target[index])
      ? updateParserState(state, target[index], index + 1)
      : updateError(
          state,
          `ParseError (position ${index}): Expecting letter, got '${target[index]}'`,
        );
  }

  return updateError(
    state,
    `ParseError (position ${index}): Expecting letter, but got end of input.`,
  );
});

//           letters :: Parser e String s
export const letters = regex(reLetters).errorMap(
  (_, index) => `ParseError (position ${index}): Expecting letters`,
);

//           anyOfString :: String -> Parser e Char s
export const anyOfString = function anyOfString(s) {
  return new Parser(function anyOfString$state(state) {
    if (state.isError) return state;

    const { target, index } = state;

    if (target.length > index) {
      return s.includes(target[index])
        ? updateParserState(state, target[index], index + 1)
        : updateError(
            state,
            `ParseError (position ${index}): Expecting any of the string "${s}", got ${target[index]}`,
          );
    }
    return updateError(
      state,
      `ParseError (position ${index}): Expecting any of the string "${s}", but got end of input.`,
    );
  });
};

//           namedSequenceOf :: [(String, Parser * * *)] -> Parser e (StrMap *) s
export const namedSequenceOf = function namedSequenceOf(pairedParsers) {
  return new Parser(function namedSequenceOf$state(state) {
    if (state.isError) return state;

    const results = {};
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
export const sequenceOf = function sequenceOf(parsers) {
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
export const sepBy = function sepBy(sepParser) {
  return function sepBy$valParser(valParser) {
    return new Parser(function sepBy$valParser$state(state) {
      if (state.isError) return state;

      let nextState = state;
      let error = null;
      const results = [];

      while (true) {
        const valState = valParser.p(nextState);
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
export const sepBy1 = function sepBy1(sepParser) {
  return function sepBy1$valParser(valParser) {
    return new Parser(function sepBy1$valParser$state(state) {
      if (state.isError) return state;

      const out = sepBy(sepParser)(valParser).p(state);
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
export const choice = function choice(parsers) {
  return new Parser(function choice$state(state) {
    if (state.isError) return state;

    let error = null;
    for (const parser of parsers) {
      const out = parser.p(state);

      if (!out.isError) return out;

      if (!error || (error && out.index > error.index)) {
        error = out;
      }
    }

    return error;
  });
};

//           between :: Parser e a s -> Parser e b s -> Parser e c s -> Parser e b s
export const between = function between(leftParser) {
  return function between$rightParser(rightParser) {
    return function between$parser(parser) {
      return sequenceOf([leftParser, parser, rightParser]).map(([_, x]) => x);
    };
  };
};

//           everythingUntil :: Parser e a s -> Parser e String s
export const everythingUntil = function everythingUntil(parser) {
  return new Parser(state => {
    if (state.isError) return state;

    const results = [];
    let nextState = state;

    while (true) {
      const out = parser.p(nextState);

      if (out.isError) {
        const { index, target } = nextState;
        const val = target[index];

        if (val) {
          results.push(val);
          nextState = updateParserState(nextState, val, index + 1);
        } else {
          return updateError(
            nextState,
            `ParseError 'everythingUntil' (position ${nextState.index}): Unexpected end of input.`,
          );
        }
      } else {
        break;
      }
    }

    return updateResult(nextState, results.join(''));
  });
};

//           anythingExcept :: Parser e a s -> Parser e Char s
export const anythingExcept = function anythingExcept(parser) {
  return new Parser(function anythingExcept$state(state) {
    if (state.isError) return state;
    const { target, index } = state;

    const out = parser.p(state);
    if (out.isError) {
      return updateParserState(state, target[index], index + 1);
    }
    return updateError(
      state,
      `ParseError 'anythingExcept' (position ${index}): Matched '${out.result}' from the exception parser`,
    );
  });
};

//           lookAhead :: Parser e a s -> Parser e a s
export const lookAhead = function lookAhead(parser) {
  return new Parser(function lookAhead$state(state) {
    if (state.isError) return state;
    const nextState = parser.p(state);
    return nextState.isError
      ? updateError(state, nextState.error)
      : updateResult(state, nextState.result);
  });
};

//           possibly :: Parser e a s -> Parser e (a | Null) s
export const possibly = function possibly(parser) {
  return new Parser(function possibly$state(state) {
    if (state.isError) return state;

    const nextState = parser.p(state);
    return nextState.isError ? updateResult(state, null) : nextState;
  });
};

//           skip :: Parser e a s -> Parser e a s
export const skip = function skip(parser) {
  return new Parser(function skip$state(state) {
    if (state.isError) return state;
    const nextState = parser.p(state);
    if (nextState.isError) return nextState;

    return updateResult(nextState, state.result);
  });
};

//           endOfInput :: Parser e Null s
export const endOfInput = new Parser(function endOfInput$state(state) {
  if (state.isError) return state;
  const { target, index } = state;
  if (index !== target.length) {
    return updateError(
      state,
      `ParseError 'endOfInput' (position ${index}): Expected end of input but got '${target.slice(
        index,
        index + 1,
      )}'`,
    );
  }

  return updateResult(state, null);
});

//           whitespace :: Parser e String s
export const whitespace = regex(reWhitespaces)
  // Keeping this error even though the implementation no longer uses many1. Will change it to something more appropriate in the next major release.
  .errorMap(
    (_, index) =>
      `ParseError 'many1' (position ${index}): Expecting to match at least one value`,
  );

//           optionalWhitespace :: Parser e String s
export const optionalWhitespace = possibly(whitespace).map(x => x || '');

//           recursiveParser :: (() => Parser e a s) -> Parser e a s
export const recursiveParser = function recursiveParser(parserThunk) {
  return new Parser(function recursiveParser$state(state) {
    return parserThunk().p(state);
  });
};

//           takeRight :: Parser e a s -> Parser f b t -> Parser f b t
export const takeRight = function takeRight(leftParser) {
  return function takeRight$rightParser(rightParser) {
    return leftParser.chain(() => rightParser);
  };
};

//           takeLeft :: Parser e a s -> Parser f b t -> Parser e a s
export const takeLeft = function takeLeft(leftParser) {
  return function takeLeft$rightParser(rightParser) {
    return leftParser.chain(x => rightParser.map(() => x));
  };
};

//           toPromise :: ParserResult e a s -> Promise (e, Integer, s) a
export const toPromise = function toPromise(result) {
  return result.isError
    ? Promise.reject({
        error: result.error,
        index: result.index,
        data: result.data,
      })
    : Promise.resolve(result.result);
};

//           toValue :: ParserResult e a s -> a
export const toValue = function toValue(result) {
  if (result.isError) {
    const e = new Error(result.error);
    e.parseIndex = result.index;
    e.data = result.data;
    throw e;
  }
  return result.result;
};
