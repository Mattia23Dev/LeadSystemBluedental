const axios = require('axios');

function extractToken(payload) {
  if (payload == null) return null;
  if (typeof payload === 'object') {
    return payload.access_token || payload.token || payload.jwt || payload.data?.access_token || payload.data?.token || null;
  }
  if (typeof payload === 'string') {
    const s = payload.trim();
    if (!s) return null;
    try {
      const o = JSON.parse(s);
      return extractToken(o);
    } catch {
      // Deasoft a volte risponde con JSON "quasi" valido: "token": VALORE senza virgolette
      const m = s.match(/"token"\s*:\s*"?([A-Za-z0-9\-_=+/]+)"?/i);
      if (m) return m[1].trim();
      if (/^[A-Za-z0-9\-_=+/]+$/.test(s)) return s;
    }
  }
  return null;
}

const DEFAULT_TOKEN_URL = 'https://funnel-1032112960130.europe-west1.run.app/?Type=Token';
const DEFAULT_RESULT_URL = 'https://funnel-1032112960130.europe-west1.run.app/?Type=Result';

/** Default credenziali Deasoft prod (sovrascrivibili con DEASOFT_USERNAME / DEASOFT_PASSWORD). */
const DEFAULT_DEASOFT_USERNAME = 'fun.dea';
const DEFAULT_DEASOFT_PASSWORD = 'RGVhc29mdC1mdW5uZWwyMDI2IQ==';

exports.getDeasoftToken = async () => {
  const tokenUrl = process.env.DEASOFT_TOKEN_URL || DEFAULT_TOKEN_URL;
  const username = process.env.DEASOFT_USERNAME || DEFAULT_DEASOFT_USERNAME;
  const password = process.env.DEASOFT_PASSWORD || DEFAULT_DEASOFT_PASSWORD;

  // Prova prima Basic Auth (RFC 7617): molti gateway accettano solo questo e non i query param.
  const response = await axios.get(tokenUrl, {
    auth: {
      username,
      password,
    },
  });

  const token = extractToken(response.data);
  if (!token) {
    throw new Error(`Token not found in response: ${JSON.stringify(response.data)}`);
  }
  return token;
};

/** @param {string} idLeadSystem — id lead su LeadSystem (parametro id_leadsystem verso Deasoft). */
exports.getDeasoftLeadOutcome = async (idLeadSystem, token) => {
  const leadUrl = process.env.DEASOFT_RESULT_URL || DEFAULT_RESULT_URL;

  const authMode = 'bearer';
  const tokenQueryName = 'token';
  const idLeadParamName = 'id_leadsystem';

  const config = {
    params: {
      [idLeadParamName]: idLeadSystem,
    },
    headers: {},
  };

  if (authMode === 'query') {
    config.params[tokenQueryName] = token;
  } else {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const response = await axios.get(leadUrl, config);
  return response.data;
};
