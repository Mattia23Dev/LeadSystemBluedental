# Fase 3 — Recupero dei mancati arrivi

Progetto Pilota MKT Bludental · documento funzionale · 27/08/2026 · Funnel Consulting

## Obiettivo

Riportare in agenda i pazienti che non si sono presentati alla prima visita. Al paziente viene
proposta via WhatsApp una nuova data: chi risponde «SÌ» torna in coda al contact center per
essere riprogrammato.

È la fase che chiude il ciclo: la Fase 1 riduce i mancati arrivi, la Fase 3 recupera quelli che
avvengono comunque.

## Perimetro

Gli stessi centri della Fase 1.

## Come funziona

1. Ogni notte rileviamo gli appuntamenti che risultano non onorati.
2. Il giorno successivo parte il messaggio di recupero.
3. La risposta viene registrata sulla scheda del paziente:
   - **SÌ** → il paziente chiede una nuova data: torna lavorabile dal contact center;
   - **NO** → il paziente rimanda: il ciclo si chiude;
   - **nessuna risposta** → si registra il silenzio.

Non scriviamo mai sopra l'esito originario di appuntamento fissato: le due informazioni devono
convivere, altrimenti non si legge più quanti appuntamenti una campagna ha generato e quanti se
ne sono realmente svolti.

Tempi di attesa ed eventuale secondo invio sono da concordare con Bludental.

## Cosa serve da Nexus

| # | Richiesta | Perché |
|---|---|---|
| 1 | Il mancato arrivo riferito al singolo appuntamento, non al paziente | Oggi è un attributo della persona: chi ha un mancato arrivo passato e un appuntamento futuro già in agenda riceverebbe l'invito a riprenotare pur avendo già una prenotazione attiva |
| 2 | La data dell'appuntamento non onorato | Senza, non si calcola il rapporto fra appuntamenti fissati e appuntamenti svolti per campagna |
| 3 | Valorizzazione anche sullo storico | Serve la fotografia del prima per poter dire se il pilota ha funzionato |
| 4 | Un campo dedicato all'esito del recupero | I tre stati del pilota coesistono sulla stessa scheda |
| 5 | Censimento degli esiti di recupero (sì / no / silenzio) | Devono affiancare l'esito originario, non sostituirlo |
| 6 | Rientro in coda di lavorazione per chi risponde «SÌ» | Vale integralmente quanto chiesto per la Fase 2 |

I punti 1 e 2 bloccano l'invio: senza, non è possibile scrivere al paziente in sicurezza. Il
punto 3 non blocca l'invio ma blocca la lettura dei risultati: senza storico non esiste un
termine di paragone e il pilota non è valutabile.

## Cosa serve da Bludental

- Quanto attendere dopo il mancato arrivo prima di scrivere, ed eventuale secondo tentativo.
- Conferma del testo del messaggio (già fornito).

## Criteri di accettazione

1. Su un paziente che non si è presentato è possibile sapere quale appuntamento è stato
   disatteso e in quale data.
2. Chi ha un mancato arrivo passato e un appuntamento futuro attivo è distinguibile da chi non
   ha alcun appuntamento aperto, e non riceve il messaggio.
3. L'esito originario di appuntamento fissato resta leggibile accanto al mancato arrivo.
4. L'esito del recupero è visibile e filtrabile, e chi risponde «SÌ» è lavorabile dal contact
   center.

## Stato

| Componente | Stato |
|---|---|
| Definizione funzionale e testi | Chiusa |
| Mancato arrivo riferito al singolo appuntamento | Da rilasciare su Nexus, bloccante |
| Valorizzazione storica del mancato arrivo | Non soddisfatta, blocca la misurazione |
| Campo ed esiti dedicati al recupero | Da censire su Nexus, bloccante |
| Rientro in coda del contact center | Da definire con Nexus e Bludental, bloccante |
| Regole di attesa e secondo invio | Da concordare con Bludental |
| Sviluppo Funnel: invio, raccolta risposta, scrittura esito | Da avviare |

Lato nostro conserviamo già lo storico dei mancati arrivi rilevati, così il dato non va perso
quando la scheda del paziente viene aggiornata.
