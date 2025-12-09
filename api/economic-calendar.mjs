export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Fetch economic calendar from FCS API
    const response = await fetch(
      `https://fcsapi.com/api-v3/forex/economy_cal?access_key=${process.env.FCS_API_KEY}&from=${today}&to=${today}`
    );
    
    if (!response.ok) {
      throw new Error(`FCS API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.response || data.status === false) {
      throw new Error('Invalid FCS API response');
    }
    
    // Filter and format the events
    const events = data.response
      .filter(event => {
        // Only show high and medium importance events
        return event.impact === 'High' || event.impact === 'Medium';
      })
      .map(event => ({
        time: formatTime(event.date),
        title: event.title,
        country: event.country,
        importance: event.impact.toLowerCase(),
        forecast: event.forecast || '—',
        previous: event.previous || '—',
        actual: event.actual || '—'
      }))
      .sort((a, b) => {
        // Sort by time
        const timeA = new Date('1970/01/01 ' + a.time);
        const timeB = new Date('1970/01/01 ' + b.time);
        return timeA - timeB;
      });
    
    res.status(200).json({ events });
    
  } catch (error) {
    console.error('Economic calendar error:', error);
    res.status(500).json({ error: error.message });
  }
}

function formatTime(dateString) {
  // Convert "2025-12-08 08:30:00" to "8:30 AM EST"
  const date = new Date(dateString);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${displayHours}:${displayMinutes} ${ampm} EST`;
}
