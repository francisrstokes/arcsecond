import {Left, Right} from 'data.either';
const id = x => x;

// type ParserState a = Either String (Int, String, a)
// type Parser a b = () -> ParserState a -> ParserState b

const FL = p => {
  p['fantasy-land/map'] = fn => FL(() => state => {
    return p()(state).map(([i, s, v]) => [i, s, fn(v)]);
  });

  p['fantasy-land/chain'] = fn => FL(() => state => {
    return p()(state).chain(([i, s, v]) => {
      return fn(v)()(Right([i, s, v]))
    });
  });

  p['fantasy-land/ap'] = parserOfFunction => FL(() => state => {
    return parserOfFunction()(state).chain(([_, __, fn]) => {
      return p()(state).map(([i, s, v]) => [i, s, fn(v)]);
    });
  });

  p['fantasy-land/of'] = x => FL(() => state => {
    return state.map(([i, s]) => [i, s, x]);
  });

  p.map = p['fantasy-land/map'];
  p.ap = p['fantasy-land/ap'];
  p.chain = p['fantasy-land/chain'];
  p.of = p['fantasy-land/of'];

  return p;
};

//           Parser :: Parser a a
export const Parser = FL(() => id);

//           pipeParsers :: [Parser * *] -> Parser * *
export const pipeParsers = fns => FL(() => state => {
  return fns.slice(1).reduce((nextState, fn) => fn()(nextState), fns[0]()(state))
});

//           composeParsers :: [Parser * *] -> Parser * *
export const composeParsers = fns => () => x => {
  return pipeParsers ([...fns].reverse()) () (x);
};

//           tapParser :: (a => void) -> Parser a a
export const tapParser = fn => FL(() => state => {
  fn(state.value);
  return state;
});

//           parse :: Parser a b -> String -> Either String b
export const parse = parser => targetString => {
  const parserState = Right([0, targetString, null]);
  return parser()(parserState).map(([_, __, result]) => result);
};

//           decide :: (a -> Parser b c) -> Parser b c
export const decide = fn => FL(() => state => {
  return state.chain(([_, __, v]) => {
    const parser = fn(v);
    return parser()(state);
  });
});

//           fail :: String -> Parser a b
export const fail = errorMessage => FL(() => _ => {
  return Left (errorMessage);
});

//           succeedWith :: b -> Parser a b
export const succeedWith = x => FL(() => state => {
  return state.map(([i, s]) => [i, s, x]);
});

//           many :: Parser a b -> Parser a [b]
export const many = parser => FL(() => state => {
  return state.chain(innerState => {
    const results = [];
    let nextState = innerState;

    while (true) {
      let exit = false;

      const out = parser () (Right(nextState));
      out.cata({
        Right: x => {
          nextState = x;
          results.push(nextState[2]);
        },
        Left: () => {
          exit = true;
        }
      });

      if (exit) {
        break;
      }
    }

    const [index, targetString] = nextState;
    return Right ([index, targetString, results]);
  });
});

//           many1 :: Parser a b -> Parser a [b]
export const many1 = parser => FL(() => state => {
  const res = many (parser) () (state);
  return res.chain(([index, targetString, value]) => {
    if (value.length === 0) {
      return Left (`ParseError 'many1' (position ${index}): Expecting to match at least one value`);
    }
    return Right ([index, targetString, value]);
  });
});

//           mapTo :: (a -> b) -> Parser a b
export const mapTo = fn => FL(() => state => {
  return state.map(([index, targetString, res]) => {
    return [index, targetString, fn(res)];
  });
});

//           char :: Char -> Parser a String
export const char = c => FL(() => state => {
  if (!c || c.length !== 1) {
    throw new TypeError (`char must be called with a single character, but got ${c}`);
  }

  return state.chain(([index, targetString]) => {
    const rest = targetString.slice(index);
    if (rest.length >= 1) {
      if (rest[0] === c) {
        return Right ([index + 1, targetString, c]);
      } else {
        return Left (`ParseError (position ${index}): Expecting character '${c}', got '${rest[0]}'`);
      }
    }
    return Left (`ParseError (position ${index}): Expecting character '${c}', but got end of input.`);
  });
});

//           str :: String -> Parser a String
export const str = s => FL(() => state => {
  if (!s || s.length < 1) {
    throw new TypeError (`str must be called with a string with length > 1, but got ${s}`);
  }

  return state.chain(([index, targetString]) => {
    const rest = targetString.slice(index);
    if (rest.length >= 1) {
      if (rest.startsWith(s)) {
        return Right ([index + s.length, targetString, s]);
      } else {
        return Left (`ParseError (position ${index}): Expecting string '${s}', got '${rest.slice(0, s.length)}...'`);
      }
    }
    return Left (`ParseError (position ${index}): Expecting string '${s}', but got end of input.`);
  });
});

