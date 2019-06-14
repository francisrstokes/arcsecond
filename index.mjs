import Either from 'data.either';
const {Left, Right} = Either;

export function Parser(p) {
  this.p = p;
};

Parser.prototype.run = function Parser$run(targetString) {
  return this.p(Right([0, targetString, null])).map((result) => {
    return result[2];
  });
};

Parser.prototype['fantasy-land/map'] = function Parser$map(fn) {
  const that = this;
  return new Parser(function Parser$map$state (state) {
    return that.p(state).map(function Parser$map$state$map([i, s, v]) {
      return [i, s, fn(v)];
    });
  });
};

Parser.prototype['fantasy-land/chain'] = function Parser$chain(fn) {
  const that = this;
  return new Parser(function Parser$chain$state(state) {
    return that.p(state).chain(function Parser$chain$chain([i, s, v]) {
      return fn(v).p(Right([i, s, v]));
    });
  });
};

Parser.prototype['fantasy-land/ap'] = function Parser$ap(parserOfFunction) {
  const that = this;
  return new Parser(function Parser$ap$state(state) {
    return parserOfFunction.p(state).chain(function Parser$ap$chain([_, __, fn]) {
      return that.p(state).map(function Parser$ap$chain$map([i, s, v]) {
        return [i, s, fn(v)];
      });
    });
  });
};

Parser.prototype.leftMap = function Parser$leftMap(fn) {
  const that = this;
  return new Parser(function Parser$leftMap$state(state) {
    return that.p(state).leftMap(function Parser$leftMap$state$leftMap([i, e]) {
      return [i, fn(e, i)];
    });
  });
};

Parser.prototype.map = Parser.prototype['fantasy-land/map'];
Parser.prototype.ap = Parser.prototype['fantasy-land/ap'];
Parser.prototype.chain = Parser.prototype['fantasy-land/chain'];
Parser['fantasy-land/of'] = function (x) {
  return new Parser(state => {
    return state.map(([i, s]) => [i, s, x]);
  });
};
Parser.of = Parser['fantasy-land/of'];

//           pipeParsers :: [Parser * * *] -> Parser * * *
export const pipeParsers = function pipeParsers (parsers) {
  return new Parser(function pipeParsers$state (state) {
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
    return pipeParsers ([...parsers].reverse()).p(state);
  });
};

//           tapParser :: (a => void) -> Parser e a a
export const tapParser = function tapParser(fn) {
  return new Parser(function tapParser$state(state) {
    fn(state.value);
    return state;
  });
};

//           parse :: Parser e a b -> String -> Either e b
export const parse = function parse(parser) {
  return function parse$targetString(targetString) {
    return parser.run(targetString);
  };
};

//           decide :: (a -> Parser e b c) -> Parser e b c
export const decide = function decide(fn) {
  return new Parser(function decide$state(state) {
    return state.chain(function decide$state$chain([_, __, v]) {
      const parser = fn(v);
      return parser.p(state);
    });
  });
};

//           fail :: String -> Parser String a b
export const fail = function fail(errorMessage) {
  return new Parser(function fail$state(state) {
    return state.chain(function fail$state$chain([i]) {
      return Left ([i, errorMessage]);
    });
  });
};

//           succeedWith :: b -> Parser e a b
export const succeedWith = function succeedWith(x) {
  return new Parser(function succeedWith$state(state) {
    return state.map(function succeedWith$state$map([i, s]) {
      return [i, s, x]
    });
  });
};

//           either :: Parser e a b -> Parser e (Either f b) c
export const either = function either(parser) {
  return new Parser(function either$state(state) {
    return state.chain(function either$state$chain(innerState) {
      const res = parser.p(Right(innerState));
      return Right([
        res.value[0],
        innerState[1],
        res.isLeft ?
          res :
          res.map(([_, __, v]) => v)
      ]);
    });
  });
}

//           many :: Parser e a b -> Parser e a [b]
export const many = function many(parser) {
  return new Parser(function many$state(state) {
    return state.chain(function many$state$chain(innerState) {
      const results = [];
      let nextState = innerState;

      while (true) {
        const out = parser.p(Right(nextState));
        if (out.isLeft) {
          break;
        } else {
          nextState = out.value;
          results.push(nextState[2]);

          if (nextState[0] >= nextState[1].length) {
            break;
          }
        }
      }

      const [index, targetString] = nextState;
      return Right ([index, targetString, results]);
    });
  });
};

