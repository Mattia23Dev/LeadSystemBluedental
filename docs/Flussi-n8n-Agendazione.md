# Flussi n8n del servizio di agendazione

Documento tecnico interno · 03/09/2026

Questi flussi vivono su n8n (`https://deepagent-n8n-u45409.vm.elestio.app`), **fuori da questo
repository**, e sono i "tool" che l'assistente usa durante la conversazione con il paziente:
scelgono il centro, cercano gli slot liberi e tengono valido il token verso Deasoft. Li chiama
l'**agente vocale ElevenLabs** — si vede dallo `user-agent: ElevenLabs/1.0` nei payload
registrati — e la stessa strada è prevista per l'assistente WhatsApp.

Sono la metà "conversazione" del tavolo **Agendazione diretta su Deasoft**
(`docs/Agendazione-Diretta-Deasoft.md`). L'altra metà — ricezione della prenotazione,
salvataggio di `id_deasoft`, allineamento degli esiti — vive qui nel repo e sta in
`server/helpers/deasoft.js`, `server/scripts/deasoft-event-sync.js`,
`server/routes/leads.js` (`POST /api/webhook-agendazione-deasoft`) e
`server/controllers/subs.js` (`makeAgendazioneCall`).

Sono annotati qui perché altrimenti non se ne trova traccia leggendo il codice: chi arriva su
questo repository non ha modo di sapere che esistono.

---

## 1. Token Deasoft

**Endpoint n8n** `GET /webhook/deasoft/token`

Tiene un token Deasoft valido e lo distribuisce a tutti gli altri flussi, che lo chiedono a lui
invece di autenticarsi ognuno per conto proprio.

Come funziona: legge il token dalla cache del workflow (`$getWorkflowStaticData`), lo considera
scaduto se mancano meno di 5 minuti alla scadenza, e in quel caso ne chiede uno nuovo a
`?Type=Token` con Basic Auth (credenziale n8n *Deasoft Token AUTH*), lo salva con la sua
scadenza — `expires_in`, in pratica 24 ore — e lo restituisce. Uno *Schedule Trigger* alle 05:00
lo rinnova ogni mattina, così di giorno è sempre caldo.

Risponde `{ "token": "..." }`.

---

## 2. Scelta del centro

**Endpoint n8n** `POST /webhook/bludental/deasoft/get_available_centers`

Riceve `{ "location": "Guidonia Montecelio, Roma, 00012" }` e restituisce il centro consigliato
più fino a due alternative vicine.

La scelta la fa un agente (gpt-5.4-nano, reasoning basso) che ha **gli 82 centri scritti nel
prompt**, con id, nome e indirizzo, e sceglie per prossimità geografica. Risponde in testo
secondo un formato fisso, che un nodo Code trasforma in JSON e arricchisce con l'elenco dei
trattamenti.

Tre esiti possibili: `ok` con `recommended` ed eventuali `backup_1` / `backup_2`;
`need_more_info` se la località è ambigua; `no_center_nearby` se non c'è nulla di plausibile
nelle vicinanze.

I **trattamenti** sono anch'essi scritti nel nodo Code, con id e codice:

```
4125 PR protesi fissa e mobile   4132 CE conservativa/endodonzia
4126 PF protesi fissa            4133 CO conservativa
4127 PM protesi mobile           4134 EN endodonzia
4128 CI chirurgia/implantologia  4135 GE generica
4129 CH chirurgia                4136 GN gnatologia
4130 IM implantologia            4137 OR ortodonzia
4131 IG igiene                   4138 PE pedodonzia
```

Nello stesso canvas c'è un ramo separato che chiama davvero Deasoft su `?Type=Center` e ne
smista i campi (`center_id`, `name`, `address`, `phone`): **non è collegato alla risposta**, è la
versione "vera" della stessa funzione, lasciata pronta ma non in uso.

---

## 3. Ricerca degli slot disponibili

