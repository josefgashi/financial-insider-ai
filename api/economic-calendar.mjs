export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = nextWeek.toISOString().split('T')[0];
    
    const response = await fetch(
      `https://fcsapi.com/api-v3/forex/economy_cal?access_key=${process.env.FCS_API_KEY}&from=${fromDate}&to=${toDate}`
    );
    
    if (!response.ok) {
      throw new Error(`FCS API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Return RAW data so we can see what FCS actually returns
    res.status(200).json({ 
      debug: true,
      fromDate,
      toDate,
      status: data.status,
      totalEvents: data.response ? data.response.length : 0,
      sampleEvents: data.response ? data.response.slice(0, 10) : [],
      allImpacts: data.response ? [...new Set(data.response.map(e => e.impact))] : []
    });
    
  } catch (error) {
    console.error('Economic calendar error:', error);
    res.status(500).json({ error: error.message });
  }
}
