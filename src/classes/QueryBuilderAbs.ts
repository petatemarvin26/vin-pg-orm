import Base from './BaseAbs';
import ExecutionAbs from './ExecutionAbs';

import {Constructor, KeyVal, Operator} from '@/common/types';

/**
 * TODO:
 * - where clause needs to be flexible and key not in ('1', '2', '3')
 */

/**
 * Stateful SQL query builder for model classes backed by a table name.
 *
 * Each builder method mutates the internal SQL string and bound-value array so
 * calls can be chained before the query is executed by `ExecutionAbs`.
 */
export default abstract class QueryBuilderAbsAbs extends Base {
  /**
   * Build a single-row `INSERT` statement from a plain object payload.
   *
   * Falsy values are skipped entirely, and string values containing `point`
   * are wrapped with `ST_GeogFromText(...)` for PostGIS-style geography input.
   *
   * @param payload - Column/value pairs to insert.
   * @returns The current query builder instance.
   */
  create(payload: KeyVal) {
    const keys = [];
    const args = [];
    this._values = [];
    for (const [k, v] of Object.entries(payload)) {
      if (!v) continue;

      keys.push(k);
      this._values.push(v);
      if (typeof v === 'string' && v.toLowerCase().includes('point')) {
        args.push(`ST_GeogFromText($${args.length + 1})`);
      } else args.push(`$${args.length + 1}`);
    }
    this._qry = `INSERT INTO ${this._table_name}(${keys.join(', ')}) VALUES (${args.join(', ')})`;
    return this;
  }

  /**
   * Build a multi-row `INSERT` statement using the keys from the first record.
   *
   * Every value from each record is added to the shared placeholder list in the
   * order encountered.
   *
   * @param payload - Records to insert in a single statement.
   * @throws Error if payload is empty.
   * @returns The current query builder instance.
   */
  createMany(payload: KeyVal[]) {
    if (!payload.length)
      throw Error('Create Many must not have empty payload.');

    this._values = [];
    const keys = Object.keys(payload[0]);
    let qry_values = '';
    payload.forEach((single_data, idx) => {
      const args: string[] = [];
      for (const [_, v] of Object.entries(single_data)) {
        args.push(`$${this._values.length + 1}`);
        this._values.push(v);
      }
      qry_values += `(${args.join(',')})`;
      if (payload.length !== idx + 1) qry_values += `,`;
    });
    this._qry = `INSERT INTO ${this._table_name}(${keys.join(', ')}) VALUES ${qry_values}`;
    return this;
  }

  /**
   * Build an `UPDATE ... SET ...` statement for a single record payload.
   *
   * The generated query only includes the `SET` portion; add filters
   * separately with `where_set()`, `where()`, or related helpers.
   *
   * @param keyvals - Column/value pairs to assign.
   * @returns The current query builder instance.
   */
  update(keyvals: KeyVal) {
    this._values = [];
    let _keyvals = [];
    for (const [k, v] of Object.entries(keyvals)) {
      _keyvals.push(`${k}=$${this._values.length + 1}`);
      this._values.push(v);
    }
    this._qry = `UPDATE ${this._table_name} SET ${_keyvals.join(', ')}`;
    return this;
  }

  /**
   * Build a batch `UPDATE` using `json_populate_recordset` and row `id` values.
   *
   * The full payload array is serialized into a single bound parameter and
   * joined against the table as `v`, updating every column except the first key
   * from the payload shape.
   *
   * @param payload - Records to update, each expected to include `id`.
   * @throws Error if payload is empty.
   * @returns The current query builder instance.
   */
  updateMany(payload: KeyVal[]) {
    if (!payload.length) throw Error('Empty payload');

    const columns = Object.keys(payload[0]);
    const set: string[] = [];
    columns.forEach((col, idx) => {
      if (idx) set.push(`${col}=v.${col}`);
    });
    this._values.push(JSON.stringify(payload));
    this._qry = `
      UPDATE ${this._table_name}
      SET ${set.join(', ')}
      FROM json_populate_recordset(NULL::${this._table_name}, $1) AS v
      WHERE ${this._table_name}.id = v.id`;
    return this;
  }

