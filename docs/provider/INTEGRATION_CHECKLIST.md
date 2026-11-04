# Integration checklist (after `git pull` of the team project)

1. [ ] `git pull`, then extract the ZIP at the project root. Run `git status`: only **new** untracked files; nothing modified.
2. [ ] `node --version` is 18 or newer. No `npm install` is needed.
3. [ ] Smoke test standalone: `node provider-dev-server.js`, open `/provider/dashboard.html`, click all 7 nav links.
4. [ ] Confirm friend's `/` page still looks the same (provider CSS is scoped to `.provider-app` and only loaded by provider pages).
5. [ ] **Shared-file change (manual, only when a team server exists)** — add to the server file, one block:
   ```js
   const { registerProviderRoutes } = require('./src/modules/provider');
   // after the server is created and its request listener is attached:
   registerProviderRoutes(server);
   ```
   (Alternative inside an existing request handler: `if (await require('./src/modules/provider').handleProviderRequest(req, res)) return;` as the first line.)
   The team server must also serve `public/provider/*`, `public/css/provider/*`, `public/js/provider/*`.
6. [ ] **Auth:** replace `resolveUser(req)` in `src/modules/provider/middleware/auth.js` with the real session lookup (must return `role: 'PROVIDER'`, `status: 'approved'`). Remove `sessionStorage.providerDevId` from `public/js/provider/api.js`.
7. [ ] Optional: link `/provider/dashboard.html` from the team's login redirect for provider users.
8. [ ] Verify: create package → appears in My Packages (pending); edit; add date; confirm a pending booking; delete a package with active bookings is refused; switch to `cust-1` → 403; restart server → data resets (expected).
9. [ ] Do not commit `node_modules`, `.env` or DB files (none are part of this module).