//           regex :: RegExp -> Parser a String
export const regex = re => {
  const typeofre = Object.prototype.toString.call(re);
  if (typeofre !== '[object RegExp]') {
    throw new TypeError (`regex must be called with a Regular Expression, but got ${typeofre}`);
  }

  if (re.toString()[1] !== '^') {
    throw new Error(`regex parsers must contain '^' start assertion.`)
  }

  return () => state => {
    return state.chain(([index, targetString]) => {
      const rest = targetString.slice(index);
      if (rest.length >= 1) {
        const match = rest.match(re);
        if (match) {
          return Right ([index + match[0].length, targetString, match[0]]);
        } else {
          return Left (`ParseError (position ${index}): Expecting string matching '${re}', got '${rest.slice(0, 5)}...'`);
        }
      }
      return Left (`ParseError (position ${index}): Expecting string matching '${re}', but got end of input.`);
    });
  };
}
//           digit :: Parser a String
export const digit = FL(() => state => {
  return state.chain(([index, targetString]) => {
    const rest = targetString.slice(index);

    if (rest.length >= 1) {
      if (/[0-9]/.test(rest[0])) {
        return Right ([index + 1, targetString, rest[0]]);
      } else {
        return Left (`ParseError (position ${index}): Expecting digit, got '${rest[0]}'`);
      }
    }
    return Left (`ParseError (position ${index}): Expecting digit, but got end of input.`);
  });
});

//           digits :: Parser a String
export const digits = pipeParsers([
  many1 (digit),
  mapTo (x => x.join(''))
]);

//           letter :: Parser a String
export const letter = FL(() => state => {
  return state.chain(([index, targetString]) => {
    const rest = targetString.slice(index);

    if (rest.length >= 1) {
      if (/[a-zA-Z]/.test(rest[0])) {
        return Right ([index + 1, targetString, rest[0]]);
      } else {
        return Left (`ParseError (position ${index}): Expecting letter, got ${rest[0]}`);
      }
    }
    return Left (`ParseError (position ${index}): Expecting letter, but got end of input.`);
  });
});

//           letters :: Parser a String
export const letters = pipeParsers([
  many1 (letter),
  mapTo (x => x.join(''))
]);

//           anyOfString :: String -> Parser a String
export const anyOfString = s => FL(() => state => {
  return state.chain(([index, targetString]) => {
    const rest = targetString.slice(index);
    if (rest.length >= 1) {
      if (s.includes(rest[0])) {
        return Right ([index + 1, targetString, rest[0]]);
      } else {
        return Left (`ParseError (position ${index}): Expecting any of the string "${s}", got ${rest[0]}`);
      }
    }
    return Left (`ParseError (position ${index}): Expecting any of the string "${s}", but got end of input.`);
  });
});

//           namedSequenceOf :: [(String, Parser a b)] -> Parser a (StrMap b)
export const namedSequenceOf = pairedParsers => FL(() => state => {
  return state.chain(innerState => {
    const results = {};
    let left = null;
    let nextState = innerState;

    for (const [key, parser] of pairedParsers) {
      const out = parser () (Right(nextState));

      out.cata ({
        Right: x => {
          nextState = x;
          results[key] = x[2];
        },
        Left: x => {
          left = x;
        }
      });

      if (left) {
        break;
      }
    }

    if (left) return Left (left);

    const [i, s] = nextState;
    return Right ([i, s, results]);
  });
});

//           sequenceOf :: [Parser a b] -> Parser a [b]
export const sequenceOf = parsers => FL(() => state => {
  return state.chain(innerState => {
    const results = [];
    let left = null;
    let nextState = innerState;

    for (const parser of parsers) {
      const out = parser () (Right(nextState));
      out.cata ({
        Right: x => {
          nextState = x;
          results.push(x[2]);
        },
        Left: x => {
          left = x;
        }
      });

      if (left) {
        break;
      }
    }

    if (left) return Left (left);

    const [i, s] = nextState;
    return Right ([i, s, results]);
  });
});

