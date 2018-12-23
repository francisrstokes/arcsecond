const {
  Parser,
  parse,
  char,
  str,
  digit,
  fail,
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
  pipeParsers,
  composeParsers,
  anythingExcept,
  lookAhead,
  possibly,
  skip,
  whitespace,
  takeRight,
  takeLeft,
  recursiveParser,
  tapParser,
  decide,
  mapTo,
  toPromise,
  toValue,
  succeedWith
} = require('../index')

const {Left,Right} = require('data.either');

const f = x => ({ f: x });
const g = x => ({ g: x });

const expectEquivalence = (parserA, parserB) => () => {
  const strings = [
    'hello world',
    'hello1234a',
    '',
    '12345 325vfs43',
    '!@#$%^',
    '≈ç√∫˜µ hgello skajb'
  ];

  strings.forEach(s => {
    expect(
      parse(parserA)(s)
    ).toEqual(
      parse(parserB)(s)
    )
  });
};

const failLeft = () => {
  throw new Error ('Expected a Right')
};
const failRight = () => {
  throw new Error ('Expected a Left')
};

const expectedFailTest = (parser, testingString) => () => {
  if (parse (parser) (testingString).isRight) {
    failRight();
  }
};

const expectedSuccessTest = (parser, expectation, testingString) => () => {
  const out = parse (parser) (testingString);
  if (out.isRight) {
    expect(out.get()).toEqual(expectation);
  } else {
    failLeft();
  }
};

const expectedThrowTest = (parserFn, testingString, errorMessage = '') => () => {
  expect(() => {
    parse(parserFn())(testingString)
  }).toThrow(errorMessage)
}

const testMany = (msg, testFns) => test(msg, () => testFns.forEach(fn => fn()));

testMany.only = (msg, testFns) => {
  describe.only('', () => {
    test(msg, () => testFns.forEach(fn => fn()));
  })
}

test(
  'Parser',
  expectedSuccessTest (Parser, null, 'something')
);

testMany(
  'char', [
    expectedSuccessTest(char ('a'), 'a', 'abc123'),
    expectedFailTest (char ('a'), '123'),
    expectedFailTest (char ('a'), ''),
    expectedThrowTest (char ('aaaa'), 'aaaabcdef', 'char must be called with a single character, but got aaaa'),
  ]
);

testMany(
  'str', [
    expectedSuccessTest(str ('abc'), 'abc', 'abc123'),
    expectedFailTest (str ('def'), 'abc123'),
    expectedFailTest (str ('def'), ''),
    expectedThrowTest (str (''), 'aaaabcdef', 'str must be called with a string with length > 1, but got '),
  ]
);

testMany(
  'digit', [
    expectedSuccessTest(digit, '1', '1234'),
    expectedFailTest(digit, 'abc123'),
    expectedFailTest(digit, ''),
  ]
);

testMany(
  'digits', [
    expectedSuccessTest(digits, '1234', '1234'),
    expectedSuccessTest(digits, '1', '1abc2'),
    expectedFailTest(digits, 'abc123'),
    expectedFailTest(digits, ''),
  ]
);

testMany(
  'letter', [
    expectedSuccessTest(letter, 'a', 'abcd1234'),
    expectedSuccessTest(letter, 'A', 'AbCd1234'),
    expectedFailTest(letter, '123ABxc'),
    expectedFailTest(letter, ''),
  ]
);

testMany(
  'letters', [
    expectedSuccessTest(letters, 'abcd', 'abcd1234'),
    expectedSuccessTest(letters, 'AbCd', 'AbCd1234'),
    expectedFailTest(letters, '123ABxc'),
    expectedFailTest(letters, '')
  ]
);

testMany(
  'fail', [
    expectedFailTest(fail('nope'), 'abc123'),
    expectedFailTest(fail('nope'), ''),
    expectedFailTest(fail('nope'), '12435'),
  ]
);

testMany(
  'succeedWith', [
    expectedSuccessTest(succeedWith('yes'), 'yes', 'abc123'),
    expectedSuccessTest(succeedWith('yes'), 'yes', ''),
    expectedSuccessTest(succeedWith('yes'), 'yes', '12435'),
  ]
);

