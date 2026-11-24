# api/ (Vercel Functions, Node.js)

- Export `GET`/`POST` handlers that take a `Request` and return a `Response`
- Relative imports end in `.js` (`../_lib/security.js`); without it, they break on Vercel
- Do not import from `src/`: there is no `import.meta.env` here; use `process.env` from `node:process`
- `_lib/` does not become a route; any other file does. Keep tests in `_lib/`
- Admin routes: `authorize(req)` from `_lib/auth.ts`, then check `role`. Never trust a role sent by the client or stored in the cookie
- Database: `createServiceClient()` bypasses RLS, so authorize first
- Rate limits: `withinRateLimit`. OTP fails closed, uploads fail open
- Errors: `fail(status, message)` with a Portuguese message; never return internal error text
