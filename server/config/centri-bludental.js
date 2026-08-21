/**
 * Anagrafica dei centri Bludental, chiave `id_deasoft` — lo stesso valore che Nexus
 * espone su `id_centro_bludental` dal 21/08/2026.
 *
 * Fonte: file `centri_bludental_deasoft.xlsx` inviato da Robert Timofte (NextUp) il
 * 21/08/2026, con i dati ricevuti direttamente da Deasoft. Rispetto al file originale:
 *   - i CAP sono riportati a 5 cifre (nel foglio Excel gli zeri iniziali erano persi:
 *     Roma arrivava come 172 invece di 00172);
 *   - gli spazi doppi negli indirizzi sono normalizzati.
 *
 * A cosa serve: Nexus espone l'indirizzo in un campo unico e concatenato
 * (`indirizzo_completo_centro_bludental`, es. "VIA G. CARDUCCI 55 (C\O C.C CONAD
 * BERGAMO) 24127 BERGAMO BG"), che non e' inseribile nel messaggio al paziente. Qui
 * teniamo il dato gia' scomposto: citta' e indirizzo finiscono in due variabili
 * distinte del template WhatsApp (vedi Rev. 2.0 §3.4.2).
 *
 * PILOTA: i 15 centri del progetto pilota (Rev. 2.0 §3.2). E' il perimetro di invio:
 * fuori da questa lista NON si scrive al paziente.
 */

