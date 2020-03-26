import each from 'lodash/each';
import toPairs from 'lodash/toPairs';
import castArray from 'lodash/castArray';
import isPlainObject from 'lodash/isPlainObject';

// Invokes the predicate with the arguments supplied through 'cases'.
// The cases can be single values where each becomes the sole argument to
// the predicate, or multiple arrays where each array become the arguments,
// or an object where each key, value pair becomes the two arguments.
// The arguments can then be used to paramentarize an #it invocation.
//
// 1. cases (Object|...Array|...*): The arguments that constitute the cases.
// 2. predicate (Function): The function to invoke for setting up the spec functions.
export function with_cases(...cases) {
    const fn = cases.pop();
    const [obj] = cases;
    each(
        isPlainObject(obj) ? toPairs(obj) : cases,
        params => fn(...castArray(params))
    );
}