//           many1 :: Parser e a b -> Parser String a [b]
export const many1 = function many1(parser) {
  return new Parser(function many1$state(state) {
    const res = many (parser).p(state);
    return res.chain(function many1$state$chain([index, targetString, value]) {
      if (value.length === 0) {
        return Left ([index, `ParseError 'many1' (position ${index}): Expecting to match at least one value`]);
      }
      return Right ([index, targetString, value]);
    });
  });
};

//           mapTo :: (a -> b) -> Parser e a b
export const mapTo = function mapTo(fn) {
  return new Parser(function mapTo$state(state) {
    return state.map(function mapTo$state$map([index, targetString, res]) {
      return [index, targetString, fn(res)];
    });
  });
};

//           leftMapTo :: ((e, Int) -> f) -> Parser f a b
export const leftMapTo = fn => new Parser(state => {
  return state.leftMap(([index, errorString]) => {
    return [index, fn(errorString, index)];
  });
});

//           char :: Char -> Parser String a String
export const char = function char(c) {
  if (!c || c.length !== 1) {
    throw new TypeError (`char must be called with a single character, but got ${c}`);
  }

  return new Parser(function char$state (state) {
    return state.chain(function char$state$chain([index, targetString]) {
      if (index < targetString.length) {
        if (targetString[index] === c) {
          return Right ([index + 1, targetString, c]);
        } else {
          return Left ([index, `ParseError (position ${index}): Expecting character '${c}', got '${targetString[index]}'`]);
        }
      }
      return Left ([index, `ParseError (position ${index}): Expecting character '${c}', but got end of input.`]);
    });
  });
};

//           str :: String -> Parser String a String
export const str = function str(s) {
  if (!s || s.length < 1) {
    throw new TypeError (`str must be called with a string with length > 1, but got ${s}`);
  }

  return new Parser(function str$state (state) {
    return state.chain(function str$state$chain([index, targetString]) {
      const rest = targetString.slice(index);
      if (rest.length >= 1) {
        if (rest.startsWith(s)) {
          return Right ([index + s.length, targetString, s]);
        } else {
          return Left ([index, `ParseError (position ${index}): Expecting string '${s}', got '${rest.slice(0, s.length)}...'`]);
        }
      }
      return Left ([index, `ParseError (position ${index}): Expecting string '${s}', but got end of input.`]);
    });
  });
};

//           regex :: RegExp -> Parser String a String
export const regex = function regex(re) {
  const typeofre = Object.prototype.toString.call(re);
  if (typeofre !== '[object RegExp]') {
    throw new TypeError (`regex must be called with a Regular Expression, but got ${typeofre}`);
  }

  if (re.toString()[1] !== '^') {
    throw new Error(`regex parsers must contain '^' start assertion.`)
  }

  return new Parser(function regex$state(state) {
    return state.chain(function regex$state$chain([index, targetString]) {
      const rest = targetString.slice(index);
      if (rest.length >= 1) {
        const match = rest.match(re);
        if (match) {
          return Right ([index + match[0].length, targetString, match[0]]);
        } else {
          return Left ([index, `ParseError (position ${index}): Expecting string matching '${re}', got '${rest.slice(0, 5)}...'`]);
        }
      }
      return Left ([index, `ParseError (position ${index}): Expecting string matching '${re}', but got end of input.`]);
    });
  });
};

//           digit :: Parser String a String
export const digit = new Parser(function digit$state(state) {
  return state.chain(function digit$state$chain([index, targetString]) {
    const rest = targetString.slice(index);

    if (rest.length >= 1) {
      if (/[0-9]/.test(rest[0])) {
        return Right ([index + 1, targetString, rest[0]]);
      } else {
        return Left ([index, `ParseError (position ${index}): Expecting digit, got '${rest[0]}'`]);
      }
    }
    return Left ([index, `ParseError (position ${index}): Expecting digit, but got end of input.`]);
  });
});

//           digits :: Parser String a String
export const digits = many1 (digit) .map (x => x.join(''));

