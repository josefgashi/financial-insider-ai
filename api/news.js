export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    // Fetch Reuters business news RSS feed
    const response = await fetch('https://feeds.reuters.com/reuters/businessNews');
    const xml = await response.text();
    
    // Parse RSS feed
    const items = parseRSS(xml);
    
    // Use Claude API to paraphrase descriptions
    const articles = await Promise.all(
      items.slice(0, 10).map(async item => {
        const summary = await paraphraseWithAI(item.description);
        
        return {
          headline: item.title,
          summary: summary,
          source: 'Reuters',
          link: item.link,
          date: item.pubDate,
          timeAgo: getTimeAgo(item.pubDate)
        };
      })
    );
    
    res.status(200).json({ articles });
    
  } catch (error) {
    console.error('News API Error:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
}

// Simple RSS parser
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXML = match[1];
    
    const title = itemXML.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1] || 
                  itemXML.match(/<title>(.*?)<\/title>/)?.[1];
    const link = itemXML.match(/<link>(.*?)<\/link>/)?.[1];
    const description = itemXML.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/)?.[1] ||
                       itemXML.match(/<description>(.*?)<\/description>/)?.[1];
    const pubDate = itemXML.match(/<pubDate>(.*?)<\/pubDate>/)?.[1];
    
    if (title && link) {
      items.push({ title, link, description: description || '', pubDate });
    }
  }
  
  return items;
}

// Use Claude API to paraphrase
async function paraphraseWithAI(text) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `Paraphrase this news description into 1-2 concise sentences. Keep it factual and neutral. Remove any HTML tags:\n\n${text}`
        }]
      })
    });
    
    const data = await response.json();
    return data.content[0].text;
    
  } catch (error) {
    console.error('AI paraphrase error:', error);
    // Fallback: just strip HTML and truncate
    return text.replace(/<[^>]*>/g, '').substring(0, 150) + '...';
  }
}

// Calculate time ago
function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
