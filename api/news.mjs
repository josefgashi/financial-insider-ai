function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const rssUrl = encodeURIComponent('http://feeds.bbci.co.uk/news/business/rss.xml');
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&api_key=${process.env.RSS2JSON_API_KEY}&count=10`);
    
    if (!response.ok) {
      throw new Error(`RSS fetch failed: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status !== 'ok') {
      throw new Error(`RSS parsing failed: ${data.message}`);
    }
    
    const articles = data.items.map(item => ({
      headline: item.title,
      summary: item.description.replace(/<[^>]*>/g, '').substring(0, 200),
      source: 'BBC Business',
      link: item.link,
      date: item.pubDate,
      timeAgo: getTimeAgo(item.pubDate)
    }));
    
    res.status(200).json({ articles });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
