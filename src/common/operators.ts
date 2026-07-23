import {Logical, In, Equal, Not, Operator} from './types';

/**
 * Wrap an operator so it is prefixed with SQL `AND`.
 *
 * Useful when composing multiple conditions inside `where(...)`.
 */
export const _and: Logical = (operator) => {
  const and_operator: Operator = (constructor) => {
    constructor.addQuery = ' AND';
    return operator(constructor);
  };
  return and_operator;
};

/**
 * Wrap an operator so it is prefixed with SQL `OR`.
 *
 * Useful when composing alternative conditions inside `where(...)`.
 */
export const _or: Logical = (operator) => {
  const or_operator: Operator = (constructor) => {
    constructor.addQuery = ' OR';
    return operator(constructor);
  };
  return or_operator;
};

/**
 * Negate a supported operator by rewriting the generated SQL fragment.
 *
 * Currently converts equality conditions into `!=` and `IN` conditions into
 * `NOT IN` after the wrapped operator has built its query segment.
 */
export const _not: Not = (operator) => {
  const not_operator: Operator = (constructor) => {
    const self = operator(constructor);

    // TODO: IS NOT NULL not working
    if (constructor.query.toLowerCase().includes('is null')) {
      const [left] = constructor.query.split(/is null(?=[^]*$)/i);
      constructor.setQuery = ` ${left.trim()} IS NOT NULL`;
    } else if (operator.name.includes('eq')) {
      const [left, right] = constructor.query.split(/=(?=[^=]+$)/);
      constructor.setQuery = ` ${left.trim()} != ${right.trim()}`;
    }

    if (operator.name.includes('in')) {
      const [left, right] = constructor.query.split(
        /\s+\bIN\b\s+(?!.*\bIN\b)/i
      );
      constructor.setQuery = ` ${left.trim()} NOT IN ${right.trim()}`;
    }
    return self;
  };
  return not_operator;
};

/**
 * Build an equality condition for a single column and bound value.
 *
 * Produces a parameterized fragment such as `column = $1`.
 */
export const _eq: Equal = (key, value) => {
  const eq_operator: Operator = (constructor) => {
    if (value === null) {
      constructor.addQuery = ` ${key} IS NULL`;
    } else {
      constructor.addValue = value;
      constructor.addQuery = ` ${key} = $${constructor.values.length}`;
    }
    return constructor;
  };
  return eq_operator;
};

/**
 * Build an `IN` condition for a column and multiple bound values.
 *
 * Produces a parameterized fragment such as `column IN ($1, $2, ...)`.
 */
export const _in: In = (key, values) => {
  const in_operator: Operator = (constructor) => {
    const len = constructor.values.length;
    const args: string[] = [];
    values.forEach((value, idx) => {
      constructor.addValue = value;
      args.push(`$${len + (idx + 1)}`);
    });
    constructor.addQuery = ` ${key} IN (${args.join(', ')})`;
    return constructor;
  };
  return in_operator;
};
