export default async function handler(req, res) {
  // CORS headers - MUST be set first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const API_KEY = process.env.KITE_API_KEY;
    const ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN;

    console.log('=== Function Start ===');
    console.log('Method:', req.method);
    console.log('API_KEY exists:', !!API_KEY);
    console.log('ACCESS_TOKEN exists:', !!ACCESS_TOKEN);

    if (!API_KEY) {
      console.error('Missing KITE_API_KEY');
      return res.status(500).json({ error: 'API Key not configured' });
    }

    if (!ACCESS_TOKEN) {
      console.log('No access token - this is expected before first auth');
      return res.status(500).json({ error: 'Access token not configured. Please generate token via /admin.html' });
    }

    // Fetch from Kite API
    const instruments = [
      'NSE:NIFTY 50',
      'NSE:NIFTY BANK', 
      'NSE:NIFTY MIDCAP 50',
      'BSE:SENSEX'
    ];

    const kiteUrl = `https://api.kite.trade/quote?i=${instruments.join('&i=')}`;
    console.log('Calling Kite API...');

    const kiteResponse = await fetch(kiteUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${API_KEY}:${ACCESS_TOKEN}`,
        'X-Kite-Version': '3',
        'Accept': 'application/json'
      }
    });

    console.log('Kite response status:', kiteResponse.status);

    if (!kiteResponse.ok) {
      const errorText = await kiteResponse.text();
      console.error('Kite API error:', errorText);
      return res.status(500).json({ 
        error: `Kite API error: ${kiteResponse.status}`,
        details: errorText 
      });
    }

    const kiteData = await kiteResponse.json();
    console.log('Kite data status:', kiteData.status);

    if (kiteData.status !== 'success' || !kiteData.data) {
      console.error('Invalid Kite response:', kiteData);
      return res.status(500).json({ 
        error: 'Invalid response from Kite',
        kiteStatus: kiteData.status 
      });
    }

    // Parse the data
    const result = {
      nifty50: parseQuote(kiteData.data['NSE:NIFTY 50']),
      banknifty: parseQuote(kiteData.data['NSE:NIFTY BANK']),
      niftymidcap: parseQuote(kiteData.data['NSE:NIFTY MIDCAP 50']),
      sensex: parseQuote(kiteData.data['BSE:SENSEX'])
    };

    console.log('Success! Returning data');
    return res.status(200).json(result);

  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      type: error.name
    });
  }
}

function parseQuote(quote) {
  if (!quote) {
    console.warn('Quote data is missing');
    return null;
  }

  try {
    const lastPrice = quote.last_price || 0;
    const prevClose = quote.ohlc?.close || lastPrice;
    const open = quote.ohlc?.open || lastPrice;
    const high = quote.ohlc?.high || lastPrice;
    const low = quote.ohlc?.low || lastPrice;

    return {
      value: lastPrice,
      change: lastPrice - prevClose,
      percentChange: prevClose ? ((lastPrice - prevClose) / prevClose) * 100 : 0,
      open: open,
      high: high,
      low: low,
      prevClose: prevClose,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error parsing quote:', error);
    return null;
  }
}
