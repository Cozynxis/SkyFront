# SKYFRONT Community setup

Supabase project: https://supabase.com/dashboard/project/tknnvjwjemwjodolsduh
GitHub frontend: `src/community.js` and `src/community.css`

The database migrations were applied to the dedicated SkyFront project. Do not apply them to Mingle, Avento, or other projects.

## First admin sign-in

1. Open the Community page in the deployed game.
2. Choose **SIGN IN / REGISTER** → **REGISTER** using the owner's email.
3. Choose a strong password locally. Never send it to anyone.
4. Open the email verification message and confirm the address.
5. Sign in again and open Community. **ADMIN STUDIO** appears only for the verified owner.

The admin role is assigned by a database trigger after the owner's email is verified. A normal user cannot grant themselves admin privileges.

## Deployment

- Install dependencies with `npm install` and build using `npm run build`.
- Supabase publishable key is safe to include in the frontend *only* with RLS. Never add a service role key.
- For email confirmation to return to the game, configure **Authentication → URL Configuration** in Supabase to allow your deployed game URL, e.g. `https://cozynxis.github.io/SkyFront/`.
- The app currently uses a dedicated publishable key and project URL in `src/community.js`.
- Realtime requires the database publication configured by the migration.
- Poll results aggregate total votes without returning voter email addresses.
- Admin Studio shows voting totals, not an identity dashboard. To add a staff-facing per-voter audit, design a separate consent/privacy policy first.

## Notes

- Announcements can be published, edited, pinned, unpublished and deleted.
- Polls can be created, closed, reopened and deleted. Users get one vote per poll.
- Image attachments are currently HTTPS image URLs; direct upload storage is not yet implemented.
- This is an initial implementation, not a tested production deployment.
