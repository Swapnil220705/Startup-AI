import React, { useState, useEffect } from 'react';
import { Target, BarChart3, Zap, FileText, ArrowRight, Lightbulb, Star, Users, TrendingUp, CheckCircle, Sparkles } from 'lucide-react';
import Header from '../components/Header';

const LandingPage = ({ navigate, isDark, toggleTheme }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const testimonialInterval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 4000);
    return () => clearInterval(testimonialInterval);
  }, []);

  const features = [
    {
      icon: <Target className="w-8 h-8 text-indigo-600" />,
      title: "Lean Canvas Generator",
      description: "Transform your idea into a structured business model with AI-powered insights",
      gradient: "from-indigo-500 to-purple-600"
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-emerald-600" />,
      title: "Competitor Analysis",
      description: "Identify your competition and discover your unique positioning in the market",
      gradient: "from-emerald-500 to-teal-600"
    },
    {
      icon: <Zap className="w-8 h-8 text-blue-600" />,
      title: "MVP & Revenue Planning",
      description: "Get actionable recommendations for your minimum viable product and monetization",
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      icon: <FileText className="w-8 h-8 text-purple-600" />,
      title: "Pitch Deck Export",
      description: "Generate investor-ready presentations with professional templates",
      gradient: "from-purple-500 to-pink-600"
    }
  ];

  const stats = [
    { icon: <Users className="w-8 h-8" />, number: "50K+", label: "Entrepreneurs" },
    { icon: <TrendingUp className="w-8 h-8" />, number: "₹2.5Cr+", label: "Funding Raised" },
    { icon: <Star className="w-8 h-8" />, number: "4.9", label: "User Rating" },
    { icon: <CheckCircle className="w-8 h-8" />, number: "95%", label: "Success Rate" }
  ];

  const testimonials = [
    { name: "Priya Sharma", role: "FinTech Founder", text: "StartupAI helped me validate my idea and secure ₹50L in seed funding within 3 months!" },
    { name: "Rahul Gupta", role: "EdTech Entrepreneur", text: "The Lean Canvas generator saved me weeks of work. My pitch deck was investor-ready instantly." },
    { name: "Ananya Patel", role: "HealthTech CEO", text: "From idea to MVP plan in minutes. This platform is a game-changer for Indian startups." }
  ];

  const benefits = [
    "AI-powered business validation",
    "Investor-ready pitch decks",
    "Market analysis & positioning",
    "Revenue model planning",
    "Competitor intelligence",
    "MVP roadmap creation"
  ];

  return (
    <div className="min-h-screen overflow-hidden">
      <Header navigate={navigate} isDark={isDark} toggleTheme={toggleTheme} />
      
      {/* Hero Section with Enhanced Design */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 ${isDark ? 'bg-indigo-500' : 'bg-indigo-200'} animate-pulse`}></div>
          <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 ${isDark ? 'bg-purple-500' : 'bg-purple-200'} animate-pulse delay-1000`}></div>
          <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full opacity-10 ${isDark ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gradient-to-r from-indigo-300 to-purple-300'} animate-spin`} style={{animationDuration: '20s'}}></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className={`text-center transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-semibold mb-8 shadow-lg">
              <Sparkles className="w-4 h-4" />
              <span>AI-Powered Startup Planning</span>
              <Sparkles className="w-4 h-4" />
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Your AI Co-founder
              </span>
              <br />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>
                for Startup Success
              </span>
            </h1>
            
            <p className={`text-xl md:text-2xl mb-10 max-w-4xl mx-auto leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Transform ideas into pitch-ready business plans in minutes. Get AI-powered insights, 
              structured guidance, and investor presentations that help you <span className="font-semibold text-indigo-600">raise funding faster</span>.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6 mb-12">
              <button
                onClick={() => navigate('/start')}
                className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-5 rounded-2xl text-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center space-x-3"
              >
                <span>Start Building Now</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button className={`px-8 py-4 rounded-2xl text-lg font-semibold border-2 transition-all duration-300 ${isDark ? 'border-gray-600 text-gray-300 hover:border-gray-500 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'}`}>
                Watch Demo
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap justify-center items-center space-x-8 text-sm opacity-75">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500 border-2 border-white"></div>
                  ))}
                </div>
                <span>50K+ entrepreneurs trust us</span>
              </div>
              <div className="flex items-center space-x-1">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-2">4.9/5 rating</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className={`py-16 ${isDark ? 'bg-gray-800/50' : 'bg-gray-50/50'} backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 transition-all duration-300 group-hover:scale-110 ${isDark ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-600'}`}>
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {stat.number}
                </div>
                <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section with Enhanced Cards */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Everything you need
              </span>
              <br />
              <span className={isDark ? 'text-white' : 'text-gray-900'}>
                to validate your startup
              </span>
            </h2>
            <p className={`text-xl ${isDark ? 'text-gray-300' : 'text-gray-600'} max-w-3xl mx-auto leading-relaxed`}>
              Our AI analyzes your idea and generates comprehensive business insights 
              to help you build with confidence and attract investors.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`group relative p-8 rounded-3xl transition-all duration-500 hover:scale-105 cursor-pointer ${isDark ? 'bg-gray-800/50 hover:bg-gray-800/80 border border-gray-700' : 'bg-white hover:bg-gray-50 border border-gray-200'} shadow-lg hover:shadow-2xl backdrop-blur-sm`}
              >
                {/* Gradient Border Effect */}
                <div className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-[1px]`}>
                  <div className={`w-full h-full rounded-3xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}></div>
                </div>
                
                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 bg-gradient-to-r ${feature.gradient} text-white group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-4 group-hover:text-indigo-600 transition-colors">
                    {feature.title}
                  </h3>
                  <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}>
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className={`py-24 ${isDark ? 'bg-gray-800/30' : 'bg-gray-50/50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-3xl md:text-4xl font-bold mb-8">
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Why choose StartupAI?
                </span>
              </h3>
              <div className="grid gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-4 group">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <span className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-700'} group-hover:text-indigo-600 transition-colors`}>
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Testimonial Carousel */}
            <div className={`relative p-8 rounded-3xl ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200'} shadow-xl backdrop-blur-sm`}>
              <div className="absolute top-4 left-8">
                <div className="flex space-x-1">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>
              
              <div className="mt-8">
                <p className={`text-lg mb-6 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  "{testimonials[currentTestimonial].text}"
                </p>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {testimonials[currentTestimonial].name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonials[currentTestimonial].name}</div>
                    <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {testimonials[currentTestimonial].role}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center mt-6 space-x-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentTestimonial(index)}
                    className={`w-2 h-2 rounded-full transition-all ${index === currentTestimonial ? 'bg-indigo-600 w-8' : 'bg-gray-300'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-90"></div>
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full bg-black opacity-20"></div>
          <div className="absolute top-20 left-20 w-32 h-32 rounded-full bg-white opacity-10 animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-24 h-24 rounded-full bg-white opacity-10 animate-pulse delay-1000"></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to build the next big thing?
          </h2>
          <p className="text-xl mb-10 text-white/90 max-w-2xl mx-auto leading-relaxed">
            Join 50,000+ entrepreneurs who have validated their ideas and raised funding 
            with our AI-powered platform. Start your journey today.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button
              onClick={() => navigate('/start')}
              className="group bg-white text-indigo-600 px-10 py-5 rounded-2xl text-lg font-semibold hover:bg-gray-50 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:scale-105 flex items-center space-x-3"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <div className="text-white/80 text-sm">
              ✓ No credit card required  ✓ 7-day free trial  ✓ Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className={`border-t py-16 ${isDark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-4">
                <Lightbulb className="w-8 h-8 text-indigo-600" />
                <span className="text-2xl font-bold">StartupAI</span>
              </div>
              <p className={`text-lg mb-6 max-w-md ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Empowering entrepreneurs with AI-driven business planning and validation tools.
              </p>
              <div className="flex space-x-4">
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} transition-colors cursor-pointer`}>
                  <span className="text-2xl">🇮🇳</span>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} transition-colors cursor-pointer`}>
                  <span className="text-2xl">💼</span>
                </div>
                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} transition-colors cursor-pointer`}>
                  <span className="text-2xl">🚀</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <div className="space-y-3">
                <a href="#" className={`block hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Features</a>
                <a href="#" className={`block hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Pricing</a>
                <a href="#" className={`block hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Templates</a>
                <a href="#" className={`block hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>API</a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <div className="space-y-3">
                <a href="#" className={`block hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>About</a>
                <a href="#" className={`block hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact</a>
                <a href="#" className={`block hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Careers</a>
                <a href="#" className={`block hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Blog</a>
              </div>
            </div>
          </div>
          
          <div className={`pt-8 border-t flex flex-col md:flex-row justify-between items-center ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
            <div className={`text-sm mb-4 md:mb-0 ${isDark ? 'text-gray-500' : 'text-gray-600'}`}>
              © 2025 StartupAI. All rights reserved. Made with ❤️ in India
            </div>
            <div className="flex space-x-6">
              <a href="#" className={`text-sm hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Privacy</a>
              <a href="#" className={`text-sm hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Terms</a>
              <a href="#" className={`text-sm hover:text-indigo-600 transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;