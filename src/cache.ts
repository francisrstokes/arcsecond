type Function_ = (...x: never[]) => unknown;

type Memoize<F extends Function_> = {
  (...x: Parameters<F>): ReturnType<F>;
  clearCache: () => void;
};

const memoizedFunctions: Memoize<Function_>[] = [];

export const memoize = <F extends Function_>(
  fn: F,
) => {
  const cache = new Map<string, unknown>();

  const memoizedFunction = ((...x: never[]) => {
    const hash = JSON.stringify(x);
    if (cache.has(hash)) {
      return cache.get(hash);
    } else {
      return fn(...x);
    }
  }) as F;

  const memoizedCallableObject = Object.assign(memoizedFunction, {
    clearCache: () => {
      cache.clear();
    }
  });

  memoizedFunctions.push(memoizedCallableObject);

  return memoizedCallableObject;
};

export const clearCache = () => {
  memoizedFunctions.forEach(memoizedFunction => {
    memoizedFunction.clearCache();
  });
}
