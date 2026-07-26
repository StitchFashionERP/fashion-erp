# Installatie

Vervang alleen deze bestanden:

- `src/lib/company-settings.ts`
- `src/app/instellingen/bedrijfsinstellingen/page.tsx`
- `src/app/instellingen/bedrijfsinstellingen/company-settings.module.css`

Voer daarna één keer uit in Supabase SQL Editor:

- `supabase/migrations/202607260002_company_settings_cloud.sql`

Werking:
- Bestaande lokale bedrijfsinstellingen worden bij de eerste keer openen automatisch naar Supabase gemigreerd als er nog geen cloudrecord bestaat.
- Na succesvolle migratie wordt `fashion-erp-company-settings-v1` uit Local Storage verwijderd.
- Daarna lezen en schrijven alle computers dezelfde instellingen per organisatie.
