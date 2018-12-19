const {
  parse,
  char,
  str
} = require('..')

const testStr = "abc123";

const failLeft = () => expect('Expected a Right');
const failRight = () => expect('Expected a Left');
const succeed = () => expect(1).toBe(1);

const expectedFailTest = parser => () => {
  parse (parser) (testStr) .cata ({
    Left: succeed,
    Right: failRight
  });
}

test('char should match correctly', () => {
  parse (char ('a')) (testStr) .cata ({
    Left: failLeft,
    Right: x => expect(x).toBe('a')
  });
});

test('char should fail correctly', expectedFailTest (char ('z')));

test('str should match correctly', () => {
  parse (str ('abc')) (testStr) .cata ({
    Left: failLeft,
    Right: x => expect(x).toBe('abc')
  });
});

test('str should fail correctly', expectedFailTest (str ('def')));

test('digit should match correctly', () => {
  parse (str ('abc')) (testStr) .cata ({
    Left: failLeft,
    Right: x => expect(x).toBe('abc')
  });
});