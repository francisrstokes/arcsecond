import { expectType } from "tsd";

import AS from "../index";

// .run
expectType<AS.ParserState<string, any, any>>(AS.str("hello").run("hello"));

// .fork
expectType<string | { data: string }>(
  AS.str("hello").fork(
    "hello",
    (errorMsg, parsingState) => {
      console.log(errorMsg);
      console.log(parsingState);
      return { data: "goodbye" };
    },
    (result, parsingState) => {
      console.log(parsingState);
      return result;
    }
  )
);

// .map
expectType<AS.Parser<{ matchType: string; value: string }, any, any>>(
  AS.letters.map(x => ({
    matchType: "string",
    value: x
  }))
);

// .chain
expectType<
  | AS.Parser<string, any, any>
  | AS.Parser<{ result: string }, any, any>
  | AS.Parser<null, null, string>
>(
  AS.letters.chain(matchedValue => {
    switch (matchedValue) {
      case "number":
        return AS.digits.map(result => ({ result }));

      case "string":
        return AS.letters;

      default:
        return AS.fail("Unrecognised input type");
    }
  })
);

// .mapFromData
expectType<
  AS.Parser<{ matchedValueWas: string; internalDataWas: any }, any, any>
>(
  AS.letters.mapFromData(({ result, data }) => ({
    matchedValueWas: result,
    internalDataWas: data
  }))
);

// .chainFromData
expectType<AS.ParserState<string, { bypassNormalApproach: boolean }, any>>(
  AS.withData(
    AS.letters.chainFromData(({ result, data }) => {
      if ((data as any).bypassNormalApproach) {
        return AS.digits;
      }

      return AS.letters;
    })
  )({ bypassNormalApproach: false }).run("hello")
);

// .errorChain
expectType<AS.Parser<string, any, null>>(
  AS.digits.errorChain(({ error, index, data }) => {
    console.log("Recovering...");
    return AS.letters;
  })
);

// setData
expectType<AS.Parser<null, { message: string }, null>>(
  AS.setData({
    message: "The name is Jim"
  })
);

// withData
expectType<AS.Parser<{ result: string }, string, any>>(
  AS.withData(AS.letters.map(result => ({ result })))("hello world!")
);

// mapData
expectType<AS.Parser<string, string, any>>(
  AS.mapData<string, string>(s => s.toUpperCase())
);

// getData
expectType<AS.Parser<string, string, null>>(
  AS.withData(AS.getData as AS.Parser<string, string, null>)("hello world!")
);

// coroutine
expectType<
  AS.Parser<
    {
      name: any;
      age: any;
    },
    any,
    any
  >
>(
  AS.coroutine(function*() {
    // Capture some letters and assign them to a variable
    const name = yield AS.letters;

    // Capture a space
    yield AS.char(" ");

    const age = yield AS.digits.map(Number);

    // Capture a space
    yield AS.char(" ");

    if (age > 18) {
      yield AS.str("is an adult");
    } else {
      yield AS.str("is a child");
    }

    return { name, age };
  })
);

// char
expectType<AS.Parser<string, any, any>>(AS.char("h"));

// str
expectType<AS.Parser<string, any, any>>(AS.str("hello"));

// digit
expectType<AS.Parser<string, any, any>>(AS.digit);

// digits
expectType<AS.Parser<string, any, any>>(AS.digits);

// letter
expectType<AS.Parser<string, any, any>>(AS.letter);

// letters
expectType<AS.Parser<string, any, any>>(AS.letters);

// whitespace
expectType<AS.Parser<string, any, any>>(AS.whitespace);

// optionalWhitespace
expectType<AS.Parser<string, any, any>>(AS.optionalWhitespace);

// anyOfString
expectType<AS.Parser<string, any, any>>(AS.anyOfString("aeiou"));

// regex
expectType<AS.Parser<string, any, any>>(AS.regex(/^[hH][aeiou].{2}o/));

// sequenceOf
expectType<AS.Parser<[string, string, string, string, number], any, any>>(
  AS.sequenceOf([
    AS.str("he"),
    AS.letters,
    AS.char(" "),
    AS.str("world"),
    AS.digits.map(Number)
  ])
);

