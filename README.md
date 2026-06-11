# Mini Fency

A small full-stack domain blacklist management system composed of a Go authentication service, a Node.js blacklist service, a Vue 3 web dashboard, and a Chromium browser extension.

---

## Project Overview

Mini Fency simulates the core behaviour of a web protection tool: a user logs in, manages a list of risky domains through a web UI, and a browser extension automatically blocks navigation to those domains in real time.

The project is split into four independent components:

| Component           | Technology                            | Port |
| ------------------- | ------------------------------------- | ---- |
| `auth-service`      | Go, chi, JWT, bcrypt                  | 8080 |
| `blacklist-service` | Node.js, Express, TypeScript          | 3000 |
| `web-ui`            | Vue 3, Vite, Tailwind CSS, TypeScript | 80   |
| `extension`         | Chrome MV3, Vue 3, TypeScript         | —    |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                      Browser                                         │
│                                                                                      │
│   ┌──────────────────────────────┐          ┌──────────────────────────────┐         │
│   │       Chrome Extension       │          │           Web UI             │         │
│   └──────────────┬───────────────┘          └──────────────┬───────────────┘         │
│                  │                                         │                         │
└──────────────────┴──────────────────────┬──────────────────┴─────────────────────────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │         nginx          │
                              │  • reverse proxy       │
                              │  • routes /api/*       │
                              └────────────┬───────────┘
                                           │
                  ┌────────────────────────┴────────────────────────┐
                  │                                                 │
             /api/auth/*                                     /api/blacklist/*
                  │                                                 │
                  ▼                                                 ▼
      ┌──────────────────────────────┐         ┌────────────────────────────────────┐
      │         auth-service         │         │         blacklist-service          │
      │──────────────────────────────│         │────────────────────────────────────│
      │                              │         │                                    │
      │  POST /login                 │         │  GET    /domains                   │
      │                              │         │  POST   /domains                   │
      └──────────────────────────────┘         │  DELETE /domains/:domain           │
                                               │  GET    /domains/check/:domain     │
                                               │                                    │
                                               │  Storage: blacklist.json           │
                                               └────────────────────────────────────┘
```

**Authentication flow:**

1. User submits credentials (web UI or extension popup).
2. Auth service validates against the hashed admin password, returns a signed JWT (HS256).
3. The token is stored in `localStorage` (web UI) or `chrome.storage.local` (extension).
4. Every blacklist API call includes the token as `Authorization: Bearer <token>`.
5. The blacklist service middleware verifies the token using the shared `JWT_SECRET`.

**Domain blocking flow:**

1. The extension background service worker fetches the full domain list from the blacklist service on startup and every minute via a Chrome alarm.
2. It converts the list into `declarativeNetRequest` dynamic rules, one redirect rule per domain.
3. When the user navigates to a blacklisted domain, Chrome intercepts the request at the network level and redirects to the extension's local `blocked/index.html` page.
4. When a domain is added or removed from the web UI, it sends a `REFRESH` message to the extension via `chrome.runtime.sendMessage` (externally connectable) so the rules update immediately without waiting for the next scheduled sync.

---

## Setup

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- A Chromium-based browser (Chrome, Edge, Brave)

### 1. Build the extension

```bash
cp extension/.env.example extension/.env
docker compose --profile extension run --rm --build extension-build
```

This generates the `extension/dist/` folder.

### 2. Install the extension in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/dist/` folder
5. Copy the ID shown below the extension name

### 3. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and paste the copied extension ID into `CHROME_EXTENSION_ID`:

```
CHROME_EXTENSION_ID=your_id_here
```

You can also change `JWT_SECRET` to any random string, but it is not required to get started; the default value in `.env.example` works for local testing.

### 4. Start the backend services and the web UI

```bash
docker compose --profile ui up --build
```

The Web UI is available at `http://localhost`.

---

## How to Run the Backend Services

The backend services can be started in three ways depending on what you need.

### Via Docker Compose

```bash
docker compose up --build
```

This starts `auth-service` on port 8080 and `blacklist-service` on port 3000 inside the Docker network. The ports are not exposed to the host; they are only reachable by other containers (nginx, web UI).

### Via Docker Compose with host ports exposed

If you are developing the web UI outside Docker and need `localhost:8080` and `localhost:3000` to be reachable from your machine, merge the dev override:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Natively (Go and Node.js)

Each service can also be run directly with its own runtime. Environment variables are not read from the root `.env` in this case; see each service's `.env.example` for the full list and instructions on how to inject them.

**auth-service** (requires Go):

```bash
cd auth-service
export JWT_SECRET=... ADMIN_PASSWORD_HASH=... ALLOWED_ORIGINS=... PORT=8080
go run ./cmd/main.go
```

**blacklist-service** (requires Node.js):

```bash
cd blacklist-service
cp .env.example .env  # fill in the values
npm install
npm run dev
```

---

## How to Run the Web UI

The web UI is included in the `ui` Docker Compose profile and served by an nginx container at port 80.

```bash
docker compose --profile ui up --build
```

Open `http://localhost` in your browser. nginx proxies:

- `/api/auth/` → `http://auth-service:8080/`
- `/api/blacklist/` → `http://blacklist-service:3000/`

To run the web UI in development mode (with hot reload) outside Docker:

```bash
cd web-ui
cp .env.example .env   # set VITE_AUTH_BASE_URL and VITE_BLACKLIST_BASE_URL
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

---

## How to Install and Test the Browser Extension

### Installation

1. Complete the **Setup** steps above (build the extension, load it in Chrome).
2. The extension icon appears in the toolbar. Click it to open the popup.

### Login

1. Click the extension icon.
2. Enter username `admin` and password `password123`.
3. On success the popup shows a green status card with the number of blocked domains.

### Testing domain blocking

1. Log in through both the extension popup and the web UI.
2. In the web UI, add a domain to the blacklist, for example `evil.com`.
3. Navigate to `https://eliv.com` in Chrome.
4. You should be redirected to the extension's blocked page with the message "This site is blocked by Mini Fency".
5. Remove the domain from the web UI.

> **Note:** How quickly the extension reflects the change depends on the setup:
>
> - If `CHROME_EXTENSION_ID` is set in the environment and the web UI was built with it, the change is pushed to the extension immediately via `chrome.runtime.sendMessage`.
> - If the web UI is running in development mode without that variable, the extension ID can be supplied at runtime to enable the same immediate sync.
> - Otherwise, click the **Refresh** button in the popup to force an immediate sync manually.
> - As a last resort, the extension will pick up the change automatically within one minute via its scheduled alarm.

---

## Test Credentials

| Username | Password      |
| -------- | ------------- |
| `admin`  | `password123` |

`.env.example` already contains a pre-generated bcrypt hash for `password123`, so copying it as-is gives you this user out of the box. To use a different password, replace `ADMIN_PASSWORD_HASH` in `.env` with a new bcrypt hash.

---

## Main Technical Decisions

**JWT shared secret between services**
Both the Go auth service and the Node.js blacklist service read `JWT_SECRET` from the environment. The auth service signs tokens; the blacklist service verifies them. This avoids a network call for token introspection on every request while keeping the services independently deployable.

**`declarativeNetRequest` for domain blocking**
The extension uses the MV3-native `declarativeNetRequest` API instead of `webRequest` listeners. This runs at the browser network layer before a connection is established, meaning the blocked page appears instantly with no page content loaded first. It is also the required approach under MV3, as the deprecated `webRequest` blocking mode is not available to extensions.

**One-minute alarm + immediate notify**
The extension polls the blacklist API every minute via a Chrome alarm to stay in sync even when the web UI is not open. When the web UI adds or removes a domain it additionally sends a `REFRESH` message to the extension's background worker so blocking takes effect immediately without waiting for the next poll cycle.

**File-based persistence for the blacklist**
The blacklist service writes to `data/blacklist.json` inside the container. This is intentionally simple for the exercise scope. The JSON file is created on first write; the service degrades gracefully if it does not exist yet (returns an empty list).

**bcrypt for password storage**
Passwords are stored as bcrypt hashes (cost 10) and never stored or transmitted in plain text. The auth service intentionally returns the same `"invalid credentials"` error regardless of whether the username was not found or the password was wrong, to prevent username enumeration.

**Multi-stage Docker builds**
Both the Go and Node.js Dockerfiles use multi-stage builds to produce minimal runtime images (alpine). The Go binary is statically compiled (`CGO_ENABLED=0`) so no C runtime is needed in the final image.

**nginx as reverse proxy for the web UI**
The Vue SPA is served by nginx, which also proxies `/api/auth/` and `/api/blacklist/` to the respective backend containers. This means the browser only ever talks to a single origin (`http://localhost`), eliminating cross-origin cookie or CORS complexity in the frontend.

---

## Known Limitations and Trade-offs

**Single hardcoded user**
There is no user registration or database. The admin account is configured via an environment variable at startup. Adding multi-user support would require a database and a user management endpoint.

**In-memory user store in the auth service**
The user repository is a Go map populated at startup from environment variables. This is sufficient for the exercise but means a restart reloads the same single user and any runtime changes are lost.

**File-based blacklist storage**
`data/blacklist.json` lives inside the Docker container. If the container is removed the blacklist is lost. A production deployment should mount a named Docker volume or use a database.

**JWT tokens are not revocable**
Issued tokens are valid until they expire (24 hours). There is no token blacklist or refresh-token mechanism. Logging out from the web UI or extension simply discards the token locally; an attacker who captured the token can continue using it for the remainder of its lifetime.

**Extension requires manual ID configuration**
Chrome assigns a stable extension ID only after the extension is loaded. The ID must be copied manually into `.env` and the backend services rebuilt to allow the extension's origin through CORS.

**No HTTPS in local development**
All services communicate over plain HTTP on localhost. A production deployment must add TLS termination (e.g., Let's Encrypt via a reverse proxy).
