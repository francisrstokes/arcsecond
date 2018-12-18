import {taggedSum} from 'daggy';

const Expr = taggedSum('Expr', {
  Variable: ['x'],
  Definition: ['x', 'y'],
  Application: ['x', 'y']
});

Expr.prototype.toString = function () {
  return this.cata({
    Variable: (x) => `Variable(${x.toString()})`,
    Definition: (x, y) => `Definition(${x.toString()}, ${y.toString()})`,
    Application: (x, y) => `Application(${x.toString()}, ${y.toString()})`,
  })
};

export const Variable = Expr.Variable;
export const Definition = Expr.Definition;
export const Application = Expr.Application;