const {TextEncoder} = require('util');
const {
  Parser,
  parse,
  char,
  anyChar,
  str,
  digit,
  fail,
  exactly,
  peek,
  many,
  many1,
  digits,
  letter,
  letters,
  regex,
  anyOfString,
  namedSequenceOf,
  sequenceOf,
  sepBy,
  sepBy1,
  choice,
  between,
  everythingUntil,
  everyCharUntil,
  pipeParsers,
  composeParsers,
  anythingExcept,
  anyCharExcept,
  lookAhead,
  possibly,
  skip,
  whitespace,
  optionalWhitespace,
  takeRight,
  takeLeft,
  recursiveParser,
  tapParser,
  decide,
  mapTo,
  toPromise,
  toValue,
  succeedWith,
  errorMapTo,
  either,
  coroutine,
  getData,
  setData,
  mapData,
  startOfInput,
  endOfInput,
  withData,
} = require('../bundle.js');

const encoder = new TextEncoder();

const f = x => ({ f: x });
const g = x => ({ g: x });

// https://github.com/fluture-js/Fluture/blob/0ae92d9d61ca8f112ef2bb2327b7e8680100bff1/test/util/util.js#L8
const MAX_STACK_SIZE = (function r (){try{return 1 + r()}catch(e){return 1}}());

const expectEquivalence = (parserA, parserB) => () => {
  const strings = [
    'hello world',
    'hello1234a',
    '',
    '12345 325vfs43',
    '!@#$%^',
    '≈ç√∫˜µ hgello skajb',
  ];

  strings.forEach(s => {
    expect(parse(parserA)(s)).toEqual(parse(parserB)(s));
  });
};

const failLeft = state => {
  console.log(state);
  throw new Error('Expected a success');
};
const failRight = state => {
  console.log(state);
  throw new Error('Expected an error');
};

const expectedFailTest = (parser, testingString) => () => {
  const result = parser.run(testingString);
  if (!result.isError) {
    failRight(result);
  }
};

const expectedSuccessTest = (parser, expectation, testingString) => () => {
  const out = parser.run(testingString);
  if (out.isError) {
    failLeft(out);
  } else {
    expect(out.result).toEqual(expectation);
  }
};

const expectedThrowTest = (
  parserFn,
  testingString,
  errorMessage = '',
) => () => {
  expect(() => {
    parse(parserFn())(testingString);
  }).toThrow(errorMessage);
};

const testMany = (msg, testFns) => test(msg, () => testFns.forEach(fn => fn()));

testMany.only = (msg, testFns) => {
  describe.only('', () => {
    test(msg, () => testFns.forEach(fn => fn()));
  });
};


test('ArrayBuffer as input', () => {
  const input = Uint8Array.from("hello world!".split('').map(c => c.charCodeAt(0))).buffer;
  const parser = sequenceOf([
    letters,
    char(' '),
    letters,
    char('!'),
    endOfInput
  ]);
  expectedSuccessTest(parser, ['hello', ' ', 'world', '!', null], input)();
});

test('TypedArray as input', () => {
  const input = Uint8Array.from("hello world!".split('').map(c => c.charCodeAt(0)));
  const parser = sequenceOf([
    letters,
    char(' '),
    letters,
    char('!'),
    endOfInput
  ]);
  expectedSuccessTest(parser, ['hello', ' ', 'world', '!', null], input)();
});

test('DataView as input', () => {
  const input = new DataView(Uint8Array.from("hello world!".split('').map(c => c.charCodeAt(0))).buffer);
  const parser = sequenceOf([
    letters,
    char(' '),
    letters,
    char('!'),
    endOfInput
  ]);
  expectedSuccessTest(parser, ['hello', ' ', 'world', '!', null], input)();
});

test('Parser', expectedSuccessTest(new Parser(x => x), null, 'something'));

testMany('char', [
  expectedSuccessTest(char('a'), 'a', 'abc123'),
  expectedSuccessTest(char('😁'), '😁', '😁bc123'),
  expectedSuccessTest(char('ƒ'), 'ƒ', 'ƒbc123'),
  expectedFailTest(char('a'), '123'),
  expectedFailTest(char('a'), ''),
  () => {
    expect(() => char('abc')).toThrow(
      'char must be called with a single character, but got abc',
    );
  },
  expectedFailTest(char('a'), new Uint8Array([0b11110000]))
]);