testMany(
  'many', [
    expectedSuccessTest(many (digit), '1234'.split(''), '1234abc'),
    expectedSuccessTest(many (digit), '12345'.split(''), '12345abc'),
    expectedSuccessTest(many (digit), [], 'abc'),
    expectedSuccessTest(many (digit), [], ''),
  ]
);

testMany(
  'many1', [
    expectedSuccessTest(many1 (digit), '1234'.split(''), '1234abc'),
    expectedSuccessTest(many1 (digit), '12345'.split(''), '12345abc'),
    expectedFailTest(many1 (digit), 'abc'),
    expectedFailTest(many1 (digit), ''),
  ]
);

testMany(
  'regex', [
    expectedSuccessTest(regex (/^[a-zA-Z0-9]/), '1', '1234abc_dsklvnjsd'),
    expectedSuccessTest(regex (/^[a-zA-Z0-9]+/), '1234abc', '1234abc_dsklvnjsd'),
    expectedSuccessTest(regex (/^[a-zA-Z0-9]+/g), '1234abc', '1234abc_dsklvnjsd'),
    expectedSuccessTest(regex (/^[a-z0-9]+/i), '1234abc', '1234abc_dsklvnjsd'),
    expectedSuccessTest(regex (/^[a-z0-9]+/gi), '1234abc', '1234abc_dsklvnjsd'),
    expectedSuccessTest(regex (/^(\w\s?)+/), 'this is a sentence', 'this is a sentence. this is another'),
    expectedFailTest(regex (/^(\w\s?)+/), ''),
    expectedFailTest(regex (/^[a-zA-Z]+/), '123abc'),
    expectedThrowTest(() => regex (/[a-zA-Z]+/), '123abc', `regex parsers must contain '^' start assertion.`),
    expectedThrowTest(() => regex (34), '123abc', 'regex must be called with a Regular Expression, but got [object Number]')
  ]
);

testMany(
  'anyOfString', [
    expectedSuccessTest(anyOfString ('abcdef'), 'c', 'can I match'),
    expectedFailTest(anyOfString ('abcdef'), 'zebra'),
  ]
);

testMany(
  'anyOfString', [
    expectedSuccessTest(anyOfString ('abcdef'), 'c', 'can I match'),
    expectedFailTest(anyOfString ('abcdef'), 'zebra'),
  ]
);

testMany(
  'namedSequenceOf', [
    expectedSuccessTest(
      namedSequenceOf([
        ['first', str ('abc')],
        ['second', regex (/^[0-9\-]+/)],
        ['third', letters],
      ]),
      {
        first: 'abc',
        second: '9823-2134-2-24-2--',
        third: 'hallo'
      },
      'abc9823-2134-2-24-2--hallo'
    ),

    expectedFailTest(
      namedSequenceOf([
        ['first', str ('abc')],
        ['second', regex (/^[0-9\-]+/)],
        ['third', letters],
      ]),
      'def9823-2134-2-24-2-hallo'
    ),
  ]
);

testMany(
  'sequenceOf', [
    expectedSuccessTest(
      sequenceOf([
        str ('abc'),
        regex (/^[0-9\-]+/),
        letters,
      ]),
      [
        'abc',
        '9823-2134-2-24-2--',
        'hallo'
      ],
      'abc9823-2134-2-24-2--hallo'
    ),

    expectedFailTest(
      sequenceOf([
        str ('abc'),
        regex (/^[0-9\-]+/),
        letters,
      ]),
      'def9823-2134-2-24-2-hallo'
    ),
  ]
);

testMany(
  'sepBy', [
    expectedSuccessTest(sepBy (char (',')) (letter), ['a', 'b', 'c'], 'a,b,c'),
    expectedSuccessTest(sepBy (char (',')) (letter), [], ''),
    expectedSuccessTest(sepBy (char (',')) (letter), [], '1,2,3'),
    expectedFailTest(sepBy (char (',')) (letter), 'a,b,'),
  ]
);

