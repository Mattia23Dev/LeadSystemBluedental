/**
 * Tracciamento appuntamento / no show a partire dal payload Nexus.
 *
 * Nexus dal 06/08/2026 espone 3 campi nuovi (mail Robert 05/08):
 *   - no_show               '1' se il paziente non si e' presentato, NULL altrimenti
 *   - data_ora_appuntamento ISO 8601 con fuso esplicito (es. 2026-08-14T15:30:00+02:00)
 *   - stato_conferma        testo libero, lo scriviamo NOI (SI-CONFERMA / NO-CONFERMA)
 *
 * Requisito nostro: l'esito "fissato" e il no show devono restare tracciati in campi
 * DEDICATI e NON sovrascrivibili, cosi' se in un sync successivo Nexus cambia esito
 * (ricontatto, nuovo appuntamento, lead persa) non perdiamo lo storico:
 *   - appuntamento.fissato / fissatoAt / esitoFissatoOriginale  -> scritti UNA volta sola
 *   - appuntamento.noShow / noShowAt / noShowStorico            -> sticky, mai azzerati
 *   - appuntamento.dataOraPrima + spostamenti[]                 -> primo orario + ogni spostamento
 *
 * ATTENZIONE (verificato il 06/08/2026): no_show su Nexus e' un flag di PAZIENTE, non
 * del singolo appuntamento — esistono lead con no_show='1' e un appuntamento FUTURO
 * (hanno mancato un appuntamento precedente e ne hanno preso un altro). Per questo il
 * flag viene sempre registrato insieme all'orario a cui si riferiva quando l'abbiamo visto.
 */

const HISTORY_LIMIT = 20;

/** L'esito Nexus indica un appuntamento fissato? ("fissato", "gia' fissato", ...) */
function isFissato(nexusLead) {
  const esito = String(nexusLead?.esito || '');
  const status = String(nexusLead?.lead_status || '');
  return /fissat/i.test(esito) || /appuntamento fissato/i.test(status);
}

/** '1' -> true; NULL / '' / '0' -> false */
function isNoShow(nexusLead) {
  const v = nexusLead?.no_show;
  if (v === null || v === undefined) return false;
  const s = String(v).trim().toLowerCase();
  return s !== '' && s !== '0' && s !== 'false' && s !== 'null';
}

/** ISO 8601 con fuso -> Date (istante corretto). Ritorna null se non parsabile. */
function parseDataOra(value) {
  if (!value) return null;
  const d = new Date(String(value).trim());
  return isNaN(d.getTime()) ? null : d;
}

function pushLimited(arr, item) {
  const out = Array.isArray(arr) ? [...arr] : [];
  out.push(item);
  if (out.length > HISTORY_LIMIT) out.splice(0, out.length - HISTORY_LIMIT);
  return out;
}

/**
 * Costruisce il nuovo blocco `appuntamento` a partire da quello precedente e dal
 * payload Nexus. Non modifica l'input: ritorna { appuntamento, changes } dove
 * `changes` elenca cosa e' cambiato (utile per i log e per capire se rimandare
 * il reminder dopo uno spostamento).
 */
function buildAppuntamento(prev, nexusLead, now = new Date()) {
  const app = { ...(prev || {}) };
  const changes = [];

  const esito = nexusLead?.esito ?? null;
  const leadStatus = nexusLead?.lead_status ?? null;
  const dataOra = nexusLead?.data_ora_appuntamento || null;
  const fissato = isFissato(nexusLead);
  const noShow = isNoShow(nexusLead);

  // --- 1) esito "fissato": scritto una volta sola, poi immutabile -----------
  if (fissato && !app.fissato) {
    app.fissato = true;
    app.fissatoAt = now;
    app.esitoFissatoOriginale = esito;
    app.leadStatusFissatoOriginale = leadStatus;
    changes.push('fissato');
  }

  // Esito corrente: puo' cambiare liberamente, serve solo per sapere "com'e' oggi".
  if (app.esitoCorrente !== esito || app.leadStatusCorrente !== leadStatus) {
    app.esitoCorrente = esito;
    app.leadStatusCorrente = leadStatus;
    app.esitoCorrenteAt = now;
    if (app.fissato) changes.push('esito_cambiato');
  }

  // --- 2) data/ora appuntamento e spostamenti ------------------------------
  if (dataOra) {
    if (!app.dataOraPrima) {
      app.dataOraPrima = dataOra;
      app.dataOraPrimaAt = now;
      changes.push('data_ora_prima');
    }
    if (app.dataOra && app.dataOra !== dataOra) {
      app.spostamenti = pushLimited(app.spostamenti, { at: now, da: app.dataOra, a: dataOra });
      changes.push('spostamento');
    }
    app.dataOra = dataOra;
    app.dataOraTs = parseDataOra(dataOra);
    app.dataOraVistaAt = now;
    // L'appuntamento e' (di nuovo) in agenda: annulla l'eventuale sparizione.
    if (app.dataOraSparitaAt) {
      app.dataOraSparitaAt = null;
      changes.push('data_ora_ricomparsa');
    }
  } else if (app.dataOra && !app.dataOraSparitaAt) {
    // L'appuntamento e' uscito dall'agenda Nexus (cancellato o gia' svolto):
    // NON cancelliamo il valore, segniamo solo quando non lo vediamo piu'.
    // Il cron reminder usa questo flag per NON scrivere a chi ha disdetto.
    app.dataOraSparitaAt = now;
    changes.push('data_ora_sparita');
  }

  // --- 3) no show: sticky, mai azzerato ------------------------------------
  if (noShow) {
    if (!app.noShow) {
      app.noShow = true;
      app.noShowAt = now;
      app.noShowValoreNexus = String(nexusLead?.no_show);
      changes.push('no_show');
    }
    app.noShowVistoAt = now;
    const ultimo = Array.isArray(app.noShowStorico) ? app.noShowStorico[app.noShowStorico.length - 1] : null;
    // Nuova riga di storico solo se cambia l'appuntamento di riferimento o l'esito.
    if (!ultimo || ultimo.dataOra !== (dataOra || null) || ultimo.esito !== esito) {
      app.noShowStorico = pushLimited(app.noShowStorico, {
        at: now,
        valore: String(nexusLead?.no_show),
        dataOra: dataOra || null,
        esito,
      });
    }
  } else if (app.noShow && !app.noShowRimossoAt) {
    // Nexus ha tolto il flag: teniamo il nostro (sticky) e annotiamo la discrepanza.
    app.noShowRimossoAt = now;
    changes.push('no_show_rimosso_da_nexus');
  }

  // --- 4) stato_conferma cosi' come lo vede Nexus (lo scriviamo noi) -------
  const statoConfermaNexus = nexusLead?.stato_conferma || null;
  if (app.statoConfermaNexus !== statoConfermaNexus) {
    app.statoConfermaNexus = statoConfermaNexus;
    changes.push('stato_conferma_nexus');
  }

  return { appuntamento: app, changes };
}

module.exports = {
  buildAppuntamento,
  isFissato,
  isNoShow,
  parseDataOra,
  HISTORY_LIMIT,
};