testMany('anyChar', [
  expectedSuccessTest(anyChar, 'a', 'abc123'),
  expectedSuccessTest(anyChar, '😁', '😁bc123'),
  expectedSuccessTest(anyChar, 'ƒ', 'ƒbc123'),
  expectedFailTest(anyChar, ''),
  expectedFailTest(anyChar, new Uint8Array([0b11110000]))
]);

testMany('peek', [
  expectedSuccessTest(peek, 'a'.charCodeAt(0), 'abc123'),
  expectedSuccessTest(peek, encoder.encode('😁')[0], '😁bc123'),
  expectedSuccessTest(peek, encoder.encode('ƒ')[0], 'ƒbc123'),
  expectedFailTest(peek, ''),
]);

test('startOfInput', () => {
  const mustBeginWithHeading = sequenceOf([startOfInput, str('# ')]);
  const parser = between(mustBeginWithHeading)(endOfInput)(everyCharUntil(endOfInput));
  expectedSuccessTest(parser, 'Heading', '# Heading')();
  expectedFailTest(parser, ' # Heading')();
});

testMany('endOfInput', [
  expectedSuccessTest(endOfInput, null, ''),
  expectedFailTest(endOfInput, 'abc'),
]);

testMany('either', [
  () => {
    const p = either(char('a'));
    const res = p.run('a');
    expect(res.isError).toBeFalsy();
  },
  () => {
    const p = either(char('a'));
    const res = p.run('b');
    expect(res.isError).toBeFalsy();
  },
  () => {
    const p = either(fail('nope!'));
    const res = p.run('b');
    expect(res.isError).toBeFalsy();
    expect(res.result.value).toEqual('nope!');
  },
]);

testMany('coroutine', [
  () => {
    const p = coroutine(function*() {
      const firstPart = yield letters;
      const secondPart = yield digits;
      return {
        result: [firstPart, secondPart],
      };
    });

    const res1 = p.run('abc123');
    expect(res1.result).toEqual({
      result: ['abc', '123'],
    });

    // A second usage should not be stateful
    const res2 = p.run('def456');
    expect(res2.result).toEqual({
      result: ['def', '456'],
    });
  },
  () => {
    const p = coroutine(function*() {
      const firstPart = yield letters;
      const secondPart = yield digits.errorMap(() => 'Wanted digits');
      return {
        result: [firstPart, secondPart],
      };
    });

    const res = p.run('abc___');

    expect(res.isError).toBe(true);
    expect(res.error).toEqual('Wanted digits');
    expect(res.index).toEqual(3);
  },
  () => {
    const p = coroutine(function*() {
      const firstPart = yield letters;
      const secondPart = yield 42;
      return {
        result: [firstPart, secondPart],
      };
    });

    expect(() => p.run('abc___')).toThrow(
      '[coroutine] yielded values must be Parsers, got 42.',
    );
  },
]);

testMany('str', [
  expectedSuccessTest(str('abc'), 'abc', 'abc123'),
  expectedFailTest(str('def'), 'abc123'),
  expectedFailTest(str('def'), ''),
  () => {
    expect(() => str('')).toThrow(
      'str must be called with a string with length > 1, but got ',
    );
  },
]);

testMany('digit', [
  expectedSuccessTest(digit, '1', '1234'),
  expectedFailTest(digit, 'abc123'),
  expectedFailTest(digit, ''),
  expectedFailTest(digit, new Uint8Array([0b11110000]))
]);

testMany('digits', [
  expectedSuccessTest(digits, '1234', '1234'),
  expectedSuccessTest(digits, '1', '1abc2'),
  expectedFailTest(digits, 'abc123'),
  expectedFailTest(digits, ''),
]);

testMany('letter', [
  expectedSuccessTest(letter, 'a', 'abcd1234'),
  expectedSuccessTest(letter, 'A', 'AbCd1234'),
  expectedFailTest(letter, '123ABxc'),
  expectedFailTest(letter, ''),
  expectedFailTest(letter, new Uint8Array([0b11110000]))
]);

testMany('letters', [
  expectedSuccessTest(letters, 'abcd', 'abcd1234'),
  expectedSuccessTest(letters, 'AbCd', 'AbCd1234'),
  expectedFailTest(letters, '123ABxc'),
  expectedFailTest(letters, ''),
]);

testMany('fail', [
  expectedFailTest(fail('nope'), 'abc123'),
  expectedFailTest(fail('nope'), ''),
  expectedFailTest(fail('nope'), '12435'),
]);

testMany('succeedWith', [
  expectedSuccessTest(succeedWith('yes'), 'yes', 'abc123'),
  expectedSuccessTest(succeedWith('yes'), 'yes', ''),
  expectedSuccessTest(succeedWith('yes'), 'yes', '12435'),
]);

