# API Deasoft — endpoint e ambienti

Riferimento tecnico · aggiornato al 09/09/2026 · fonte: documento «WEB API DEASOFT» di Marica Ferri

Deasoft espone tutto su **un solo URL per ambiente**, distinguendo l'operazione dal
parametro `Type`. L'autenticazione è Basic Auth per ottenere un token, poi `Bearer` sulle
chiamate successive.

## I due ambienti

| | Produzione | Beta |
|---|---|---|
| host | `funnel-1032112960130.europe-west1.run.app` | `funnelbeta-1032112960130.europe-west1.run.app` |
| utenza | `fun.dea` | `deasoft.funnel` |

**Le credenziali sono diverse fra i due ambienti, e i token non sono intercambiabili.**
Un token di produzione usato sul beta risponde `{"status":401,"message":"Not Authorized"}`
dentro un HTTP 200: sembra una risposta vuota, non un errore di autenticazione. È il
motivo per cui il sync degli esiti è rimasto fermo settimane senza che si capisse perché.
Nel codice questo è gestito da `helpers/deasoft.js` (`tokenUrlDi`), che chiede sempre il
token allo stesso host dell'endpoint che sta chiamando.

Le password stanno nelle variabili d'ambiente `DEASOFT_USERNAME` / `DEASOFT_PASSWORD`,
non qui.

## Cosa è esposto

| `Type` | A cosa serve | Dove | Chi lo usa |
|---|---|---|---|
| `Token` | rilascia il token (Basic Auth) | entrambi | tutti |
| `Center` | anagrafica dei centri | entrambi | flusso n8n, ramo non collegato |
| `Slot` | slot liberi per centro, trattamento e intervallo | entrambi | flussi n8n dell'agendazione |
| `Result` | esiti per `id_leadsystem` | entrambi | `deasoft-nightly-sync.js` |
| `EventResult` | esiti per `id_deasoft` | solo beta | `deasoft-event-sync.js` |
| `POST /` | **creazione appuntamento** | solo beta | nessuno, ancora da collegare |

Attenzione: `id_leadsystem` vuole l'**id Nexus**, non il nostro id Mongo. Il nome inganna.

Nel documento originale l'URL di `EventResult` ha un refuso — `funnelbeta-032112960130`,
manca una cifra. Quello giusto è `funnelbeta-1032112960130`.

## Creazione appuntamento (beta)

È il pezzo che manca all'agendazione diretta. POST sulla radice dell'host beta:

```json
{
  "center_id": "12",
  "treatment": "4130",
  "from": "2026-05-18 12:30:00",
  "to": "2026-05-18 10:15:00",
  "first_name": "Liam",
  "last_name": "Brozzi",
  "phone": "+393925740147",
  "email": "brozzimaster@gmail.com",
  "nin": "BRZLMI02S16H501Y"
}
```

Nell'esempio del documento `from` è successivo a `to`: da chiarire quale sia l'ordine
atteso. Mancano ancora modifica e annullamento, mai sviluppati.

## Esiti restituiti da `Result` ed `EventResult`

Stesso tracciato per entrambi, cambia solo la chiave. Campi verificati sulle risposte
reali il 03/09/2026:

```
presentato, non_presentato, data_presentato
preventivato, importo_preventivato, preventivo_accettato, preventivo_non_accettato
fatturato, importo_fatturato
data_fissato, rischedulato, data_rischedulato, data_ultima_modifica_esito, id_lead
```

I booleani arrivano come **stringhe** `"true"` / `"false"`, gli importi come numeri, le
date come `AAAA-MM-GG`. La normalizzazione è in `helpers/deasoft.js` (`mappaEsiti`).

## Affidabilità dei campi

**Preventivato e fatturato sono affidabili**, con gli importi coerenti. Non ci sono casi
di fatturato senza importo né di fatturato senza preventivo.

**`presentato` in produzione non è utilizzabile.** Vale `true` quasi sempre: 8.172 `true`
contro 913 `false`, e su 1.435 visite ancora da svolgere 1.260 risultavano già
presentate. `data_presentato` coincide sempre con la data dell'appuntamento, quindi il
campo risponde di fatto «esiste un appuntamento», non «il paziente è venuto».

**Sul beta è corretto.** Verificato il 09/09/2026 con un confronto diretto sugli stessi
quattordici pazienti, tutti con visita futura: produzione `presentato=true` 14 volte su
14, beta `presentato=false` 14 volte su 14, con `data_presentato` vuota. Deasoft deve
ancora portare la correzione in produzione.

Da tenere presente finché non succede: **non usare `presentato` per misurare le
presenze**. Il no show va letto dal blocco `appuntamento` alimentato da Nexus.

## Note operative

Una chiamata a `Result` impiega **circa 13 secondi** quando trova il dato, 2 quando non
lo trova, e l'endpoint rallenta sotto carico parallelo. Interrogare qualche migliaio di
contatti richiede ore: per questo il sync notturno usa concorrenza e cadenze di
rilettura (vedi `deasoft-nightly-sync.js`). Il beta è più lento e ogni tanto risponde 504.

Sono in sviluppo da parte di Deasoft due endpoint per la **lista appuntamenti** — per
contatto e per clinica con intervallo di date — che risolverebbero il problema alla
radice. L'agendazione diretta è invece ferma in attesa di approvazione (Marica, 09/09/2026).