**Endpoint n8n** `POST /webhook/bludental/deasoft/get_available_slots`

Riceve i tre centri candidati, il trattamento e la data desiderata:

```json
{
  "center_id_one": "12", "center_id_two": "13", "center_id_three": "15",
  "treatment_id": "4130",
  "requested_date": "2026-04-27"
}
```

Un nodo Code costruisce, per ogni centro, **due finestre di sette giorni** a partire dalla data
richiesta (da +0 a +7 e da +8 a +14) e passa il lavoro al sotto-flusso descritto qui sotto, uno
per centro. Serve perché Deasoft risponde su intervalli brevi: due chiamate coprono due
settimane.

---

## 4. Sotto-flusso: slot di un singolo centro

**Workflow** `DA - SUB - Bludental Check Available Slots` (id `p2trUWfjk7bAbTgQ`)

Riceve `center_id`, `treatment_id` e le due finestre. Chiede il token al flusso 1, interroga
Deasoft due volte su `?Type=Slot&from&to&center_id&treatment`, unisce i risultati, **toglie i
duplicati, ordina per data e taglia agli otto slot più vicini**.

Restituisce:

```json
{ "has_slots": true, "slot_count": 8, "slots": [ { "from": "...", "to": "..." } ] }
```

Il taglio a otto è una scelta di conversazione, non un limite di Deasoft: al telefono o in chat
non si leggono venti orari.

---

## Endpoint Deasoft usati

Tutti sullo stesso host `https://funnel-1032112960130.europe-west1.run.app`, distinti dal
parametro `Type`, con `Authorization: Bearer <token>`.

| Type | Cosa fa | Chi lo usa |
|---|---|---|
| `Token` | rilascia il token (Basic Auth) | flusso 1 |
| `Center` | anagrafica dei centri | flusso 2, ramo non collegato |
| `Slot` | slot liberi per centro, trattamento e intervallo | flussi 3 e 4 |
| `Result` | esiti per `id_leadsystem` | `server/helpers/deasoft.js`, sync notturno |
| `EventResult` | esiti post-visita per `id_deasoft` (host beta) | `server/scripts/deasoft-event-sync.js` |

---

## Cosa manca per chiudere il giro

**La creazione dell'appuntamento non esiste in nessuno di questi flussi.** Si sceglie il centro,
si trovano gli slot, e lì ci si ferma: manca l'endpoint che prenota davvero, e mancano modifica e
annullamento. È il motivo per cui il tavolo dell'agendazione risulta "in test e bloccato".

Quando ci sarà, il ritorno verso di noi è già pronto: `POST /api/webhook-agendazione-deasoft`
salva `agendata`, `agendataAt`, data e ora, centro, note e soprattutto `id_deasoft`, che è la
chiave con cui poi si leggono gli esiti.

---

## Punti di attenzione

**I centri sono scritti due volte.** Gli 82 centri stanno nel prompt del flusso 2 e in
`server/config/centri-bludental.js`. Due copie della stessa anagrafica divergeranno: se un centro
cambia indirizzo o ne apre uno nuovo, va aggiornato in entrambi i posti. La strada pulita è il
ramo `?Type=Center` già presente ma scollegato, che prende l'elenco dalla fonte.

**Anche i trattamenti sono scritti a mano** nel nodo Code, senza una fonte che li verifichi.

**In un nodo di prova c'è un Bearer token in chiaro** (`RICHIEDI CENTRI3`, usato per i test
manuali): va tolto, perché resta nel JSON del workflow e viene esportato con esso.

**Restano nodi non collegati** — una query Postgres in sola lettura e un nodo Data Table — che
sembrano esperimenti abbandonati: meglio rimuoverli, o si finisce per credere che facciano
qualcosa.

**La scelta del centro la fa un modello linguistico** su una lista statica, non una ricerca
geografica. Funziona finché l'elenco è aggiornato, ma sbaglia in silenzio: se un centro manca dal
prompt, per l'assistente semplicemente non esiste.