//           letter :: Parser String a String
export const letter = new Parser(function letter$state(state) {
  return state.chain(function letter$state$chain([index, targetString]) {
    const rest = targetString.slice(index);

    if (rest.length >= 1) {
      if (/[a-zA-Z]/.test(rest[0])) {
        return Right ([index + 1, targetString, rest[0]]);
      } else {
        return Left ([index, `ParseError (position ${index}): Expecting letter, got ${rest[0]}`]);
      }
    }
    return Left ([index, `ParseError (position ${index}): Expecting letter, but got end of input.`]);
  });
});

//           letters :: Parser String a String
export const letters = many1 (letter) .map (x => x.join(''));

//           anyOfString :: String -> Parser String a String
export const anyOfString = function anyOfString(s) {
  return new Parser(function anyOfString$state(state) {
    return state.chain(([index, targetString]) => {
      const rest = targetString.slice(index);
      if (rest.length >= 1) {
        if (s.includes(rest[0])) {
          return Right ([index + 1, targetString, rest[0]]);
        } else {
          return Left ([index, `ParseError (position ${index}): Expecting any of the string "${s}", got ${rest[0]}`]);
        }
      }
      return Left ([index, `ParseError (position ${index}): Expecting any of the string "${s}", but got end of input.`]);
    });
  });
};

//           namedSequenceOf :: [(String, Parser e a b)] -> Parser e a (StrMap b)
export const namedSequenceOf = function namedSequenceOf(pairedParsers) {
  return new Parser(function namedSequenceOf$state(state) {
    return state.chain(() => {
      const results = {};
      let nextState = state;

      for (const [key, parser] of pairedParsers) {
        const out = parser.p(nextState);
        if (out.isLeft) {
          return out;
        } else {
          nextState = out;
          results[key] = out.value[2];
        }
      }

      const [i, s] = nextState.value;
      return Right ([i, s, results]);
    });
  });
};

//           sequenceOf :: [Parser e a b] -> Parser e a [b]
export const sequenceOf = function sequenceOf(parsers) {
  return new Parser(function sequenceOf$state(state) {
    return state.chain(() => {
      const results = new Array(parsers.length);
      let nextState = state;

      for (let i = 0; i < parsers.length; i++) {
        const out = parsers[i].p(nextState);
        if (out.isLeft) {
          return out;
        } else {
          nextState = out;
          results[i] = out.value[2];
        }
      }

      const [i, s] = nextState.value;
      return Right ([i, s, results]);
    });
  });
};

//           sepBy :: Parser e a c -> Parser e a b -> Parser e a [b]
export const sepBy = function sepBy(sepParser) {
  return function sepBy$valParser(valParser) {
    return new Parser(function sepBy$valParser$state(state) {
      return state.chain(function sepBy$valParser$state$chain() {
        let nextState = state;
        let left = null;
        const results = [];

        while (true) {
          const valState = valParser.p(nextState);
          const sepState = sepParser.p(valState);

          if (valState.isLeft) {
            left = valState;
            break;
          } else {
            results.push(valState.value[2]);
          }

          if (sepState.isLeft) {
            nextState = valState;
            break;
          }

          nextState = sepState;
        }

        if (left) {
          if (results.length === 0) {
            const [i, s] = state.value;
            return Right ([i, s, results]);
          }
          return left;
        }

        const [i, s] = nextState.value;
        return Right ([i, s, results]);
      });
    });
  }
};

//           sepBy1 :: Parser e a c -> Parser f a b  -> Parser String a [b]
export const sepBy1 = function sepBy1(sepParser) {
  return function sepBy1$valParser(valParser) {
    return new Parser(function sepBy1$valParser$state(state) {
      return sepBy(sepParser)(valParser).p(state).chain(function sepBy1$valParser$state$chain([index, targetString, value]) {
        if (value.length === 0) {
          return Left ([index, `ParseError 'sepBy1' (position ${index}): Expecting to match at least one separated value`]);
        }
        return Right ([index, targetString, value]);
      });
    });
  }
};

//           choice :: [Parser e a *] -> Parser e a *
export const choice = function choice(parsers) {
  return new Parser(function choice$state(state) {
  let left = null;
    return state.chain(function choice$state$chain() {
      for (const parser of parsers) {
        const out = parser.p(state);

        if (out.isLeft) {
          if (!left || out.value[0] > left.value[0]) {
            left = out;
          }
        } else {
          return out;
        }
      }

      return left;
    });
  });
};

