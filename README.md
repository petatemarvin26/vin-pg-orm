## VIN-PG-ORM

VIN-PG-ORM is a lightweight PostgreSQL ORM and query builder for TypeScript that helps you model tables as classes and compose SQL with chainable methods.

## Table Contents

- [Installation](#installation)
- [Features](#features)
- [Examples](#examples)

## Installation

```shell
npm install vin-pg-orm pg
```

## Features

#### Query Builder

- `select`, `create`, `createMany`
- `update`, `updateMany`
- `delete`, `deleteMany`
- `where`, `join`, `len`
- `one`, `many`, `exec`, `get`

#### Common Operators

- `_eq`
- `_in`
- `_and`
- `_or`
- `_not`

#### Connection Helper

- `DbConn` singleton wrapper around `pg.Pool`
- Supports direct connection checks and pooled client access

## Examples

##### `Database Connection`

```ts
import {DbConn} from 'vin-pg-orm';

await DbConn.connect();
```

##### `BaseModel`

```ts
import {BaseModel} from 'vin-pg-orm';

export class User extends BaseModel {
  protected _table_name: string = 'tbl_user';

  public id = String();
  public firstname = String();
  public lastname = String();
}
```

##### `Select`

```ts
import {User, UserRole, Role} from './models';

const users = await User.select()
  .join(UserRole)
  .join(Role)
  .many();
```

##### `Where Operators`

```ts
import {User} from './models';
import {_and, _eq, _not} from 'vin-pg-orm';

const result = await User.select()
  .where(_eq('firstname', 'Marvin'), _and(_not(_eq('lastname', null))))
  .many();
```

##### `Create`

```ts
import {User} from './models';

await User.create({
  firstname: 'Marvin',
  lastname: 'Petate'
}).exec();
```

##### `Update Many`

```ts
import {User} from './models';

await User.updateMany([
  {id: '1', firstname: 'Marvin'},
  {id: '2', firstname: 'John'}
]).exec();
```

##### `Delete Many`

```ts
import {User} from './models';

await User.deleteMany(['1', '2', '3']).exec();
```

> NOTE: `DbConn` uses the default `pg` environment variables, so make sure your database credentials are available before running queries.

## Contributing

Unfortunately we are not accepting any contributors yet this is under probitionary, but for your concerns and possible suggestions you may raise the issue on our github

## Changelog

We're using github [release][github-release] and based on [semantic versioning][semantic-version]

## Author

[Marvin Petate][marvin-petate]

## License

[ISC][license]

[github-release]: https://github.com/petatemarvin26/vin-pg-orm/releases
[license]: ./LICENSE
[semantic-version]: https://semver.org/
[marvin-petate]: https://marvin-petate.web.app
