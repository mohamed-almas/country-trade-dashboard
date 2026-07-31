import { useState } from 'react';
import { useTheme } from '../lib/ThemeContext';
import { Newspaper, ExternalLink, Calendar, TrendingUp } from 'lucide-react';

export function TradeNewsPage() {
  const { isDark } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = ['all', 'geopolitical', 'economic', 'trade-policy', 'commodities', 'shipping'];

  const newsArticles = [
    {
      id: 1,
      title: 'Global Trade Volume Reaches Record High in 2024',
      category: 'economic',
      date: '2024-12-15',
      source: 'World Trade Organization',
      excerpt: 'International trade flows exceeded expectations with a 4.2% growth rate, driven by strong performance in Asia-Pacific region and recovery in manufacturing sectors.',
      url: '#',
      trending: true
    },
    {
      id: 2,
      title: 'New Trade Agreement Between EU and ASEAN Takes Effect',
      category: 'trade-policy',
      date: '2024-12-10',
      source: 'Trade Policy Review',
      excerpt: 'The comprehensive free trade agreement aims to reduce tariffs by 95% over the next five years, potentially affecting $300 billion in annual trade.',
      url: '#',
      trending: true
    },
    {
      id: 3,
      title: 'Commodity Prices Show Mixed Signals Amid Supply Chain Adjustments',
      category: 'commodities',
      date: '2024-12-08',
      source: 'Commodity Markets Daily',
      excerpt: 'Energy prices stabilized while agricultural commodities experienced volatility due to weather patterns and shifting demand dynamics.',
      url: '#',
      trending: false
    },
    {
      id: 4,
      title: 'Shipping Costs Normalize After Three Years of Disruption',
      category: 'shipping',
      date: '2024-12-05',
      source: 'Maritime Economics Journal',
      excerpt: 'Container shipping rates return to pre-pandemic levels as port congestion eases and vessel capacity increases.',
      url: '#',
      trending: false
    },
    {
      id: 5,
      title: 'Emerging Markets Drive Growth in South-South Trade',
      category: 'economic',
      date: '2024-12-01',
      source: 'International Trade Centre',
      excerpt: 'Trade between developing nations grew by 8.5%, outpacing traditional North-South corridors and reshaping global trade patterns.',
      url: '#',
      trending: true
    },
    {
      id: 6,
      title: 'Digital Trade Regulations Create New Compliance Challenges',
      category: 'trade-policy',
      date: '2024-11-28',
      source: 'Global Trade Compliance',
      excerpt: 'New data localization requirements and digital service taxes force companies to adapt cross-border e-commerce strategies.',
      url: '#',
      trending: false
    },
    {
      id: 7,
      title: 'Geopolitical Tensions Shift Supply Chain Strategies',
      category: 'geopolitical',
      date: '2024-11-25',
      source: 'Global Affairs Analysis',
      excerpt: 'Companies accelerate near-shoring and friend-shoring initiatives to reduce exposure to geopolitical risks and enhance supply chain resilience.',
      url: '#',
      trending: true
    },
    {
      id: 8,
      title: 'Green Trade Initiatives Gain Momentum at Climate Conference',
      category: 'trade-policy',
      date: '2024-11-20',
      source: 'Environmental Trade Monitor',
      excerpt: 'Over 40 countries commit to carbon border adjustment mechanisms and sustainable trade practices by 2026.',
      url: '#',
      trending: false
    }
  ];

  const filteredNews = selectedCategory === 'all'
    ? newsArticles
    : newsArticles.filter(article => article.category === selectedCategory);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <Newspaper className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trade News & Analysis</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Filter by Category</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : isDark
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredNews.map(article => (
          <div
            key={article.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {article.trending && (
                    <span className="flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded">
                      <TrendingUp className="w-3 h-3" />
                      Trending
                    </span>
                  )}
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded">
                    {article.category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {article.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <span className="font-semibold">{article.source}</span>
            </div>

            <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-3">
              {article.excerpt}
            </p>

            <a
              href={article.url}
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold transition-colors"
            >
              Read Full Article
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ))}
      </div>

      {filteredNews.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
          <Newspaper className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No articles found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try selecting a different category to view more articles.
          </p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">About Trade News</h2>
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-gray-700 dark:text-gray-300">
            Stay informed with the latest developments in global trade, including geopolitical analysis,
            economic trends, trade policy updates, commodity market movements, and shipping industry news.
            Our curated selection brings you insights from leading trade publications and international organizations.
          </p>
          <p className="text-gray-700 dark:text-gray-300 mt-3">
            <strong>Note:</strong> This is a demonstration page. In production, articles would be fetched from
            news APIs such as NewsAPI, Bloomberg, Reuters, or custom RSS feeds tailored to trade and commerce topics.
          </p>
        </div>
      </div>
    </div>
  );
}
