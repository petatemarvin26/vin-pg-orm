export default abstract class BaseAbs {
  protected abstract _table_name: string;

  public length: number = 0;

  protected _lastjoin?: BaseAbs;
  protected _qry: string = '';
  protected _values: any[] = [];

  protected _select: string = '';
  protected _from: string = '';
  protected _where: {[key: string]: {[key: string]: any}} = {};
  protected _join: string = '';
  protected _sort: string = '';

  public get query() {
    return this._qry;
  }
  public set addQuery(query: string) {
    this._qry += query;
  }
  public set setQuery(query: string) {
    this._qry = query;
  }

  public get values() {
    return this._values;
  }
  public set addValue(value: any) {
    this._values.push(value);
  }

  getRelationship<M extends new () => any>(Model: M, refname: string = 'id') {
    const last_relmodel = this._lastjoin;
    const new_relmodel = new Model() as BaseAbs;

    if (!last_relmodel) return '';

    // check the matched by key
    for (const key of Object.keys(last_relmodel)) {
      const new_relmodel_matched = Object.keys(new_relmodel).find(
        (new_relmodel_key) => new_relmodel_key === key
      ) as keyof BaseAbs;
      if (
        new_relmodel_matched &&
        typeof new_relmodel[new_relmodel_matched] === 'function'
      ) {
        return `${last_relmodel._table_name}.${key} = ${new_relmodel._table_name}.${key}`;
      }
    }

    // check if last related model has reference
    for (const key of Object.keys(last_relmodel)) {
      const val = last_relmodel[key as keyof BaseAbs];

      if (typeof val === 'function' && new_relmodel instanceof val) {
        return `${last_relmodel._table_name}.${key} = ${new_relmodel._table_name}.${refname}`;
      }
    }

    // check if the new related model has reference
    for (const key of Object.keys(new_relmodel)) {
      const val = new_relmodel[key as keyof BaseAbs];
      if (typeof val === 'function' && last_relmodel instanceof val) {
        return `${new_relmodel._table_name}.${key} = ${last_relmodel._table_name}.${refname}`;
      }
    }

    throw Error('No reference key found.');
  }

  generateWhere() {
    let where_clause = [];
    let where_data = [];

    let count = 1;
    for (const key in this._where) {
      const keyvals = Object.entries(this._where[key]);
      if (keyvals.length) {
        const [k, v] = keyvals[0];
        where_clause.push(`${key} ${k}=$${count}`);
        where_data.push(v);
      }
      count += 1;
    }
    return [where_clause.join(' '), where_data];
  }
}
