const KiteConnect = require("kiteconnect").KiteConnect;

export default async function handler(req, res) {
  // 1. Handle Preflight (CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 2. Read environment variables
    const API_KEY = process.env.ZERODHA_API_KEY;
    const API_SECRET = process.env.ZERODHA_API_SECRET;
    const ACCESS_TOKEN = process.env.ZERODHA_ACCESS_TOKEN; 

    // 3. Look for request_token in QUERY (URL) or BODY
    const request_token = req.query.request_token || (req.body && req.body.request_token);

    console.log('=== Request Started ===');
    console.log('Mode:', request_token ? 'GENERATING TOKEN' : 'FETCHING DATA');
    
    // ------------------------------------------
    // MODE A: GENERATE NEW TOKEN (For Admin Page)
    // ------------------------------------------
    if (request_token) {
      // --- NEW DIAGNOSTIC LOGS ---
      // This will log the *length* of your keys as the server sees them.
      // This proves if they are being loaded correctly from Vercel.
      console.log(`DIAGNOSTIC - API_KEY Length: ${API_KEY ? API_KEY.length : 0}`);
      console.log(`DIAGNOSTIC - API_SECRET Length: ${API_SECRET ? API_SECRET.length : 0}`);
      console.log(`DIAGNOSTIC - request_token Length: ${request_token ? request_token.length : 0}`);
      // --- END DIAGNOSTIC LOGS ---

      if (!API_KEY || !API_SECRET || !request_token) {
          console.error('DIAGNOSTIC ERROR: One or more keys are missing.');
          return res.status(500).json({ error: 'Server Configuration Error: A key is missing.' });
      }

      console.log('Starting Token Generation...');
      const kc = new KiteConnect({ api_key: API_KEY });

      try {
        const response = await kc.generateSession(request_token, API_SECRET);
        console.log('SUCCESS: Token Generated');
        
        return res.status(200).json({ 
          status: 'success',
          access_token: response.access_token,
          public_token: response.public_token
        });
      } catch (kiteError) {
        console.error('Kite API Error (Token Gen):', kiteError.message);
        // This is where the "Invalid 'checksum'" error is caught
        return res.status(400).json({ error: 'Kite Error: ' + kiteError.message });
      }
    }

    // ------------------------------------------
    // MODE B: FETCH DATA (For Dashboard)
    // ------------------------------------------
    
    if (!ACCESS_TOKEN) {
      console.error('Data Fetching Error: ZERODHA_ACCESS_TOKEN is BLANK.');
      return res.status(500).json({ error: 'No Access Token found. Use Admin Panel to generate one.' });
    }
    
    console.log(`Token loaded: ${ACCESS_TOKEN.substring(0, 5)}...`);

    try {
      const kc = new KiteConnect({
          api_key: API_KEY,
          access_token: ACCESS_TOKEN
      });

      const instruments = ['NSE:NIFTY 50', 'NSE:NIFTY BANK', 'NSE:NIFTY MIDCAP 50', 'BSE:SENSEX'];
      console.log('Fetching quotes for dashboard...');
      const quotes = await kc.getQuote(instruments);
      
      console.log('SUCCESS: Quotes fetched.');
      return res.status(200).json(quotes);

    } catch (dataError) {
      console.error('Data Fetching Error:', dataError.message);
      return res.status(500).json({ error: 'Kite Error (Data Fetch): ' + dataError.message });
    }

  } catch (error) {
    console.error('Overall Server Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