testMany(
  'sepBy1', [
    expectedSuccessTest(sepBy1 (char (',')) (letter), ['a', 'b', 'c'], 'a,b,c'),
    expectedFailTest(sepBy1 (char (',')) (letter), [], ''),
    expectedFailTest(sepBy1 (char (',')) (letter), [], '1,2,3'),
    expectedFailTest(sepBy1 (char (',')) (letter), 'a,b,'),
  ]
);

testMany(
  'choice', [
    expectedSuccessTest(
      choice ([
        letter,
        digit,
        char('!')
      ]),
      'a',
      'abcd'
    ),
    expectedSuccessTest(
      choice ([
        letter,
        digit,
        char('!')
      ]),
      '1',
      '1bcd'
    ),
    expectedSuccessTest(
      choice ([
        letter,
        digit,
        char('!')
      ]),
      '!',
      '!bcd'
    ),
    expectedFailTest(
      choice ([
        letter,
        digit,
        char('!')
      ]),
      '-bcd'
    )
  ]
);

testMany(
  'between', [
    expectedSuccessTest(between (char('(')) (char(')')) (letters), 'hello', '(hello)'),
    expectedSuccessTest(between (char('[')) (char(']')) (sepBy (char(',')) (digit)), '1234'.split(''), '[1,2,3,4]'),
    expectedFailTest(between (char('(')) (char(')')) (letters), 'hello', '(hello world)'),
    expectedFailTest(between (char('(')) (char(')')) (letters), 'hello', '()'),
  ]
);

testMany(
  'pipeParsers', [
    expectedSuccessTest(
      pipeParsers ([
        str ('hello'),
        char (' '),
        str ('world')
      ]),
      'world',
      'hello world'
    ),
    expectedFailTest(
      pipeParsers ([
        str ('hello'),
        char (' '),
        str ('world')
      ]),
      'hellok world'
    ),
  ]
);

testMany(
  'composeParsers', [
    expectedSuccessTest(
      composeParsers ([
        str ('world'),
        char (' '),
        str ('hello'),
      ]),
      'world',
      'hello world'
    ),
    expectedFailTest(
      composeParsers ([
        str ('world'),
        char (' '),
        str ('hello'),
      ]),
      'hellok world'
    ),
  ]
);

testMany(
  'everythingUntil', [
    expectedSuccessTest(
      everythingUntil (char ('!')),
      'dsv2#%3423√ç∫˜µ˚∆˙∫√†¥',
      'dsv2#%3423√ç∫˜µ˚∆˙∫√†¥!'
    ),
    expectedSuccessTest(
      pipeParsers ([
        everythingUntil (char ('!')),
        char ('!')
      ]),
      '!',
      'dsv2#%3423√ç∫˜µ˚∆˙∫√†¥!'
    ),
    expectedSuccessTest(
      everythingUntil (char ('!')),
      '',
      '!'
    ),
    expectedFailTest(
      everythingUntil (char ('!')),
      ''
    ),
  ]
);

testMany(
  'anythingExcept', [
    expectedSuccessTest(anythingExcept (char ('!')), 'a', 'a'),
    expectedSuccessTest(anythingExcept (char ('!')), '1', '1'),
    expectedSuccessTest(anythingExcept (char ('!')), '√', '√'),
    expectedFailTest(anythingExcept (char ('!')), '!'),
  ]
);

testMany(
  'lookAhead', [
    expectedSuccessTest(lookAhead (char('a')), 'a', 'a'),
    expectedSuccessTest(
      pipeParsers ([
        lookAhead (char('a')),
        char ('a')
      ]),
      'a',
      'a'
    ),
    expectedFailTest(lookAhead (char('a')), 'b'),
  ]
);

testMany(
  'possibly', [
    expectedSuccessTest(possibly (char('a')), 'a', 'a'),
    expectedSuccessTest(possibly (char('a')), null, 'b'),
    expectedSuccessTest(possibly (fail('nope')), null, 'a'),
    expectedSuccessTest(possibly (char('a')), null, ''),
  ]
);

