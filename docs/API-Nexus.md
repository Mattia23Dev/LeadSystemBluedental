# API Nexus — endpoint, campi e trappole

Riferimento tecnico · aggiornato al 23/09/2026 · fonte: NextUp (Robert Timofte), mail del 05/08, 21/08,
14/09 e 23/09/2026, più le verifiche fatte da noi in produzione.

Nexus è il CRM di Bludental, gestito da NextUp. Base URL unico, autenticazione con token statico
nell'header `Authorization: Bearer ...` (in `helpers/nexus.js`, da spostare in variabile d'ambiente).

```
https://bludental.hisolution.it
```

## Cosa è esposto

| Endpoint | A cosa serve | Chi lo usa |
|---|---|---|
| `POST /lead/api/list` | elenco lead con `select` / `conditions` / `limit` | `nexus-nightly-sync.js`, `nexus-agenda-sync.js` |
| `GET /lead/api/get?id=` | dettaglio di una lead | `nexus-nightly-sync.js` |
| `POST /lead/api/set` | crea (senza `id`) o aggiorna (con `id`) una lead | assegnazione, webhook punteggio, `stato_conferma` |

`list` accetta anche i parametri in **GET** sulla query string: è la forma che NextUp usa negli esempi.

### Parametri di `list`

| Parametro | Note |
|---|---|
| `select` | colonne, con alias `t` per la tabella lead: `t.id, t.nominativo, …`, oppure `t.*` |
| `conditions` | SQL sulla `WHERE`, es. `t.data_ora_appuntamento >= '2026-09-10 00:00:00'` |
| `join` | **JOIN esplicito verso altre tabelle** (vedi sotto) |
| `group` / `having` / `order` | come in SQL |
| `limit` | numero, oppure `all` per tutte le righe |

L'update con `set` è **parziale**: `{ id, stato_conferma }` non tocca gli altri campi.

## Perimetro: vediamo solo le lead Funnel

L'utenza API vede **solo le lead con `sorgente = 'Funnel'`**, cioè quelle generate da noi: 104.581 al
23/09/2026, e nemmeno una con sorgente diversa. Le lead che Bludental acquisisce da altri canali
esistono su Nexus ma per noi sono invisibili: non possiamo cercarle per telefono né leggerne
l'appuntamento. È il motivo per cui circa il 40% degli appuntamenti nell'agenda dei centri pilota non
è raggiungibile dal reminder (vedi `Lavori-in-Corso.md`).

## La tabella `contatto` e l'`id_deasoft` (23/09/2026)

Nexus tiene due tabelle distinte: **lead** (la richiesta) e **contatto** (l'anagrafica della persona).
È il contatto a portare l'`id_deasoft`, cioè l'identificativo del paziente sul gestionale. Nexus
valorizza `id_lead` sul contatto **quando l'appuntamento viene fissato tramite salvataggio Trace**.

```
GET /lead/api/list?select=t.*,contatto.id_deasoft&join=JOIN contatto on contatto.id_lead = t.id&limit=all
GET /lead/api/get?id=<id lead>&select=t.*,contatto.id_deasoft&join=JOIN contatto on contatto.id_lead = t.id
```

Sulla `get`, se non torna nulla (`false`) significa che **non c'è un contatto associato** a quella lead.

Verificato il 23/09/2026 sulle lead create da giugno: **9.617 lead hanno un contatto associato, 7.233
di queste hanno l'`id_deasoft`**. Fra le nostre lead fissate che Deasoft non trova (l'errore
`id_leadsystem non trovato`), **il 41% ha un `id_deasoft` su Nexus**: sono recuperabili senza aspettare
la pulizia dello storico lato Deasoft.

Il telefono **non** sta sulla tabella contatto: è su una tabella separata, non esposta.

## Campi dell'appuntamento

Rilasciati il 06/08/2026 e completati il 21/08/2026:

