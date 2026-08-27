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

La finestra temporale serve a ricontrollare gli appuntamenti recenti più volte, perché preventivo
e fatturato non nascono il giorno stesso della visita: l'esito di un appuntamento va riletto per
qualche giorno prima di considerarlo definitivo. Ampiezza della finestra e frequenza sono da
tarare insieme.

## Dati attesi da Deasoft

| Dato | A cosa serve |
|---|---|
| Presentato / non presentato | Misura reale dei mancati arrivi, indipendente da quanto registrato su Nexus |
| Preventivato | Distingue la visita conclusa con una proposta da quella finita lì |
| Fatturato | Dice quante visite diventano un acquisto |
| Valore | Permette di calcolare il ritorno per campagna e per centro |

## Cosa serve da Deasoft

1. L'elenco dei valori restituiti e il loro **significato esatto**, in particolare come si
   distingue «non ancora avvenuto» da «avvenuto con esito negativo».
2. La conferma che il dato venga **aggiornato nel tempo** e non solo alla creazione
   dell'appuntamento.
3. Il via libera al passaggio dall'ambiente di prova alla produzione.

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
| Attivazione in produzione | **Mai accesa**: il processo è disattivato nell'applicazione |
| Significato dei valori restituiti da Deasoft | Da confermare |
| Indicatori e reportistica per Bludental | Da definire |

Il lavoro tecnico è quindi già fatto e fermo prima dell'accensione. Per riprenderlo servono le tre
conferme da Deasoft e la decisione sugli indicatori: non è un progetto da ricominciare, è un
progetto da accendere e tarare.

## Punti aperti

- **Perimetro.** Oggi la selezione è limitata a una finestra di pochi giorni e a una parte delle
  richieste: va deciso se estenderla a tutte le fissate del pilota o dell'intera rete.
- **Sovrapposizione con l'export esistente.** Un'informazione simile arriva già per altra via al
  call center, tramite un foglio esportato dal gestionale. Due fonti per lo stesso dato prima o
  poi divergono: meglio scegliere quale fa fede.
- **Rapporto con l'agendazione diretta.** Gli appuntamenti nati dall'assistente automatico hanno
  un canale di lettura degli esiti separato, già predisposto. Da valutare se ricondurre i due
  percorsi a uno solo una volta che entrambi saranno accesi.
