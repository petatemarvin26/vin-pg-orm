import {Pool} from 'pg';

export default class DbConn {
  private pool: Pool;
  public constructor() {
    this.pool = new Pool();
  }
  public connect() {
    return this.pool.query('SELECT NOW()');
  }

  private static _instance: DbConn;
  private static getInstance() {
    if (!this._instance) {
      this._instance = new DbConn();
    }
    return this._instance;
  }
  public static async connect() {
    const db = this.getInstance();
    return await db.connect();
  }
  public static get pool() {
    const db = this.getInstance();
    return db.pool;
  }
  public static async getClient() {
    const db = this.getInstance();
    return await db.pool.connect();
  }
}