  /**
   * Build a `DELETE` statement targeting the current table with no filter.
   *
   * @returns The current query builder instance.
   */
  delete() {
    this._values = [];
    this._qry = `DELETE FROM ${this._table_name}`;
    return this;
  }

  /**
   * Build a `DELETE` statement with a `WHERE ... IN (...)` filter.
   *
   * @param values - Values to bind inside the `IN` clause.
   * @param key - Column name to match against; defaults to 'id'.
   * @returns The current query builder instance.
   */
  deleteMany(values: any[], key: string = 'id') {
    this._values = [];
    const args = values.map((val, idx) => {
      this._values.push(val);
      return `$${idx + 1}`;
    });
    this._qry = `DELETE FROM ${this._table_name} WHERE ${key} IN (${args.join(', ')})`;
    return this;
  }

  /**
   * Build a `SELECT` statement for the current table.
   *
   * Calling this resets the current bound values and selects `*` when no
   * column names are provided.
   *
   * @param keys - Columns to project; selects all columns when omitted.
   * @returns The current query builder instance.
   */
  select(...keys: string[]) {
    this._values = [];
    const has = keys.length > 0;
    this._qry = `SELECT ${has ? keys.join(', ') : '*'}`;
    this._qry += ` FROM ${this._table_name}`;
    return this;
  }

  /**
   * Build a `SELECT COUNT(*) AS length` statement for the current table.
   *
   * @returns The current query builder instance.
   */
  len() {
    this._qry = `SELECT COUNT(*) as length FROM ${this._table_name}`;
    return this;
  }

  /**
   * Start a `WHERE` clause by applying one or more operator callbacks.
   *
   * Each operator is responsible for appending its own SQL fragment and any
   * bound values to the current builder state.
   *
   * @param operators - Operator callbacks such as `_eq(...)` or `_and(_in(...))`.
   * @returns The current query builder instance.
   */
  where(...operators: Operator[]) {
    this._qry += ' WHERE';
    operators.forEach((operator) => operator(this));
    return this;
  }

  /**
   * Join another model table and return a builder typed as both models.
   *
   * The join condition is inferred by `getRelationship()` from matching keys or
   * model-reference properties, and `_lastjoin` is advanced so subsequent joins
   * chain from the most recently joined model.
   *
   * @param Model - Model constructor to join.
   * @param refname - Reference column name; defaults to 'id'.
   * @returns The current query builder instance extended with the joined model.
   */
  join<M extends Constructor<ExecutionAbs>>(
    Model: M,
    refname: string = 'id'
  ): this & InstanceType<M> {
    const ref = new Model();
    const relation = this.getRelationship(Model, refname);
    this._lastjoin = ref;
    ref._qry = this._qry;
    ref._qry += ` JOIN ${ref._table_name} ON ${relation}`;
    return Object.assign(this, ref) as InstanceType<M> & this;
  }

  /**
   * Append an `ORDER BY` clause to the current query.
   *
   * @param keys - Columns to order by.
   * @returns The current query builder instance.
   */
  order_by(...keys: string[]) {
    this._qry += ` ORDER BY ${keys.join(', ')}`;
    return this;
  }

  /**
   * Append `ASC` to the current `ORDER BY` clause.
   *
   * @returns The current query builder instance.
   */
  asc() {
    this._qry += ' ASC';
    return this;
  }

  /**
   * Append `DESC` to the current `ORDER BY` clause.
   *
   * @returns The current query builder instance.
   */
  desc() {
    this._qry += ' DESC';
    return this;
  }

  /**
   * Append a `RETURNING` clause to the current query.
   *
   * Defaults to `RETURNING *` when no column names are provided.
   *
   * @param keys - Columns to return; returns all columns when omitted.
   * @returns The current query builder instance.
   */
  return(...keys: string[]) {
    const has = keys.length > 0;
    this._qry += ` RETURNING ${has ? keys.join(', ') : '*'}`;
    return this;
  }
}
