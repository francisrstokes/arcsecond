## [Recipes](#recipes)
- [`cookies`](#parses-document.cookie) - Parse `document.cookie`.

#### Parse `document.cookie`

A lenient parser for `document.cookie`. It uses [`fromPairs`](https://ramdajs.com/docs/#fromPairs) from [Ramda](https://ramdajs.com).

```javascript
import { char, everythingUntil, regex, sepBy, sequenceOf, str, takeRight } from 'arcsecond';
import { fromPairs } from 'ramda';

const validCharacters = /^[^;,\s]*/;
const percentEncoded = /(%[0-9A-Za-z]{2})+/g;
const percentDecode = value => value.replace(percentEncoded, decodeURIComponent);
const equalsSign = char('=');
const cookie = sequenceOf([
    everythingUntil(equalsSign).map(percentDecode),
    takeRight(equalsSign)(regex(validCharacters)).map(percentDecode)
]);
const cookies = sepBy(str('; '))(cookie).map(fromPairs);

cookies.run('a=123; b=456; c=%20').result //=> { "a": "123", "b": "456", "c": " " }
```


