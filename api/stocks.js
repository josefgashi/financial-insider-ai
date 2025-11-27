export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const symbols = ['SPY', 'DIA', 'QQQ', 'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META'];
  
  try {
    const promises = symbols.map(async symbol => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
      const response = await fetch(url);
      const data = await response.json();
      const quote = data.chart.result[0].meta;
      
      const price = quote.regularMarketPrice;
      const previousClose = quote.chartPreviousClose || quote.previousClose;
      const change = price - previousClose;
      const changePercent = (change / previousClose) * 100;
      
      return {
        symbol: symbol,
        price: price,
        change: change,
        changePercent: changePercent
      };
    });
    
    const results = await Promise.all(promises);
    res.status(200).json({ stocks: results });
    
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
}
