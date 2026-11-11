# Payments test app and example catalog

The app is a **catalog of 13 ready-made forms** (signup, signup + event, signup + paid event, survey, CRM lead, public registry, driver license appointment, bank transfer, semester enrollment, initial system setup, travel onboarding, job application, support ticket). Pick one in the sidebar and a **UI kit** (default, Bootstrap, Material UI, Tailwind, SCSS theme, shadcn) in the selector: the same schema renders with each. Both choices live in the URL (`?ex=bank-transfer&kit=mui`) and switching reloads, so a kit's global CSS never leaks into another. The shadcn kit uses native stand-ins for shadcn's components (`packages/ui-shadcn/stubs`). Examples are in `src/catalog/examples.ts`; `bun test src` checks that each one is a valid v1 schema.

Everything works without a backend or credentials (payments fall back to the mock provider). The rest of this file is about trying the real sandboxes.

Tries the real payment plugins (Stripe, PayPal, Mercado Pago, Lemon Squeezy) against provider **sandboxes**. Two parts:

- `server/`: a small TypeScript backend ([Hono](https://hono.dev), plain `fetch` to the provider APIs, no SDKs). It holds the secret keys, owns the price catalog (the browser only names a `plan`), creates payments and answers `GET /api/<provider>/status`, which asks the provider itself (never the return URL). `app.fetch` is a standard handler, so it also deploys to Cloudflare Workers, Vercel, Bun or Deno. Any other API exposing the same routes works with the app.
- `src/`: a Vite app with an `ArtisanForm` (order → payment → confirming → done) using the plugins from `src/`.

## Run it

```bash
cp apps/payments-test/.env.example apps/payments-test/.env.local   # fill in only what you want to test
cd apps/payments-test && bun run dev                                # API :8787, app http://localhost:5174
```

Providers without credentials show as "not configured" and are left out of the payment step. Keys go in `.env.local` (git-ignored), never in the chat or the code. Only public keys reach the browser, through `GET /api/config`.

## Webhooks with Docker

Stripe and Lemon Squeezy call back to your backend, so it needs to be reachable. `compose.yaml` runs the API plus two optional helpers (the web app stays on the host, `bun run dev:web`):

```bash
cd apps/payments-test
docker compose --env-file .env.local up --build                  # API on :8787
docker compose --env-file .env.local --profile stripe up         # + Stripe CLI forwarding events
docker compose --env-file .env.local --profile lemon up          # + public Cloudflare tunnel
```

- **Stripe:** the CLI forwards test events to `/api/stripe/webhook`. Print its signing secret once with `docker compose --env-file .env.local --profile stripe run --rm stripe-cli listen --print-secret`, put it in `.env.local` as `STRIPE_WEBHOOK_SECRET` and restart the API. Delivered events show up at `GET /api/stripe/events`. The payment state itself is still read from Stripe's API.
- **Lemon Squeezy:** get the tunnel URL with `docker compose logs tunnel | grep trycloudflare.com` (it changes on every start), register `<url>/api/lemonsqueezy/webhook` for `order_created` in Lemon Squeezy → Settings → Webhooks, and use the signing secret you set there as `LEMONSQUEEZY_WEBHOOK_SECRET`.
- **Mercado Pago (optional):** register `<url>/api/mercadopago/webhook` for the `payment` topic in Your integrations → Webhooks (test mode) and put its secret signature in `MP_WEBHOOK_SECRET`. The endpoint verifies the signature and logs the payment status; confirmation itself still goes through `/status`.
- Without Docker: `stripe listen --forward-to localhost:8787/api/stripe/webhook` and `cloudflared tunnel --url http://localhost:8787` do the same.

Everything at once (API + Stripe CLI + tunnel in Docker, web app in the foreground): `bun run dev:all`. Stop the containers with `docker compose --env-file .env.local --profile stripe --profile lemon down`.

## Routes

| Route | What it does |
| --- | --- |
| `POST /api/stripe/payment-intent`, `/checkout-session` | Embedded Payment Element / hosted Checkout |
| `POST /api/paypal/orders`, `/orders/:id/capture` | Orders v2 create and capture |
| `POST /api/mercadopago/payment`, `/preference`, `/webhook` | Payment Brick / Checkout Pro / signed notification |
| `POST /api/lemonsqueezy/checkout`, `/webhook` | Hosted checkout; signed webhook |
| `POST /api/stripe/webhook`, `GET /api/stripe/events` | Signed Stripe webhook (logged) and the last events received |
| `GET /api/<provider>/status?ref=…` | Confirmation for the `pending` step (Lemon Squeezy uses `email`, fed by its webhook) |

## Sandbox notes

- **Redirects** (Stripe Checkout, Checkout Pro, Lemon Squeezy) return to the page; the draft (`persistKey`) restores the form and the `pending` step confirms through the backend. `ALLOWED_ORIGINS` limits where a checkout may send the user back to.
- **Mercado Pago:** use the credentials of a *test seller*, and the currency of its country (`MP_CURRENCY`). `auto_return` is only sent for https return URLs.
- **Lemon Squeezy:** prices live on the variant. It has no payment reference on return, so confirmation needs the webhook: expose the backend (see [Webhooks with Docker](#webhooks-with-docker)). The paid state is kept in memory.
- `bun test server` runs the backend checks (no network).
