# API Deasoft — endpoint e ambienti

Riferimento tecnico · aggiornato al 16/09/2026 · fonte: documento «WEB API DEASOFT» di Marica Ferri e mail del 15-16/09/2026

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
| `EventResult` | esiti per `id_deasoft` | entrambi dall'11/09/2026 | `deasoft-event-sync.js`, oggi ancora sul beta |
| `POST /` | **creazione appuntamento** | beta; in produzione non verificata | nessuno, ancora da collegare |
| `ListAppointments` | appuntamenti di un paziente, per `id_deasoft` | solo beta dal 15/09/2026 | nessuno, in valutazione |
| `ListAppointmentsDate` | appuntamenti di un centro fra due date | solo beta dal 15/09/2026 | nessuno, in valutazione |

L'11/09/2026 Deasoft ha portato in produzione le modifiche validate sul beta. `EventResult`
risponde in produzione con dati veri, verificato lo stesso giorno. La POST di creazione in
produzione **non è stata provata**, perché creerebbe un appuntamento vero nell'agenda di un
centro: va collaudata con un paziente e un centro di prova concordati con Deasoft.

Il sync `EventResult` legge ancora il beta finché su Railway non si imposta
`DEASOFT_EVENT_AMBIENTE=prod`; il token segue da solo l'host.

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

**`presentato` è corretto in produzione dall'11/09/2026.** Verificato quel giorno sugli
stessi pazienti letti prima della correzione:

| Gruppo | Prima | Dopo |
|---|---|---|
| 10 visite future | `true` 10/10 | `false` 10/10, `data_presentato` vuota |
| 10 fatturati | `true` | `true` 10/10, `data_presentato` = data della visita |
| 7 no show segnati da Nexus | 2 `true` | `false` 7/7 |

Prima della correzione il campo valeva `true` quasi sempre (8.172 `true` contro 913
`false`, e 1.260 visite ancora da svolgere su 1.435 già «presentate»): rispondeva di fatto
«esiste un appuntamento», non «il paziente è venuto». Il beta era già corretto dal
09/09/2026.

**`non_presentato` non basta per riconoscere un no show.** Sui 7 no show valeva `true`
solo 2 volte: il segnale utile è «visita passata e `presentato=false`». Campione piccolo
e visite di pochi giorni prima, da riguardare quando i centri avranno registrato tutto.

