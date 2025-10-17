# Deno Auth Service

Production-ready authentication service built with Deno, Hono, PostgreSQL, and OTP-based flows.

## Getting Started

1. Copy `.env.example` to `.env` and adjust secrets.
2. Run database migrations:

```sh
deno task migrate:up
```

3. Start the dev server:

```sh
deno task dev
```

4. Run tests:

```sh
deno task test
```

## Database Migrations

This project uses [Nessie](https://deno.land/x/nessie) for migrations. Migration files live under `migrations/`.

## API Documentation

OpenAPI 3.1 JSON is served at `/docs/openapi.json` once the server is running.

## License

MIT
