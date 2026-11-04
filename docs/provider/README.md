# Yaathirai — Local Tourist / Package Provider Module

Frontend + backend for the provider role in the assignment. **No database. All data is mock and in-memory**
(changes vanish when the server restarts). Built with Node built-in modules only (no Express, no npm dependencies; Node 18+).

## Extract
Unzip at the **root of the pulled project** (the folder that contains `public/`). Every path is new, so nothing of your friend's is overwritten.
Verify no conflicts first: `unzip -l yaathirai-provider-module.zip` and compare against `git status` afterwards — only new files should appear.

## Run
The team repo currently has no server, so a standalone one is included:
```
node provider-dev-server.js        # PORT=3000 by default
open http://localhost:3000/provider/dashboard.html
```
When your friend adds a Node `http` server, use the **one-line registration** instead (see INTEGRATION_CHECKLIST.md) and stop using `provider-dev-server.js`.

## Pages (`/provider/`)
dashboard · my-packages · create-package · edit-package?id= · availability · bookings · reports (package-wise earnings) · reviews

## API (`/api/provider`, all require a signed-in approved PROVIDER)
| Method | Path | Purpose |
|---|---|---|
| GET | /me, /dashboard | profile + form options, summary |
| GET, POST | /packages | list own, create (status `pending`) |
| GET, PUT, DELETE | /packages/:id | read, edit, delete (blocked if active bookings) |
| GET, POST | /packages/:id/availability | dates + capacity, add date |
| PUT, DELETE | /availability/:id | change seats/open-closed, delete |
| GET | /bookings?status=&packageId=&q= | own-package bookings |
| GET | /bookings/:id | detail |
| PATCH | /bookings/:id/status | pending→confirmed/cancelled, confirmed→completed/cancelled |
| GET | /earnings, /reviews?packageId= | package-wise earnings, reviews |

Errors: `{ok:false,error:{message,details}}` with 401/403/404/405/409/422. Other providers' records return 404.

## Test
Users: `prov-1` (default), `prov-2`, `cust-1` (customer → 403). Switch in the browser console: `sessionStorage.providerDevId='prov-2'` then reload.
```
curl localhost:3000/api/provider/dashboard
curl -H 'X-Provider-Id: cust-1' localhost:3000/api/provider/packages     # 403
curl localhost:3000/api/provider/packages/pkg-4                          # 404 (prov-2's)
```

## Limitations / mock
- Packages, availability, bookings, payments (`mock_*` statuses), earnings, reviews and the users are mock.
- Auth is a **dev stub** (`X-Provider-Id` header). It is not secure; replace `resolveUser()` in `middleware/auth.js`.
- Images are URL/path text only (no upload). Admin approval of packages is not part of this module.
- Not built: provider register/login pages, profile/settings (outside the listed provider features; register/login belong to the shared auth work).

## When the database arrives
Re-implement `repositories/memory.repository.js` with the same method names against MySQL (`tour_packages`, `package_itinerary`, `package_availability`, `bookings`, `payments`, `reviews`). Delete `data/mock-data.js`. Move itinerary/inclusions into their tables, make repository methods async and add `await` in the service. Routes, controllers, validators and frontend stay unchanged. Booking-status + seat changes should then run in one transaction.
