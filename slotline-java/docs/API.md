# Slotline HTTP API

All routes below start with `/api`. JSON requests reject unknown properties. API responses use `Cache-Control: no-store`.

## Sessions and CSRF

Start with `GET /csrf`, keeping the returned session cookie. The response gives `token` and `headerName`. Send that header and token on every POST/PATCH, including public quote/booking creation, admin login and logout.

`POST /session` accepts URL-encoded `username` and `password`. Successful login returns JSON and keeps a server session. Fetch a fresh CSRF token after login or logout because Spring Security rotates it. Admin routes return 401 when there is no session and 403 when the role or CSRF check fails.

## Endpoints

| Method | Route | Access | Result |
| --- | --- | --- | --- |
| GET | `/health` | Public | Liveness status |
| GET | `/catalog` | Public | Services, extras, timezone and booking date window |
| GET | `/csrf` | Public | Session-bound CSRF header and token |
| GET | `/session` | Public | Authentication state, without private data |
| POST | `/session` | Public + CSRF | Admin session login |
| POST | `/logout` | CSRF | End admin session |
| POST | `/quotes` | Public + CSRF | New server-priced quote, HTTP 201 |
| GET | `/availability?date=2026-10-20` | Public | Available kickoff start times |
| POST | `/bookings` | Public + CSRF + idempotency key | Booking and private tracking token, HTTP 201 |
| GET | `/bookings/{reference}` | Private tracking token | Customer booking snapshot |
| GET | `/admin/bookings?status=&q=&page=0` | Admin | Search results, pagination and global stats |
| GET | `/admin/bookings/{reference}` | Admin | Full booking details |
| PATCH | `/admin/bookings/{reference}` | Admin + CSRF | Versioned status update |
| GET | `/admin/export` | Admin | All bookings as CSV |

## Create a quote

```json
{
  "items": [
    { "serviceId": "website", "quantity": 1 },
    { "serviceId": "api", "quantity": 1 }
  ],
  "scope": "standard",
  "extras": ["docs"],
  "priority": true
}
```

The returned total is `543.75`, deposit `271.88` and balance `271.87`. Store the returned `id` for booking. `advanced` applies a 1.5 multiplier to services only. Duplicate/unknown catalogue IDs and quantities outside 1–5 are rejected.

## Create a booking

Set `Idempotency-Key` to a freshly generated UUID. Reuse it only for retries of exactly the same request body.

```json
{
  "quoteId": "<returned-quote-UUID>",
  "clientName": "Alex Example",
  "email": "alex@demo.example",
  "company": "Demo Studio",
  "brief": "A responsive website for our small studio.",
  "date": "2026-10-20",
  "time": "11:00"
}
```

Choose a date within the window returned by `/catalog`; the sample date above is not a permanent available date. Briefs require 15–3,000 characters. The response contains `booking` and `accessToken`. Quote IDs are single-use, and expired quotes return 410. Slot collisions and conflicting repeat requests return 409.

## Private tracking

Request `GET /bookings/{reference}` with `X-Booking-Token: <accessToken>`. Missing or incorrect tokens receive the same 404 response as a missing booking. Admin list/detail/CSV responses never include the tracking token.

## Status update

```json
{ "status": "CONFIRMED", "version": 0 }
```

Use the latest version from the booking response. Invalid transitions and stale versions return 409. Cancelling clears the reservation key but keeps the quote, booking and events.

## Errors

Errors have a readable `message`; validation errors may also contain an `errors` array. Database internals and stack traces are not returned to the browser. Admin list results use a fixed page size of 20. Stats cover all bookings, even while a search filter is active.