//           between :: Parser e a b -> Parser f a c -> Parser g a d -> Parser g a d
export const between = function between(leftParser) {
  return function between$rightParser(rightParser) {
    return function between$rightParser(parser) {
      return sequenceOf ([
        leftParser,
        parser,
        rightParser
      ]) .map (([_, x]) => x);
    }
  }
};

//           everythingUntil :: Parser e a b -> Parser String a c
export const everythingUntil = function everythingUntil(parser) {
  return new Parser(state => {
    return state.chain (function everythingUntil$state(innerState) {
      const results = [];
      let nextState = state;

      while (true) {
        const out = parser.p(nextState);

        if (out.isLeft) {
          const [index, targetString] = nextState.value;
          const val = targetString[index];
          if (val) {
            results.push(val);
            nextState = Right([index + 1, targetString, val]);
          } else {
            return Left ([nextState[0], `ParseError 'everythingUntil' (position ${nextState.value[0]}): Unexpected end of input.`]);
          }
        } else {
          break;
        }
      }
      const [i, s] = nextState.value;
      return Right ([i, s, results.join('')]);
    });
  });
};

//           anythingExcept :: Parser e a b -> Parser String a c
export const anythingExcept = function anythingExcept(parser) {
  return new Parser(function anythingExcept$state(state) {
    return state.chain(([index, targetString]) => {
      const out = parser.p(state);
      if (out.isLeft) {
        return Right ([index + 1, targetString, targetString[index]]);
      }
      return Left ([index, `ParseError 'anythingExcept' (position ${index}): Matched '${out.value[2]}' from the exception parser`]);
    });
  });
};

//           lookAhead :: Parser e a b -> Parser e a b
export const lookAhead = function lookAhead(parser) {
  return new Parser(function lookAhead$state(state) {
    return state.chain(function lookAhead$state$chain([i, s]) {
      const nextState = parser.p(state);
      return nextState.map(function lookAhead$state$chain$map([_, __, v]) {
        return [i, s, v]
      });
    });
  });
};

//           possibly :: Parser e a b -> Parser e a (b|null)
export const possibly = function possibly(parser) {
  return new Parser(function possibly$state(state) {
    return state.chain(function possibly$state$chain([index, targetString]) {
      const nextState = parser.p(state);
      if (nextState.isLeft) {
        return Right([index, targetString, null]);
      }
      return nextState;
    });
  });
};

//           skip :: Parser e a b -> Parser e a a
export const skip = function skip(parser) {
  return new Parser(function skip$state(state) {
    return state.chain(function skip$state$chain([_, __, value]) {
      const nextState = parser.p(state);
      return nextState.map (([i, s]) => [i, s, value]);
    });
  });
};

//           endOfInput :: Parser e a b
export const endOfInput = new Parser(function endOfInput$state(state) {
  return state.chain(function endOfInput$state$chain([index, targetString]) {
    if (index !== targetString.length) {
      return Left([index, `ParseError 'endOfInput' (position ${index}): Expected end of input but got '${targetString.slice(index, index+1)}'`])
    }
    return Right([index, targetString, null]);
  });
});

//           whitespace :: Parser e a String
export const whitespace =  many (anyOfString (' \n\t\r')) .map (x => x.join(''));

//           recursiveParser :: (() => Parser e a b) -> Parser e a b
export const recursiveParser = function recursiveParser(parserThunk) {
  return new Parser(function recursiveParser$state(state) {
    return parserThunk().p(state);
  });
};

//           takeRight :: Parser e a b -> Parser f b c -> Parser f a c
export const takeRight = lParser => rParser => pipeParsers ([ lParser, rParser ]);

//           takeLeft :: Parser e a b -> Parser f b c -> Parser e a b
export const takeLeft = lParser => rParser => sequenceOf([lParser, rParser]) .map (x => x[0]);

//           toPromise :: Either a b -> Promise a b
export const toPromise = result => {
  return result.cata({
    Left: x => Promise.reject(x),
    Right: x => Promise.resolve(x)
  });
};

//           toValue :: Either a b -> b
export const toValue = result => {
  return result.cata({
    Left: ([index, x]) => {
      const e = new Error(x);
      e.parseIndex = index;
      throw e;
    },
    Right: x => x
  });
};