testMany(
  'exactly', [
    expectedSuccessTest(exactly(3)(char('*')), '***'.split(''), '***'),
    expectedSuccessTest(exactly(4)(digit), '1234'.split(''), '1234abc'),
    expectedFailTest(exactly(4)(digit), 'abc'),
    expectedThrowTest(() => exactly('a')(digit), '123abc', `exactly must be called with a number > 0, but got a`)
  ]
);

testMany('many', [
  expectedSuccessTest(many(digit), '1234'.split(''), '1234abc'),
  expectedSuccessTest(many(digit), '12345'.split(''), '12345abc'),
  expectedSuccessTest(many(digit), [], 'abc'),
  expectedSuccessTest(many(digit), [], ''),
]);

testMany('many1', [
  expectedSuccessTest(many1(digit), '1234'.split(''), '1234abc'),
  expectedSuccessTest(many1(digit), '12345'.split(''), '12345abc'),
  expectedFailTest(many1(digit), 'abc'),
  expectedFailTest(many1(digit), ''),
]);

testMany('regex', [
  expectedSuccessTest(regex(/^[a-zA-Z0-9]/), '1', '1234abc_dsklvnjsd'),
  expectedSuccessTest(regex(/^[a-zA-Z0-9]+/), '1234abc', '1234abc_dsklvnjsd'),
  expectedSuccessTest(regex(/^[a-zA-Z0-9]+/g), '1234abc', '1234abc_dsklvnjsd'),
  expectedSuccessTest(regex(/^[a-z0-9]+/i), '1234abc', '1234abc_dsklvnjsd'),
  expectedSuccessTest(regex(/^[a-z0-9]+/gi), '1234abc', '1234abc_dsklvnjsd'),
  expectedSuccessTest(
    regex(/^(\w\s?)+/),
    'this is a sentence',
    'this is a sentence. this is another',
  ),
  expectedFailTest(regex(/^(\w\s?)+/), ''),
  expectedFailTest(regex(/^[a-zA-Z]+/), '123abc'),
  expectedThrowTest(
    () => regex(/[a-zA-Z]+/),
    '123abc',
    `regex parsers must contain '^' start assertion.`,
  ),
  expectedThrowTest(
    () => regex(34),
    '123abc',
    'regex must be called with a Regular Expression, but got [object Number]',
  ),
]);

testMany('anyOfString', [
  expectedSuccessTest(anyOfString('abcdef'), 'c', 'can I match'),
  expectedSuccessTest(anyOfString('a≤˚🔺cdef'), '≤', '≤can I match'),
  expectedSuccessTest(anyOfString('a≤˚🔺cdef'), '🔺', '🔺can I match'),
  expectedFailTest(anyOfString('abcdef'), 'zebra'),
  expectedFailTest(anyOfString('abcdef'), new Uint8Array([0b11110000]))

]);

testMany('namedSequenceOf', [
  expectedSuccessTest(
    namedSequenceOf([
      ['first', str('abc')],
      ['second', regex(/^[0-9-]+/)],
      ['third', letters],
    ]),
    {
      first: 'abc',
      second: '9823-2134-2-24-2--',
      third: 'hallo',
    },
    'abc9823-2134-2-24-2--hallo',
  ),

  expectedFailTest(
    namedSequenceOf([
      ['first', str('abc')],
      ['second', regex(/^[0-9-]+/)],
      ['third', letters],
    ]),
    'def9823-2134-2-24-2-hallo',
  ),
]);

testMany('sequenceOf', [
  expectedSuccessTest(
    sequenceOf([str('abc'), regex(/^[0-9-]+/), letters]),
    ['abc', '9823-2134-2-24-2--', 'hallo'],
    'abc9823-2134-2-24-2--hallo',
  ),

  expectedFailTest(
    sequenceOf([str('abc'), regex(/^[0-9-]+/), letters]),
    'def9823-2134-2-24-2-hallo',
  ),
]);

testMany('sepBy', [
  expectedSuccessTest(sepBy(char(','))(letter), ['a', 'b', 'c'], 'a,b,c'),
  expectedSuccessTest(sepBy(char(','))(letter), [], ''),
  expectedSuccessTest(sepBy(char(','))(letter), [], '1,2,3'),
  expectedFailTest(sepBy(char(','))(letter), 'a,b,'),
]);

