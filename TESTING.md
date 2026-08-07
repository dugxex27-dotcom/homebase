# Testing Notes

## Database connection — always use `$DATABASE_URL`

`$PGHOST` / `$PGPORT` point to a different Neon instance than the one the API server connects to. Any manual DB check intended to reflect what the server sees (row counts, FK state, migration results, etc.) must use `psql "$DATABASE_URL"` directly. Queries run against the PGHOST/PGPORT instance may silently succeed while showing stale or entirely different data.

## Session cookies require HTTPS

Session cookies are set with `secure: true` and `sameSite: none`. Calls made over plain HTTP (e.g. `http://localhost:18080/api/...`) will not receive the `Set-Cookie` header — the cookie is dropped silently with no error in the response body or status code. All manual test requests that need an authenticated session must go through `https://$REPLIT_DEV_DOMAIN/api/...`. Use `curl -sk -c <jar>` to store and replay the cookie across requests.
