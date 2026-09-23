# Lavori in corso — Bludental

Registro interno · aggiornato al 16/09/2026 · una voce per filone, con stato, prossimo passo e
chi lo sblocca. Si aggiorna quando cambia qualcosa, non a calendario.

Legenda stato: **in corso** (si sta lavorando) · **bloccato** (aspetta qualcun altro) ·
**pronto** (fatto, non rilasciato) · **da fare** (deciso, non iniziato) · **aperto** (da decidere).

---

## 1. Reminder appuntamenti (Fase 1)

### 1a. Terzo esito `NO-RISPOSTA-AI` e soglia a 6 ore — **pronto, non rilasciato**

Richiesta Bludental del 16/09 via Francesca: il silenzio dopo il sollecito non deve più
finire in `NO-CONFERMA` (indistinguibile dal rifiuto) ma in un esito dedicato, e la soglia
scende da 12 a 6 ore.

- Branch **`reminder-no-risposta-ai`** (commit `1e454d6`): nuovo valore
  `REMINDER_STATO_SILENZIO` (default `NO-RISPOSTA-AI`, coi trattini come gli altri tre),
  `REMINDER_ATTESA_SOLLECITO_ORE` default 6, doc Fase 1 e API reminder aggiornati.
- **Da chiudere con Bludental prima del merge:**
  1. il nome esatto dell'esito (hanno scritto "NO RISPOSTA AI" con gli spazi);
  2. il testo del sollecito promette *"entro la giornata odierna"*: con 6 ore la chiusura
     scatta alle 14:35 dello stesso giorno (invio 08:05). O si cambia il testo, o si tiene la
     promessa;
  3. cosa deve farne il contact center: richiamare? cancellare? Senza una regola è una riga
     in più che nessuno lavora.
- Numeri di riferimento dal 01/09: 78 `NO-CONFERMA` scritti da noi, di cui 48 per risposta
  NO e 30 per silenzio. 64 su 82 `NO-CONFERMA` sono poi diventati `annullato deasoft`: la sede
  agisce sull'esito.

### 1b. NO-CONFERMA manuale del contact center — **chiuso, nessuna azione**

Verificato il 16/09: il reminder **non legge** `stato_conferma` da Nexus per decidere gli
invii, guarda solo la risposta WhatsApp. I 5 casi con NO-CONFERMA messo a mano su lead in
ATTESA-RISPOSTA erano tutti `annullato deasoft`: l'operatrice ha cancellato l'appuntamento
dopo la telefonata, e a un appuntamento annullato il sollecito non si manda. Comportamento
corretto. Script: `diag-attesa-noconferma-manuale.js`, `...2.js`.

### 1c. Rientro nel flusso dopo correzione manuale — **da fare**

Se l'operatrice corregge `stato_conferma` a video (NO → SI dopo telefonata, o SI → NO), oggi
lo vediamo nel mirror (`appuntamento.statoConfermaNexus`) ma il reminder non lo usa: il
paziente riconfermato al telefono non riceve il −1 giorno. Nexus ha consegnato origine
distinguibile e campo editabile (27/08): è sviluppo nostro. Dipende da come si chiude 1a
(quattro valori invece di tre).

### 1d. Agenda letta da Deasoft invece che da Nexus — **bloccato (Deasoft)**

Spec completa in `docs/Spec-Reminder-Agenda-da-Deasoft.md`. Aspetta `id_lead` negli item,
produzione, riallineamento beta. Marica ha detto sì a `id_lead` il 16/09.

---

## 2. Esiti Deasoft

### 2a. Rilettura dei `presentato` sbagliati — **in corso**

Deasoft ha corretto `presentato` in produzione l'11/09; le lead lette prima tenevano
`true` anche su visite future, e il sync notturno non le rilegge perché salta i futuri.
Rilettura una tantum con `deasoft-rilettura-post-fix.js`: al 16/09 mattina **1.300 rilette,
612 `presentato` fantasma tolti**, restano ~413 più 99 finite in errore transitorio (503
Deasoft) da ripescare con `--ritenta`. Deasoft prod ha risposto 503 sotto il nostro carico:
concorrenza abbassata da 8 a 4.

**Da decidere dopo:** il sync notturno ritenta i KO solo dopo 7 giorni
(`DEASOFT_SYNC_KO_GIORNI`), giusto per "non trovato" ma sbagliato per 503/ECONNRESET.
Separare i due casi (transitorio = riprova domani).

### 2b. `data_fissato` non è la data della visita — **chiuso, documentato**

È la data di prenotazione. Verificato su 962 lead. La dashboard non la usa più (16/09).

### 2c. `EventResult` ancora sul beta — **da fare, una variabile**

`DEASOFT_EVENT_AMBIENTE=prod` su Railway. In produzione risponde dall'11/09. Riguarda solo le
lead `agendata: true` dell'agendazione diretta, oggi zero: nessuna urgenza.

### 2d. Lead non trovate da Deasoft — **aperto**

Sulle fissate degli ultimi 90 giorni: 2.781 su 9.377 interrogate (30%) rispondono
`id_leadsystem non trovato`. **Il 30% è strutturale, non storico** (verificato il 16/09): sulle
fissate entrate dal 09/09 è 200 su 651, agosto 952 su 3.175, stessa quota. La frase "sceso al
3% dopo il fix EasyCall" scritta il 16/09 era sbagliata. Tre fatti:

- un `non trovato` **non diventa mai trovato** a una lettura successiva (0 su 8.406 lead con
  almeno due letture): non è un ritardo di Deasoft, l'appuntamento non è agganciato al nostro id;
