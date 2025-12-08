function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

// Source reputation scores
const sourceScores = {
  'Wall Street Journal': 10,
  'Financial Times': 10,
  'Bloomberg': 10,
  'Reuters': 9,
  'The Economist': 9,
  'Dow Jones': 9,
  'Forbes': 8,
  'Fortune': 8,
  'CNBC': 8,
  'MarketWatch': 7,
  'Barrons': 7,
  'Business Insider': 6,
  'CNN Business': 6,
  'Seeking Alpha': 6,
  'Benzinga': 5,
  'Investing.com': 5,
  'TheStreet': 5,
  'Motley Fool': 5,
  'Nasdaq': 6,
  'BBC Business': 7
};

async function scoreArticleImportance(headline, summary, source) {
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
        max_tokens: 50,
        messages: [{
          role: 'user',
          content: `Rate this financial news headline's importance for investors on a scale of 1-10 (10 = extremely market-moving, 1 = not important). Only respond with a number.

Headline: ${headline}
Summary: ${summary}

Rating:`
        }]
      })
    });
    
    if (!response.ok) return 5;
    
    const data = await response.json();
    const scoreText = data.content[0].text.trim();
    const score = parseInt(scoreText.match(/\d+/)?.[0] || '5');
    
    return Math.min(Math.max(score, 1), 10);
    
  } catch (error) {
    console.error('AI scoring error:', error);
    return 5;
  }
}

async function fetchFromSource(sourceUrl, sourceName) {
  try {
    const rssUrl = encodeURIComponent(sourceUrl);
    const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}&api_key=${process.env.RSS2JSON_API_KEY}&count=5`);
    
    if (!response.ok) {
      console.log(`${sourceName} fetch failed`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.status !== 'ok') {
      console.log(`${sourceName} parse failed:`, data.message);
      return [];
    }
    
    return data.items.map(item => ({
      headline: item.title,
      summary: item.description.replace(/<[^>]*>/g, '').substring(0, 200),
      source: sourceName,
      link: item.link,
      date: item.pubDate,
      timeAgo: getTimeAgo(item.pubDate)
    }));
  } catch (error) {
    console.error(`Error fetching ${sourceName}:`, error);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const sources = [
      { url: 'http://feeds.bbci.co.uk/news/business/rss.xml', name: 'BBC Business' },
      { url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', name: 'CNBC' },
      { url: 'http://feeds.marketwatch.com/marketwatch/topstories/', name: 'MarketWatch' },
      { url: 'https://www.ft.com/?format=rss', name: 'Financial Times' },
      { url: 'https://www.investing.com/rss/news.rss', name: 'Investing.com' },
      { url: 'https://seekingalpha.com/feed.xml', name: 'Seeking Alpha' },
      { url: 'https://www.fool.com/feeds/index.aspx', name: 'Motley Fool' },
      { url: 'https://www.businessinsider.com/rss', name: 'Business Insider' },
      { url: 'https://fortune.com/feed', name: 'Fortune' },
      { url: 'https://www.forbes.com/real-time/feed2/', name: 'Forbes' },
      { url: 'https://www.economist.com/finance-and-economics/rss.xml', name: 'The Economist' },
      { url: 'https://www.wsj.com/xml/rss/3_7014.xml', name: 'Wall Street Journal' },
      { url: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml', name: 'Dow Jones' },
      { url: 'https://www.barrons.com/rss', name: 'Barrons' },
      { url: 'https://www.thestreet.com/rss/index.rss', name: 'TheStreet' },
      { url: 'https://www.nasdaq.com/feed/rssoutbound', name: 'Nasdaq' },
      { url: 'https://www.benzinga.com/feed', name: 'Benzinga' }
    ];
    
    const allArticles = await Promise.all(
      sources.map(source => fetchFromSource(source.url, source.name))
    );
    
    let flatArticles = allArticles.flat().filter(article => article.headline);
    
    console.log(`Fetched ${flatArticles.length} articles, scoring importance...`);
    
    // Score each article
    const scoredArticles = await Promise.all(
      flatArticles.map(async (article) => {
        const aiScore = await scoreArticleImportance(article.headline, article.summary, article.source);
        const sourceScore = sourceScores[article.source] || 5;
        
        // Enhanced recency scoring
        const hoursOld = (Date.now() - new Date(article.date)) / (1000 * 60 * 60);
        let recencyScore = 10;
        
        if (hoursOld < 1) recencyScore = 10;      // Last hour: 10 points
        else if (hoursOld < 3) recencyScore = 8;   // 1-3 hours: 8 points
        else if (hoursOld < 6) recencyScore = 6;   // 3-6 hours: 6 points
        else if (hoursOld < 12) recencyScore = 4;  // 6-12 hours: 4 points
        else if (hoursOld < 24) recencyScore = 2;  // 12-24 hours: 2 points
        else recencyScore = 0;                     // Older: 0 points
        
        // Weighted scoring: Recency 50%, AI importance 30%, Source 20%
        const finalScore = (recencyScore * 0.5) + (aiScore * 0.3) + (sourceScore * 0.2);
        
        return {
          ...article,
          importanceScore: finalScore
        };
      })
    );
    
    // Sort by final score (highest first)
    const sortedArticles = scoredArticles
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .slice(0, 20);
    
    const articles = sortedArticles.map(({ importanceScore, ...article }) => article);
    
    console.log(`Returning ${articles.length} articles sorted by recency + importance`);
    
    res.status(200).json({ articles });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
}
