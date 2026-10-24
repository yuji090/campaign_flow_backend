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

## Database changes

Never edit an existing migration. Add a new file in `backend/src/main/resources/db/migration`,
for example `V2__add_payments.sql`. Flyway applies it on the next start.