- ma l'appuntamento su Deasoft **esiste**: fra gli appuntamenti passati riletti da Deasoft
  *dopo* la visita, 402 su 2.100 (19%) restano `non trovato`, e 236 di questi hanno su Nexus
  data visita, centro e mancato appuntamento (dati che arrivano dall'agenda). Deasoft ha
  l'appuntamento e non sa che è nostro. (I 44 `annullato/confermato deasoft` non trovati non
  valgono come prova: letti prima dell'esito, poi saltati dal sync perché futuri);
- senza centro/data su Nexus il non trovato è al 49%, con centro al 20%: si concentra sulle
  prenotazioni che non passano dal flusso standard (EasyCall, sede).

Conseguenza per 1d: `id_lead` nelle liste appuntamenti **non basta** per queste, perché sul
record Deasoft l'id non c'è. Serve il **telefono** negli item: non "se costa poco", è la
condizione per agganciare il 30%. Da dire a Marica così.

---

## 3. Dashboard (Lovable, dati di Francesca)

### 3a. Regole KPI appuntamenti — **fatto il 16/09**

Lovable ha applicato le regole: fissato = `appuntamento.fissato`, data visita solo da Nexus,
presentati/no show solo sui passati, copertura Deasoft come funnel e non come confronto.
Numeri verificati identici ai nostri sugli ultimi 90 giorni (9.854 fissati vs 9.935 nostri,
differenza di orario di lettura). Script: `diag-verifica-lovable-90gg.js`.

### 3b. Il "1.444" di Francesca — **aperto (Francesca)**

Sulla finestra 22/08–15/09 noi contiamo 2.539 fissate Nexus, lei 1.444. Non è un nostro
filtro: va chiesto a lei da dove esce (utente? export parziale? centri pilota?).

### 3c. Il no show al 58% — **da spiegare al cliente**

Sui 2.173 appuntamenti passati con data nota degli ultimi 90 giorni, 1.257 hanno il flag no
show di Nexus (58%; 62% nella prima metà di settembre). Deasoft concorda (952 `presentato=
false` contro 25 contraddizioni). **Ma il flag Nexus include le disdette**: quando
l'operatrice annulla su Deasoft, `data_ora_mancato_appuntamento` si valorizza lo stesso. Il
no show "vero" (paziente che non si presenta senza avvisare) si distingue solo con lo `stato`
Deasoft per appuntamento (0 annullato vs 2 non presentato), cioè con 1d. Finché non c'è, in
dashboard va etichettato "mancati o annullati", non "no show". Nel pilota: 495 passati, 302
mancati; fra i 23 `SI-CONFERMA` solo 7 mancati (30% contro 61%), campione piccolo.

---

## 4. Agendazione diretta su Deasoft — **bloccato (Deasoft)**

Agenti voce e WhatsApp pronti; flussi n8n arrivano agli slot e si fermano: **manca la
creazione dell'appuntamento** (`POST /` esiste sul beta, mai provato in produzione perché
creerebbe un appuntamento vero). Ferma in attesa di approvazione Deasoft (Marica, 09/09).
Doc cliente `docs/Agendazione-Diretta-Deasoft.md`, flussi `docs/Flussi-n8n-Agendazione.md`.
Quando riparte: collaudo con paziente e centro di prova concordati, poi bivio "Patient
Journey" in `calculateAndAssignLeadsEveryDayMetaWeb`.

---

## 5. Fase 2 (reingaggio Non Risponde) e Fase 3 (recupero No Show) — **da fare**

Specifica v2.0 consegnata (`Specifica-Funzionale-LeadSystem-Nexus-v2.0.html`), doc cliente
`Fase-2-...md` e `Fase-3-...md`. Nexus non ha ancora consegnato: webhook
`esito_non_risponde` con `numero_tentativi`/`data_ultimo_tentativo`, campi
`stato_reingaggio`/`stato_recupero`, esiti `WA-NR-*`/`WA-NOSHOW-*`, opt-out. Per la Fase 3 il
no show per appuntamento arriverebbe prima da Deasoft (1d) che da Nexus: da valutare se
partire da lì.

---

## 6. Debito noto

- **Doppioni chatbot Messenger**: `syncMessengerLeadToNexus` (`serverCP/controllers/chatbot.js`)
  non passa l'`id` e ricrea la lead su Nexus invece di aggiornarla: 630 doppioni storici,
  zero dal 01/09 ma la funzione è ancora così. Fix piccolo, da fare.
- **Finestra 2 mesi del sync notturno Nexus** (`setMonth(-2)` hardcoded): fuori finestra
  `nexus_lead.*` si congela. I KPI devono leggere `appuntamento.*` (append-only), non
  `nexus_lead.*`. Già così in dashboard, da ricordare per ogni nuova lettura.
- ~~**Richiesta a NextUp: `id_deasoft` sulla lead**~~ — **chiusa il 23/09/2026.** Robert ha
  indicato come leggerlo: sta sulla tabella `contatto`, si ottiene con un JOIN su
  `/lead/api/list` (vedi `docs/API-Nexus.md`). Job `nexus-id-deasoft-sync.js`, ogni notte alle
  03:30: al primo giro ha scritto **7.495 id**. Copre il **30% delle fissate che Deasoft non
  trova** (1.500 su 5.032), che ora si possono interrogare per paziente invece che per lead.

---

## Prossimi passi, in ordine

1. Finire la rilettura Deasoft (2a) e riportare il totale.
2. Rispondere a Marica: sì a `id_lead`, **telefono obbligatorio** (vedi 2d: senza, il 30% resta fuori), date di produzione e beta.
3. Far decidere a Bludental i tre punti di 1a, poi merge e deploy (due variabili).
4. Chiedere a Francesca l'origine del 1.444 (3b) e far rietichettare il no show (3c).
5. Appena `id_lead` è sul beta riallineato: misura di copertura (1d, prerequisito 3), poi
   Fase A della spec.
