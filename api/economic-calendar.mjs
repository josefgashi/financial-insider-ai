export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const today = new Date();
    const threeDays = new Date(today);
    threeDays.setDate(today.getDate() + 3);
    
    const fromDate = today.toISOString().split('T')[0];
    const toDate = threeDays.toISOString().split('T')[0];
    
    const response = await fetch(
      `https://fcsapi.com/api-v3/forex/economy_cal?access_key=${process.env.FCS_API_KEY}&from=${fromDate}&to=${toDate}`
    );
    
    if (!response.ok) {
      throw new Error(`FCS API failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.response || !Array.isArray(data.response)) {
      res.status(200).json({ events: [] });
      return;
    }
    
    const events = data.response
      .filter(event => {
        const imp = parseInt(event.importance || 0);
        return imp >= 1 && imp <= 3;
      })
      .map(event => {
        const imp = parseInt(event.importance || 0);
        let importance = 'low';
        if (imp === 3) importance = 'high';
        else if (imp === 2) importance = 'high';
        else if (imp === 1) importance = 'medium';
        
        return {
          date: event.date ? event.date.split(' ')[0] : '',
          time: formatTime(event.date || ''),
          title: event.title || 'Event',
          country: event.country || '',
          currency: event.currency || '',
          importance: importance
        };
      })
      .slice(0, 20);
    
    res.status(200).json({ events });
    
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(200).json({ events: [], error: error.message });
  }
}

function formatTime(dateString) {
  if (!dateString) return 'TBD';
  
  try {
    const date = new Date(dateString);
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const min = minutes.toString().padStart(2, '0');
    
    return `${hours}:${min} ${ampm}`;
  } catch (e) {
    return 'TBD';
  }
}
