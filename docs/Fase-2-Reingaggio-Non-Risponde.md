# Fase 2 — Reingaggio dei contatti non raggiungibili

Progetto Pilota MKT Bludental · documento funzionale · 27/08/2026 · Funnel Consulting

## Obiettivo

Recuperare le richieste di prima visita che il contact center non riesce a raggiungere per
telefono. Al paziente il cui esito è «Non risponde» viene inviato un messaggio WhatsApp: se
risponde «SÌ», torna in coda alle operatrici per essere richiamato e fissare l'appuntamento.

Oggi queste richieste si fermano dopo qualche tentativo telefonico a vuoto e non vengono più
lavorate.

## Perimetro

Gli stessi centri della Fase 1, quando il dato del centro è disponibile sulla scheda. Per le
richieste che non hanno ancora un centro di riferimento va concordato con Bludental un criterio
alternativo di selezione: provenienza della campagna o città dichiarata dal paziente.

## Come funziona

1. Il contact center prova a contattare il paziente e l'esito diventa «Non risponde».
2. Nexus ce lo segnala nel momento in cui accade, indicando quanti tentativi sono stati fatti e
   quando è avvenuto l'ultimo.
3. Superata la soglia concordata, parte il messaggio WhatsApp.
4. La risposta viene registrata sulla scheda del paziente:
   - **SÌ** → il paziente chiede di essere richiamato: torna lavorabile dal contact center;
   - **NO** → il paziente rimanda: il ciclo si chiude;
   - **nessuna risposta** → si registra il silenzio e non si insiste oltre.

La regola di ingaggio — dopo quanti tentativi a vuoto e dopo quanti giorni parte il messaggio,
e se sia previsto un solo invio o più di uno — la definiamo con Bludental e la applichiamo noi.
A Nexus non chiediamo di implementarla: chiediamo i dati su cui si applica e di accogliere il
risultato.

## Cosa serve da Nexus

| # | Richiesta | Perché |
|---|---|---|
| 1 | Segnalazione immediata del passaggio dell'esito a «Non risponde» | Su una lettura notturna il messaggio arriva tardi e perde efficacia |
| 2 | Numero di tentativi telefonici e data dell'ultimo tentativo | Sono i due dati su cui si applica la regola di ingaggio |
| 3 | Un campo dedicato all'esito del reingaggio | I tre stati del pilota coesistono sulla stessa scheda e non devono sovrascriversi |
| 4 | Censimento degli esiti di reingaggio (sì / no / silenzio) | Devono affiancare l'esito «Non risponde», non sostituirlo |
| 5 | Rientro in coda di lavorazione per chi risponde «SÌ» | Senza, la fase produce richieste di appuntamento che nessuno lavora |

Il punto 5 è quello che il documento originario di Bludental non copre ed è la condizione perché
la fase abbia senso: chi risponde «SÌ» ha chiesto esplicitamente di essere richiamato. Se il
rientro automatico in coda non è previsto, serve che Nexus indichi la strada più semplice per
ottenere lo stesso risultato — riapertura della scheda, attività, task o equivalente.

## Cosa serve da Bludental

- La regola di ingaggio: soglia di tentativi, giorni di attesa, uno o più invii.
- Conferma del testo del messaggio (già fornito).

## Criteri di accettazione

1. Il passaggio a «Non risponde» ci viene segnalato entro pochi minuti, con numero di tentativi
   e data dell'ultimo tentativo.
2. Il messaggio parte solo per i pazienti che soddisfano la regola concordata.
3. L'esito del reingaggio è visibile e filtrabile sulla scheda e non altera esito, stato o
   campagna.
4. Un paziente che ha risposto «SÌ» è riconoscibile a video e lavorabile dal contact center.

## Stato

| Componente | Stato |
|---|---|
| Definizione funzionale e testi | Chiusa |
| Segnalazione da Nexus e dati sui tentativi | Da rilasciare, bloccante |
| Campo ed esiti dedicati al reingaggio | Da censire su Nexus, bloccante |
| Rientro in coda del contact center | Da definire con Nexus e Bludental, bloccante |
| Regola di ingaggio | Da concordare con Bludental |
| Sviluppo Funnel: invio, raccolta risposta, scrittura esito | Da avviare |

Lo sviluppo lato nostro è contenuto, perché invio e raccolta della risposta riusano l'impianto
della Fase 1 già in esercizio. La fase è ferma sulle dipendenze, non sul nostro lavoro.