//           sepBy :: Parser a c -> Parser a b -> Parser a [b]
export const sepBy = sepParser => valParser => FL(() => state => {
  return state.chain(innerState => {
    let nextState = innerState;
    let left = null;
    const results = [];

    while (true) {
      let exit = false;

      const valState = valParser () (Right (nextState));
      const sepState = sepParser () (valState);

      const unwrappedValState = valState.cata ({
        Right: x => {
          results.push(x[2]);
          return x;
        },
        Left: x => {
          left = x;
          exit = true;
        }
      });

      const unwrappedSepState = sepState.cata ({
        Right: id,
        Left: () => {
          nextState = unwrappedValState;
          exit = true;
        }
      });

      if (exit) break;

      nextState = unwrappedSepState;
    }

    if (left) {
      if (results.length === 0) {
        const [i, s] = innerState;
        return Right ([i, s, []]);
      }
      return Left (left);
    }

    const [i, s] = nextState;
    return Right ([i, s, results]);
  });
});

//           sepBy1 :: Parser a c -> Parser a b  -> Parser a [b]
export const sepBy1 = sepParser => valParser => FL(() => state => {
  const res = sepBy (sepParser) (valParser) () (state);
  return res.chain(([index, targetString, value]) => {
    if (value.length === 0) {
      return Left (`ParseError 'sepBy1' (position ${index}): Expecting to match at least one separated value`);
    }
    return Right ([index, targetString, value]);
  });
});

//           choice :: [Parser a *] -> Parser a *
export const choice = parsers => FL(() => state => {
  return state.chain(([index]) => {
    let match = null;
    for (const parser of parsers) {
      let exit = false;
      const out = parser () (state);

      out.cata({
        Left: id,
        Right: x => {
          exit = true;
          match = Right(x);
        }
      });

      if (exit) break;
    }

    if (!match) {
      return Left (`ParseError 'choice' (position ${index}): Expecting to match at least parser`);
    }

    return match;
  });
});

//           between :: Parser a b -> Parser a c -> Parser a d -> Parser a d
export const between = leftParser => rightParser => parser => pipeParsers ([
  sequenceOf ([
    leftParser,
    parser,
    rightParser
  ]),
  mapTo (([_, x]) => x)
]);

//           everythingUntil :: Parser a b -> Parser a c
export const everythingUntil = parser => FL(() => state => {
  return state.chain (innerState => {
    const results = [];
    let nextState = innerState;
    let eof = false;

    while (true) {
      let exit = false;
      const out = parser () (Right (nextState));

      out.cata ({
        Left: () => {
          const [index, targetString] = nextState;
          const val = targetString[index];

          if (val) {
            results.push(val);
            nextState = [index + 1, targetString, val]
          } else {
            eof = true;
            exit = true;
          }
        },
        Right: () => {
          exit = true;
        }
      });

      if (exit) break;
    }

    if (eof) {
      return Left (`ParseError 'everythingUntil' (position ${nextState[0]}): Unexpected end of input.`);
    }

    const [i, s] = nextState;
    return Right ([i, s, results.join('')]);
  });
});

//           anythingExcept :: Parser a b -> Parser a c
export const anythingExcept = parser => FL(() => state => {
  return state.chain(([index, targetString]) => {
    const out = parser()(state);
    return out.cata({
      Left: () => Right ([index + 1, targetString, targetString[index]]),
      Right: ([_, __, s]) => Left (`ParseError 'anythingExcept' (position ${index}): Matched '${s}' from the exception parser`)
    });
  })
})

//           lookAhead :: Parser a b -> Parser a b
export const lookAhead = parser => FL(() => state => {
  return state.chain(([i, s]) => {
    const nextState = parser () (state);
    return nextState.map(([_, __, v]) => [i, s, v]);
  });
});

//           possibly :: Parser a b -> Parser a (b|null)
export const possibly = parser => FL(() => state => {
  return state.chain(([i, s]) => {
    const nextState = parser () (state);
    return nextState.cata({
      Left: () => Right ([i, s, null]),
      Right: x => Right (x)
    });
  });
});

//           skip :: Parser a b -> Parser a a
export const skip = parser => FL(() => state => {
  return state.chain(([_, __, value]) => {
    const nextState = parser () (state);
    return nextState.map (([i, s]) => [i, s, value]);
  });
});

//           whitespace :: Parser a String
export const whitespace = pipeParsers ([
  many (anyOfString (' \n\t\r')),
  mapTo (x => x.join(''))
]);

//           recursiveParser :: (() => Parser a b) -> Parser a b
export const recursiveParser = parserThunk => FL(() => parserThunk()());

//           takeRight :: Parser a b -> Parser b c -> Parser a c
export const takeRight = lParser => rParser => pipeParsers ([ lParser, rParser ]);

//           takeLeft :: Parser a b -> Parser b c -> Parser a b
export const takeLeft = lParser => rParser => pipeParsers ([
  sequenceOf([lParser, rParser]),
  mapTo (x => x[0])
]);

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
    Left: x => {
      throw new Error(x);
    },
    Right: x => x
  });
};

