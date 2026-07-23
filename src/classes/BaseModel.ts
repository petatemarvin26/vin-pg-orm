import {Constructor, KeyVal} from '@/common/types';

import ExecutionAbs from './ExecutionAbs';

export default abstract class BaseModel extends ExecutionAbs {
  public static create<T extends ExecutionAbs>(
    this: Constructor<T>,
    payload: KeyVal
  ): T {
    return new this().create(payload);
  }

  public static createMany<T extends ExecutionAbs>(
    this: Constructor<T>,
    payload: KeyVal[]
  ): T {
    return new this().createMany(payload);
  }

  public static update<T extends ExecutionAbs>(
    this: Constructor<T>,
    keyvals: KeyVal
  ): T {
    return new this().update(keyvals);
  }

  public static updateMany<T extends ExecutionAbs>(
    this: Constructor<T>,
    keyvals: KeyVal[]
  ): T {
    return new this().updateMany(keyvals);
  }

  public static delete<T extends ExecutionAbs>(this: Constructor<T>): T {
    return new this().delete();
  }

  public static deleteMany<T extends ExecutionAbs>(
    this: Constructor<T>,
    ids: string[]
  ): T {
    return new this().deleteMany(ids);
  }

  public static select<T extends ExecutionAbs>(
    this: Constructor<T>,
    ...keys: string[]
  ): T {
    return new this().select(...keys);
  }

  public static len<T extends ExecutionAbs>(this: Constructor<T>): T {
    return new this().len();
  }

  public static get<T extends ExecutionAbs>(
    this: Constructor<T>,
    id: any,
    key?: string
  ): Promise<T> {
    return new this().get(id, key);
  }
}
