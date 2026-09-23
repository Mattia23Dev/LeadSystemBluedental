# Allineamento degli esiti post-visita da Deasoft

Sync notturno · documento funzionale · 27/08/2026 · Funnel Consulting

## Obiettivo

Sapere che fine fa ogni appuntamento fissato dalle campagne: se il paziente si è presentato, se
gli è stato fatto un preventivo, se ha acquistato e per quale importo.

È il dato che manca per chiudere il cerchio. Oggi sappiamo quanto costa generare una richiesta e
quante richieste diventano appuntamenti; non sappiamo quanto di quel lavoro diventa fatturato. Con
questo allineamento la resa delle campagne si legge fino in fondo, per centro e per campagna, e le
scelte di investimento smettono di basarsi sul numero di appuntamenti.

## Come funziona

1. Ogni notte prendiamo le richieste che **risultano fissate su Nexus** in una finestra temporale
   recente.
2. Per ciascuna interroghiamo Deasoft con l'identificativo della richiesta.
3. Salviamo sulla scheda quello che Deasoft restituisce e ne conserviamo lo storico, così da poter
   ricostruire in quale momento un esito è cambiato.

È un'operazione di **sola lettura**: non scriviamo nulla su Deasoft e non tocchiamo nulla su
Nexus. Non modifica il lavoro delle operatrici né quello dei centri.

La finestra temporale serve a ricontrollare gli appuntamenti più volte, perché preventivo e
fatturato non nascono il giorno stesso della visita: l'esito va riletto per qualche giorno prima
di considerarlo definitivo. Oggi guardiamo indietro quattro mesi e rileggiamo ogni paziente una
volta al giorno, più di rado quando l'esito è ormai chiuso.

## Dati attesi da Deasoft

| Dato | A cosa serve |
|---|---|
| Presentato / non presentato | Misura reale dei mancati arrivi, indipendente da quanto registrato su Nexus |
| Preventivato | Distingue la visita conclusa con una proposta da quella finita lì |
| Fatturato | Dice quante visite diventano un acquisto |
| Valore | Permette di calcolare il ritorno per campagna e per centro |

## Cosa serve da Deasoft

- I due nuovi modi di leggere gli appuntamenti — per singolo paziente e per centro con
  intervallo di date — attualmente in sviluppo.

La correzione sul dato di presenza, che era l'altra richiesta, è in produzione
dall'11/09/2026.

## Cosa serve da Bludental

- Conferma di quali indicatori vogliono vedere e con quale frequenza.
- Chiarimento sul rapporto con l'export che oggi alimenta il call center: se il nuovo
  allineamento lo sostituisce o gli si affianca.

## Criteri di accettazione

1. Per un appuntamento fissato e già svolto, la scheda riporta se il paziente si è presentato.
2. Per un appuntamento concluso con un acquisto, la scheda riporta l'importo.
3. Un esito che cambia nei giorni successivi viene recepito, e resta traccia del valore
   precedente.
4. Nessuna informazione già presente sulla scheda viene sovrascritta o persa.

## Stato

| Componente | Stato |
|---|---|
| Selezione delle richieste fissate su Nexus | Sviluppata |
| Interrogazione notturna di Deasoft e salvataggio degli esiti, con storico | Sviluppata |
| Attivazione in produzione | Attiva dal 03/09/2026, gira ogni notte alle 05:00 |
| Significato dei valori restituiti da Deasoft | Chiarito; presenza corretta in produzione dall'11/09/2026 |
| Indicatori e reportistica per Bludental | Da definire |

Il sync è acceso e sta raccogliendo dati: al 09/09/2026 abbiamo esiti su circa 9.100 pazienti,
con **1.271 preventivi per 3,17 milioni di euro** e **462 fatturati per 1,45 milioni**.
Preventivato e fatturato sono affidabili e utilizzabili da subito.

**Il dato sulla presenza è affidabile dall'11/09/2026.** Fino ad allora il campo valeva «sì»
quasi sempre, anche per visite ancora da svolgere: rispondeva di fatto «esiste un
appuntamento» e non «è venuto». Deasoft ha portato la correzione in produzione l'11/09 e lo
stesso giorno l'abbiamo verificata: le visite future risultano non presentate, i fatturati
presentati, i mancati arrivi segnalati da Nexus non presentati.

Due cautele. I valori letti prima dell'11/09 si correggono da soli man mano che il sync li
rilegge, ma per le visite ancora da svolgere succede solo la notte dopo la visita: fino ad
allora le analisi sulle presenze devono escludere le letture precedenti. E per riconoscere
un mancato arrivo conta «visita passata e non presentato», perché il dato esplicito di
mancato arrivo non viene sempre compilato dai centri.

## Punti aperti

- **Perimetro.** Oggi leggiamo i pazienti con una prima visita fissata negli ultimi quattro mesi:
  va deciso se estendere la finestra più indietro per ricostruire lo storico.
- **Sovrapposizione con l'export esistente.** Un'informazione simile arriva già per altra via al
  call center, tramite un foglio esportato dal gestionale. Due fonti per lo stesso dato prima o
  poi divergono: meglio scegliere quale fa fede.
- **Rapporto con l'agendazione diretta.** Gli appuntamenti nati dall'assistente automatico hanno
  un canale di lettura degli esiti separato, già predisposto. Da valutare se ricondurre i due
  percorsi a uno solo una volta che entrambi saranno accesi.
- **Tempi di risposta.** Ogni interrogazione richiede circa tredici secondi, quindi leggere
  qualche migliaio di pazienti occupa ore. Deasoft sta sviluppando due letture più efficienti —
  per singolo paziente e per centro con intervallo di date — che risolvono il problema.
