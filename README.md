# Bitespeed Identity Reconciliation Service

A backend web service that identifies and consolidates customer contact information across multiple purchases, even when different email addresses and phone numbers are used.

## Hosted Endpoint

> **Base URL:** `<YOUR_HOSTED_URL>`
>
> **POST** `/identify`

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **ORM:** Prisma (v7)
- **Database:** SQLite (local dev) / PostgreSQL (production)

## Getting Started

### Prerequisites

- Node.js >= 20.19.0
- npm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd projectpp

# Install dependencies
npm install

# Generate Prisma client and run database migrations
npx prisma generate
npx prisma migrate dev --name init
```

### Running the Server

```bash
# Development mode (with hot-reload via tsx)
npm run dev

# Production build
npm run build
npm start
```

The server starts on `http://localhost:3000` by default. Set the `PORT` environment variable to change this.

## API

### `POST /identify`

Receives contact information and returns a consolidated identity.

**Request Body (JSON):**

```json
{
  "email": "example@domain.com",
  "phoneNumber": "123456"
}
```

At least one of `email` or `phoneNumber` must be provided. Both can be provided together.

**Response (200 OK):**

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [23]
  }
}
```

- `primaryContatctId`: ID of the primary contact
- `emails`: All emails linked to this identity (primary contact's email first)
- `phoneNumbers`: All phone numbers linked to this identity (primary contact's phone first)
- `secondaryContactIds`: IDs of all secondary contacts

### How Identity Linking Works

1. **New customer:** If no existing contacts match the email or phone, a new primary contact is created.
2. **Existing customer, new info:** If a match is found by email or phone but the request contains new information (a new email or phone), a secondary contact is created and linked to the primary.
3. **Merging primaries:** If the request links two previously separate primary contacts (e.g., email matches one group and phone matches another), the newer primary is demoted to secondary and linked to the older primary.

## Project Structure

```
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Migration files
├── prisma.config.ts        # Prisma CLI configuration
├── src/
│   ├── index.ts            # Express app entry point
│   ├── lib/
│   │   └── prisma.ts       # Prisma client instance
│   ├── routes/
│   │   └── identify.ts     # POST /identify route
│   └── services/
│       └── contact.service.ts  # Core reconciliation logic
├── package.json
├── tsconfig.json
└── .env                    # DATABASE_URL (not committed)
```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | Database connection string | `file:./dev.db` |