const CENTRI = [
  { id: '1', nome: "ROMA TUSCOLANA", indirizzo: "VIALE DEI CONSOLI 81", cap: '00175', comune: "ROMA", provincia: 'RM' },
  { id: '2', nome: "ROMA BALDUINA", indirizzo: "PIAZZA CARLO MAZZARESI 30", cap: '00136', comune: "ROMA", provincia: 'RM' },
  { id: '3', nome: "FROSINONE", indirizzo: "PIAZZALE DE MATTHAEIS", cap: '03100', comune: "FROSINONE", provincia: 'FR' },
  { id: '5', nome: "OSTIA", indirizzo: "VIA DELLE BALEARI 280/296", cap: '00121', comune: "ROMA", provincia: 'RM' },
  { id: '6', nome: "POMEZIA", indirizzo: "VIA ROMA 169-171", cap: '00071', comune: "POMEZIA", provincia: 'RM' },
  { id: '7', nome: "CIVITAVECCHIA", indirizzo: "VIALE GIACOMO MATTEOTTI 19/B", cap: '00053', comune: "CIVITAVECCHIA", provincia: 'RM' },
  { id: '8', nome: "CAPENA", indirizzo: "VIA TIBERINA 34 I", cap: '00060', comune: "CAPENA", provincia: 'RM' },
  { id: '9', nome: "CIAMPINO", indirizzo: "VIALE DEL LAVORO 27", cap: '00043', comune: "CIAMPINO", provincia: 'RM' },
  { id: '10', nome: "BARI", indirizzo: "VIA PRINCIPE AMEDEO 170", cap: '70122', comune: "BARI", provincia: 'BA' },
  { id: '11', nome: "ROMA MARCONI", indirizzo: "VIA ANTONINO LO SURDO 15", cap: '00146', comune: "ROMA", provincia: 'RM' },
  { id: '12', nome: "ROMA TIBURTINA", indirizzo: "VIA IRENE IMPERATRICE D'ORIENTE 3", cap: '00162', comune: "ROMA", provincia: 'RM' },
  { id: '13', nome: "ROMA CASILINA", indirizzo: "VIA DELLE ROBINIE 29", cap: '00172', comune: "ROMA", provincia: 'RM' },
  { id: '14', nome: "MILANO BRIANZA", indirizzo: "VIALE BRIANZA 23", cap: '20100', comune: "MILANO", provincia: 'MI' },
  { id: '15', nome: "ROMA TORRE ANGELA", indirizzo: "VIA DI TORRENOVA 459", cap: '00133', comune: "ROMA", provincia: 'RM' },
  { id: '16', nome: "LATINA", indirizzo: "VIA ARMELLINI 46/48", cap: '04100', comune: "LATINA", provincia: 'LT' },
  { id: '17', nome: "ROMA PRATI FISCALI", indirizzo: "VIA VAL MAGGIA 66", cap: '00100', comune: "ROMA", provincia: 'RM' },
  { id: '18', nome: "BERGAMO", indirizzo: "VIA G. CARDUCCI 55 (C\\O C.C CONAD BERGAMO)", cap: '24127', comune: "BERGAMO", provincia: 'BG' },
  { id: '19', nome: "COMO", indirizzo: "PIAZZA GIOVANNI AMENDOLA 28", cap: '22100', comune: "COMO", provincia: 'CO' },
  { id: '21', nome: "SAN GIULIANO", indirizzo: "VIA MILANO 6", cap: '20098', comune: "SAN GIULIANO MILANESE", provincia: 'MI' },
  { id: '22', nome: "COLOGNO MONZESE", indirizzo: "CORSO ROMA 74/76", cap: '20093', comune: "COLOGNO MONZESE", provincia: 'MI' },
  { id: '23', nome: "TERNI", indirizzo: "VIA MONTEFIORINO 48 (C/O C.C. COSPEA VILLAGE)", cap: '05100', comune: "TERNI", provincia: 'TR' },
  { id: '24', nome: "CINISELLO BALSAMO", indirizzo: "VIALE RINASCITA 36", cap: '20092', comune: "CINISELLO BALSAMO", provincia: 'MI' },
  { id: '25', nome: "VARESE", indirizzo: "VIA DELLE MEDAGLIE D'ORO 25", cap: '21100', comune: "VARESE", provincia: 'VA' },
  { id: '26', nome: "BRESCIA", indirizzo: "VIA VITTORIO VENETO 35-37", cap: '25128', comune: "BRESCIA", provincia: 'BS' },
  { id: '27', nome: "MONZA", indirizzo: "VIALE VITTORIO VENETO 25", cap: '20900', comune: "MONZA", provincia: 'MB' },
  { id: '28', nome: "BUSTO ARSIZIO", indirizzo: "VIA G. MAMELI ANGOLO VIA M. BUONARROTI 10", cap: '21052', comune: "BUSTO ARSIZIO", provincia: 'VA' },
  { id: '29', nome: "MILANO LOMELLINA", indirizzo: "VIA LOMELLINA 37", cap: '20133', comune: "MILANO", provincia: 'MI' },
  { id: '31', nome: "BOLOGNA", indirizzo: "PIAZZA A. MICKIEWICZ 6", cap: '40100', comune: "BOLOGNA", provincia: 'BO' },
  { id: '32', nome: "AREZZO", indirizzo: "VIALE LEONE LEONI 4/8", cap: '52100', comune: "AREZZO", provincia: 'AR' },
  { id: '33', nome: "CREMONA", indirizzo: "VIA GIUSEPPINA 12 L", cap: '26100', comune: "CREMONA", provincia: 'CR' },
  { id: '34', nome: "TREVISO", indirizzo: "VIALE IV NOVEMBRE 19", cap: '31100', comune: "TREVISO", provincia: 'TV' },
  { id: '35', nome: "REGGIO EMILIA", indirizzo: "VIALE PIAVE 4/F", cap: '42121', comune: "REGGIO EMILIA", provincia: 'RE' },
  { id: '36', nome: "GENOVA", indirizzo: "VIA CORNIGLIANO 83 R", cap: '16152', comune: "GENOVA", provincia: 'GE' },
  { id: '37', nome: "PIOLTELLO", indirizzo: "VIA ROMA 92", cap: '20096', comune: "PIOLTELLO", provincia: 'MI' },
  { id: '38', nome: "MILANO PARENZO", indirizzo: "VIA PARENZO 2", cap: '20143', comune: "MILANO", provincia: 'MI' },
  { id: '39', nome: "VIGEVANO", indirizzo: "VIA MERULA 1", cap: '27029', comune: "VIGEVANO", provincia: 'PV' },
  { id: '40', nome: "SETTIMO MILANESE", indirizzo: "PIAZZA DEI TRE MARTIRI 11", cap: '20019', comune: "SETTIMO MILANESE", provincia: 'MI' },
  { id: '41', nome: "TORINO BOTTICELLI", indirizzo: "VIA BOTTICELLI 83/N C/O C.C. COOP BOTTICELLI", cap: '10155', comune: "TORINO", provincia: 'TO' },
  { id: '42', nome: "ROVIGO", indirizzo: "CORSO DEL POPOLO 155", cap: '45100', comune: "ROVIGO", provincia: 'RO' },
  { id: '43', nome: "FORLÌ", indirizzo: "CORSO GIUSEPPE MAZZINI 4/6", cap: '47121', comune: "FORLÌ", provincia: 'FC' },
  { id: '44', nome: "MILANO CASTELLI", indirizzo: "PIAZZA POMPEO CASTELLI 12", cap: '20156', comune: "MILANO", provincia: 'MI' },
  { id: '45', nome: "SEREGNO", indirizzo: "VIA AUGUSTO MARIANI 15/17", cap: '20831', comune: "SEREGNO", provincia: 'MB' },
  { id: '46', nome: "ABBIATEGRASSO", indirizzo: "VIA MANZONI 42", cap: '20081', comune: "ABBIATEGRASSO", provincia: 'MI' },
  { id: '47', nome: "PARMA", indirizzo: "STRADA AURELIO SAFFI 80", cap: '43121', comune: "PARMA", provincia: 'PR' },
  { id: '48', nome: "MANTOVA", indirizzo: "VIALE RISORGIMENTO 45", cap: '46100', comune: "MANTOVA", provincia: 'MN' },
  { id: '49', nome: "CANTÙ", indirizzo: "VIA ALESSANDRO MANZONI 27", cap: '22063', comune: "CANTÙ", provincia: 'CO' },
  { id: '50', nome: "VERONA", indirizzo: "VIALE ALESSANDRO MANZONI 1", cap: '37138', comune: "VERONA", provincia: 'VR' },
  { id: '51', nome: "PADOVA", indirizzo: "VIA NICCOLÒ TOMMASEO 2", cap: '35131', comune: "PADOVA", provincia: 'PD' },
  { id: '52', nome: "MODENA", indirizzo: "VIA EMILIA EST 44", cap: '41121', comune: "MODENA", provincia: 'MO' },
  { id: '53', nome: "VALMONTONE", indirizzo: "VALMONTONE OUTLET- VIA DELLA PACE", cap: '00038', comune: "VALMONTONE", provincia: 'RM' },
  { id: '54', nome: "FIRENZE", indirizzo: "VIALE FRANCESCO REDI 57/D", cap: '50144', comune: "FIRENZE", provincia: 'FI' },
  { id: '55', nome: "VICENZA", indirizzo: "VIALE GIUSEPPE MAZZINI 2", cap: '36100', comune: "VICENZA", provincia: 'VI' },
  { id: '56', nome: "LODI", indirizzo: "CORSO ADDA 75", cap: '26900', comune: "LODI", provincia: 'LO' },
  { id: '57', nome: "CESENA", indirizzo: "VIA SAVIO 606", cap: '47522', comune: "CESENA", provincia: 'FC' },
  { id: '58', nome: "SASSARI", indirizzo: "VIALE UMBERTO I 17/A - 17/B", cap: '07100', comune: "SASSARI", provincia: 'SS' },
  { id: '59', nome: "PERUGIA", indirizzo: "VIA DELLA PESCARA 39-49", cap: '06124', comune: "PERUGIA", provincia: 'PG' },
  { id: '60', nome: "TORINO CHIRONI", indirizzo: "PIAZZA GIAMPIETRO CHIRONI 6", cap: '10145', comune: "TORINO", provincia: 'TO' },
  { id: '61', nome: "SETTIMO TORINESE", indirizzo: "VIA ITALIA 29", cap: '10036', comune: "SETTIMO TORINESE", provincia: 'TO' },
  { id: '62', nome: "CAGLIARI", indirizzo: "VIA DELLA PINETA 231", cap: '09126', comune: "CAGLIARI", provincia: 'CA' },
  { id: '63', nome: "PIACENZA", indirizzo: "VIALE DEI MILLE 3", cap: '29100', comune: "PIACENZA", provincia: 'PC' },
  { id: '64', nome: "FERRARA", indirizzo: "CORSO PORTA MARE 60/64", cap: '44121', comune: "FERRARA", provincia: 'FE' },
  { id: '65', nome: "PRATO", indirizzo: "VIA ZARINI 298/D - 298/F", cap: '59100', comune: "PRATO", provincia: 'PO' },
  { id: '66', nome: "BIELLA", indirizzo: "VIA ITALIA 13", cap: '13900', comune: "BIELLA", provincia: 'BI' },
  { id: '67', nome: "CASSINO", indirizzo: "VIALE DANTE 97", cap: '03043', comune: "CASSINO", provincia: 'FR' },
  { id: '68', nome: "CARPI", indirizzo: "PIAZZA GARIBALDI 18", cap: '41012', comune: "CARPI", provincia: 'MO' },
  { id: '69', nome: "MELZO", indirizzo: "VIA VITTORIO EMANUELE II 8", cap: '20066', comune: "MELZO", provincia: 'MI' },
  { id: '70', nome: "DESENZANO DEL GARDA", indirizzo: "VIA FRANCESCO AGELLO 26", cap: '25015', comune: "DESENZANO DEL GARDA", provincia: 'BS' },
  { id: '71', nome: "ANZIO", indirizzo: "VIA ESCULAPIO 1/A", cap: '00042', comune: "ANZIO", provincia: 'RM' },
  { id: '72', nome: "LUCCA", indirizzo: "VIA BORGO GIANNOTTI 191", cap: '55100', comune: "LUCCA", provincia: 'LU' },
  { id: '73', nome: "MESTRE", indirizzo: "VIA CIRCONVALAZIONE 1", cap: '30117', comune: "VENEZIA", provincia: 'VE' },
  { id: '74', nome: "PORDENONE", indirizzo: "VIALE TREVISO 3/C", cap: '33170', comune: "PORDENONE", provincia: 'PN' },
  { id: '75', nome: "RHO", indirizzo: "VIA PIETRO MASCAGNI 1", cap: '20017', comune: "RHO", provincia: 'MI' },
  { id: '76', nome: "RAVENNA", indirizzo: "CIRCONVALLAZIONE ALLA ROTONDA DEI GOTI N. 24 ANGOLO VIA BOEZIO N. 41", cap: '48100', comune: "RAVENNA", provincia: 'RA' },
  { id: '77', nome: "RIMINI", indirizzo: "VIA FLAMINIA 175", cap: '47923', comune: "RIMINI", provincia: 'RN' },
  { id: '78', nome: "BOLOGNA EMILIA PONENTE", indirizzo: "VIA EMILIA PONENTE 100", cap: '40133', comune: "BOLOGNA", provincia: 'BO' },
  { id: '79', nome: "BASSANO DEL GRAPPA", indirizzo: "VIA MOTTON 43", cap: '36061', comune: "BASSANO DEL GRAPPA", provincia: 'VI' },
  { id: '80', nome: "MASSA", indirizzo: "VIALE DEMOCRAZIA", cap: '54100', comune: "MASSA", provincia: 'MS' },
  { id: '81', nome: "ALESSANDRIA", indirizzo: "VIA SANTA CATERINA DA SIENA", cap: '15121', comune: "ALESSANDRIA", provincia: 'AL' },
  { id: '82', nome: "LIVORNO", indirizzo: "VIA FRANCESCO DE SANTIS 44", cap: '57128', comune: "LIVORNO", provincia: 'LI' },
  { id: '83', nome: "UDINE", indirizzo: "PIAZZALE OSSOPO 1", cap: '33100', comune: "UDINE", provincia: 'UD' },
  { id: '84', nome: "TRENTO", indirizzo: "VIA ANTONIO ROSMINI 94", cap: '38122', comune: "TRENTO", provincia: 'TN' },
  { id: '85', nome: "RIVOLI", indirizzo: "CORSO SUSA 156", cap: '10098', comune: "RIVOLI", provincia: 'TO' },
];