testMany('sepBy1', [
  expectedSuccessTest(sepBy1(char(','))(letter), ['a', 'b', 'c'], 'a,b,c'),
  expectedFailTest(sepBy1(char(','))(letter), ''),
  expectedFailTest(sepBy1(char(','))(letter), '1,2,3'),
  expectedFailTest(sepBy1(char(','))(letter), 'a,b,'),
]);

testMany('choice', [
  expectedSuccessTest(choice([letter, digit, char('!')]), 'a', 'abcd'),
  expectedSuccessTest(choice([letter, digit, char('!')]), '1', '1bcd'),
  expectedSuccessTest(choice([letter, digit, char('!')]), '!', '!bcd'),
  expectedFailTest(choice([letter, digit, char('!')]), '-bcd'),
  () => {
    const parser = choice([
      sequenceOf([letters, char(' '), letters]),
      sequenceOf([digits, char(' '), digits]),
    ]);
    const failResult = parse(parser)('12345 hello');
    expect(failResult.error).toEqual(
      `ParseError (position 6): Expecting digits`,
    );
    expect(failResult.index).toEqual(6);
  },
]);

testMany('between', [
  expectedSuccessTest(
    between(char('('))(char(')'))(letters),
    'hello',
    '(hello)',
  ),
  expectedSuccessTest(
    between(char('['))(char(']'))(sepBy(char(','))(digit)),
    '1234'.split(''),
    '[1,2,3,4]',
  ),
  expectedFailTest(
    between(char('('))(char(')'))(letters),
    'hello',
    '(hello world)',
  ),
  expectedFailTest(between(char('('))(char(')'))(letters), 'hello', '()'),
]);

testMany('pipeParsers', [
  expectedSuccessTest(
    pipeParsers([str('hello'), char(' '), str('world')]),
    'world',
    'hello world',
  ),
  expectedFailTest(
    pipeParsers([str('hello'), char(' '), str('world')]),
    'hellok world',
  ),
]);

testMany('composeParsers', [
  expectedSuccessTest(
    composeParsers([str('world'), char(' '), str('hello')]),
    'world',
    'hello world',
  ),
  expectedFailTest(
    composeParsers([str('world'), char(' '), str('hello')]),
    'hellok world',
  ),
]);

testMany('everythingUntil', [
  expectedSuccessTest(
    everythingUntil(char('!')),
    [...encoder.encode('dsv2#%3423√ç∫˜µ˚∆˙∫√†¥')],
    'dsv2#%3423√ç∫˜µ˚∆˙∫√†¥!',
  ),
  expectedSuccessTest(
    pipeParsers([everythingUntil(char('!')), char('!')]),
    '!',
    'dsv2#%3423√ç∫˜µ˚∆˙∫√†¥!',
  ),
  expectedSuccessTest(everythingUntil(char('!')), [], '!'),
  expectedFailTest(everythingUntil(char('!')), '')
]);

testMany('everyCharUntil', [
  expectedSuccessTest(
    everyCharUntil(char('!')),
    'dsv2#%3423√ç∫˜µ˚∆˙∫√†¥',
    'dsv2#%3423√ç∫˜µ˚∆˙∫√†¥!',
  ),
  expectedSuccessTest(
    pipeParsers([everyCharUntil(char('!')), char('!')]),
    '!',
    'dsv2#%3423√ç∫˜µ˚∆˙∫√†¥!',
  ),
  expectedSuccessTest(everyCharUntil(char('!')), '', '!'),
  expectedFailTest(everyCharUntil(char('!')), '')
]);

test('errorMapTo', () => {
  const parser = pipeParsers([
    choice([
      sequenceOf([letters, char(' '), letters]),
      sequenceOf([digits, char(' '), digits]),
    ]),
    errorMapTo((_, index) => `Failed to parse structure @ ${index}`),
  ]);

  const failResult = parse(parser)('12345 hello');

  expect(failResult.error).toEqual('Failed to parse structure @ 6');
  expect(failResult.index).toEqual(6);
});

testMany('anythingExcept', [
  expectedSuccessTest(anythingExcept(char('!')), 'a'.charCodeAt(0), 'a'),
  expectedSuccessTest(anythingExcept(char('!')), '1'.charCodeAt(0), '1'),
  expectedSuccessTest(anythingExcept(char('!')), encoder.encode('√')[0], '√'),
  expectedFailTest(anythingExcept(char('!')), '!'),
]);

testMany('anyCharExcept', [
  expectedSuccessTest(anyCharExcept(char('!')), 'a', 'a'),
  expectedSuccessTest(anyCharExcept(char('!')), '1', '1'),
  expectedSuccessTest(anyCharExcept(char('!')), '√', '√'),
  expectedFailTest(anyCharExcept(char('!')), '!'),
  expectedFailTest(anyCharExcept(char('!')), new Uint8Array([0b11110000]))
]);

