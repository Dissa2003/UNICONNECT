# UniConnect

This workspace contains two separate projects:

- `backend` – Express/MongoDB API server
- `frontend` – React SPA using react-scripts and axios

## Getting started

At the root of the workspace you can manage both projects together:

```bash
# install tools used by both
npm install
# this will install `concurrently` at the root and pull dependencies in each subfolder

# start both servers in one terminal
npm start
```

The frontend will launch automatically at `http://localhost:3000` and the API is available on `http://localhost:5000`.

You can also run each project independently:

```bash
cd backend && npm install && npm start
cd frontend && npm install && npm start
```

## Routing behaviour

- Visiting `/` loads the public home page with the shared navbar.
- Clicking **Login** in the navbar navigates to `/login`.  If already authenticated you will be forwarded to your dashboard.
- Protected pages (`/student`, `/admin`) require a token and will redirect to `/login` if not present.

## Session timeout

A 15‑minute inactivity timer runs in the frontend.  Any mouse, keyboard, touch or click event resets the timer.  When the user has been idle for 15 minutes the JWT is removed and the app navigates back to the login screen.  The timer is synced across tabs using `localStorage` events.

## Navbar consistency

The same `Navbar` component is rendered on all pages via `AppWrapper`; the old hard‑coded navigation in the student dashboard has been removed.

## Backend notes

- Profiles enforce that `strongSubjects` and `weakSubjects` are subsets of `subjects`.
- Availability is stored as an object map and legacy array data is migrated on read.
- The `/profile/me` endpoint now returns a `displayName` field for sidebar display.
- Students can view other members whose profiles match their scope on the dashboard under **Match Preview**. The section automatically opens when matches are found, and the main panel scrolls independently so you can navigate long profiles.

> ⚠️ **Developer tip**: changes to routes or controllers require restarting the backend server. Consider running
> `npm install -g nodemon` and then `nodemon src/app.js` inside the `backend` folder for automatic reloads.

---

Feel free to explore or extend!  `npm run build` at the root will produce a production-ready frontend build.
