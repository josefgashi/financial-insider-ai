// Simple in-memory cache
let cachedEvents = null;
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Fallback events
const fallbackEvents = [
  { time: '3:30 AM', title: 'RBA Interest Rate Decision', currency: 'AUD', importance: 'high' },
  { time: '4:30 AM', title: 'RBA Press Conference', currency: 'AUD', importance: 'medium' },
  { time: '7:00 AM', title: 'German Trade Balance', currency: 'EUR', importance: 'high' },
  { time: '8:30 AM', title: 'JOLTS Job Openings', currency: 'USD', importance: 'high' },
  { time: '10:00 AM', title: 'Consumer Confidence', currency: 'USD', importance: 'medium' },
  { time: '2:00 PM', title: 'FOMC Meeting Minutes', currency: 'USD', importance: 'high' },
  { time: '4:30 PM', title: 'Fed Chair Powell Speaks', currency: 'USD', importance: 'high' }
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const now = Date.now();
    
    // Check cache
    if (cachedEvents && (now - lastFetchTime) < CACHE_DURATION) {
      return res.status(200).json({ 
        events: cachedEvents,
        cached: true
      });
    }
    
    // Scrape fresh data
    const events = await scrapeForexFactory();
    
    if (events && events.length > 0) {
      cachedEvents = events;
      lastFetchTime = now;
      return res.status(200).json({ 
        events: cachedEvents,
        cached: false
      });
    }
    
    // Fallback
    return res.status(200).json({ 
      events: cachedEvents || fallbackEvents,
      cached: !!cachedEvents
    });
    
  } catch (error) {
    console.error('Calendar error:', error);
    return res.status(200).json({ 
      events: cachedEvents || fallbackEvents
    });
  }
}

async function scrapeForexFactory() {
  try {
    // Get today's date in format: dec9.2025
    const today = new Date();
    const month = today.toLocaleString('en-US', { month: 'short' }).toLowerCase();
    const day = today.getDate();
    const year = today.getFullYear();
    const dateStr = `${month}${day}.${year}`;
    
    console.log('Fetching FF for date:', dateStr);
    
    const response = await fetch(`https://www.forexfactory.com/calendar?day=${dateStr}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Referer': 'https://www.forexfactory.com/',
      }
    });
    
    if (!response.ok) {
      console.error('FF fetch failed:', response.status);
      return null;
    }
    
    const html = await response.text();
    const events = parseHTML(html);
    
    console.log(`Scraped ${events.length} events from Forex Factory`);
    return events;
    
  } catch (error) {
    console.error('Scraper error:', error);
    return null;
  }
}

function parseHTML(html) {
  const events = [];
  
  try {
    // Match calendar rows
    const rowRegex = /<tr[^>]*class="calendar__row[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi;
    const matches = [...html.matchAll(rowRegex)];
    
    for (const match of matches) {
      const rowHtml = match[1];
      
      // Skip date/header rows
      if (rowHtml.includes('calendar__date') || rowHtml.includes('newday')) {
        continue;
      }
      
      // Extract time
      const timeMatch = rowHtml.match(/class="calendar__time[^"]*"[^>]*>([^<]+)</i);
      const time = timeMatch ? timeMatch[1].trim() : null;
      
      // Skip if no time or tentative
      if (!time || time === 'Tentative' || time === 'All Day') {
        continue;
      }
      
      // Extract currency
      const currencyMatch = rowHtml.match(/class="calendar__currency[^"]*"[^>]*>([^<]+)</i);
      const currency = currencyMatch ? currencyMatch[1].trim() : '';
      
      // Extract title  
      const titleMatch = rowHtml.match(/class="calendar__event[^"]*"[^>]*>([^<]+)</i);
      const title = titleMatch ? titleMatch[1].trim() : null;
      
      // Extract importance
      const impactMatches = rowHtml.match(/icon--ff-impact-/gi);
      const impactCount = impactMatches ? impactMatches.length : 0;
      
      let importance = 'low';
      if (impactCount >= 3) importance = 'high';
      else if (impactCount === 2) importance = 'medium';
      
      // Only add medium/high importance events with valid time and title
      if (title && time && importance !== 'low') {
        events.push({
          time: formatTime(time),
          title: cleanTitle(title),
          currency: currency || 'USD',
          importance: importance
        });
      }
    }
    
    return events.slice(0, 20);
    
  } catch (error) {
    console.error('Parse error:', error);
    return [];
  }
}

function formatTime(time) {
  if (!time) return 'TBD';
  
  const cleaned = time.toLowerCase().replace(/\s/g, '');
  const match = cleaned.match(/(\d{1,2}):(\d{2})(am|pm)/);
  
  if (match) {
    const hours = match[1];
    const mins = match[2];
    const period = match[3].toUpperCase();
    return `${hours}:${mins} ${period}`;
  }
  
  return time;
}

function cleanTitle(title) {
  return title
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}
