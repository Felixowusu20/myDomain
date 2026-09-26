# myDomain

White-label domain + hosting reseller platform. Customers buy from **myDomain**. The backend talks to a provider through a replaceable interface. Right now that provider is **mock data only**.

No ResellerClub, OpenSRS, Namecheap, GoDaddy, Cloudflare, cPanel, WHM, or live payment APIs are integrated.

## 1. Project architecture

```
                    myDomain
                         │
              ┌──────────┴──────────┐
              │                     │
       CUSTOMER / ADMIN        NEXT.JS BACKEND
                                    │
                             SERVICE LAYER
                          (domain / hosting / billing)
                                    │
                         ┌──────────┼──────────┐
                         │          │          │
                       Domain    Hosting      DNS
                      Provider   Provider   Provider
                         │          │          │
                         └──────────┼──────────┘
                                    │
                              MOCK PROVIDERS
```

Stack (same family as your other Next.js apps):

- Next.js 16 App Router + TypeScript
- Tailwind CSS v4
- Neon PostgreSQL via Prisma ORM (`src/lib/db.ts` → `src/lib/db-postgres.ts`)
- JWT httpOnly cookies (`jose`) + `bcryptjs`
- Zod validation

Accounts, catalog, orders, and billing live in Neon. Domain/hosting/payment **providers** are still mock unless you change the `*_PROVIDER` env vars.

Layers:

| Layer | Location |
| --- | --- |
| UI | `src/app/(customer)`, `src/app/admin` |
| API | `src/app/api` |
| Auth | `src/lib/session.ts`, `src/lib/guard.ts`, `src/middleware.ts` |
| Services | `src/lib/services` |
| Provider interfaces | `src/lib/providers/types.ts` |
| Provider factory | `src/lib/providers/index.ts` |
| Mock providers | `src/lib/providers/mock` |
| Jobs | `src/lib/jobs/runner.ts` |

Controllers never call a registrar. They call a service. The service calls `getDomainProvider()`.

## 2. Database schema

Prisma models in `prisma/schema.prisma`:

User, Customer, Admin, Domain, DomainRegistration, DomainContact, DnsRecord, TldPricing, HostingPlan, HostingAccount, Server, CartItem, Order, OrderItem, Payment, Invoice, Subscription, Renewal, Provider, ProviderAccount, SupportTicket, Notification, AuditLog, BackgroundJob.

Prices are stored in **cents**. Wholesale fields exist only on `TldPricing` and are never returned on customer APIs.

## 3. Provider abstraction

Interfaces:

- `DomainProvider`
- `HostingProvider`
- `DnsProvider`
- `PaymentProvider`
- `NotificationProvider`

Factory (`src/lib/providers/index.ts`) reads:

```
DOMAIN_PROVIDER=mock
HOSTING_PROVIDER=mock
DNS_PROVIDER=mock
PAYMENT_PROVIDER=mock
```

Later you add `ResellerClubDomainProvider` (or OpenSRS, etc.) and a `case "resellerclub"` in the factory. UI, billing, and schema stay.

## 4. Mock provider

`MockDomainProvider` keeps an in-memory registry, marks common names unavailable, registers new names as `ACTIVE`, and returns dummy nameservers `ns1.mockprovider.com` / `ns2.mockprovider.com`.

`MockHostingProvider` provisions accounts onto mock Accra servers (`GHA-01`…`GHA-03`) with reserved IPs (`192.0.2.10` and friends).

`MockPaymentProvider` always succeeds unless `{ fail: true }` is sent.

## 5. Customer workflow

1. Create account or demo login  
2. Search domain  
3. Add to cart (retail price only)  
4. Mock pay  
5. Domain is registered through `DomainProvider.registerDomain()`  
6. Domain appears on the dashboard  
7. Buy hosting → Connect domain → mock DNS/A record update  
8. See server status  

## 6. Admin workflow

Separate cookie (`mydomain_admin_session`). Admin can view customers, domains, hosting, servers, pricing (including wholesale + margin), providers, orders, payments, invoices, renewals, support, audit logs, and system health.

## 7. Authentication / authorization

- Roles: `CUSTOMER`, `ADMIN`
- Passwords hashed with bcrypt
- JWT in httpOnly cookies
- Role is taken from the signed session, never from the browser
- Customer queries always filter by `customerId`
- Admin routes use `requireAdmin()`
- Auth endpoints are rate-limited

## 8. How domain registration works

Checkout → `PaymentProvider.createPayment()` → order `PAID` → `DomainService.registerPurchasedDomain()` → `DomainProvider.registerDomain()` → store Domain + DNS + renewal + notification.

