# Endo SOP Studio

A Vite + React workspace for endodontic practices to create, manage, and print SOPs. The app uses Supabase for passwordless email-code sign-in, shared practice data, location-specific SOP overrides, and private image storage.

## Run locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and add the Supabase project URL and publishable/anon key before signing in.

## Configure Supabase

1. Create a Supabase project.
2. Run [`supabase-schema.sql`](./supabase-schema.sql) in the Supabase SQL Editor. It creates the practice, team, location, SOP, and reference tables; row-level security policies; and the private `practice-assets` bucket. This file matches the Supabase CLI migration at [`supabase/migrations/202611110001_initial_workspace.sql`](./supabase/migrations/202611110001_initial_workspace.sql); use one setup method, not both.
3. In **Authentication → Providers → Email**, enable email sign-in and email confirmations. Set the email OTP length to 6 digits.
4. In **Authentication → Email Templates**, configure the sign-in/confirmation template to display the one-time token (`{{ .Token }}`), not only a magic link.
5. Configure a production SMTP provider in Supabase Auth so verification codes and team-invitation codes are deliverable. Set the Supabase Site URL and allowed redirect URLs for your local and Vercel app domains.
6. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel environment variables, then redeploy. The browser key is only safe with the supplied row-level security policies enabled. Never use or expose a service-role key in the app.

The first verified user creates a practice and its first location. Practice admins can invite staff by email; invitees receive a 6-digit code and join the practice after verifying their address. Admins can add locations and select a source location to inherit its SOPs. Inherited SOP changes flow through until a location saves its own override. Practice name and logo are shared; each location's name and optional address are added to exported PDFs.

The sign-in screen includes an unauthenticated demo with sample patient registration, appointment reminders, check-in, insurance entry, estimate sharing, and checkout SOPs. Demo selections can be printed but are not saved.

SOPs support optional one-time prerequisites, which appear before the procedure steps in the generated PDF. Procedure and prerequisite lists can be reordered by dragging and can have blank items inserted after any step. The builder links to the TDO Learning Center; automatic drafting from LMS video content is not connected yet and requires a future LMS integration.

Use **Import existing SOP** in Build Your Own to extract text from PDF, DOCX, or TXT files into editable title, purpose, prerequisite, and procedure-step fields. Imported files are processed in the browser and are not saved as attachments. Review the extracted content before saving; scanned PDFs that contain no selectable text need OCR and are not supported. Use **Add / edit / reorder steps** on a template or saved SOP to open the same editor; use **Add after**, **Move up**, **Move down**, or the drag handle to arrange steps before saving.

## Build for Vercel

Import the project into Vercel, add the two Supabase environment variables, and use `npm run build` as the build command with `dist` as the output directory.

## Notes

- TDO reference articles are linked from the official knowledge base: https://kb.tdo4endo.com/. The templates are editable starting points, not official TDO guidance.
- TDO navigation screenshots can vary by release and permissions. Verify procedures against current TDO documentation and your office policies.
- The TDO logo displayed in the app was supplied for this project.
- Authenticated practice data is shared only with practice members. Practice logos and procedure screenshots are stored in a private bucket with signed display URLs.
