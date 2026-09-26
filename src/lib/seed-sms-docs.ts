export const SMS_DOCS_PRODUCT = "sms-otp";

export const DEFAULT_SMS_DOCS = [
  {
    slug: "overview",
    title: "What SMS & OTP is",
    summary: "A verification code, or a text you write yourself.",
    sortOrder: 10,
    body: `SMS & OTP is MyDomain’s messaging product.

Use OTP when an app needs a one-time code to confirm a phone number, such as a sign-in or a checkout. Use SMS when you already know the words, such as “Your order is confirmed.”

You create a project, copy an API key, and call MyDomain. The verification code is never returned by the API. Every send is listed in the account that owns the key, and in the admin panel.`,
  },
  {
    slug: "start",
    title: "Create a project and a key",
    summary: "One project per app. The secret is shown once.",
    sortOrder: 20,
    body: `1. Sign in and open SMS & OTP.
2. Create a project. A project is one app. It owns the keys, sender IDs, and usage for that app.
3. Create an API key, name it, and copy the secret before you leave the page.
4. Leave on only the scopes that app needs.

Scopes:

- \`otp:send\` sends or resends a verification code
- \`otp:verify\` checks a code
- \`sms:send\` sends a text
- \`sms:read\` reads a message status

A new project starts with the sender ID MyDomain. A sender ID stored here is a label on the message. It is not a registration with a mobile network.

Open [SMS & OTP](/sms/keys) to create a key, or read this guide while signed out and come back when you are ready.`,
  },
  {
    slug: "authentication",
    title: "Authenticate each request",
    summary: "The key goes in the Authorization header.",
    sortOrder: 30,
    body: `Send the secret on every call:

\`\`\`
Authorization: Bearer md_live_your_key
Content-Type: application/json
\`\`\`

A browser login does not authorize these routes. A missing or wrong key returns 401. A key that is missing the scope for that route returns 403.`,
  },
  {
    slug: "otp-send",
    title: "Send a verification code",
    summary: "POST /api/v1/otp/send",
    sortOrder: 40,
    body: `This call needs the \`otp:send\` scope.

\`\`\`
curl -X POST {{baseUrl}}/api/v1/otp/send \\
  -H "Authorization: Bearer md_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+233241234567","purpose":"login"}'
\`\`\`

\`\`\`
{
  "success": true,
  "request_id": "cm...",
  "expires_in": 300
}
\`\`\`

\`phone\` is E.164, with the country code. \`purpose\` is a short label you choose, such as \`login\` or \`checkout\`. The same phone and purpose share one active code. A new send replaces the previous code.

The response does not include the code. How long it lasts, how many guesses are allowed, and how long to wait before sending again are listed under Current limits.`,
  },
  {
    slug: "otp-verify",
    title: "Check a verification code",
    summary: "POST /api/v1/otp/verify",
    sortOrder: 50,
    body: `This call needs the \`otp:verify\` scope. Use the same \`phone\` and \`purpose\` you used when sending.

\`\`\`
curl -X POST {{baseUrl}}/api/v1/otp/verify \\
  -H "Authorization: Bearer md_live_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"phone":"+233241234567","code":"123456","purpose":"login"}'
\`\`\`

\`\`\`
{ "success": true, "verified": true }
\`\`\`

A wrong, expired, or locked code returns \`verified: false\`. After the attempt limit, that code locks until you send a new one.`,
  },
  {
    slug: "otp-status",
    title: "Resend a code or read its status",
    summary: "The status never includes the code.",
    sortOrder: 60,
    body: `\`POST {{baseUrl}}/api/v1/otp/resend\` uses the same body as send and the \`otp:send\` scope. During the cooldown it returns 429.

\`GET {{baseUrl}}/api/v1/otp/status/REQUEST_ID\` needs \`otp:send\` or \`otp:verify\`. Replace REQUEST_ID with the \`request_id\` from send.

The status is one of \`pending\`, \`verified\`, \`expired\`, \`invalidated\`, or \`locked\`. The phone number in the response is masked.`,
  },
  {
    slug: "sms-send",
    title: "Send a text message",
    summary: "POST /api/v1/sms/send",
    sortOrder: 70,
    body: `This call needs the \`sms:send\` scope.

\`\`\`
curl -X POST {{baseUrl}}/api/v1/sms/send \\
  -H "Authorization: Bearer md_live_your_key" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-1042" \\
  -d '{"to":"+233241234567","message":"Your order is confirmed.","sender_id":"MyDomain"}'
\`\`\`

\`\`\`
{
  "success": true,
  "message_id": "cm...",
  "status": "queued"
}
\`\`\`

The call returns when the message is stored. It does not wait for a handset. \`GET {{baseUrl}}/api/v1/sms/MESSAGE_ID\` needs \`sms:read\` and returns the status. Sending the same \`Idempotency-Key\` again returns the original message. \`sender_id\` must be enabled on the project.`,
  },
  {
    slug: "statuses",
    title: "Message statuses",
    summary: "What each status means after you send.",
    sortOrder: 80,
    body: `A message moves through these statuses:

- \`queued\` — stored and waiting
- \`processing\` — a worker has claimed it
- \`sent\` — handed to the connector
- \`delivered\` — a receipt was recorded
- \`failed\` — it could not be sent after the retries
- \`expired\` — it was not completed in time
- \`rejected\` — the connector refused it`,
  },
  {
    slug: "errors",
    title: "Errors",
    summary: "The status code tells you what to fix.",
    sortOrder: 90,
    body: `- \`400\` — the phone, purpose, sender, or message is not valid
- \`401\` — the API key is missing or invalid
- \`403\` — the key does not have the required scope
- \`404\` — that message or request does not exist
- \`429\` — the cooldown or a rate limit blocked the call

The response body is \`{ "success": false, "error": "..." }\`.`,
  },
  {
    slug: "delivery",
    title: "How delivery works today",
    summary: "Update this section when the path to a network changes.",
    sortOrder: 100,
    body: `Messages are queued in MyDomain. The connector in this release is a development simulator. A successful send is marked delivered inside MyDomain. That receipt is not a delivery from MTN, Telecel, AirtelTigo, or any other mobile network.

When a live network is connected, edit this section in the admin so the guide matches what customers should expect.`,
  },
];
