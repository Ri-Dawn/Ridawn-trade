// FILE: netlify/functions/kite-data.js
const fetch = require(‘node-fetch’);

exports.handler = async (event, context) => {
// CORS headers
const headers = {
‘Access-Control-Allow-Origin’: ‘*’,
‘Access-Control-Allow-Headers’: ‘Content-Type’,
‘Access-Control-Allow-Methods’: ‘GET, POST, OPTIONS’,
‘Content-Type’: ‘application/json’
};

// Handle preflight
if (event.httpMethod === ‘OPTIONS’) {
return { statusCode: 200, headers, body: ‘’ };
}

const API_KEY = process.env.KITE_API_KEY;
const ACCESS_TOKEN = process.env.KITE_ACCESS_TOKEN;

// Check if access token is configured
if (!ACCESS_TOKEN || ACCESS_TOKEN === ‘’) {
return {
statusCode: 500,
headers,
body: JSON.stringify({
error: ‘Access token not configured. Please set KITE_ACCESS_TOKEN in Netlify environment variables.’,
status: ‘error’
})
};
}

try {
// Instrument symbols for Indian indices
const instruments = [
‘NSE:NIFTY 50’,
‘NSE:NIFTY BANK’,
‘NSE:NIFTY MIDCAP 50’,
‘BSE:SENSEX’
];

```
// Build the quote URL
const url = `https://api.kite.trade/quote?i=${instruments.join('&i=')}`;

console.log('Fetching from Kite API...');

const response = await fetch(url, {
  method: 'GET',
  headers: {
    'Authorization': `token ${API_KEY}:${ACCESS_TOKEN}`,
    'X-Kite-Version': '3'
  }
});

const data = await response.json();
console.log('Kite API Response Status:', data.status);

// Check if the API returned success
if (data.status === 'success' && data.data) {
  const result = {
    nifty50: parseQuote(data.data['NSE:NIFTY 50']),
    banknifty: parseQuote(data.data['NSE:NIFTY BANK']),
    niftymidcap: parseQuote(data.data['NSE:NIFTY MIDCAP 50']),
    sensex: parseQuote(data.data['BSE:SENSEX'])
  };

  console.log('✅ Data parsed successfully');

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(result)
  };
} else if (data.status === 'error') {
  // Handle Kite API errors
  console.error('Kite API Error:', data.message);
  
  // Check if token expired
  if (data.error_type === 'TokenException' || data.message?.includes('token')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ 
        error: 'Access token expired or invalid. Please generate a new token.',
        status: 'error',
        errorType: 'TOKEN_EXPIRED'
      })
    };
  }

  return {
    statusCode: 500,
    headers,
    body: JSON.stringify({ 
      error: data.message || 'Kite API error',
      status: 'error'
    })
  };
} else {
  throw new Error('Unexpected API response format');
}
```

} catch (error) {
console.error(‘Function Error:’, error.message);
return {
statusCode: 500,
headers,
body: JSON.stringify({
error: error.message,
status: ‘error’
})
};
}
};

function parseQuote(quote) {
if (!quote) {
console.warn(‘Quote data is null or undefined’);
return null;
}

try {
const lastPrice = quote.last_price || 0;
const prevClose = quote.ohlc?.close || lastPrice;
const change = lastPrice - prevClose;
const percentChange = prevClose !== 0 ? (change / prevClose) * 100 : 0;

```
return {
  value: lastPrice,
  change: change,
  percentChange: percentChange,
  open: quote.ohlc?.open || 0,
  high: quote.ohlc?.high || 0,
  low: quote.ohlc?.low || 0,
  prevClose: prevClose,
  timestamp: new Date().toISOString()
};
```

} catch (error) {
console.error(‘Error parsing quote:’, error);
return null;
}
}