**I valori salvati prima dell'11/09 restano sbagliati finché non vengono riletti.** Il
sync notturno salta le visite future, quindi le lead con appuntamento ancora da svolgere
tengono il vecchio `presentato=true` (1.392 all'11/09) fino alla notte dopo la visita.
Restano sbagliate per sempre solo le lead uscite dalla finestra di 4 mesi. Nelle analisi
sulle presenze vanno escluse le letture precedenti all'11/09.

## Note operative

Una chiamata a `Result` impiega **circa 13 secondi** quando trova il dato, 2 quando non
lo trova, e l'endpoint rallenta sotto carico parallelo. Interrogare qualche migliaio di
contatti richiede ore: per questo il sync notturno usa concorrenza e cadenze di
rilettura (vedi `deasoft-nightly-sync.js`). Il beta è più lento e ogni tanto risponde 504.

L'agendazione diretta è ferma in attesa di approvazione (Marica, 09/09/2026).

## Lista appuntamenti (beta dal 15/09/2026)

I due endpoint chiesti per leggere l'agenda direttamente da Deasoft, senza passare da
Nexus. Consegnati sul beta con la mail di Marica del 15/09/2026 e provati lo stesso
giorno in sola lettura (`scripts/test-deasoft-list-appointments.js` e `...2.js`).

```
GET ?Type=ListAppointments&id_deasoft=888865
GET ?Type=ListAppointmentsDate&center_id=10&from=2026-09-01&to=2026-09-15
```

`center_id` è l'id Deasoft del centro, lo stesso di `config/centri-bludental.js`. Le date
sono `AAAA-MM-GG` e **`to` è incluso**. Entrambi rispondono in circa un secondo con
`{ "items": [...] }`; ogni item:

```json
{
  "id_appuntamento": 5796623,
  "id_paziente": 1087402,
  "id_centro": 10,
  "nome_centro": "BARI",
  "data_ora_inizio": "2026-09-01 10:30",
  "data_ora_fine": "2026-09-01 10:45",
  "stato": 2,
  "trattamenti": [{ "nome": "PRIMA VISITA" }],
  "data_creazione": "2026-07-21T08:25:04.000Z",
  "data_ultima_mod": "2026-08-31T14:36:17.000Z",
  "data_annullamento": null
}
```

Cosa si è visto:

- `ListAppointments` restituisce **tutto lo storico** del paziente, annullati compresi
  (`data_annullamento` valorizzata). Paziente inesistente → `400` con il messaggio
  `id_leadsystem non trovato nel database`, riciclato da `Result`: è un «non trovato».
- `ListAppointmentsDate` con centro inesistente o date invertite risponde `{"items":[]}`
  senza errore. **Non c'è paginazione** (confermato da Marica il 16/09): l'array contiene
  tutti gli appuntamenti dell'intervallo. Il caso più grande provato sono 68 righe.
- Le prime visite si riconoscono dal nome del trattamento (`PRIMA VISITA`).
- **Gli orari sono ora italiana** (`2026-09-01 10:30`, senza fuso esplicito; confermato il 16/09).
- `id_paziente` **è l'`id_deasoft`** che passiamo a `EventResult`.

**Legenda di `stato`** (Marica, 16/09/2026):

| codice | stato | come lo leggiamo |
|---|---|---|
| 0 | Annullato | disdetta (`data_annullamento` valorizzata) |
| 1 | Confermato | futuro, confermato dal centro |
| 2 | Non Presentato | **no show** |
| 3 | Entrato | presentato, in corso |
| 4 | In Cura | presentato |
| 5 | Uscito | presentato, visita conclusa |
| 6 | Terminato | presentato, percorso chiuso |
| 7 | Fissato | futuro, prenotato |

Quindi: **presentato = stato 3, 4, 5 o 6**; **no show = 2**; **vivo = 1 o 7**; annullato = 0.
È la prima fonte che dà il no show **per singolo appuntamento**, quello che il flag
`no_show` di Nexus (flag di paziente) non sa fare.
- **Il beta è una fotografia al 02/09/2026**: su tutti i centri provati la
  `data_creazione` e la `data_ultima_mod` più recenti sono di quel giorno. Serve a
  validare il tracciato, non a confrontare i numeri con Nexus.

**Riconciliazione con le nostre lead.** Oggi gli item portano solo `id_paziente`: niente
telefono, niente id lead, quindi la lista per centro dà i volumi veri dell'agenda ma non si
aggancia alle lead. Il 16/09/2026 Deasoft si è detta disponibile ad aggiungere **`id_lead`**
(= `id_leadsystem` = il nostro `idNexus`, vedi la mappatura in
`Allineamento-Esiti-Deasoft.md`). Con quello, in un colpo solo:
- ogni appuntamento si lega alla lead senza passare da Nexus;
- otteniamo l'`id_deasoft` del paziente (`id_paziente`) per tutte le lead, che è la
  richiesta rimasta aperta con NextUp da agosto;
- i no show diventano per appuntamento (stato 2), non più il flag di paziente.
Il telefono resta utile solo per gli appuntamenti nati senza lead (presi al banco) e come
seconda chiave quando `id_lead` manca: da chiedere se costa poco, ma `id_lead` è la priorità.
Restano aperti: data di produzione e riallineamento della base dati del beta (ferma al 02/09).

**`id_lead` sul beta, verificato il 16/09/2026** (mail di Marica, tre chiamate): su
`ListAppointmentsDate` centro 10 dal 25/08 al 05/09, **54 appuntamenti su 54** hanno `id_lead`;
48 dei 50 valori distinti corrispondono a un nostro `idNexus`, e la data/ora coincide con Nexus
in 33 casi su 43 (le differenze sono compatibili con spostamenti dopo la fotografia del 02/09).
C'è anche su `ListAppointments`. Il telefono non c'è. Da chiarire: il 100% con `id_lead` fa
pensare che la lista contenga **solo** gli appuntamenti legati a una lead, e non quelli nati
senza, cioè proprio il 30% `non trovato` di `Result`.

## `data_fissato` non è la data dell'appuntamento

Su `Result`/`EventResult` il campo `data_fissato` è il giorno in cui l'appuntamento è
stato **preso**, non quello della visita. Verificato il 15/09/2026 su 962 lead con
entrambe le date: `data_fissato` precede l'appuntamento Nexus in 921 casi, coincide in 11,
e non è mai nel futuro; combacia con il giorno in cui il nostro mirror ha visto comparire
il fissato. La data della visita va presa da Nexus (`appuntamento.dataOra`); Deasoft la
espone solo a posteriori in `data_presentato`, e solo quando `presentato` è vero.

Lo stesso giorno è stata fatta una **rilettura una tantum** (`scripts/deasoft-rilettura-post-fix.js`)
delle 2.336 lead lette prima della correzione di `presentato` dell'11/09: erano rimaste con
il vecchio `true` perché il sync salta le visite future.
