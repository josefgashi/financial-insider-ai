export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const pairs = [
    { symbol: 'GBPUSD=X', base: 'USD', quote: 'GBP', invert: true, flags: ['🇺🇸', '🇬🇧'] },
    { symbol: 'EURUSD=X', base: 'USD', quote: 'EUR', invert: true, flags: ['🇺🇸', '🇪🇺'] },
    { symbol: 'USDJPY=X', base: 'USD', quote: 'JPY', invert: false, flags: ['🇺🇸', '🇯🇵'] }
  ];

  try {
    const results = await Promise.all(
      pairs.map(async ({ symbol, base, quote, invert, flags }) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
        const response = await fetch(url);
        const data = await response.json();
        const meta = data.chart?.result?.[0]?.meta;

        if (!meta?.regularMarketPrice) {
          throw new Error(`Missing price data for ${symbol}`);
        }

        const rawPrice = meta.regularMarketPrice;
        const rawPrevious = meta.chartPreviousClose || meta.previousClose;
        const price = invert ? 1 / rawPrice : rawPrice;
        const previousClose = rawPrevious ? (invert ? 1 / rawPrevious : rawPrevious) : price;
        const change = price - previousClose;
        const changePercent = previousClose ? (change / previousClose) * 100 : 0;

        return {
          pair: `${base}/${quote}`,
          price,
          change,
          changePercent,
          flags
        };
      })
    );

    res.status(200).json({ rates: results });
  } catch (error) {
    console.error('Forex API Error:', error);
    res.status(500).json({ error: 'Failed to fetch forex data' });
  }
}