// namedSequenceOf
expectType<
  AS.Parser<
    {
      [key: string]:
        | AS.Parser<string, any, any>
        | AS.Parser<{ r: string }, any, any>;
    },
    any,
    any
  >
>(
  AS.namedSequenceOf([
    ["firstPart", AS.str("he")],
    ["secondPart", AS.letters.map(r => ({ r }))],
    ["thirdPart", AS.char(" ")],
    ["forthPart", AS.str("world")]
  ])
);

// choice
expectType<AS.Parser<string | number, any, any>>(
  AS.choice([
    AS.digit.map(Number),
    AS.char("!"),
    AS.str("hello"),
    AS.str("pineapple")
  ])
);

// lookAhead
expectType<AS.Parser<string, any, any>>(AS.lookAhead(AS.str("world")));

// sepBy
expectType<AS.Parser<string[], any, any>>(AS.sepBy(AS.char(","))(AS.letters));

// sepBy1
expectType<AS.Parser<string[], any, any>>(AS.sepBy1(AS.char(","))(AS.letters));

// many
expectType<AS.Parser<string[], any, any>>(AS.many(AS.str("abc")));

// many1
expectType<AS.Parser<string[], any, any>>(AS.many1(AS.str("abc")));

// between
expectType<AS.Parser<string, any, any>>(
  AS.between(AS.char("<"))(AS.char(">"))(AS.letters)
);

// everythingUntil
expectType<AS.Parser<string, any, any>>(AS.everythingUntil(AS.char(".")));

// anythingExcept
expectType<AS.Parser<string, any, any>>(AS.anythingExcept(AS.char(".")));

// possibly
expectType<AS.Parser<string | null, any, any>>(AS.possibly(AS.str("Not Here")));

// endOfInput
expectType<AS.Parser<null, null, null>>(AS.endOfInput);

// skip
expectType<AS.Parser<string, any, any>>(AS.skip(AS.str("def")));

// pipeParsers
expectType<AS.Parser<string, any, any>>(
  AS.pipeParsers([AS.str("hello"), AS.char(" "), AS.str("world")])
);

// composeParsers
expectType<AS.Parser<string, any, any>>(
  AS.composeParsers([AS.str("world"), AS.char(" "), AS.str("hello")])
);

// takeRight
expectType<AS.Parser<string, any, any>>(
  AS.takeRight(AS.str("hello "))(AS.str("world"))
);

// takeLeft
expectType<AS.Parser<string, any, any>>(
  AS.takeLeft(AS.str("hello "))(AS.str("world"))
);

// recursiveParser
expectType<AS.Parser<string, any, any>>(
  AS.recursiveParser(() => AS.str("hello"))
);

// tapParser
expectType<AS.Parser<string, null, null>>(
  AS.tapParser<string>(state => state.result && state.result.toUpperCase())
);

// decide
expectType<AS.Parser<string, any, any> | AS.Parser<null, null, string>>(
  AS.decide(v => {
    switch (v) {
      case "asLetters":
        return AS.letters;
      case "asDigits":
        return AS.digits;
      default:
        return AS.fail(`Unrecognised signifier '${v}'`);
    }
  })
);

// mapTo
expectType<AS.Parser<{ matchType: string; value: string }, any, any>>(
  AS.mapTo((x: string) => {
    return {
      matchType: "string",
      value: x
    };
  })
);

// errorMapTo
expectType<AS.Parser<string, null, string>>(
  AS.errorMapTo<string, string>(
    (message, index) => `Old message was: [${message}] @ index ${index}`
  )
);

// fail
expectType<AS.Parser<null, null, string>>(AS.fail("Fail"));

// succeedWith
expectType<AS.Parser<string, null, null>>(AS.succeedWith("Succeed"));

// either
expectType<AS.Parser<{ isError: boolean; value: null }, any, any>>(
  AS.either(AS.fail("nope!"))
);

// toPromise
expectType<Promise<string | AS.ErrorStateData<any, string>>>(
  AS.toPromise(AS.str("hello").run("hello"))
);

// toValue
expectType<{ value: string }>(
  AS.toValue(
    AS.str("hello")
      .map(r => ({ value: r }))
      .run("hello worbackgroiund<hAld")
  )
);

// parser
expectType<AS.ParserState<string, any, any>>(
  AS.parse(AS.str("hello"))("hello")
);