| Campo | Contenuto | Trappola |
|---|---|---|
| `data_ora_appuntamento` | ISO 8601 con fuso, ora italiana | manca sulle prenotazioni che non passano dal flusso standard: al 23/09 **2.100 lead fissate da agosto non ce l'hanno** |
| `id_centro_bludental` | id Deasoft del centro | è la chiave dell'anagrafica in `config/centri-bludental.js` |
| `centro_bludental` | denominazione | |
| `indirizzo_completo_centro_bludental` | stringa unica | non separa città e via: per i messaggi usiamo l'anagrafica nostra |
| `no_show` | `'1'` o NULL | **flag di paziente, non di appuntamento**, e si accende anche sulle disdette |
| `data_ora_mancato_appuntamento` | orario mancato | utile per capire *quale* appuntamento, ma resta il limite sopra |
| `stato_conferma` | testo libero, 255 caratteri | lo scriviamo noi: `SI-CONFERMA`, `NO-CONFERMA`, `ATTESA-RISPOSTA`, `NO-RISPOSTA-AI` |
| `sent_easycall` | `'1'` = passata al call center esterno | dal 06/08 vale per tutte le lead Funnel |
| `data_entrata` | NULL su tutte le righe | per raggruppare per giorno usare `data_creazione` |
| `data_appuntamento` | colonna storica | **non è la data dell'appuntamento**: coincide con `data_creazione` |

## Come si legano gli id

| Identificativo | Dove nasce | Dove viaggia |
|---|---|---|
| `_id` LeadSystem | noi | inviato a Nexus come `id_lead_leadsystem`; **non arriva a Deasoft** |
| `t.id` lead Nexus | Nexus | è il nostro `idNexus`, ed è l'`id_lead` che Nexus manda a Deasoft e che usiamo come `id_leadsystem` |
| `contatto.id_deasoft` | Deasoft | leggibile solo con il JOIN qui sopra; è la chiave di `?Type=EventResult` e `?Type=ListAppointments` |
| `id_centro_bludental` | Deasoft | id del centro |

Attenzione: lo stesso `id_lead` può comparire su **più contatti** (omonimi). Verificato l'11/09/2026 su
tre casi: accanto all'anagrafica giusta ne risultava una del 2022 con telefono e codice fiscale
diversi. Per disambiguare serve il telefono, che dalla tabella contatto non arriva.

## Cosa ci fa questo id: chiude il buco degli esiti

Con `id_deasoft` si interrogano gli endpoint Deasoft che non dipendono dall'`id_leadsystem`
(vedi `API-Deasoft.md`). Verificato il 23/09/2026 su lead che `?Type=Result` non trova:

- **`?Type=ListAppointments&id_deasoft=…` funziona ed è la fonte buona**: restituisce lo storico del
  paziente con lo **stato per singolo appuntamento**. Su cinque lead con visita passata segnate come
  mancate da Nexus: quattro erano **stato 0, cioè annullate**, una sola **stato 2, non presentata**.
  È la prova che il flag `no_show` di Nexus mescola disdette e no show, e che con questa lettura si
  distinguono.
- **`?Type=EventResult&id_deasoft=…` risponde ma è inaffidabile per l'appuntamento**: restituisce
  l'ultimo esito del *paziente*, con `data_ultima_modifica_esito` anche di mesi o anni prima della
  visita (vista una del 2025 su una visita di settembre 2026). Va usato per preventivato e fatturato,
  non per dire se il paziente si è presentato a *quell'* appuntamento.

## Cadenze delle nostre letture

| Job | Cosa legge | Quando |
|---|---|---|
| `nexus-nightly-sync.js` | `list` + `get` per lead, finestra 4 mesi | ogni notte alle 02:00 |
| `nexus-agenda-sync.js` | `list` filtrata su `data_ora_appuntamento`, da 7 giorni indietro in avanti | ogni ora |
| `nexus-id-deasoft-sync.js` | `list` con JOIN `contatto`, scrive `idDeasoft` sulla lead | ogni notte alle 03:30 |

Né Nexus né Deasoft ci notificano niente: i dati li andiamo a leggere noi.
