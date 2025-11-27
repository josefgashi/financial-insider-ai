export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const symbols = ['DIA', 'QQQ', 'SPY', 'AAPL', 'MSFT', 'GOOGL'];
  const API_KEY = 'ctjaq59r01qla39vphe0ctjaq59r01qla39vpheg';
  
  try {
    const promises = symbols.map(async symbol => {
      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${API_KEY}`);
      const data = await response.json();
      
      return {
        symbol: symbol,
        shortName: symbol === 'DIA' ? 'Dow Jones' : 
                   symbol === 'QQQ' ? 'Nasdaq 100' :
                   symbol === 'SPY' ? 'S&P 500' : symbol,
        regularMarketPrice: data.c || 0,
        regularMarketChange: data.d || 0,
        regularMarketChangePercent: data.dp || 0
      };
    });
    
    const results = await Promise.all(promises);
    
    const formatted = {
      quoteResponse: {
        result: results
      }
    };
    
    res.status(200).json(formatted);
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch stock data', details: error.message });
  }
}
