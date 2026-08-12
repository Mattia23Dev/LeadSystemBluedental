# Integrazione Qualificatore ↔ LeadSystem — Reminder appuntamento e conferma

| | |
|---|---|
| **Versione** | 1.1 — 12 agosto 2026 |
| **Ambiente** | Produzione (`https://leadsystembluedental-production.up.railway.app`) |
| **Stato** | Endpoint di conferma **live e testato**. Invio reminder **integrato e testato** sul connector del qualificatore (contratto dell'11/08/2026). |

## 1. Il flusso in due righe

1. LeadSystem conosce gli appuntamenti fissati (mirror dell'agenda Nexus, aggiornato ogni ora) e chiede al qualificatore di inviare al paziente il template WhatsApp *"Ci sarai?" → Sì / No*: una prima volta **~4 giorni prima** (flusso "4 giorni") e una seconda **il giorno prima** (flusso "1 giorno").
2. Il qualificatore raccoglie la risposta e la rimanda a LeadSystem, che la scrive su Nexus nel campo `stato_conferma` (`SI-CONFERMA` / `NO-CONFERMA`).
3. Chi non risponde entro 24 ore dall'appuntamento viene chiuso automaticamente a `NO-CONFERMA` da LeadSystem: **non serve che il qualificatore mandi nulla per i silenzi**.

---

## 2. Direzione A — Qualificatore → LeadSystem (risposta del paziente)

### Endpoint

```
POST https://leadsystembluedental-production.up.railway.app/api/webhook-conferma-appuntamento
Content-Type: application/json
```

### Autenticazione

Se ci comunicate di volerlo, attiviamo un token condiviso: va mandato in header `x-webhook-token` (in alternativa `Authorization: Bearer <token>` o campo `token` nel body). **Finché il token non è concordato l'endpoint accetta le richieste senza autenticazione**, così potete testare da subito.

### Body

| Campo | Alias accettati | Obbligatorio | Note |
|---|---|---|---|
| `risposta` | `conferma`, `answer`, `esito`, `reply`, `value` | **sì** | vedi valori sotto |
| `lead_id` | `leadId` | uno dei tre | id LeadSystem: **è quello che vi passiamo noi nella richiesta di invio, usatelo se possibile** |
| `id_nexus` | `idNexus` | uno dei tre | id della lead su Nexus |
| `user_phone` | `telefono`, `phone`, `numero_telefono` | uno dei tre | qualsiasi formato (`+39…`, `0039…`, `389…`) |
| `dry_run` | — | no | `true` = simulazione: validiamo e rispondiamo, senza scrivere su Nexus |

**Valori di `risposta`** — il parsing è tollerante:

- **Sì** → `si`, `sì`, `yes`, `y`, `ok`, `confermo`, `confermato`, `1`, `true`, oppure testo libero che inizia per "sì…" (es. `"Sì ci sarò"`)
- **No** → `no`, `n`, `annulla`, `disdetta`, `non confermo`, `0`, `false`, oppure testo libero che inizia per "no…" (es. `"No, non riesco"`)
- **Nessuna risposta** → `nessuna`, `no_response`, `timeout`, `scaduto` → trattata come `NO-CONFERMA`

Se la risposta non è interpretabile rispondiamo `400` e **non** scriviamo nulla: in quel caso conviene che l'AI richieda un Sì/No esplicito al paziente.

### Esempi

Conferma positiva (via `lead_id`, il caso consigliato):

```bash
curl -X POST "https://leadsystembluedental-production.up.railway.app/api/webhook-conferma-appuntamento" \
  -H "Content-Type: application/json" \
  -d '{
        "lead_id": "6a72ed08f2a66c279728b9db",
        "risposta": "si"
      }'
```

Risposta negativa in testo libero, identificata dal telefono:

```bash
curl -X POST "https://leadsystembluedental-production.up.railway.app/api/webhook-conferma-appuntamento" \
  -H "Content-Type: application/json" \
  -d '{
        "user_phone": "+393492455024",
        "risposta": "No, non riesco a venire"
      }'
```

Simulazione (nessuna scrittura su Nexus) — **da usare per i primi test**:

```bash
curl -X POST "https://leadsystembluedental-production.up.railway.app/api/webhook-conferma-appuntamento" \
  -H "Content-Type: application/json" \
  -d '{
        "lead_id": "6a72ed08f2a66c279728b9db",
        "risposta": "si",
        "dry_run": true
      }'
```

Con token attivo, aggiungere l'header:

```bash
  -H "x-webhook-token: <token concordato>"
```

### Risposte

| Codice | Body | Significato |
|---|---|---|
| `200` | `{"message":"Conferma registrata","leadId":"…","risposta":"SI","stato_conferma":"SI-CONFERMA","appuntamento":"2026-08-24T10:00:00+02:00"}` | tutto ok, `stato_conferma` scritto su Nexus |
| `400` | `{"message":"Risposta non riconosciuta","ricevuto":…}` | il campo risposta non è interpretabile |
| `401` | `{"message":"Token non valido"}` | solo se il token è attivo |
| `404` | `{"message":"Lead non trovata"}` | nessuna lead corrisponde a id/telefono |
| `502` | `{"message":"Conferma salvata in locale ma non inviata a Nexus"}` | risposta registrata da noi, push a Nexus fallito. **Non è un errore vostro: non serve ritentare.** |

Ogni chiamata viene tracciata da noi (payload grezzo compreso), quindi in caso di dubbio possiamo ricostruire cosa è arrivato.

---

## 3. Direzione B — LeadSystem → Qualificatore (richiesta di invio template)

Contratto consegnato l'11/08/2026 e **implementato** (`server/helpers/qualificatore.js`).

```
POST https://prequalifica-ai-workflow-production.up.railway.app/connector/webhook
Content-Type: application/json
X-API-Key: whk_…L5zY
```

```json
{
  "project_id": "a819e732-32ba-421f-aa8d-45c28de199d1",
  "name": "Mario",
  "surname": "Rossi",
  "phone": "+393331234567",
  "email": "mario.rossi@example.com",
  "source": "facebook_ad",
  "flow_id": "c4e58437-dbe3-4e11-8af0-98de2e9d6710",
  "orario_visita": "10:30",
  "data_visita": "24/08/2026",
  "lead_id": "6a72ed08f2a66c279728b9db"
}
```

| `flow_id` | Flusso | Quando lo mandiamo |
|---|---|---|
| `c4e58437-dbe3-4e11-8af0-98de2e9d6710` | 4 giorni | appuntamento fra 24h e 96h |
| `89164730-2545-4615-9d51-b0c3f47a5329` | 1 giorno | appuntamento fra 3h e 24h |

Risposta osservata: `201` con `{ "lead_id": "…", "contact_id": "…", "conversation_id": "…" }` — id **del qualificatore**, che salviamo su `Lead.appuntamento.reminder` per riconciliare le conversazioni.

**Note aperte lato qualificatore:**

- `data_visita` la mandiamo come `gg/mm/aaaa` e `orario_visita` come `hh:mm` (ora italiana). Se il template si aspetta un altro formato, ditecelo: è una riga di codice.
- `lead_id` è **il nostro** id LeadSystem: ritornandocelo nella conferma il match è certo. Il match sul solo telefono funziona, ma su numeri presenti più volte in anagrafica selezioniamo la lead più recente.
- Il connector non prevede un campo `callback_url`: la risposta del paziente va inoltrata all'endpoint della **sezione 2**, che va configurato da parte vostra.
- Chiamando due volte lo stesso numero abbiamo ricevuto lo stesso `conversation_id`: confermateci che il secondo flusso (1 giorno) parte comunque anche se la conversazione esiste già.

---

## 4. Regole operative

- **Finestre di invio:** flusso "4 giorni" fra 96h e 24h dall'appuntamento, flusso "1 giorno" fra 24h e 3h. Un appuntamento fissato o spostato con poco preavviso riceve comunque il reminder al primo giro utile, con il flusso corrispondente.
- **Nessun doppio invio dello stesso flusso** per lo stesso orario (i due flussi partono comunque entrambi). Se l'appuntamento viene **spostato**, i reminder ripartono e l'eventuale risposta data per il vecchio orario viene annullata.
- **Chi ha risposto NO** non riceve il reminder del giorno prima: ha già disdetto.
- **Disdette:** gli appuntamenti spariti dall'agenda Nexus non ricevono reminder.
- **Silenzi:** li chiude LeadSystem a `NO-CONFERMA` dopo il cutoff (24h prima dell'appuntamento, con almeno 6h di attesa dall'invio).
- `stato_conferma` è un campo dedicato su Nexus: l'aggiornamento è parziale e **non tocca `campagna`, `esito` o `lead_status`**, quindi l'attribuzione delle performance resta intatta.

---

## 5. Sequenza di collaudo proposta

1. ✅ Endpoint di invio provato sui due flussi con numero interno: `201` su entrambi, template ricevuti (12/08/2026).
2. Test end-to-end su una lead di prova: creazione → Nexus → reminder → risposta Sì/No → `stato_conferma` su Nexus.
   ```
   node server/scripts/test-reminder-e2e.js crea
   node server/scripts/test-reminder-e2e.js reminder --stage 4g
   node server/scripts/test-reminder-e2e.js conferma --risposta si
   node server/scripts/test-reminder-e2e.js stato
   ```
3. Voi girate la risposta del paziente al webhook della sezione 2 (prima con `dry_run: true`).
4. Solo dopo attiviamo le cron automatiche (`REMINDER_ENABLED=true`, `REMINDER_DRY_RUN=false`).

### Configurazione (Railway, servizio LeadSystem)

| Variabile | Valore |
|---|---|
| `REMINDER_API_KEY` | `whk_…L5zY` (**obbligatoria**: senza, l'invio è disattivato) |
| `REMINDER_ENABLED` | `true` per accendere le cron (default `false`) |
| `REMINDER_DRY_RUN` | `false` per inviare davvero (default `true`) |

URL, `project_id` e i due `flow_id` sono già i default nel codice; si sovrascrivono con `REMINDER_API_URL`, `REMINDER_PROJECT_ID`, `REMINDER_FLOW_4G`, `REMINDER_FLOW_1G`.
