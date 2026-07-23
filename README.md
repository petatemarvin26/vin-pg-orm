## VIN-PG-ORM

VIN-PG-ORM is a lightweight PostgreSQL ORM and query builder for TypeScript. It maps tables to classes and provides chainable, parameterized SQL builders for common CRUD operations.

## Table of Contents

- [Installation](#installation)
- [Database configuration](#database-configuration)
- [Defining models](#defining-models)
- [Query builder API](#query-builder-api)
- [Operators](#operators)
- [Joins](#joins)
- [Transactions and clients](#transactions-and-clients)
- [Build](#build)
- [Limitations](#limitations)

## Installation

Install the ORM and its PostgreSQL peer package:

```shell
npm install vin-pg-orm pg
```

The package exports `DbConn`, `BaseModel`, the query-builder classes, and the operators from its main entry point.

## Database configuration

`DbConn` is a singleton wrapper around `pg.Pool`. With no arguments, `pg` reads its standard connection settings, such as `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD`.

```ts
import {DbConn} from 'vin-pg-orm';

// Performs SELECT NOW() and verifies that the pool can reach PostgreSQL.
await DbConn.connect();
```

Alternatively, pass any `pg.PoolConfig` object. Calling `connect()` again with a config replaces the singleton's pool:

```ts
await DbConn.connect({
  host: 'localhost',
  port: 5432,
  database: 'example',
  user: 'postgres',
  password: 'secret'
});
```

The shared pool is available as `DbConn.pool`. `DbConn.getClient()` returns a checked-out `pg.PoolClient`; release it when finished:

```ts
const client = await DbConn.getClient();
try {
  await client.query('SELECT 1');
} finally {
  client.release();
}
```

## Defining models

Extend `BaseModel` and provide the PostgreSQL table name. Public function-valued properties can be used to describe model relationships for `join()`:

```ts
import {BaseModel} from 'vin-pg-orm';

export class User extends BaseModel {
  protected _table_name = 'tbl_user';

  public id = String;
  public firstname = String;
  public lastname = String;
}
```

The static model methods create a new builder instance, so queries can be started with `User.select()`, `User.create(...)`, `User.update(...)`, `User.delete()`, `User.len()`, or `User.get(...)`.

## Query builder API

All builder methods are chainable. `exec()` and `many()` return all rows, while `one()` and `get()` return the first row. Mutating queries can use `return()` when the changed rows are needed.

### Select

```ts
import {_eq} from 'vin-pg-orm';

const users = await User.select('id', 'firstname')
  .where(_eq('firstname', 'Marvin'))
  .order_by('id')
  .desc()
  .many();

const user = await User.get('user-id');
const count = await User.len().one(); // { length: number }
```

Available select helpers are:

- `select(...columns)` — starts a `SELECT`; no columns selects `*`.
- `where(...operators)` — appends a parameterized `WHERE` clause.
- `order_by(...columns)`, `asc()`, and `desc()` — appends ordering.
- `one()` — appends `LIMIT 1` and returns the first row.
- `many()` — executes and returns all rows.
- `get(value, key = 'id')` — selects one row by a key.
- `len()` — selects `COUNT(*) AS length`.

### Insert, update, and delete

```ts
await User.create({firstname: 'Marvin', lastname: 'Petate'})
  .return('id')
  .exec();

await User.createMany([
  {firstname: 'Marvin', lastname: 'Petate'},
  {firstname: 'John', lastname: 'Doe'}
]).exec();

await User.update({firstname: 'Marvin'})
  .where(_eq('id', 'user-id'))
  .return('id', 'firstname')
  .exec();

await User.updateMany([
  {id: '1', firstname: 'Marvin'},
  {id: '2', firstname: 'John'}
]).exec();

await User.deleteMany(['1', '2', '3']).exec();
```

Available mutation helpers are:

- `create(values)` and `createMany(records)` — build `INSERT` statements.
- `update(values)` — builds `UPDATE ... SET`; add `where(...)` to limit rows.
- `updateMany(records)` — updates rows by their `id` using `json_populate_recordset`.
- `delete()` — builds an unfiltered `DELETE`; use with care.
- `deleteMany(values, key = 'id')` — deletes rows whose key is in the provided list.
- `return(...columns)` — appends `RETURNING`; no columns returns `*`.
- `exec(session?)` — executes using either an optional `pg.PoolClient` or the shared pool.

## Operators

Operators are imported from the package and passed to `where()`:

```ts
import {_and, _eq, _in, _not, _or} from 'vin-pg-orm';

const users = await User.select()
  .where(
    _eq('status', 'active'),
    _and(_in('id', ['1', '2', '3']))
  )
  .many();
```

- `_eq(column, value)` — equality; `null` becomes `IS NULL`.
- `_in(column, values)` — `IN` with parameterized values.
- `_and(operator)` — prefixes the wrapped condition with `AND`.
- `_or(operator)` — prefixes the wrapped condition with `OR`.
- `_not(operator)` — converts supported equality and `IN` conditions to `!=` and `NOT IN`.

Values are bound as PostgreSQL parameters rather than interpolated into SQL.

## Joins

`join(Model, refname = 'id')` infers a relationship from matching model properties or function-valued model references. Joins can be chained:

```ts
const rows = await User.select()
  .join(UserRole)
  .join(Role)
  .many();
```

For a reference-based relationship, define the related model property as a constructor:

```ts
class UserRole extends BaseModel {
  protected _table_name = 'tbl_user_role';
  public user = User;
  public role = Role;
}
```

If the relationship cannot be inferred, `join()` throws `No reference key found.`.
> The left table must have reference exist or same types to right side table

## Transactions and clients

Use `exec(client)` to execute a built query on a checked-out client. Transaction boundaries remain under application control:

```ts
const client = await DbConn.getClient();
try {
  await client.query('BEGIN');
  await User.create({firstname: 'Marvin'}).exec(client);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## Build

The repository provides these npm scripts:

- `npm run build` — cleans and generates the bundled JavaScript and declarations in `lib/`.
- `npm run types` — generates TypeScript declarations.
- `npm run bundle` — builds the package bundle.
- `npm run clean` — removes `lib/`.
- `npm run dev` — watches source files and rebuilds.

## Limitations

- `create()` skips falsy payload values, including `0`, `false`, and empty strings. Use a database default or review the payload when those values must be inserted.
- `createMany()` expects every record to have the same column shape as the first record.
- `updateMany()` expects each record to include an `id` and relies on a PostgreSQL composite type matching the table name.
- `delete()` creates an unfiltered delete statement. Add a `where()` clause or use `deleteMany()` when deleting selected rows.
- Query builders are stateful; create a fresh static builder for each independent query.

## Contributing

For concerns and suggestions, please open an issue on [GitHub][github-issues].

## Changelog

We're using github [release][github-release] and based on [semantic versioning][semantic-version]

## Author

[Marvin Petate][marvin-petate]

## License

[ISC][license]

[github-release]: https://github.com/petatemarvin26/vin-pg-orm/releases
[github-issues]: https://github.com/petatemarvin26/vin-pg-orm/issues
[license]: ./LICENSE
[semantic-version]: https://semver.org/
[marvin-petate]: https://marvin-petate.web.app