testMany('lookAhead', [
  expectedSuccessTest(lookAhead(char('a')), 'a', 'a'),
  expectedSuccessTest(pipeParsers([lookAhead(char('a')), char('a')]), 'a', 'a'),
  expectedFailTest(lookAhead(char('a')), 'b'),
]);

testMany('possibly', [
  expectedSuccessTest(possibly(char('a')), 'a', 'a'),
  expectedSuccessTest(possibly(char('a')), null, 'b'),
  expectedSuccessTest(possibly(fail('nope')), null, 'a'),
  expectedSuccessTest(possibly(char('a')), null, ''),
]);

testMany('skip', [
  expectedSuccessTest(skip(char('a')), null, 'a'),
  expectedFailTest(skip(char('a')), 'b'),
]);

testMany('optionalWhitespace', [
  expectedSuccessTest(optionalWhitespace, '    ', '    '),
  expectedSuccessTest(optionalWhitespace, '', ''),
  expectedSuccessTest(optionalWhitespace, '', 'a'),
  expectedSuccessTest(optionalWhitespace, '         ', '         a'),
]);

testMany('whitespace', [
  expectedSuccessTest(whitespace, '    ', '    '),
  expectedFailTest(whitespace, '', ''),
  expectedFailTest(whitespace, '', 'a'),
  expectedSuccessTest(whitespace, '         ', '         a'),
]);

testMany('takeRight', [
  expectedSuccessTest(takeRight(str('abc'))(str('def')), 'def', 'abcdef'),
  expectedFailTest(takeRight(str('abc'))(str('def')), 'abc'),
  expectedFailTest(takeRight(str('abc'))(str('def')), ''),
]);

testMany('takeLeft', [
  expectedSuccessTest(takeLeft(str('abc'))(str('def')), 'abc', 'abcdef'),
  expectedFailTest(takeLeft(str('abc'))(str('def')), 'abc'),
  expectedFailTest(takeLeft(str('abc'))(str('def')), ''),
]);

testMany('mapTo', [
  expectedSuccessTest(
    pipeParsers([char('a'), mapTo(x => ({ theLetter: x }))]),
    { theLetter: 'a' },
    'abc',
  ),
  expectedSuccessTest(
    mapTo(() => 'bleh'),
    'bleh',
    '',
  ),
]);

const decideFn = x => {
  if (x === 'a') {
    return digit;
  } else if (x === 'b') {
    return letter;
  } else {
    return fail('nope');
  }
};
testMany('decide', [
  expectedSuccessTest(pipeParsers([letter, decide(decideFn)]), '1', 'a1'),
  expectedSuccessTest(pipeParsers([letter, decide(decideFn)]), 'x', 'bx'),
  expectedFailTest(pipeParsers([letter, decide(decideFn)]), 'b1'),
  expectedFailTest(pipeParsers([letter, decide(decideFn)]), 'b1'),
  expectedFailTest(pipeParsers([letter, decide(decideFn)]), 'ca'),
  // expectedFailTest(takeLeft (str ('abc')) (str ('def')), 'abc'),
  // expectedFailTest(takeLeft (str ('abc')) (str ('def')), ''),
]);

test('recursiveParser', () => {
  const value = recursiveParser(() => choice([letter, digit, arr]));

  const arr = between(char('['))(char(']'))(sepBy(char(','))(value));

  expectedSuccessTest(value, 'a', 'abc')();
  expectedSuccessTest(value, '1', '123')();
  expectedSuccessTest(value, ['1', 'a', ['2', 'b']], '[1,a,[2,b]]')();
  expectedFailTest(value, '!nope')();
  expectedFailTest(value, '')();
});

test('tapParser', () => {
  let wasCalled = false;
  let value;
  const parser = pipeParsers([
    char('a'),
    tapParser(x => {
      wasCalled = true;
      value = x;
    }),
  ]);

  expectedSuccessTest(parser, 'a', 'abc')();
  expect(wasCalled).toBe(true);
  expect(value.index).toEqual(1);
  expect(value.data).toEqual(null);
  expect(value.isError).toEqual(false);
  expect(value.error).toEqual(null);
  expect(value.result).toEqual('a');

  wasCalled = false;
  value = null;

  expectedFailTest(parser, 'xyz')();
  expect(wasCalled).toBe(true);
  expect(value.index).toEqual(0);
  expect(value.data).toEqual(null);
  expect(value.result).toEqual(null);
  expect(value.isError).toEqual(true);
  expect(value.error).toEqual(`ParseError (position 0): Expecting character 'a', got 'x'`);
});

