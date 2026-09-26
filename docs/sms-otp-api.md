# SMS and OTP API

MyDomain exposes a developer messaging API for phone verification and generic SMS. The OTP service creates a challenge and asks the messaging service to queue an SMS. It does not talk to a mobile network itself.

## Delivery mode

`SMS_CONNECTOR=mock` is the default and the only connector shipped today.

The mock connector is **development-only**. It accepts a message inside this app and can mark it delivered with a **simulated** receipt. It does not connect to MTN, Telecel, AirtelTigo, SMPP, or any other carrier. No carrier credentials are stored in this repository.

A future connector implements `SmsNetworkConnector.send` and `getDeliveryStatus` and is chosen by the routing layer. OTP and the HTTP API stay the same when that happens.

Run the worker so queued messages leave `queued`:

```bash
npm run worker:sms
```

## Authentication

Create a project and API key in SMS & OTP at `/sms/keys`. The public guide is at `/docs`. Admins edit that guide from Admin → SMS & OTP docs. The secret is shown once. Admins can still see every project from the admin SMS pages.

```http
Authorization: Bearer md_live_prefix_secret
```

Scopes:

| Scope | Routes |
| --- | --- |
| `otp:send` | `POST /api/v1/otp/send`, `POST /api/v1/otp/resend`, OTP status |
| `otp:verify` | `POST /api/v1/otp/verify`, OTP status |
| `sms:send` | `POST /api/v1/sms/send` |
| `sms:read` | `GET /api/v1/sms/{message_id}` |

Keys are stored as an HMAC. Revoked, expired, and suspended-project keys are rejected. Cookie sessions do not authorize these routes.

## POST /api/v1/otp/send

```http
POST /api/v1/otp/send
Authorization: Bearer md_live_...
Content-Type: application/json
Idempotency-Key: optional-unique-key
```

```json
{
  "phone": "+233241234567",
  "purpose": "login"
}
```

```json
{
  "success": true,
  "request_id": "cm...",
  "expires_in": 300
}
```

The code is not returned. A new send invalidates the previous code for that project, phone, and purpose.

Defaults (override with environment variables):

- 6 digits (`OTP_LENGTH`, 4–8)
- 5 minute expiry (`OTP_TTL_SECONDS`)
- 5 verification attempts (`OTP_MAX_ATTEMPTS`)
- 60 second resend cooldown (`OTP_RESEND_COOLDOWN_SECONDS`)
- 5 sends per phone, 20 per IP, 100 per project per 10 minutes

Phone numbers must be E.164, for example `+233241234567`.

## POST /api/v1/otp/verify

```json
{
  "phone": "+233241234567",
  "code": "123456",
  "purpose": "login"
}
```

```json
{
  "success": true,
  "verified": true
}
```

A wrong, expired, used, or locked code returns `"verified": false`. The code is compared with `timingSafeEqual` against an HMAC. Only the hash is stored on the OTP record. The outbound SMS text is encrypted until the worker sends it, then deleted.

## POST /api/v1/otp/resend

Same body as send. Requires an earlier request for that phone and purpose, and respects the cooldown. The new code replaces the previous one.

## GET /api/v1/otp/status/{request_id}

```json
{
  "success": true,
  "request_id": "cm...",
  "status": "pending",
  "expires_in": 240,
  "phone": "+233******67",
  "purpose": "login"
}
```

`status` is `pending`, `verified`, `expired`, `invalidated`, or `locked`.

## POST /api/v1/sms/send

```http
POST /api/v1/sms/send
Authorization: Bearer md_live_...
Idempotency-Key: 8-to-200-characters
```

```json
{
  "to": "+233241234567",
  "message": "Your order is confirmed.",
  "sender_id": "MyDomain"
}
```

```json
{
  "success": true,
  "message_id": "cm...",
  "status": "queued"
}
```

The request returns when the message is stored. It does not wait for delivery. Repeating the same `Idempotency-Key` for a project returns the original message.

`sender_id` must be an active sender on the project (1–11 letters or numbers). New projects start with `MyDomain`. That value is a label in MyDomain, not a carrier registration.

`GET /api/v1/sms/{message_id}` returns status, a masked destination, route, and timestamps. It does not return the message body.

## Status values

Internal statuses, independent of any provider:

`queued`, `processing`, `sent`, `delivered`, `failed`, `expired`, `rejected`

The mock connector moves a successful send to `delivered` and records that the receipt was simulated. A real connector may stop at `sent` until it has a delivery receipt.

Retries use exponential backoff starting at 15 seconds, capped at 10 minutes, and stop at `SMS_MAX_RETRIES` (default 5).

## Errors

| HTTP | Meaning |
| --- | --- |
| 400 | Invalid phone, purpose, sender, or message |
| 401 | Missing or invalid API key |
| 403 | Key is valid but missing the scope, or the project is suspended |
| 404 | Unknown message, OTP request, or nothing to resend |
| 409 | Idempotency key already used for a different kind of message |
| 429 | Resend cooldown, phone/IP/project limit, or SMS rate limit |

```json
{ "success": false, "error": "Too many verification requests. Please wait a moment." }
```

## Usage

Each accepted SMS or OTP message writes one usage unit for the customer, project, and API key. Units are not prices. Pay-as-you-go, credits, and plans can read `UsageRecord` later.

## Logs

Logs include the event name, request or message id, and a masked phone. They do not include OTP codes, API secrets, or message bodies.
