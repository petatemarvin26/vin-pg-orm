import {BaseAbs, ExecutionAbs} from '@/classes';

/**
 * Constructor signature for models that extend the shared query/execution base.
 *
 * Used by helpers such as `join()` to instantiate related models while
 * preserving their concrete instance type.
 */
export type Constructor<T extends ExecutionAbs> = new () => T;

/**
 * Loose object map used for insert, update, and ad-hoc filter payloads.
 */
export type KeyVal = {[key: string]: any};

/**
 * Grouped key-value filters for composing AND/OR style conditions.
 */
export type Condition = {
  _and: KeyVal;
  _or: KeyVal;
};

/**
 * Raw SQL statement text produced by the query builder.
 */
export type Statement = string;

/**
 * Internal callback shape for query-builder operators that mutate a builder
 * instance and return it for chaining.
 */
type Callback<C extends BaseAbs> = (constructor: C) => C;

/**
 * Query-builder operator applied inside `where(...)`.
 *
 * Functions such as `_eq(...)` and `_in(...)` return this shape.
 */
export type Operator = Callback<BaseAbs>;

/**
 * Higher-order operator that prefixes another operator with SQL boolean logic.
 *
 * Implementations such as `_and(...)` and `_or(...)` wrap an existing operator
 * and append the corresponding connector before it runs.
 */
export type Logical = {
  (operator: Operator): Operator;
};

/**
 * Alias for an operator wrapper that prefixes a condition with `AND`.
 */
export type And = Logical;

/**
 * Alias for an operator wrapper that prefixes a condition with `OR`.
 */
export type Or = Logical;

/**
 * Higher-order operator that negates another operator, such as converting
 * equality into `!=` or `IN` into `NOT IN`.
 */
export type Not = {
  (operator: Operator): Operator;
};

/**
 * Factory signature for building an SQL `IN` operator for a column and a list
 * of bound values.
 */
export type In = {
  (key: string, values: any[]): Operator;
};

/**
 * Factory signature for building an SQL equality operator for a column and a
 * single bound value.
 */
export interface Equal {
  (key: string, value?: any): Operator;
}
