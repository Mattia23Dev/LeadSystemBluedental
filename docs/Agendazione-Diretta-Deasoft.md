# Agendazione diretta su Deasoft

Assistente vocale e WhatsApp · documento funzionale · 27/08/2026 · Funnel Consulting

## Obiettivo

Portare il paziente dalla richiesta all'appuntamento fissato in agenda **senza passare dal
contact center**. La richiesta viene presa in carico da un assistente automatico, per telefono e
su WhatsApp, che propone il centro e gli orari disponibili e conclude la prenotazione
direttamente su Deasoft.

Il beneficio è duplice: il paziente viene contattato in pochi minuti anziché in ore o giorni, e
le operatrici restano libere per le richieste che hanno davvero bisogno di una persona.

Questo documento si ferma alla prenotazione e alle sue modifiche. La lettura degli esiti dopo la
visita è un tavolo separato (vedi *Allineamento esiti post-visita da Deasoft*).

## Perimetro

Le richieste provenienti da **campagne dedicate**, riconoscibili dal nome della campagna. Tutte
le altre continuano a seguire il percorso attuale, invariato: nessun paziente cambia flusso per
effetto di questo progetto se non attraverso la campagna da cui arriva.

Da concordare con Bludental: quali centri aprire all'agendazione automatica e con quale
progressione.

## Come funziona

1. **Ingresso.** La richiesta arriva da una campagna dedicata e viene indirizzata all'assistente
   di agendazione anziché al normale percorso di qualifica.
2. **Contatto.** L'assistente chiama il paziente; se non risponde o preferisce, la conversazione
   prosegue su WhatsApp, secondo i tentativi e le fasce orarie già impostati negli agenti.
3. **Scelta.** Vengono proposti il centro e gli orari effettivamente disponibili in agenda.
4. **Prenotazione.** L'appuntamento viene creato su Deasoft. Deasoft restituisce l'identificativo
   del paziente, che conserviamo: è la chiave con cui, in seguito, si leggono gli esiti.
5. **Registrazione.** Sulla scheda della richiesta salviamo che è stata agendata, quando, per
   quale centro, con quale data e ora, più le note utili emerse nella conversazione.
6. **Modifiche.** Riprogrammazione e annullamento seguono lo stesso canale: il paziente scrive o
   chiama, l'assistente aggiorna l'appuntamento su Deasoft e noi allineiamo la scheda.

Se l'assistente non riesce a chiudere la prenotazione — il paziente non risponde, non vuole
prenotare, chiede di parlare con una persona — la richiesta deve poter tornare al contact center
con l'indicazione di cosa è successo. Il criterio va concordato con Bludental.

## Cosa serve da Deasoft

| # | Richiesta | Perché |
|---|---|---|
| 1 | Disponibilità reale dell'agenda per centro | Senza slot veri l'assistente può solo raccogliere una preferenza, non prenotare |
| 2 | Creazione dell'appuntamento | È l'operazione che chiude il flusso |
| 3 | Identificativo del paziente restituito al momento del fissaggio | È la chiave per leggere gli esiti dopo la visita |
| 4 | Modifica e annullamento dell'appuntamento | Serve al punto 6; in test, non ancora sbloccato |
| 5 | Ambiente di prova e passaggio in produzione concordato | Il collaudo non può girare sull'agenda reale |

## Cosa serve da Bludental

- Quali campagne alimentano il flusso e quali centri sono aperti.
- Cosa fare quando l'assistente non chiude: rientro al contact center, con quale evidenza.

## Cosa facciamo noi

- Indirizzamento delle richieste al flusso corretto in base alla campagna.
- Consegna della richiesta all'assistente con i dati del paziente.
- Ricezione della conferma di prenotazione e registrazione sulla scheda.
- Tracciamento di ogni passaggio, per poter dire quante richieste entrano, quante si concludono
  con un appuntamento e quante tornano alle operatrici.

## Criteri di accettazione

1. Una richiesta della campagna dedicata viene presa in carico dall'assistente entro i minuti
   concordati e non finisce nel percorso di qualifica.
2. L'appuntamento concordato compare in agenda Deasoft con centro, data e ora corretti.
3. Sulla nostra scheda risultano l'avvenuta agendazione, i dati dell'appuntamento e
   l'identificativo del paziente restituito da Deasoft.
4. Una riprogrammazione o un annullamento gestiti dall'assistente si riflettono su entrambi i
   lati.
5. Una richiesta non conclusa è riconoscibile e torna lavorabile dal contact center.

## Stato

| Componente | Stato |
|---|---|
| Indirizzamento delle richieste per campagna | Pronto, inattivo finché non esistono le campagne dedicate |
| Consegna della richiesta all'assistente | Pronta |
| Ricezione della prenotazione e registrazione sulla scheda | In fase di test, bloccata |
| Agenti WhatsApp e vocale per l'agendazione | Pronti entrambi |
| Scelta del centro e ricerca degli slot (flussi n8n) | Attive, vedi `Flussi-n8n-Agendazione.md` |
| Creazione dell'appuntamento su Deasoft | Manca l'endpoint, bloccante |
| Lettura dell'agenda e creazione dell'appuntamento su Deasoft | In fase di test, bloccata |
| Riprogrammazione e annullamento | In fase di test, bloccata |
| Ambiente | Beta, in attesa del via libera per la produzione |

Gli agenti WhatsApp e vocale sono pronti e il flusso è in fase di test. Quello che manca è lo
sblocco dell'agenda Deasoft (punti 1, 2 e 4), senza cui l'assistente non può prenotare, e le
campagne dedicate, senza cui non entra nessuna richiesta.

## Punti aperti

- **Chi possiede la disponibilità.** Se l'assistente non vede gli slot reali, il flusso degenera
  in una richiamata: si perde il vantaggio e si aggiunge un passaggio.
- **Consenso e opt-out.** Il paziente deve poter chiedere di non essere ricontattato via
  WhatsApp, e la scelta va rispettata da tutti i flussi.
- **Confine con il recall.** Un appuntamento nato qui riceve anche i promemoria della Fase 1: da
  confermare che sia il comportamento voluto.