testMany(
  'skip', [
    expectedSuccessTest(skip (char('a')), null, 'a'),
    expectedFailTest(skip (char('a')), 'b'),
  ]
);

testMany(
  'whitespace', [
    expectedSuccessTest(whitespace, '    ', '    '),
    expectedSuccessTest(whitespace, '', ''),
    expectedSuccessTest(whitespace, '', 'a'),
    expectedSuccessTest(whitespace, '         ', '         a'),
  ]
);

testMany(
  'takeRight', [
    expectedSuccessTest(takeRight (str ('abc')) (str ('def')), 'def', 'abcdef'),
    expectedFailTest(takeRight (str ('abc')) (str ('def')), 'abc'),
    expectedFailTest(takeRight (str ('abc')) (str ('def')), ''),
  ]
);

testMany(
  'takeLeft', [
    expectedSuccessTest(takeLeft (str ('abc')) (str ('def')), 'abc', 'abcdef'),
    expectedFailTest(takeLeft (str ('abc')) (str ('def')), 'abc'),
    expectedFailTest(takeLeft (str ('abc')) (str ('def')), ''),
  ]
);

testMany(
  'mapTo', [
    expectedSuccessTest(
      pipeParsers ([
        char ('a'),
        mapTo (x => ({ theLetter: x }))
      ]),
      {theLetter:'a'},
      'abc'
    ),
    expectedSuccessTest(
      mapTo (() => 'bleh'),
      'bleh',
      ''
    ),
  ]
);


const decideFn = x => {
  if (x === 'a') {
    return digit;
  } else if (x === 'b') {
    return letter;
  } else {
    return fail('nope');
  }
};
testMany(
  'decide', [
    expectedSuccessTest(
      pipeParsers([
        letter,
        decide (decideFn)
      ]),
      '1',
      'a1'
    ),
    expectedSuccessTest(
      pipeParsers([
        letter,
        decide (decideFn)
      ]),
      'x',
      'bx'
    ),
    expectedFailTest(
      pipeParsers([
        letter,
        decide (decideFn)
      ]),
      'b1'
    ),
    expectedFailTest(
      pipeParsers([
        letter,
        decide (decideFn)
      ]),
      'b1'
    ),
    expectedFailTest(
      pipeParsers([
        letter,
        decide (decideFn)
      ]),
      'ca'
    ),
    // expectedFailTest(takeLeft (str ('abc')) (str ('def')), 'abc'),
    // expectedFailTest(takeLeft (str ('abc')) (str ('def')), ''),
  ]
);

test('recursiveParser', () => {
  const value = recursiveParser(() => choice([
    letter,
    digit,
    arr
  ]));

  const arr = between (char ('[')) (char (']')) (sepBy (char (',')) (value));

  expectedSuccessTest(value, 'a', 'abc')();
  expectedSuccessTest(value, '1', '123')();
  expectedSuccessTest(value, ['1', 'a', ['2', 'b']], '[1,a,[2,b]]')();
  expectedFailTest(value, '!nope')();
  expectedFailTest(value, '')();
});

test('tapParser', () => {
  let wasCalled = false;
  let value;
  const parser = pipeParsers ([
    char ('a'),
    tapParser(x => {
      wasCalled = true;
      value = x;
    }),
  ]);


  expectedSuccessTest(parser, 'a', 'abc')();
  expect(wasCalled).toBe(true);
  expect(value).toEqual([1, 'abc', 'a']);

  wasCalled = false;
  value = null;

  expectedFailTest(parser, 'xyz')();
  expect(wasCalled).toBe(true);
  expect(value).toEqual([0, `ParseError (position 0): Expecting character 'a', got 'x'`]);
});

test('toPromise', async () => {
  const lv = Left('oh no');
  const rv = Right('oh yes');

  await toPromise(lv)
    .then(() => {
      throw new Error('Expected to reject')
    })
    .catch(x => expect(x).toBe('oh no'));

  await toPromise(rv)
    .then(x => expect(x).toBe('oh yes'))
    .catch(() => {
      throw new Error('Expected to resolve')
    });
});

