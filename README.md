# Serenity Notes Backend

End-to-end encrypted collaborative notes app

[https://www.serenity.re/en/notes](https://www.serenity.re/en/notes)

Security & technical details are documented at [https://www.serenity.re/en/notes/technical-documentation](https://www.serenity.re/en/notes/technical-documentation).

## Setup

```sh
yarn
yarn dev:db
# in another tab
psql
> CREATE USER prisma WITH PASSWORD 'prisma';
> ALTER USER prisma CREATEDB;
> exit
yarn prisma migrate dev
```

## Development

```sh
yarn
yarn dev:db
# in another tab
yarn dev
```

## Run tests

```sh
yarn test
# run single test
yarn test tests/oneTimeKey.test.ts
yarn test tests/integration.test.ts
```

## Scripts

```sh
# create Paddle subscription
yarn ts-node-dev --transpile-only bin/paddleSubscriptionCreate.ts
```

## License

Copyright 2021 Nikolaus Graf

Licensed under the [AGPLv3](https://www.gnu.org/licenses/agpl-3.0.html)
