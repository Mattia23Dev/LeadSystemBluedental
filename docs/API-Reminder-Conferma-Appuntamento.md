# Integrazione Qualificatore ↔ LeadSystem — Reminder appuntamento e conferma

| | |
|---|---|
| **Versione** | 1.0 — 10 agosto 2026 |
| **Ambiente** | Produzione (`https://leadsystembluedental-production.up.railway.app`) |
| **Stato** | Endpoint di conferma **live e testato**. Invio reminder in attesa del contratto lato qualificatore. |

## 1. Il flusso in due righe

1. LeadSystem conosce gli appuntamenti fissati (mirror dell'agenda Nexus, aggiornato ogni ora) e, **entro 72 ore** dall'appuntamento, chiede al qualificatore di inviare al paziente il template WhatsApp *"Ci sarai?" → Sì / No*.
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

Questa parte è **in attesa del vostro contratto**. Ci servono quattro cose:

1. **URL** dell'endpoint a cui inviare la richiesta di invio del template;
2. **Autenticazione** (chiave e nome dell'header, se diverso da `Authorization: Bearer`);
3. **Nome/ID del template WhatsApp** approvato;
4. **Variabili attese dal template**, con l'ordine.

Il payload che siamo pronti a mandare (adattabile se i vostri nomi differiscono):

```json
{
  "template": "reminder_appuntamento",
  "callback_url": "https://leadsystembluedental-production.up.railway.app/api/webhook-conferma-appuntamento",
  "lead_id": "6a72ed08f2a66c279728b9db",
  "id_nexus": "123456",
  "nome": "Mario Rossi",
  "user_phone": "+393492455024",
  "telefono_raw": "3492455024",
  "data_ora_appuntamento": "2026-08-24T10:00:00+02:00",
  "data_appuntamento": "24/08/2026",
  "ora_appuntamento": "10:00",
  "giorno_appuntamento": "lunedi",
  "appuntamento_esteso": "lunedi 24 agosto alle 10:00",
  "centro": "Bludental Brescia",
  "citta": "Brescia"
}
```

**Nota importante:** vi passiamo `lead_id`; ritornandocelo nella conferma il match è certo. Il match sul solo telefono funziona, ma su numeri presenti più volte in anagrafica selezioniamo la lead più recente.

---

## 4. Regole operative

- **Finestra di invio:** entro 72 ore dall'appuntamento e non oltre le 3 ore prima. Un appuntamento fissato o spostato con poco preavviso riceve comunque il reminder al primo giro utile.
- **Nessun doppio invio** per lo stesso orario. Se l'appuntamento viene **spostato**, il reminder riparte e l'eventuale risposta data per il vecchio orario viene annullata.
- **Disdette:** gli appuntamenti spariti dall'agenda Nexus non ricevono reminder.
- **Silenzi:** li chiude LeadSystem a `NO-CONFERMA` dopo il cutoff (24h prima dell'appuntamento, con almeno 6h di attesa dall'invio).
- `stato_conferma` è un campo dedicato su Nexus: l'aggiornamento è parziale e **non tocca `campagna`, `esito` o `lead_status`**, quindi l'attribuzione delle performance resta intatta.

---

## 5. Sequenza di collaudo proposta

1. Voi chiamate il webhook con `dry_run: true` su una lead di prova → verifichiamo insieme match e valore calcolato.
2. Una conferma reale su una singola lead di test → verifichiamo la scrittura su Nexus.
3. Ci passate URL, chiave e template: configuriamo l'invio e mandiamo i primi reminder **a mano**, su numeri interni.
4. Solo dopo attiviamo le cron automatiche.