test('toPromise', async () => {
  const failed = toPromise(fail('crash').run('nope'));
  const succeeded = toPromise(Parser.of('all good').run('nope'));

  await failed
    .then(x => {
      console.log(x);
      throw new Error('Expected to reject');
    })
    .catch(failState => {
      expect(failState.error).toEqual('crash');
      expect(failState.index).toEqual(0);
    });

  await succeeded
    .then(x => expect(x).toBe('all good'))
    .catch(() => {
      throw new Error('Expected to resolve');
    });
});

test('toValue', () => {
  const lv = parse(str('oh no'))('nope not here');
  const rv = parse(str('oh yes'))('oh yes');

  try {
    toValue(lv);
    throw new Error('Expected to throw error');
  } catch (ex) {
    expect(ex.message).toBe(
      `ParseError (position 0): Expecting string 'oh no', got 'nope ...'`,
    );
    expect(ex.parseIndex).toBe(0);
  }

  expect(() => {
    const x = toValue(rv);
    expect(x).toBe('oh yes');
  }).not.toThrow();
});

test('run', () => {
  const p = Parser.of(42);
  const out = p.run('Hello');
  expect(out.result).toBe(42);
});

testMany('fork', [
  () => {
    const p = Parser.of(42);
    let errorTriggered = false;
    let successTriggered = false;

    const out = p.fork(
      'Hello',
      x => {
        errorTriggered = true;
        return x;
      },
      (x, parserState) => {
        successTriggered = true;
        expect(parserState.data).toEqual(null);
        return x;
      },
    );

    expect(successTriggered).toBe(true);
    expect(errorTriggered).toBe(false);
    expect(out).toBe(42);
  },
  () => {
    const p = Parser.of(42);
    let errorTriggered = false;
    let successTriggered = false;

    const out = p
      .mapData(() => 'my data')
      .fork(
        'Hello',
        x => {
          errorTriggered = true;
          return x;
        },
        (x, parserState) => {
          successTriggered = true;
          expect(parserState.data).toEqual('my data');
          return x;
        },
      );

    expect(successTriggered).toBe(true);
    expect(errorTriggered).toBe(false);
    expect(out).toBe(42);
  },
  () => {
    const p = fail(42);
    let errorTriggered = false;
    let successTriggered = false;

    const out = p.fork(
      'Hello',
      (x, parserState) => {
        errorTriggered = true;
        expect(parserState.data).toEqual(null);
        return x;
      },
      x => {
        successTriggered = true;
        return x;
      },
    );

    expect(successTriggered).toBe(false);
    expect(errorTriggered).toBe(true);
    expect(out).toBe(42);
  },
]);

testMany('withData', [
  () => {
    const parser = withData(digits);

    let wasError = false;

    parser('my data').fork(
      '42 is the answer',
      e => {
        wasError = true;
      },
      (value, parserState) => {
        expect(value).toEqual('42');
        expect(parserState.data).toEqual('my data');
      },
    );

    expect(wasError).toBe(false);
  },
]);

test('getData', () => {
  const p = withData(
    coroutine(function*() {
      const stateData = yield getData;
      return stateData;
    }),
  );

  const out = p([1, 2, 3]).run('Hello');
  expect(out.result).toEqual([1, 2, 3]);
});

testMany('setData', [
  () => {
    const parser = coroutine(function*() {
      yield setData('New Data');
      return 42;
    });

    let wasError = false;

    parser.fork(
      'Hello',
      e => {
        wasError = true;
      },
      (value, parserState) => {
        expect(value).toEqual(42);
        expect(parserState.data).toEqual('New Data');
      },
    );

    expect(wasError).toBe(false);
  },
  () => {
    const parser = withData(
      coroutine(function*() {
        const data = yield getData;
        yield setData(data.map(x => x * 2));
        return 42;
      }),
    );

    let wasError = false;

    parser([1, 2, 3]).fork(
      'Hello',
      e => {
        wasError = true;
      },
      (value, parserState) => {
        expect(value).toEqual(42);
        expect(parserState.data).toEqual([2, 4, 6]);
      },
    );

    expect(wasError).toBe(false);
  },
  () => {
    const parser = withData(
      coroutine(function*() {
        yield setData('persists!');
        yield fail('nope');
        return 42;
      }),
    );

    let wasSuccess = false;

    parser([1, 2, 3]).fork(
      'Hello',
      (e, parserState) => {
        expect(e).toEqual('nope');
        expect(parserState.data).toEqual('persists!');
      },
      () => {
        wasSuccess = true;
      },
    );

    expect(wasSuccess).toBe(false);
  },
]);

