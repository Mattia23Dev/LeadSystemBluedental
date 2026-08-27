# Fase 1 — Recall appuntamento

Progetto Pilota MKT Bludental · documento funzionale · 27/08/2026 · Funnel Consulting

## Obiettivo

Ridurre i mancati arrivi alla prima visita. Il paziente riceve su WhatsApp il promemoria del
proprio appuntamento con data, ora, centro e indirizzo, e può confermare o disdire rispondendo
al messaggio. La risposta torna sulla scheda del paziente, così che il centro sappia in anticipo
su chi contare e possa liberare gli slot che non verranno onorati.

## Perimetro

16 centri: i 15 del progetto pilota — Pomezia, Bari, Pordenone, Latina, Brianza, Casilina, Rho,
Lodi, Bologna, Mestre, Perugia, Forlì, Mantova, Vicenza, Abbiategrasso — più Bologna Emilia
Ponente. Gli appuntamenti degli altri centri della rete non ricevono nulla.

## Come funziona

| Quando | Messaggio | A chi | Esito scritto sulla scheda |
|---|---|---|---|
| −4 giorni | Promemoria con richiesta di conferma | Tutti gli appuntamenti del perimetro | SI → `SI-CONFERMA` · NO → `NO-CONFERMA` · nessuna risposta → nulla |
| −2 giorni | Sollecito di conferma | Solo chi non ha risposto al primo | SI → `SI-CONFERMA` · NO → `NO-CONFERMA` · nessuna risposta entro 12 ore → `NO-CONFERMA` |
| −1 giorno | Promemoria finale, senza richiesta di conferma | Solo chi ha confermato | Nulla, la conferma è già scritta |

Regole del ciclo:

- chi conferma al primo messaggio salta il sollecito e riceve solo il promemoria finale;
- chi disdice esce dal ciclo: non riceve altro;
- chi resta in silenzio anche dopo il sollecito viene chiuso a `NO-CONFERMA`. Non chiediamo a
  Nexus di annullare nulla: la cancellazione dello slot la decide l'operatrice sull'evidenza
  di quel valore;
- se l'appuntamento viene spostato, anche su un altro centro, il ciclo riparte sul nuovo orario
  e le risposte raccolte per il vecchio orario decadono;
- se l'appuntamento sparisce dall'agenda, il ciclo si interrompe.

In tutta la Fase 1 scriviamo su Nexus due soli valori, `SI-CONFERMA` e `NO-CONFERMA`, sul campo
già esistente. Nessun esito nuovo, nessun campo nuovo, nessuna nuova chiamata.

## Cosa serve da Nexus

| # | Richiesta | Stato al 27/08/2026 |
|---|---|---|
| 1 | Data e ora dell'appuntamento sulle lead | Consegnato e in uso |
| 2 | Centro dell'appuntamento (codice + denominazione) | Consegnato e in uso |
| 3 | Aggiornamento di data, ora e centro in caso di spostamento | Consegnato, verificato sugli spostamenti |
| 4 | `SI-CONFERMA` / `NO-CONFERMA` visibili e filtrabili nell'agenda del centro | Consegnato e in uso |
| 5 | Stato di conferma modificabile a video dall'operatrice, con la modifica rileggibile e l'origine distinguibile nello storico | Consegnato e in uso |
| 6 | Campo di opt-out WhatsApp | Da concordare |

Il punto 5 serve perché il ciclo non è a senso unico: un paziente a `NO-CONFERMA` che conferma
al telefono deve poter rientrare nel flusso e ricevere il promemoria finale, e chi disdice per
telefono dopo aver confermato deve poterne uscire. L'origine della modifica serve a misurare il
pilota: senza, le conferme telefoniche si sommano a quelle automatiche e il contributo del
recall non è più leggibile.

## Cosa serve da Bludental

- Conferma dei testi e delle variabili dei tre messaggi (già forniti e recepiti).
- Decisione su come il centro lavora l'evidenza di `NO-CONFERMA`: è l'unico segnale che riceve.
- Coordinamento con il fornitore della messaggistica per i template WhatsApp (in carico a noi).

## Criteri di accettazione

1. Un appuntamento fissato in uno dei centri pilota riceve il primo messaggio a −4 giorni con
   data, ora, città e indirizzo corretti.
2. La risposta del paziente compare sulla scheda entro pochi minuti, senza alterare campagna,
   esito o stato della lead.
3. Chi conferma non riceve il sollecito; chi disdice non riceve altro; chi tace viene chiuso a
   `NO-CONFERMA` dopo il sollecito.
4. Uno spostamento di data, ora o centro fa ripartire il ciclo sui dati nuovi.

## Stato

| Componente | Stato |
|---|---|
| Lettura dell'agenda Nexus, aggiornata ogni ora | Attiva |
| Ciclo a tre messaggi con concatenamento delle risposte | Attivo, in collaudo |
| Scrittura dell'esito di conferma su Nexus | Attiva e verificata |
| Città e indirizzo nel messaggio | Attivi, presi dall'anagrafica centri |
| Chiusura a `NO-CONFERMA` dopo 12 ore di silenzio | Attiva, non ancora osservata su un caso reale |
| Segnalazione `ATTESA-RISPOSTA` dopo 12 ore dal primo promemoria | Attiva dal 27/08/2026 |
| Collaudo su cinque utenze interne, con blocco verso i pazienti veri | In corso dal 24/08/2026 |
| Rientro nel flusso dopo correzione manuale dell'operatrice | Da sviluppare: la dipendenza da Nexus è caduta |
| Apertura ai pazienti reali dei 16 centri | Da autorizzare a collaudo concluso |

## Punti aperti

- **Sovrapposizione con l'SMS del gestionale.** Bludental invia già un proprio SMS di promemoria
  per lo stesso appuntamento. Il paziente riceverebbe due messaggi dalla stessa insegna, uno dei
  quali chiede conferma e l'altro no. Da decidere prima di aprire ai pazienti reali.
- **Appuntamenti presi direttamente a gestionale.** Rilevato il 27/08/2026 in collaudo: un
  appuntamento fissato sul gestionale che non risale sulla scheda del paziente è invisibile al
  recall, che quindi non parte. Da verificare quanto sia diffuso.
