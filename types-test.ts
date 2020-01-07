import AS from './index';

// .run
const runResult: AS.ParserState<string, null, null> = AS.str('hello').run('hello');

// .fork
const forkResult: string | { data: string; } = AS.str('hello').fork(
  'hello',
  (errorMsg, parsingState) => {
    console.log(errorMsg);
    console.log(parsingState);
    return { data: 'goodbye' }
  },
  (result, parsingState) => {
    console.log(parsingState);
    return result;
  }
);

// .map
const mapResult: AS.Parser<{ matchType: string; value: string; }, null> = AS.letters.map(x => ({
  matchType: 'string',
  value: x
}));

// .chain
const chainResult: AS.Parser<string, null> | AS.Parser<{ result: string; }, null> | AS.Parser<null, null, string> = AS.letters
  .chain(matchedValue => {
    switch (matchedValue) {
      case 'number':
        return AS.digits.map(result => ({ result }));

      case 'string':
        return AS.letters;

      default:
        return AS.fail('Unrecognised input type');
    }
  });

// .mapFromData
const mapFromDataResult: AS.Parser<{ matchedValueWas: string; internalDataWas: null;}, null, null> =
  AS.letters.mapFromData(({result, data}) => ({
    matchedValueWas: result,
    internalDataWas: data
  }));

// .chainFromData
const chainFromDataResult: AS.ParserState<string, { bypassNormalApproach: boolean; }, null> = AS.withData(
  AS.letters.chainFromData(({ result, data }) => {
    if ((data as any).bypassNormalApproach) {
      return AS.digits;
    }

    return AS.letters;
  })
)({ bypassNormalApproach: false }).run('hello');


// .errorChain
const errorChainResult: AS.Parser<string, null, null> = AS.digits.errorChain(({error, index, data}) => {
  console.log('Recovering...');
  return AS.letters;
});

// setData
const setDataResult: AS.Parser<null, { message: string; }, null> = AS.setData({ message: 'The name is Jim' });

// withData
const parserWithData: AS.Parser<{ result: string; }, string, null> =
  AS.withData(AS.letters.map(result => ({ result })))("hello world!");

// mapData
const mapDataResult: AS.Parser<string, string, null> = AS.mapData<string, string>(s => s.toUpperCase());

// getData
const getDataResult: AS.Parser<string, string, null> =
  AS.withData((AS.getData as AS.Parser<string, string, null>))("hello world!");

// coroutine
const coroutineResult = AS.coroutine(function* () {
  // Capture some letters and assign them to a variable
  const name = yield AS.letters;

  // Capture a space
  yield AS.char(' ');

  const age = yield AS.digits.map(Number);

  // Capture a space
  yield AS.char(' ');

  if (age > 18) {
    yield AS.str('is an adult');
  } else {
    yield AS.str('is a child');
  }

  return { name, age };
});

// char
const charResult: AS.Parser<string> = AS.char('h');

// str
const strResult: AS.Parser<string> = AS.str('hello');

// digit
const digitResult: AS.Parser<string> = AS.digit;

// digits
const digitsResult: AS.Parser<string> = AS.digits;

// letter
const letterResult: AS.Parser<string> = AS.letter;

// letters
const lettersResult: AS.Parser<string> = AS.letters;

// whitespace
const whitespaceResult: AS.Parser<string> = AS.whitespace;

// optionalWhitespace
const optionalWhitespaceResult: AS.Parser<string> = AS.optionalWhitespace;

// anyOfString
const anyOfStringResult: AS.Parser<string> = AS.anyOfString('aeiou');

// regex
const regexResult: AS.Parser<string> = AS.regex(/^[hH][aeiou].{2}o/);

// sequenceOf
const sequenceOfResult: AS.Parser<string[]> = AS.sequenceOf([
  AS.str('he'),
  AS.letters,
  AS.char(' '),
  AS.str('world'),
]);

// namedSequenceOf
const namedSequenceOfResult: AS.Parser<{ [key: string]: string | { r: string } }, null, null>  = AS.namedSequenceOf([
  ['firstPart', AS.str('he')],
  ['secondPart', AS.letters.map(r => ({ r }))],
  ['thirdPart', AS.char(' ')],
  ['forthPart', AS.str('world')],
]);

