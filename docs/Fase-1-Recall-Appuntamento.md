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
| −4 giorni | Promemoria con richiesta di conferma | Tutti gli appuntamenti del perimetro | SI → `SI-CONFERMA` · NO → `NO-CONFERMA` · nessuna risposta entro 12 ore → `ATTESA-RISPOSTA` |
| −2 giorni | Sollecito di conferma | Solo chi non ha risposto al primo | SI → `SI-CONFERMA` · NO → `NO-CONFERMA` · nessuna risposta entro 12 ore → `NO-CONFERMA` |
| −1 giorno | Promemoria finale, senza richiesta di conferma | Solo chi ha confermato | Nulla, la conferma è già scritta |

Regole del ciclo:

- chi non risponde al primo messaggio viene segnalato come `ATTESA-RISPOSTA` dopo 12 ore. Non
  è una chiusura: serve al contact center per richiamarlo mentre il sollecito è ancora davanti,
  e la lead resta nel ciclo;
- chi conferma al primo messaggio salta il sollecito e riceve solo il promemoria finale;
- chi disdice esce dal ciclo: non riceve altro;
- chi resta in silenzio anche dopo il sollecito viene chiuso a `NO-CONFERMA`. Non chiediamo a
  Nexus di annullare nulla: la cancellazione dello slot la decide l'operatrice sull'evidenza
  di quel valore;
- se l'appuntamento viene spostato, anche su un altro centro, il ciclo riparte sul nuovo orario
  e le risposte raccolte per il vecchio orario decadono;
- se l'appuntamento sparisce dall'agenda, il ciclo si interrompe.

In tutta la Fase 1 scriviamo su Nexus tre valori — `SI-CONFERMA`, `NO-CONFERMA` e
`ATTESA-RISPOSTA`, quest'ultimo aggiunto su richiesta di Bludental il 27/08/2026 — sempre sul
campo già esistente. Nessun campo nuovo, nessuna nuova chiamata: la logica dei tre messaggi
resta interamente lato nostro.

## Cosa serve da Nexus

| # | Richiesta | Stato al 27/08/2026 |
|---|---|---|
| 1 | Data e ora dell'appuntamento sulle lead | Consegnato e in uso |
| 2 | Centro dell'appuntamento (codice + denominazione) | Consegnato e in uso |
| 3 | Aggiornamento di data, ora e centro in caso di spostamento | Consegnato, verificato sugli spostamenti |
| 4 | `SI-CONFERMA` / `NO-CONFERMA` visibili e filtrabili nell'agenda del centro | Consegnato e in uso |
| 5 | Stato di conferma modificabile a video dall'operatrice, con la modifica rileggibile e l'origine distinguibile nello storico | Consegnato e in uso |
| 6 | Terzo valore `ATTESA-RISPOSTA` riconoscibile e filtrabile in agenda come gli altri due | Da confermare |
| 7 | Campo di opt-out WhatsApp | Da concordare |

Il punto 5 è quello che tiene il ciclo aperto nei due sensi: un paziente a `NO-CONFERMA` che
conferma al telefono rientra nel flusso e riceve il promemoria finale, e chi disdice per
telefono dopo aver confermato ne esce. Ora che il campo è modificabile e la modifica è
leggibile, il rientro nel flusso è sviluppo nostro. L'origine della modifica serve a misurare
il pilota: senza, le conferme telefoniche si sommano a quelle automatiche e il contributo del
recall non è più leggibile.

Il punto 6 nasce dalla richiesta del 27/08: perché il contact center possa lavorare i pazienti
in attesa, il terzo valore deve essere riconoscibile e filtrabile in agenda esattamente come gli
altri due.

## Cosa serve da Bludental

- **La presa in carico dei pazienti in `ATTESA-RISPOSTA`:** chi li richiama e in quale finestra.
  Fra la segnalazione e il sollecito automatico passa una giornata piena, ed è lì che il recall
  telefonico può fare la differenza.
- **Cosa fa l'operatrice quando raccoglie la conferma al telefono:** correggere `stato_conferma`
  a video è ciò che evita al paziente il nostro sollecito su un appuntamento già confermato.

## Criteri di accettazione

1. Un appuntamento fissato in uno dei centri pilota riceve il primo messaggio a −4 giorni con
   data, ora, città e indirizzo corretti.
2. La risposta del paziente compare sulla scheda entro pochi minuti, senza alterare campagna,
   esito o stato della lead.
3. Chi conferma non riceve il sollecito; chi disdice non riceve altro; chi tace viene chiuso a
   `NO-CONFERMA` dopo il sollecito.
4. Uno spostamento di data, ora o centro fa ripartire il ciclo sui dati nuovi.
5. Un paziente che non risponde entro 12 ore è riconoscibile e filtrabile in agenda come
   `ATTESA-RISPOSTA`, e il ciclo prosegue comunque con il sollecito.

## Stato

| Componente | Stato |
|---|---|
| Lettura dell'agenda Nexus, aggiornata ogni ora | Attiva |
| Ciclo a tre messaggi con concatenamento delle risposte | Attivo, in collaudo |
| Scrittura dell'esito di conferma su Nexus | Attiva e verificata |
| Città e indirizzo nel messaggio | Attivi, presi dall'anagrafica centri |
| Chiusura a `NO-CONFERMA` dopo 12 ore di silenzio | Attiva |
| Segnalazione `ATTESA-RISPOSTA` dopo 12 ore dal primo promemoria | Attiva dal 27/08/2026 |
| Collaudo su cinque utenze interne, con blocco verso i pazienti veri | In corso dal 24/08/2026 |
| Rientro nel flusso dopo correzione manuale dell'operatrice | Da sviluppare: la dipendenza da Nexus è caduta |
| Apertura ai pazienti reali dei 16 centri | Da autorizzare a collaudo concluso |

## Punti aperti

- **Appuntamenti presi tramite EasyCall: risolto.** Le prenotazioni delle operatrici esterne
  creavano su Nexus un contatto nuovo invece di agganciarsi alla scheda esistente, quindi
  l'appuntamento restava invisibile al recall. Corretto il 7-8 settembre 2026 da NextUp ed
  EasyCall, con recupero dello storico di agosto: gli appuntamenti visibili nei centri pilota
  sono passati da 951 a 1.841, e la copertura della data sulle prenotazioni EasyCall dal 5% al
  65%, in linea con gli altri canali.