If the provider throws, the domain is stored as `PENDING_REGISTRATION` and the customer sees a friendly “we’re still completing registration” message.

## 9. How hosting connection works

Customer opens a hosting account and clicks **Connect**. The service:

- Links the domain to the hosting account
- Sets mock nameservers
- Points the `@` A record at the mock server IP (`192.0.2.x`)

The customer does not type nameservers or IPs.

## 10. How payment works in demo mode

`MockPaymentProvider` returns `SUCCESS` immediately. No card network, no Stripe, no Paystack. The checkout button is the mock charge.

## 11. Run locally

```bash
cd Domain.com
npm install
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
```

Put your Neon pooled URI in `.env.local` as `DATABASE_URL`. Prisma reads that URL from `prisma.config.ts`.

Open [http://localhost:3000](http://localhost:3000).

### GitHub sign-in and repository import

The customer GitHub flow supports OAuth sign-in, connecting GitHub to an existing customer, browsing accessible repositories, private repository inspection, branch selection, environment variable entry, and deployment checks before a trial hosting deployment is created.

### Static vs SSR hosting

- **Static** (Vite, CRA, Astro static, HTML): files are built and served from `/p/{slug}`.
- **SSR / Node** (Next.js, Nuxt, Remix, SvelteKit, Node `start` scripts): the app is built in Docker, then kept running as a container with your env vars (including `DATABASE_URL`). Preview URL uses a subdomain on `PREVIEW_ROOT_DOMAIN` (default `lvh.me` locally, which resolves to `127.0.0.1`).

Docker must be running on the host that executes builds. Runtime ports are allocated from `RUNTIME_PORT_MIN`–`RUNTIME_PORT_MAX` and proxied through `/api/runtime-proxy`.

Create a **GitHub OAuth App** at [GitHub Developer Settings](https://github.com/settings/developers) with:

- Homepage URL: `http://localhost:3000`
- Authorization callback URL: `http://localhost:3000/api/auth/github/callback`

Then add the generated values to `.env.local`:

```env
GITHUB_CLIENT_ID="your-client-id"
GITHUB_CLIENT_SECRET="your-client-secret"
```

The app requests `read:user user:email repo`. The first two scopes enable customer sign-in; `repo` is required for importing private repositories. After restarting `npm run dev`, customers can choose **Continue with GitHub** on login or **Connect GitHub** from Sites, search their repositories, select a branch, enter environment variables, and deploy.

For production, register the exact public homepage and callback URLs for that deployment. GitHub callback URLs must match exactly, including the protocol, hostname, path, and any port.

## 12. First accounts

There are no demo logins. Create a customer at `/register`. The first visit to `/admin/login` creates the first administrator.

## 13. Environment variables

See `.env.example`.

```
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxxx.aws.neon.tech/neondb?sslmode=require"
AUTH_SECRET="replace-with-a-long-random-secret"
DOMAIN_PROVIDER="mock"
HOSTING_PROVIDER="mock"
DNS_PROVIDER="mock"
PAYMENT_PROVIDER="mock"
NOTIFICATION_PROVIDER="mock"
```

`DATABASE_URL` is required. Use the Neon **pooled** connection string.

## 14. Files to change for a real provider

1. `src/lib/providers/types.ts` — only if the real API needs extra methods  
2. `src/lib/providers/real/<provider>.ts` — **new implementation**  
3. `src/lib/providers/index.ts` — add a `case` for the new driver  
4. `.env` — set `DOMAIN_PROVIDER=resellerclub` (or similar) and real secrets  
5. `src/app/admin/providers/page.tsx` — optional UI for connection status  

Do **not** rewrite dashboards, cart, orders, or Prisma models unless the real provider introduces new product types.

## 15. Real APIs we will eventually need

These are capabilities, not guessed endpoints. Exact URLs come from the provider you choose.

**Domain / registrar**

- Availability search  
- Register / renew / transfer  
- Status + expiration  
- Nameservers  
- DNS records  
- Auto-renew  
- WHOIS / contact objects  

**Hosting**

- List plans  
- Create / suspend / unsuspend / terminate account  
- Server assignment  
- Resource / status  
- Control-panel credentials  

**DNS** (if separate from the registrar)

- CRUD for A, AAAA, CNAME, MX, TXT, NS  

**Payments**

- Create charge / checkout session  
- Verify / webhook  
- Refund  

**Notifications later**

- Email and in-app notices use `NotificationProvider`.
- Phone OTP and outbound SMS are the SMS & OTP product. See [docs/sms-otp-api.md](docs/sms-otp-api.md). Delivery is a development mock until a real network connector is added.
# myDomain
