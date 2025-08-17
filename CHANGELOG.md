# Changelog — B&B Clean
Formato: [Keep a Changelog](https://keepachangelog.com/it-IT/1.0.0/). Date in ISO (YYYY-MM-DD). SemVer.

## [0.2.0] - 2025-08-17
### Aggiunto
- **Admin KYC (dashboard)**:
  - `dashboard.html` (navbar solo “Admin”, tab KYC).
  - `admin-kyc-list.js` (lista richieste, filtri stato, azioni).
  - `admin-kyc-decision.js` (approva/rifiuta/riporta “in attesa”).
  - `netlify/functions/kyc.js` (API admin: list/get/decide) con storage **Netlify Blobs**.
  - `package.json` con dipendenza `@netlify/blobs`.
- **Notifiche KYC**: email automatiche al partner su esito (approvato/rifiutato/in revisione).

### Modificato
- `netlify/functions/notify.js`: quando riceve `upload-docs` salva la richiesta in Blobs (`store "kyc"`), oltre a inviare email allo staff.
- **Pulizia navbar**:
  - Pubbliche: `index.html` (se presente), `prenota.html`, `partner.html`, `annunci.html` → **Home · Prenota · Diventa partner · Area Partner**.
  - Admin: `dashboard.html` → **solo “Admin”**.
- **_redirects**: sblocco sito (file mantenuto ma vuoto / regola “coming soon” commentata).

### Sicurezza
- Richiesto `ADMIN_TOKEN` (ENV su Netlify) per usare l’API `/.netlify/functions/kyc`.

---

## [0.1.0] - 2025-08-17
### Aggiunto
- **Area Partner (MVP)**:
  - `partner-app.html` (tab: Overview, Profilo, KYC, Tariffe, Disponibilità, Payout, Notifiche, Sicurezza).
  - `partner.js` (login con OTP email, progress profilo, CF auto con `comuni.json`, upload KYC via email, preferenze).
- **Funzioni server**:
  - `netlify/functions/notify.js` (OTP: request/verify, KYC upload, invio notifiche via Resend).
  - `netlify/functions/route.js` (distanza stradale — OpenRouteService).
  - `netlify/functions/geocode.js` (geocoding — OpenRouteService).
- **Configurazioni**:
  - `settings.json` con regole economiche (commissione 12%, fee cliente 5%, rimborso 2.5€/10km, acconto 0%).
- **Stile**:
  - `bbclean-theme.css` / `styles.css` integrazione base (palette teal + scuro).

### Note operative
- ENV richieste: `RESEND_API_KEY`, `OTP_SECRET`, `NOTIFY_EMAIL`, *(opzionale)* `ORS_API_KEY`.
- Mittente email: `no-reply@bebclean.it` (Resend → Domains verificato).
- Dati KYC/foto: per ora via email; previsto storage esterno con link firmati in una release futura.

---

## [Unreleased]
- Annunci & matching nel raggio; stima/carrello con breakdown completo; Stripe Connect Express (onboarding + transfer).
