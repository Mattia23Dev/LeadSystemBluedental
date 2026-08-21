> **SUPERATO.** Questo documento (Rev. 1.0, 30/07/2026) è stato sostituito dalla
> **Rev. 2.0 del 12/08/2026** — `docs/Specifica-Funzionale-LeadSystem-Nexus-v2.0.html`,
> che riorganizza i requisiti nelle tre fasi del progetto pilota Bludental
> (Recall / Reingaggio NR / Recupero No Show). Conservato solo per storico.

# Specifica funzionale — Integrazione LeadSystem ↔ Nexus
## Esito "No Show" e data/ora appuntamento per reminder automatici

| | |
|---|---|
| **Committente** | Bludental / Funnel Consulting |
| **Fornitore** | NextUp — piattaforma Nexus |
| **Riferimenti** | Mail F. Di Lallo 28/07/2026 — Mail S. Salis 29/07/2026 — Mail D. Malizia 30/07/2026 |
| **Data** | 30 luglio 2026 |
| **Priorità** | Alta — rilascio richiesto prima della chiusura estiva |

---

## 1. Contesto e stato attuale

LeadSystem invia a Nexus le lead generate dalle campagne di acquisizione (`POST /lead/api/set`) e, tramite un **sync notturno**, rilegge da Nexus lo stato di lavorazione di ogni lead già collegata (`GET /lead/api/get?id=<id_nexus>`), archiviandone il payload completo.

Oggi il payload restituito espone, tra gli altri, `lead_status` (es. *Appuntamento Fissato*) ed `esito`. Da questi dati alimentiamo la reportistica di performance delle campagne e l'ottimizzazione degli investimenti pubblicitari.

**Non sono attualmente disponibili nel sync due informazioni che ci servono:**

1. l'esito **No Show** dell'appuntamento (paziente fissato ma non presentatosi);
2. la **data e ora dell'appuntamento** fissato.

Il presente documento descrive il comportamento atteso per entrambe.

---

## 2. Requisito 1 — Esito "No Show"

### 2.1 Obiettivo
Distinguere in modo strutturato gli appuntamenti fissati che si sono effettivamente svolti da quelli non onorati, per:
- costruire un flusso di monitoraggio e recupero dei pazienti non presentatisi;
- misurare la qualità reale delle campagne (oggi un appuntamento fissato e mai svolto pesa come un successo pieno).

### 2.2 Comportamento atteso
Nel payload restituito dall'API di lettura lead va aggiunto **un campo dedicato e distinto**, indicativamente `no_show`, di tipo **booleano** (`true` / `false`):

- `true` → la lead aveva un appuntamento fissato e **non si è presentata**;
- `false` (o valore vuoto) → nessun No Show rilevato.

**Vincolo essenziale:** i campi che oggi descrivono l'appuntamento fissato (`lead_status`, `esito`) devono restare **invariati**. Il No Show è un'informazione *aggiuntiva e successiva*, non deve sovrascrivere né alterare l'esito originale di fissazione. Solo mantenendo entrambe le informazioni possiamo leggere sia "quanti appuntamenti ho generato" sia "quanti si sono realmente svolti".

### 2.3 Retroattività
Si richiede che il campo sia valorizzato anche **sullo storico**, cioè sulle lead e sugli appuntamenti già presenti in Nexus, per poter ricostruire lo storico dei No Show e avere una baseline di confronto.

### 2.4 Criterio di accettazione
Interrogando l'API su una lead con appuntamento non onorato, la risposta contiene contemporaneamente:
- l'esito/stato originario di appuntamento fissato;
- `no_show = true`.

---

## 3. Requisito 2 — Data e ora appuntamento (abilitante reminder)

### 3.1 Obiettivo
Bludental attiva da agosto un flusso di **reminder automatici ai pazienti**, inviati **3 giorni prima della data dell'appuntamento**, con l'obiettivo di ridurre i mancati arrivi.

Per pianificare l'invio dobbiamo sapere **quando** è fissato l'appuntamento: è un dato che oggi non riceviamo, e senza il quale il flusso non è realizzabile.

### 3.2 Comportamento atteso
Nel payload restituito dall'API va aggiunto **un campo con data e ora dell'appuntamento**, valorizzato **esclusivamente per le lead con appuntamento fissato** (vuoto/null negli altri casi).