test('toValue', () => {
  const lv = Left('oh no');
  const rv = Right('oh yes');

  try {
    toValue(lv);
    throw new Error('Expected to throw error');
  } catch (ex) {
    expect(ex.message).toBe('oh no');
  }

  expect(() => {
    const x = toValue(rv);
    expect(x).toBe('oh yes');
  }).not.toThrow()
});

test('map (equivalence to mapTo)', () => {
  const testStr = 'hello';
  const fn = x => ({ value: x })

  const successMap = letters.map(fn);
  const successMapTo = pipeParsers ([ letters, mapTo (fn) ]);

  const failMap = fail('nope').map(fn);
  const failMapTo = pipeParsers ([ fail('nope'), mapTo (fn) ]);

  expectEquivalence(successMap, successMapTo)();
  expectEquivalence(failMap, failMapTo)();
});

testMany('map (laws)', [
  expectEquivalence(
    letters.map(x => x),
    letters
    ),
    expectEquivalence(
      letters.map(x => f(g(x))),
      letters.map(g).map(f)
    ),
]);

test('chain (equivalence to decide)', () => {
  const testStr1 = 'num 42';
  const testStr2 = 'num 42';
  const testStr3 = 'num 42';

  const fn = x => {
    if (x === 'num ') {
      return digits;
    } else if (x == 'str ') {
      return letters;
    } else {
      return fail ('nope');
    }
  };

  const lettersSpace = takeLeft (letters) (whitespace);

  const successChain = lettersSpace.chain(fn);
  const successDecide = pipeParsers ([ lettersSpace, decide (fn) ]);
  const failChain = fail('nope').chain(fn);
  const failDecide = pipeParsers ([ fail('nope'), decide (fn) ]);

  expect(parse (successChain) (testStr1)).toEqual(parse (successDecide) (testStr1));
  expect(parse (failChain) (testStr1)).toEqual(parse (failDecide) (testStr1));

  expect(parse (successChain) (testStr2)).toEqual(parse (successDecide) (testStr2));
  expect(parse (failChain) (testStr2)).toEqual(parse (failDecide) (testStr2));

  expect(parse (successChain) (testStr3)).toEqual(parse (successDecide) (testStr3));
  expect(parse (failChain) (testStr3)).toEqual(parse (failDecide) (testStr3));
});

testMany('chain (laws)', [
  expectEquivalence(
    letters.chain(() => digits).chain(() => char('a')),
    letters.chain(x => (() => digits)(x).chain(() => char('a')))
  )
]);

testMany('applicative (laws)', [
  expectEquivalence(
    letters.ap(Parser.of(x => x)),
    letters
  ),
  expectEquivalence(
    Parser.of(42).ap(Parser.of(f)),
    Parser.of(f(42))
  ),
  expectEquivalence(
    Parser.of(42).ap(Parser.of(f)),
    Parser.of(f).ap(Parser.of(fn => fn(42)))
  )
]);

test('ap (equivalence to ...)', () => {
  const testStr = 'hello';
  const fn = x => ({ value: x })

  const sNonAp = pipeParsers ([
    sequenceOf ([ succeedWith (fn), letters ]),
    mapTo (([fn, x]) => fn(x))
  ]);
  const sAp = letters.ap(Parser.of(fn));

  const fNonAp = takeRight (fail('nope')) (pipeParsers ([
    sequenceOf ([ succeedWith (fn), letters ]),
    mapTo (([fn, x]) => fn(x))
  ]));
  const fAp = takeRight (fail('nope')) (letters.ap(Parser.of(fn)));

  expect(parse (sNonAp) (testStr)).toEqual(parse (sAp) (testStr));
  expect(parse (fNonAp) (testStr)).toEqual(parse (fAp) (testStr));
});

testMany('ap (laws)', [
  expectEquivalence(
    letters.ap(Parser.of(g).ap(Parser.of(f).map(f => g => x => f(g(x))))),
    letters.ap(Parser.of(g)).ap(Parser.of(f))
  )
]);