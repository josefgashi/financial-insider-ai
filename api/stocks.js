export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Using IEX Cloud's free sandbox (test data, but always works)
  const symbols = ['DIA', 'QQQ', 'SPY', 'AAPL', 'MSFT', 'GOOGL'];
  const token = 'Tpk_d09c1d72c2674688a5cc0e7eac5c7797'; // Free sandbox token
  
  try {
    const promises = symbols.map(async symbol => {
      const url = `https://sandbox.iexapis.com/stable/stock/${symbol}/quote?token=${token}`;
      const response = await fetch(url);
      const data = await response.json();
      
      return {
        symbol: symbol,
        shortName: symbol === 'DIA' ? 'Dow Jones' : 
                   symbol === 'QQQ' ? 'Nasdaq 100' :
                   symbol === 'SPY' ? 'S&P 500' : symbol,
        regularMarketPrice: data.latestPrice || 0,
        regularMarketChange: data.change || 0,
        regularMarketChangePercent: data.changePercent ? data.changePercent * 100 : 0
      };
    });
    
    const results = await Promise.all(promises);
    
    res.status(200).json({
      quoteResponse: {
        result: results
      }
    });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
}