- Il nome del campo può essere definito liberamente da voi.
- **Formato richiesto: data-ora in standard ISO 8601 con indicazione del fuso** (es. `2026-08-14T15:30:00+02:00`), oppure in **UTC** (es. `2026-08-14T13:30:00Z`). L'importante è che il fuso sia esplicito e non ambiguo, per gestire correttamente il passaggio ora legale / ora solare (+1 o +2).
- Il campo deve essere **aggiornato** in caso di spostamento dell'appuntamento.

### 3.3 Flusso operativo che ne deriva (lato nostro)
1. Il sync notturno legge da Nexus le lead con appuntamento fissato e la relativa data/ora.
2. **3 giorni prima** dell'appuntamento inviamo al paziente un messaggio di reminder con due pulsanti di risposta (*"Ci sarai?"* → **Sì** / **No**).
3. Esiti possibili:
   - **Risposta "Sì"** → nessuna azione, l'appuntamento resta confermato.
   - **Risposta "No"** oppure **nessuna risposta** → la lead viene marcata come **non confermata**.

### 3.4 Comportamento atteso su Nexus per le lead non confermate
Per le lead non confermate inviamo a Nexus una richiesta di aggiornamento (`POST /lead/api/set`) valorizzando il **campo campagna** con il valore convenzionale:

```
NO-CONFERMA
```

Rispetto a questo comportamento chiediamo:

**a) Evidenza visiva in interfaccia.** La lead così marcata deve risultare **immediatamente riconoscibile a video** per le operatrici che gestiscono le agende (evidenziazione, badge, colore, filtro dedicato o equivalente secondo le vostre convenzioni), così che possano ricontattare il paziente o liberare lo slot.

**b) Conservazione della campagna originale.** È indispensabile che, dopo questo aggiornamento, la **campagna di provenienza originale della lead resti disponibile e non venga persa**: è il dato su cui si basa tutta l'attribuzione delle performance pubblicitarie. Sono per noi accettabili entrambe queste soluzioni, secondo quanto risulti più semplice da implementare per voi:

- **Soluzione preferita:** un **campo dedicato** (es. `stato_conferma` / flag) su cui scrivere il valore `NO-CONFERMA`, lasciando il campo `campagna` intatto;
- **Soluzione alternativa:** mantenere l'uso del campo `campagna` come descritto sopra, purché Nexus **conservi la campagna originale** in un campo distinto (o nello storico della lead) e ce la restituisca nel sync.

Vi chiediamo di indicarci quale delle due adottare e, in caso di campo dedicato, il nome e i valori ammessi.

### 3.5 Criterio di accettazione
- Ogni lead con appuntamento fissato espone nel sync la data/ora dell'appuntamento nel formato concordato.
- Dopo l'invio del marcatore `NO-CONFERMA`, la lead è visivamente evidenziata in Nexus e la campagna originale è ancora leggibile via API.

---

## 4. Riepilogo delle richieste

| # | Richiesta | Tipo/formato | Note |
|---|---|---|---|
| 1 | Nuovo campo esito **No Show** nel payload lead | booleano `true`/`false` | Non deve modificare `lead_status` / `esito` esistenti |
| 2 | Valorizzazione **retroattiva** del No Show | — | Su lead e appuntamenti già presenti |
| 3 | Nuovo campo **data e ora appuntamento** | ISO 8601 con fuso esplicito (`+01:00`/`+02:00`) o UTC | Solo per lead con appuntamento fissato; aggiornato in caso di spostamento |
| 4 | Gestione marcatore **`NO-CONFERMA`** | campo dedicato (preferito) o campo `campagna` | Deve produrre evidenza visiva in interfaccia |
| 5 | **Conservazione della campagna originale** dopo il marcatore | — | Requisito vincolante per l'attribuzione delle campagne |

Tutti i campi devono essere esposti sia sulla lettura della singola lead (`GET /lead/api/get`) sia, ove pertinente, sulla lista (`POST /lead/api/list`), senza modifiche ai campi già esistenti che comportino interruzioni dell'integrazione attuale.

---

## 5. Tempistiche

Le due integrazioni sono **abilitanti** per attività già pianificate da Bludental (reminder di agosto e sistema di recupero No Show). Chiediamo cortesemente un riscontro con:

- fattibilità e modalità realizzativa proposta;
- nomi definitivi dei campi e valori ammessi;
- offerta economica e **data prevista di rilascio**, possibilmente **entro la prima settimana di agosto 2026**.

Restiamo a disposizione per un breve incontro tecnico di allineamento sulle specifiche.

---

**Contatti**
Funnel Consulting — Francesca Di Lallo (Direttore Generale) · Mattia Noris (referente tecnico integrazione LeadSystem)
Bludental — Simona Salis (Direttrice Marketing)
