# Party preparation

## Backup

Read only: nothing changes in Supabase or R2. Media already saved is not downloaded again.

1. Fill a `.env.production.local` (ignored by git) with the production `SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) and the `R2_*` variables of `.env.example`
2. Run `node --env-file=.env.production.local scripts/backup.mjs`
3. It must end with `backup ok`. Copy `~/instawedding-backups` to another disk or a private drive

The folder has names, emails and hidden photos: never commit or share it. Pass another folder as an argument if needed. Run it before every migration, at the end of the party and the day after. It does not cover Supabase Auth accounts, the schema (see `supabase/migrations/`) or settings. Restoring is manual and has not been rehearsed.

`manifest.json` of each snapshot lists files whose extension does not match their content, files no post uses and posts with missing files.

## Device tests

Use the production site, with test photos deleted afterwards. Devices: an iPhone with Safari and an Android with Chrome. Write down the model and system version.

| #   | Test                                                 | Expected                              |
| --- | ---------------------------------------------------- | ------------------------------------- |
| 1   | Post a photo with the "P&B Elegante" filter          | Published photo is black and white    |
| 2   | Post a photo without a filter, then run the backup   | No file with the wrong extension      |
| 3   | Create a guestbook card right after opening the page | Serif fonts, nothing outside the card |
| 4   | Record a 5s clip and post a gallery video            | Both play in the feed                 |
| 5   | Post in airplane mode, then turn the network on      | Post is published by itself           |
| 6   | Open the app from the WhatsApp browser and sign in   | Google login works                    |
| 7   | Rotate the phone in every screen                     | Nothing is cut off                    |
| 8   | Ask a ceremonialist to sign in by email code         | The code arrives                      |
| 9   | Open the projector on the party laptop for one hour  | It stays open, screen does not sleep  |
