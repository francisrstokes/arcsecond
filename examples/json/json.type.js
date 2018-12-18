import {taggedSum} from 'daggy';

const JSONType = taggedSum('JSON', {
  JBoolean: ['x'],
  JNumber: ['x'],
  JNull: [],
  JArray: ['x'],
  JString: ['x'],
  JObject: ['x'],
  JKeyValuePair: ['x', 'y'],
});

const times = str => n => Array.from({length: n}, () => str).join('');
const tabs = times('  ');

JSONType.prototype.toString = function (l = 0) {
  return this.cata({
    JBoolean: (x) => `${tabs(l)}Boolean(${x.toString()})`,
    JNumber: (x) => `${tabs(l)}Number(${x.toString()})`,
    JNull: () => `${tabs(l)}Null`,
    JArray: (x) => `${tabs(l)}Array(\n${x.map(e => e.toString(l+1)).join(',\n')}\n${tabs(l)})`,
    JString: (x) => `${tabs(l)}String(${x.toString()})`,
    JObject: (x) => `${tabs(l)}Object(\n${x.map(e => e.toString(l+1)).join(',\n')}\n${tabs(l)})`,
    JKeyValuePair: (x, y) => `${tabs(l)}KeyValuePair(\n${x.toString(l+1)},\n${y.toString(l+1)}\n${tabs(l)})`,
  })
};


export const JBoolean = JSONType.JBoolean;
export const JNumber = JSONType.JNumber;
export const JNull = JSONType.JNull;
export const JArray = JSONType.JArray;
export const JString = JSONType.JString;
export const JObject = JSONType.JObject;
export const JKeyValuePair = JSONType.JKeyValuePair;