// choice
const choiceResult: AS.Parser<string> = AS.choice([
  AS.digit,
  AS.char('!'),
  AS.str('hello'),
  AS.str('pineapple')
]);

// lookAhead
const lookAheadResult: AS.Parser<string> = AS.lookAhead(AS.str('world'));

// sepBy
const sepByResult: AS.Parser<string[]> = AS.sepBy(AS.char(','))(AS.letters);

// sepBy1
const sepBy1Result: AS.Parser<string[]> = AS.sepBy1(AS.char(','))(AS.letters);

// many
const manyResult: AS.Parser<string[], null, null> = AS.many(AS.str('abc'));

// many1
const many1Result: AS.Parser<string[], null, null> = AS.many1(AS.str('abc'));

// between
const betweenResult: AS.Parser<string, null, null> = AS.between(AS.char('<'))(AS.char('>'))(AS.letters);

// everythingUntil
const everythingUntilResult: AS.Parser<string, null, null> = AS.everythingUntil(AS.char('.'));

// anythingExcept
const anythingExceptResult: AS.Parser<string, null, null> = AS.anythingExcept(AS.char('.'));

// possibly
const possiblyResult: AS.Parser<string | null, null, null> = AS.possibly(AS.str('Not Here'));

// endOfInput
const endOfInputResult: AS.Parser<null, null, null> = AS.endOfInput;

// skip
const skipResult: AS.Parser<string, null, null> = AS.skip<string, null>(AS.str('def'));

// pipeParsers
const pipeParsersResult: AS.Parser<string, null, null> = AS.pipeParsers<string>([
  AS.str('hello'),
  AS.char(' '),
  AS.str('world')
]);

// composeParsers
const composeParsersResult: AS.Parser<string, null, null> = AS.composeParsers<string>([
  AS.str('world'),
  AS.char(' '),
  AS.str('hello')
]);

// takeRight
const takeRightResult: AS.Parser<string, null, null> = AS.takeRight(AS.str('hello '))(AS.str('world'));

// takeLeft
const takeLeftResult: AS.Parser<string, null, null> = AS.takeLeft(AS.str('hello '))(AS.str('world'));

// recursiveParser
const recursiveParserResult: AS.Parser<string, null, null> = AS.recursiveParser(() => AS.str('hello'));

// tapParser
const tapParserResult: AS.Parser<string, null, null> = AS.tapParser<string>(state => state.result.toUpperCase());

// decide
const decideResult: AS.Parser<string, null, null> | AS.Parser<null, null, string> =
  AS.decide((v: string) => {
    switch (v) {
      case 'asLetters': return AS.letters;
      case 'asDigits': return AS.digits;
      default: return AS.fail(`Unrecognised signifier '${v}'`);
    }
  });

// mapTo
const mapToResult: AS.Parser<{ matchType: string; value: string; }, null, null> =
  AS.mapTo((x: string) => {
    return {
      matchType: 'string',
      value: x
    }
  });

// errorMapTo
const errorMapToResult: AS.Parser<string, null, string> =
  AS.errorMapTo<string, string>((message, index) => `Old message was: [${message}] @ index ${index}`);

// fail
const failResult: AS.Parser<null, null, string> = AS.fail('Fail');

// succeedWith
const succeedWithResult: AS.Parser<string, null, null> = AS.succeedWith('Succeed');

// either
const eitherResult: AS.Parser<{ isError: boolean, value: null }, null, null> = AS.either(AS.fail('nope!'));

// toPromise
const toPromiseResult: Promise<string | { data: null; error: string; index: number }> =
  AS.toPromise(AS.str('hello').run('hello'));

// toValue
const toValueResult: { value: string } = AS.toValue(AS.str('hello').map(r => ({ value: r })).run('hello worbackgroiund<hAld'))

// parser
const parse: AS.ParserState<string, null, null> = AS.parse(AS.str('hello'))('hello');
