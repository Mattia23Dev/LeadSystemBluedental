/**
 * Whitelist dei numeri di collaudo del sistema reminder (fase di test, agosto 2026).
 *
 * A cosa serve: durante il collaudo il reminder gira con i cron ACCESI e in invio
 * REALE, ma deve poter scrivere SOLO ai cinque numeri del gruppo di test. Il
 * perimetro dei centri pilota (config/centri-bludental.js) non basta: dentro quei
 * centri ci sono pazienti veri, che in questa fase non devono ricevere nulla.
 *
 * Il filtro e' FAIL-CLOSED e vive nel codice, non solo in .env: finche' la whitelist
 * e' attiva, un numero fuori lista (o un numero mancante/illeggibile) viene bloccato.
 * Per uscire dalla fase di test serve una scelta esplicita: REMINDER_WHITELIST_ATTIVA=false.
 *
 * Il controllo e' applicato in tre punti, in modo che nessuna strada lo aggiri:
 *   - helpers/qualificatore.js  -> invio del template WhatsApp al paziente
 *   - helpers/statoConferma.js  -> scrittura di stato_conferma su Nexus
 *   - scripts/reminder-appuntamenti.js -> selezione dei candidati (per i log)
 *
 * Env:
 *   REMINDER_WHITELIST_ATTIVA  'false' spegne il filtro e apre l'invio a tutto il
 *                              perimetro pilota. Default true (fase di test).
 *   REMINDER_WHITELIST_EXTRA   numeri aggiuntivi separati da virgola, per aggiungere
 *                              un tester senza toccare il codice.
 */

/** Gruppo di test concordato il 24/08/2026. Confronto sulle ultime 10 cifre. */
const NUMERI_TEST = [
  { nome: 'Simona Salis', telefono: '+39 320 492 8711' },
  { nome: 'Mattia Noris', telefono: '+39 351 325 7290' },
  { nome: 'Andrea Caruso', telefono: '+39 338 285 7716' },
  { nome: 'Francesca Di Lallo', telefono: '+39 340 055 9975' },
  { nome: 'Samuel Tagliacozzo', telefono: '+39 331 146 5086' },
];

const ATTIVA = String(process.env.REMINDER_WHITELIST_ATTIVA || 'true').toLowerCase() !== 'false';

/** Ultime 10 cifre: unico confronto affidabile fra i formati in giro (+39, 0039, grezzo). */
function last10(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

const EXTRA = String(process.env.REMINDER_WHITELIST_EXTRA || '')
  .split(',')
  .map((s) => last10(s))
  .filter((s) => s.length === 10);

/** Mappa ultime10 -> nome del tester (gli extra da .env non hanno nome). */
const CONSENTITI = new Map(NUMERI_TEST.map((t) => [last10(t.telefono), t.nome]));
for (const n of EXTRA) if (!CONSENTITI.has(n)) CONSENTITI.set(n, 'extra da env');

/**
 * Si puo' scrivere a questo numero?
 * Con la whitelist spenta e' sempre true. Con la whitelist accesa, un numero vuoto o
 * non riconoscibile e' bloccato: in dubbio non si scrive.
 */
function isConsentito(phone) {
  if (!ATTIVA) return true;
  const n = last10(phone);
  if (n.length !== 10) return false;
  return CONSENTITI.has(n);
}

/** Nome del tester dietro al numero, per i log. */
function etichetta(phone) {
  return CONSENTITI.get(last10(phone)) || null;
}

/** Riga di stato per i log di avvio degli script. */
function descrizione() {
  if (!ATTIVA) return 'whitelist test SPENTA (invio aperto a tutto il perimetro pilota)';
  return `whitelist test ATTIVA su ${CONSENTITI.size} numeri: ${[...CONSENTITI.values()].join(', ')}`;
}

module.exports = { NUMERI_TEST, ATTIVA, CONSENTITI, isConsentito, etichetta, descrizione, last10 };
