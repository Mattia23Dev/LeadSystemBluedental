# Integrazione Qualificatore ↔ LeadSystem — Reminder appuntamento e conferma

| | |
|---|---|
| **Versione** | 2.0 — 24 agosto 2026 |
| **Ambiente** | Produzione (`https://leadsystembluedental-production.up.railway.app`) |
| **Stato** | Endpoint di conferma **live e testato**. Invio reminder integrato sul connector del qualificatore, aggiornato al contratto del 24/08/2026: tre flussi, variabili dentro `dynamicVariables`, chiave webhook ruotata. |

## 1. Il flusso in due righe

1. LeadSystem conosce gli appuntamenti fissati (mirror dell'agenda Nexus, aggiornato ogni ora) e chiede al qualificatore di mandare al paziente il template giusto per il momento. I messaggi sono **tre** e non hanno lo stesso destinatario: il primo a ~4 giorni va a tutti, il sollecito a ~2 giorni solo a chi non ha risposto, il promemoria finale a ~1 giorno **solo a chi ha confermato**.
2. Il qualificatore raccoglie la risposta e la rimanda a LeadSystem, che la scrive su Nexus nel campo `stato_conferma` (`SI-CONFERMA` / `NO-CONFERMA`).
3. Il silenzio **dopo il sollecito** diventa `NO-RISPOSTA-AI` in automatico dopo 6 ore (fino al 16/09/2026: `NO-CONFERMA` dopo 12), come promette il testo del sollecito stesso: **non serve che il qualificatore mandi nulla per i silenzi**. Il silenzio dopo il solo primo messaggio non produce invece alcuna scrittura.

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

Contratto consegnato l'11/08/2026, aggiornato il 24/08/2026 e **implementato** (`server/helpers/qualificatore.js`).

> **Cos'è cambiato il 24/08/2026** — le variabili del template non stanno più in cima al payload ma dentro `dynamicVariables`; città e indirizzo si chiamano ora `citta_visita` e `indirizzo_visita` (prima `citta_centro` / `indirizzo_centro`) e il nome del centro non serve più; si aggiunge il terzo flusso (sollecito a 2 giorni); la chiave webhook è stata ruotata.

```
POST https://prequalifica-ai-workflow-production.up.railway.app/connector/webhook
Content-Type: application/json
X-API-Key: whk_…5YUM
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
  "dynamicVariables": {
    "orario_visita": "10:30",
    "data_visita": "29/08/2026",
    "lead_id": "6a72ed08f2a66c279728b9db",
    "citta_visita": "BOLOGNA",
    "indirizzo_visita": "VIA EMILIA PONENTE 100"
  }
}
```

| `flow_id` | Flusso | Finestra | A chi va |
|---|---|---|---|
| `c4e58437-dbe3-4e11-8af0-98de2e9d6710` | 4 giorni — primo promemoria | fra 48h e 96h | a tutti |
| `cade2965-4ad2-4de1-9114-ede44223b786` | 2 giorni — sollecito | fra 24h e 48h | solo a chi non ha risposto |
| `89164730-2545-4615-9d51-b0c3f47a5329` | 1 giorno — promemoria finale | fra 3h e 24h | solo a chi ha confermato |

`citta_visita` e `indirizzo_visita` vengono dalla nostra anagrafica dei centri, non dalla stringa concatenata di Nexus: i testi Bludental li usano separati ("presso BluDental a \[Città\] in \[Indirizzo\]").

Risposta osservata: `201` con `{ "lead_id": "…", "contact_id": "…", "conversation_id": "…" }` — id **del qualificatore**, che salviamo su `Lead.appuntamento.reminder` per riconciliare le conversazioni.

**Note aperte lato qualificatore:**

- `data_visita` la mandiamo come `gg/mm/aaaa` e `orario_visita` come `hh:mm` (ora italiana). Se il template si aspetta un altro formato, ditecelo: è una riga di codice.
- `lead_id` è **il nostro** id LeadSystem: ritornandocelo nella conferma il match è certo. Il match sul solo telefono funziona, ma su numeri presenti più volte in anagrafica selezioniamo la lead più recente.
- Il connector non prevede un campo `callback_url`: la risposta del paziente va inoltrata all'endpoint della **sezione 2**, che va configurato da parte vostra.
- Chiamando due volte lo stesso numero abbiamo ricevuto lo stesso `conversation_id`: confermateci che i flussi successivi al primo partono comunque anche se la conversazione esiste già.

---

## 4. Regole operative

- **Chi riceve cosa:** primo promemoria a tutti; sollecito solo a chi non ha ancora risposto; promemoria finale solo a chi ha confermato, al primo o al secondo messaggio. Chi risponde **NO** esce dal ciclo e non riceve altro.
- **Finestre di invio:** 4 giorni fra 96h e 48h, 2 giorni fra 48h e 24h, 1 giorno fra 24h e 3h. Un appuntamento fissato o spostato con poco preavviso si aggancia al primo giro utile, ma il primo messaggio che riceve è sempre quello a "4 giorni": il sollecito dice *"non abbiamo ancora ricevuto conferma"* e a chi non ha mai ricevuto nulla direbbe una cosa falsa.
- **Nessun doppio invio dello stesso flusso** per lo stesso orario. Se l'appuntamento viene **spostato**, il ciclo riparte da capo e l'eventuale risposta data per il vecchio orario viene annullata.
- **Disdette:** gli appuntamenti spariti dall'agenda Nexus non ricevono reminder.
- **Silenzi:** LeadSystem scrive `NO-RISPOSTA-AI` dopo 6 ore di silenzio dal sollecito, e solo quando la finestra del sollecito è chiusa — così chi ha ricevuto il primo messaggio a −4 giorni non viene chiuso mentre ha ancora il sollecito davanti.
- `stato_conferma` è un campo dedicato su Nexus: l'aggiornamento è parziale e **non tocca `campagna`, `esito` o `lead_status`**, quindi l'attribuzione delle performance resta intatta.

---

## 5. Sequenza di collaudo proposta

1. ✅ Endpoint di invio provato sui flussi 4 giorni e 1 giorno con numero interno: `201` su entrambi, template ricevuti (12/08/2026). Da rifare sul contratto nuovo, sollecito compreso: `node server/scripts/test-reminder-connector.js --stage all --live`
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
| `REMINDER_API_KEY` | la chiave webhook aggiornata il 24/08/2026 (**obbligatoria**: senza, l'invio è disattivato; la precedente non funziona più) |
| `REMINDER_ENABLED` | `true` per accendere le cron (default `false`) |
| `REMINDER_DRY_RUN` | `false` per inviare davvero (default `true`) |
| `REMINDER_WHITELIST_ATTIVA` | **da non impostare** durante il collaudo: assente significa attiva, e la whitelist limita gli invii ai soli numeri del gruppo di test (`server/config/test-whitelist.js`). Metterla a `false` apre l'invio ai pazienti veri. |

URL, `project_id` e i tre `flow_id` sono già i default nel codice; si sovrascrivono con `REMINDER_API_URL`, `REMINDER_PROJECT_ID`, `REMINDER_FLOW_4G`, `REMINDER_FLOW_2G`, `REMINDER_FLOW_1G`. Le soglie delle finestre stanno in `REMINDER_STAGE_4G_ORE`, `REMINDER_STAGE_2G_ORE`, `REMINDER_STAGE_1G_ORE` e `REMINDER_ATTESA_SOLLECITO_ORE`.
