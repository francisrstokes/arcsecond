import {taggedSum} from 'daggy';

const Bf = taggedSum('Bf', {
  Inc: [],
  Dec: [],
  MoveRight: [],
  MoveLeft: [],
  PrintByte: [],
  GetByte: [],
  GetByte: [],
  Loop: ['x'],
  Instructions: ['x']
});

Bf.prototype.toString = function () {
  return this.cata({
    Inc: () => `Inc`,
    Dec: () => `Dec`,
    MoveRight: () => `MoveRight`,
    MoveLeft: () => `MoveLeft`,
    PrintByte: () => `PrintByte`,
    GetByte: () => `GetByte`,
    Loop: (x) => `Loop(${x.toString()})`,
    Instructions: (x) => `Instructions(${x.join(', ')})`,
  })
};

const K = x => _ => x;

export const Inc = K(Bf.Inc);
export const Dec = K(Bf.Dec);
export const MoveRight = K(Bf.MoveRight);
export const MoveLeft = K(Bf.MoveLeft);
export const PrintByte = K(Bf.PrintByte);
export const GetByte = K(Bf.GetByte);
export const Loop = Bf.Loop;
export const Instructions = Bf.Instructions;