testMany('mapData', [
  () => {
    const parser = withData(
      coroutine(function*() {
        yield mapData(d => d.map(x => x * 2));
        return 42;
      }),
    );

    let wasError = false;

    parser([1, 2, 3]).fork(
      'Hello',
      e => {
        wasError = true;
      },
      (value, parserState) => {
        expect(value).toEqual(42);
        expect(parserState.data).toEqual([2, 4, 6]);
      },
    );

    expect(wasError).toBe(false);
  },
  () => {
    const parser = withData(Parser.of(42).mapData(d => d.map(x => x * 2)));

    let wasError = false;

    parser([1, 2, 3]).fork(
      'Hello',
      e => {
        wasError = true;
      },
      (value, parserState) => {
        expect(value).toEqual(42);
        expect(parserState.data).toEqual([2, 4, 6]);
      },
    );

    expect(wasError).toBe(false);
  },
]);

testMany('.errorChain', [
  () => {
    const p = val =>
      fail(val).errorChain(({ error }) => {
        if (error === 42) {
          return letters;
        } else {
          return fail('nope');
        }
      });

    const res = p(42).run('abc');
    expect(res.isError).toBe(false);
    expect(res.result).toEqual('abc');

    const res2 = p(41).run('abc');
    expect(res2.isError).toBe(true);
    expect(res2.error).toEqual('nope');
  },
  () => {
    const p = letters
      .chain(() => fail(42))
      .errorChain(({ index }) => {
        if (index === 3) {
          return digits;
        } else {
          return fail('nope');
        }
      });

    const res = p.run('abc1234');
    expect(res.isError).toBe(false);
    expect(res.result).toEqual('1234');

    const res2 = p.run('abcd1234');
    expect(res2.isError).toBe(true);
    expect(res2.error).toEqual('nope');
  },
  () => {
    const p = withData(
      fail(42).errorChain(({ data }) => {
        if (data === 'I was stored!') {
          return letters;
        } else {
          return fail('nope');
        }
      }),
    );

    const res = p('I was stored!').run('abc');
    expect(res.isError).toBe(false);
    expect(res.result).toEqual('abc');

    const res2 = p('something different').run('abc');
    expect(res2.isError).toBe(true);
    expect(res2.error).toEqual('nope');
  },
  () => {
    const p = letters.errorChain(() => Parser.of('I changed!'));

    const res = p.run('abc');
    expect(res.isError).toBe(false);
    expect(res.result).toEqual('abc');
  },
]);

test('mapFromData', () => {
  const p = withData(
    Parser.of(42).mapFromData(({ data }) => {
      if (data === 'yes') {
        return 0xdeadbeef;
      } else {
        return 0xf00dbabe;
      }
    }),
  );

  const out1 = p('yes').run('whatever').result;
  expect(out1).toEqual(0xdeadbeef);

  const out2 = p('nope').run('whatever').result;
  expect(out2).toEqual(0xf00dbabe);
});

test('chainFromData', () => {
  const p = withData(
    Parser.of(42).chainFromData(({ data }) => {
      if (data === 'use digits') {
        return digits;
      } else {
        return letters;
      }
    }),
  );

  const out1 = p('use digits').run('012345');
  expect(out1.isError).toBe(false);
  expect(out1.result).toEqual('012345');

  const out2 = p('use letters').run('012345');
  expect(out2.isError).toBe(true);
  expect(out2.error).toEqual(`ParseError (position 0): Expecting letters`);
});

test('map (equivalence to mapTo)', () => {
  const fn = x => ({ value: x });

  const successMap = letters.map(fn);
  const successMapTo = pipeParsers([letters, mapTo(fn)]);

  const failMap = fail('nope').map(fn);
  const failMapTo = pipeParsers([fail('nope'), mapTo(fn)]);

  expectEquivalence(successMap, successMapTo)();
  expectEquivalence(failMap, failMapTo)();
});

testMany('map (laws)', [
  expectEquivalence(
    letters.map(x => x),
    letters,
  ),
  expectEquivalence(
    letters.map(x => f(g(x))),
    letters.map(g).map(f),
  ),
]);

testMany('errorMap (laws)', [
  expectEquivalence(
    fail('nope').errorMap(({error}) => error),
    fail('nope'),
  ),
  expectEquivalence(
    fail('nope').map(x => f(g(x))),
    fail('nope')
      .map(g)
      .map(f),
  ),
]);

