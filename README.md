# CampaignFlow · The Digital Sole

Campaign distribution and finance tool: which campaign came from which advertiser,
where it was distributed, what each partner owes us or we owe them, and the company's monthly profit.

```
campaignmanager/
├── backend/    Spring Boot 4 · Java 21 · MySQL · Flyway
└── frontend/   React 19 · Vite · Tailwind
```

## Run locally

**Backend** (needs Java 21 and MySQL running)

```bash
cd backend
cp local.properties.example local.properties   # then fill in your MySQL password and a JWT secret
./mvnw spring-boot:run
```

The API runs on http://localhost:8080. Flyway creates the database tables on first start,
and the first admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

The app runs on http://localhost:5173 and talks to the backend at `VITE_API_URL` (default `http://localhost:8080`).

## How the money works

| Where | What is entered |
|---|---|
| **Monthly entry** page | A whole month on one screen: every live campaign's revenue and every publisher's events and payout |
| Campaign → month | Advertiser's revenue (+ optional signed **adjustment** for clawbacks/bonuses, with a reason) and approved events |
| Distribution → month | Publisher's total and payable events, payout (pre-filled as payable × rate), optional advertiser-approved events, optional adjustment |
| Partner / Payments | Money **received** from advertisers and **paid** to publishers, with deductions (TDS, fees), or a **write-off** to clear a balance |
| Month close (admin) | Locks a month's revenue, payouts and exchange rates; corrections then go in as adjustments in an open month |

- Press **Ctrl/⌘ K** anywhere to jump to a campaign, partner, distribution or page.
- Profit = revenue − payout, always calculated live, never stored.
- Partner balance = all billed − payments − write-offs, per currency.
- A campaign's advertiser, direct flag and currency are fixed once it has revenue or distributions.
  A new agency means a new campaign.
- Estimated revenue per distribution splits each month's campaign revenue by advertiser-approved events
  (when every publisher has them) or payable events. Months without revenue are left out.
- Every change to money is kept in the history (old → new, who, when).
- Company totals in several currencies are added up in `BASE_CURRENCY` using the monthly rates.

## Database changes

Never edit an existing migration. Add a new file in `backend/src/main/resources/db/migration`,
for example `V2__add_payments.sql`. Flyway applies it on the next start.
