import {PoolClient} from 'pg';

import DbConn from '@/DbConn';
import {_eq} from '@/common/operators';

import QueryBuilderAbs from './QueryBuilderAbs';

/**
 * Base model providing query execution helpers for all models.
 *
 * Extends the query builder with methods to execute built SQL against
 * the configured database connection.
 */
export default abstract class ExecutionAbs extends QueryBuilderAbs {
  protected client?: PoolClient;
  protected _lastjoin: ExecutionAbs = this;

  /**
   * Execute the built query and return all result rows.
   *
   * @param session - Optional active database client session.
   * @returns Array of model instances matching the query.
   */
  async exec(session?: PoolClient): Promise<Array<this>> {
    if (session) {
      const result = await session.query(this._qry, this._values);
      return result.rows;
    }
    const result = await DbConn.pool.query(this._qry, this._values);
    return result.rows;
  }

  /**
   * Execute the built query and return all rows in a union object of Models
   *
   * @returns Array of plain object rows for the query result.
   */
  async many(): Promise<Array<this>> {
    const result = await DbConn.pool.query(this._qry, this._values);
    const modelResult = result.rows.map((d) => {
      const employee: any = {};
      Object.entries(d).map(([k, v]) => {
        employee[k] = v;
      });
      return employee;
    });
    return modelResult;
  }

  /**
   * Execute the built query and return a single row.
   *
   * @returns The first matching model instance.
   */
  async one(): Promise<this> {
    this._qry += ' LIMIT 1';
    const result = await DbConn.pool.query(this._qry, this._values);
    return result.rows[0];
  }

  /**
   * Build a select query filtered by id and return a single result.
   *
   * @param id - Primary key value used to filter the query.
   * @param key - A preferred key to use in filter.
   * @returns The matching model instance or undefined if not found.
   */
  async get(id: any, key: string = 'id'): Promise<this> {
    this.select().where(_eq(key, id));
    this._qry += ' LIMIT 1';
    const result = await DbConn.pool.query(this._qry, this._values);
    return result.rows[0];
  }
}