test('errorMap (equivalence to errorMapTo)', () => {
  const fnMap = ({error}) => ({ value: error });
  const fnMapTo = x => ({ value: x });

  const failMap = fail('nope').errorMap(fnMap);
  const failMapTo = pipeParsers([fail('nope'), errorMapTo(fnMapTo)]);

  expectEquivalence(failMap, failMapTo)();
});

test('chain (equivalence to decide)', () => {
  const testStr1 = 'num 42';
  const testStr2 = 'num 42';
  const testStr3 = 'num 42';

  const fn = x => {
    if (x === 'num ') {
      return digits;
    } else if (x === 'str ') {
      return letters;
    } else {
      return fail('nope');
    }
  };

  const lettersSpace = takeLeft(letters)(whitespace);

  const successChain = lettersSpace.chain(fn);
  const successDecide = pipeParsers([lettersSpace, decide(fn)]);
  const failChain = fail('nope').chain(fn);
  const failDecide = pipeParsers([fail('nope'), decide(fn)]);

  expect(parse(successChain)(testStr1)).toEqual(parse(successDecide)(testStr1));
  expect(parse(failChain)(testStr1)).toEqual(parse(failDecide)(testStr1));

  expect(parse(successChain)(testStr2)).toEqual(parse(successDecide)(testStr2));
  expect(parse(failChain)(testStr2)).toEqual(parse(failDecide)(testStr2));

  expect(parse(successChain)(testStr3)).toEqual(parse(successDecide)(testStr3));
  expect(parse(failChain)(testStr3)).toEqual(parse(failDecide)(testStr3));
});

testMany('chain (laws)', [
  expectEquivalence(
    letters.chain(() => digits).chain(() => char('a')),
    letters.chain(x => (() => digits)(x).chain(() => char('a'))),
  ),
]);

testMany('errorChain (laws)', [
  expectEquivalence(
    fail('no')
      .errorChain(() => digits)
      .chain(() => char('a')),
    fail('no').errorChain(x => (() => digits)(x).chain(() => char('a'))),
  ),
]);

testMany('applicative (laws)', [
  expectEquivalence(letters.ap(Parser.of(x => x)), letters),
  expectEquivalence(Parser.of(42).ap(Parser.of(f)), Parser.of(f(42))),
  expectEquivalence(
    Parser.of(42).ap(Parser.of(f)),
    Parser.of(f).ap(Parser.of(fn => fn(42))),
  ),
]);

test('ap (equivalence to ...)', () => {
  const testStr = 'hello';
  const fn = x => ({ value: x });

  const sNonAp = pipeParsers([
    sequenceOf([succeedWith(fn), letters]),
    mapTo(([fn, x]) => fn(x)),
  ]);
  const sAp = letters.ap(Parser.of(fn));

  const fNonAp = takeRight(fail('nope'))(
    pipeParsers([
      sequenceOf([succeedWith(fn), letters]),
      mapTo(([fn, x]) => fn(x)),
    ]),
  );
  const fAp = takeRight(fail('nope'))(letters.ap(Parser.of(fn)));

  expect(parse(sNonAp)(testStr)).toEqual(parse(sAp)(testStr));
  expect(parse(fNonAp)(testStr)).toEqual(parse(fAp)(testStr));
});

testMany('ap (laws)', [
  expectEquivalence(
    letters.ap(Parser.of(g).ap(Parser.of(f).map(f => g => x => f(g(x))))),
    letters.ap(Parser.of(g)).ap(Parser.of(f)),
  ),
]);

test('coroutine is stack safe', () => {
  const doubleStack = MAX_STACK_SIZE * 2;
  const input = 'a'.repeat(doubleStack);

  const parser = coroutine(function* () {
    let out = '';
    for (let i = 0; i < doubleStack; i++) {
      out += (yield letter).toUpperCase();
    }
    return out;
  });

  expect(parse(parser)(input).result).toEqual('A'.repeat(doubleStack));
});

testMany('regression: regex captures the right number of characters', [
  expectedSuccessTest(
    sequenceOf([
      str('('),
      regex(/^aeioú/),
      str(')'),
    ]),
    ['(', 'aeioú', ')'],
    '(aeioú)',
  ),
])

testMany('regression: str captures the right number of characters', [
  expectedSuccessTest(
    sequenceOf([
      str('('),
      str('aeioú'),
      str(')'),
    ]),
    ['(', 'aeioú', ')'],
    '(aeioú)',
  )
]);