/**
 * I 15 centri del pilota, per id_deasoft. Ordine e raggruppamento come nel documento
 * di progetto Bludental (Rev. 2.0 §3.2):
 *   Top    Pomezia (6) · Bari (10) · Pordenone (74)
 *   Medie  Latina (16) · Milano Brianza (14) · Roma Casilina (13)
 *   Low    Rho (75) · Lodi (56) · Bologna (31) · Mestre (73) · Perugia (59) ·
 *          Forli (43) · Mantova (48) · Vicenza (55) · Abbiategrasso (46)
 */
const PILOTA = ['6', '10', '74', '16', '14', '13', '75', '56', '31', '73', '59', '43', '48', '55', '46'];

/**
 * DA CONFERMARE con Bludental: l'anagrafica ha due centri a Bologna, "BOLOGNA" (31) e
 * "BOLOGNA EMILIA PONENTE" (78). Il documento di progetto dice solo "Bologna": nel
 * dubbio il pilota include il solo 31. Se Simona conferma che rientrano entrambi,
 * spostare il 78 dentro PILOTA.
 */
const PILOTA_DA_CONFERMARE = ['78'];

const BY_ID = new Map(CENTRI.map((c) => [String(c.id), c]));
const PILOTA_SET = new Set(PILOTA);

/** @returns {object|null} il centro con questo id_deasoft, o null se sconosciuto. */
function getCentro(id) {
  if (id === null || id === undefined || id === '') return null;
  return BY_ID.get(String(id).trim()) || null;
}

/** Questo centro rientra nel perimetro del pilota? Id sconosciuto o vuoto => false. */
function isPilota(id) {
  if (id === null || id === undefined || id === '') return false;
  return PILOTA_SET.has(String(id).trim());
}

/**
 * Variabili di citta' e indirizzo per il messaggio al paziente. Usa l'anagrafica e
 * NON la stringa concatenata di Nexus. Ritorna null se il centro non e' censito: in
 * quel caso il messaggio non e' compilabile e l'invio va saltato.
 */
function variabiliMessaggio(id) {
  const c = getCentro(id);
  if (!c) return null;
  return { citta: c.comune, indirizzo: c.indirizzo, nome: c.nome, cap: c.cap, provincia: c.provincia };
}

module.exports = { CENTRI, PILOTA, PILOTA_DA_CONFERMARE, getCentro, isPilota, variabiliMessaggio };
