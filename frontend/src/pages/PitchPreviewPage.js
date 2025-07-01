// src/pages/PitchPreviewPage.jsx
import React from 'react';
import { 
  Download, 
  CheckCircle, 
  Building, 
  Users, 
  TrendingUp 
} from 'lucide-react';
import Header from '../components/Header';

const PitchPreviewPage = ({ navigate, isDark, toggleTheme }) => {
  // Load data from localStorage just like DashboardPage does
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    try {
      // Get all data pieces from localStorage
      const formData = JSON.parse(localStorage.getItem('formData') || '{}');
      const leanCanvas = JSON.parse(localStorage.getItem('leanCanvas') || 'null');
      const mvp = JSON.parse(localStorage.getItem('mvp') || 'null');
      const revenue = JSON.parse(localStorage.getItem('revenue') || 'null');
      const pitch = JSON.parse(localStorage.getItem('pitch') || 'null');
      const personas = JSON.parse(localStorage.getItem('personas') || 'null');
      const competitors = JSON.parse(localStorage.getItem('competitors') || 'null');

      const collectedData = {
        overview: {
          name: formData.name || leanCanvas?.startupName || 'Your Startup',
          industry: formData.domain || leanCanvas?.industry || '',
          problem: formData.problem || leanCanvas?.problem || '',
          solution: formData.solution || leanCanvas?.solution || '',
          audience: formData.audience || leanCanvas?.audience || leanCanvas?.customerSegments || '',
          usp: formData.usp || leanCanvas?.uniqueValueProposition || ''
        },
        leanCanvas: leanCanvas,
        mvp: mvp,
        revenue: revenue,
        pitch: pitch, // This is the AI-generated pitch data
        personas: personas,
        competitors: competitors
      };

      setData(collectedData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading pitch data:', error);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} showNavigation={true} />
        <div className="p-10 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>Loading pitch data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} showNavigation={true} />
        <div className="p-10 text-center">
          <p>No pitch data found. Please go back and generate a new business plan.</p>
          <button 
            onClick={() => navigate('/input')}
            className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Generate New Plan
          </button>
        </div>
      </div>
    );
  }

  // Extract MVP data properly
  const mvpFeatures = data.mvp?.coreFeatures || (Array.isArray(data.mvp) ? data.mvp : []);
  
  // Extract customer segments properly
  const customerSegments = data.leanCanvas?.customerSegments || [data.overview.audience];
  
  const slides = [
    {
      title: "Title Slide",
      content: (
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">{data.overview.name}</h1>
          <p className="text-xl text-indigo-600 mb-8">{data.overview.usp}</p>
          <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className="font-semibold mb-2">AI-Generated Elevator Pitch:</h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'} italic`}>
              {data.pitch?.elevatorPitch || 'No elevator pitch available'}
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Problem → Solution",
      content: (
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-2xl font-bold mb-4 text-red-600">Problem</h3>
            <p className="text-lg">{data.overview.problem}</p>
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-4 text-green-600">Solution</h3>
            <p className="text-lg">{data.overview.solution}</p>
          </div>
        </div>
      )
    },
    {
      title: "Market Opportunity",
      content: (
        <div>
          <h3 className="text-2xl font-bold mb-6">Target Market</h3>
          <p className="text-lg mb-6">{data.overview.audience}</p>
          <div className="grid md:grid-cols-3 gap-4">
            {Array.isArray(customerSegments) ? (
              customerSegments.map((segment, index) => (
                <div key={index} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  {segment}
                </div>
              ))
            ) : (
              <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                {customerSegments || data.overview.audience}
              </div>
            )}
          </div>
        </div>
      )
    },
    {
      title: "Product Overview",
      content: (
        <div>
          <h3 className="text-2xl font-bold mb-6">MVP Features</h3>
          {mvpFeatures.length > 0 ? (
            <div className="space-y-3">
              {mvpFeatures.map((feature, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>{typeof feature === 'string' ? feature : JSON.stringify(feature)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No MVP features available
            </p>
          )}
        </div>
      )
    },
    {
      title: "Monetization",
      content: (
        <div>
          <h3 className="text-2xl font-bold mb-6">Revenue Streams</h3>
          {Array.isArray(data.revenue) && data.revenue.length > 0 ? (
            <div className="space-y-4">
              {data.revenue.map((model, index) => (
                <div key={index} className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">{model.model}</h4>
                    <span className="text-green-600 font-medium">{model.projection}</span>
                  </div>
                  <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{model.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No revenue data available
            </p>
          )}
        </div>
      )
    },
    {
      title: "Competition & Market Position",
      content: (
        <div>
          <h3 className="text-2xl font-bold mb-6">Competitive Advantage</h3>
          <div className="mb-6">
            <h4 className="font-semibold mb-3">Our Unique Value Proposition:</h4>
            <p className="text-lg mb-4">{data.overview.usp}</p>
          </div>
          
          {Array.isArray(data.competitors) && data.competitors.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-semibold mb-3">Key Competitors & Our Advantages:</h4>
              {data.competitors.slice(0, 3).map((competitor, index) => (
                <div key={index} className={`p-3 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{competitor.name || `Competitor ${index + 1}`}</span>
                    <span className="text-green-600 text-sm font-medium">
                      Our Advantage: {competitor.differentiator || 'Unique approach'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              No competitor data available
            </p>
          )}
        </div>
      )
    },
    {
      title: "Next Steps",
      content: (
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-6">Ready to Launch</h3>
          <div className="mb-8">
            <h4 className="font-semibold mb-3">AI-Generated Elevator Pitch:</h4>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'} mb-6`}>
              <p className="text-lg italic">
                {data.pitch?.elevatorPitch || 'Generate a new business plan to get your elevator pitch'}
              </p>
            </div>
          </div>
          
          <p className="text-lg mb-8">
            With this comprehensive business plan, you're ready to start building and validating your startup idea.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Building className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
              <p className="font-medium">Build MVP</p>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="font-medium">Find Customers</p>
            </div>
            <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="font-medium">Raise Funding</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} showNavigation={true} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pitch Deck Preview</h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Investor-ready presentation for {data.overview.name}
            </p>
          </div>
          <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>

        <div className="space-y-8">
          {slides.map((slide, index) => (
            <div key={index} className={`p-8 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Slide {index + 1}: {slide.title}</h2>
                <span className={`px-3 py-1 rounded-full text-sm ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                  {index + 1} of {slides.length}
                </span>
              </div>
              <div className="min-h-64">
                {slide.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PitchPreviewPage;