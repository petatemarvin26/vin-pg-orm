import {Pool, PoolConfig} from 'pg';

export default class DbConn {
  private pool: Pool;
  public constructor() {
    this.pool = new Pool();
  }
  public connect(config?: PoolConfig) {
    if (config) this.pool = new Pool(config);
    return this.pool.query('SELECT NOW()');
  }

  private static _instance: DbConn;
  private static getInstance() {
    if (!this._instance) {
      this._instance = new DbConn();
    }
    return this._instance;
  }
  public static async connect(config?: PoolConfig) {
    const instance = this.getInstance();
    return await instance.connect(config);
  }
  public static get pool() {
    const instance = this.getInstance();
    return instance.pool;
  }
  public static async getClient() {
    const instance = this.getInstance();
    return await instance.pool.connect();
  }
}
