// src/utils/mockData.js
export const mockDashboardData = {
  overview: {
    name: "EcoTrack",
    problem: "Small businesses struggle to track and reduce their carbon footprint",
    solution: "AI-powered sustainability tracking platform with actionable insights",
    audience: "Small to medium businesses (10-500 employees)",
    usp: "First AI assistant that gamifies sustainability goals for teams"
  },
  leanCanvas: {
    problem: ["High energy costs", "Lack of sustainability tracking", "Complex reporting requirements"],
    solution: ["Real-time energy monitoring", "AI-powered recommendations", "Automated compliance reports"],
    customerSegments: ["SME restaurants", "Retail chains", "Tech startups"],
    keyMetrics: ["Monthly energy savings", "Carbon reduction %", "User engagement rate"],
    uniqueValueProp: "Turn sustainability into a competitive advantage with AI",
    channels: ["Direct sales", "Partner integrations", "Content marketing"],
    revenueStreams: ["SaaS subscriptions", "Premium analytics", "Consultation services"],
    costStructure: ["AI infrastructure", "Sales team", "Marketing"],
    unfairAdvantage: ["Proprietary AI models", "First-mover advantage", "Industry partnerships"]
  },
  mvp: [
    "Energy consumption dashboard with real-time monitoring",
    "Basic AI recommendations for energy savings",
    "Simple carbon footprint calculator",
    "Weekly sustainability reports"
  ],
  monetization: [
    { model: "Freemium SaaS", description: "Basic tracking free, advanced AI features paid", projection: "$50-200/month per business" },
    { model: "Enterprise", description: "Custom solutions for larger organizations", projection: "$500-2000/month" },
    { model: "API Access", description: "White-label solution for other platforms", projection: "$0.10 per API call" }
  ],
  competitors: [
    { name: "EcoVadis", description: "Enterprise sustainability ratings", differentiator: "More affordable, SME-focused" },
    { name: "Sustainability Cloud", description: "Salesforce sustainability module", differentiator: "Standalone solution, easier setup" },
    { name: "Plan A", description: "Carbon management platform", differentiator: "AI-powered recommendations vs manual tracking" }
  ],
  personas: [
    { name: "Sarah Chen", age: 34, occupation: "Restaurant Owner", painPoints: ["Rising energy costs", "Time-consuming compliance", "Lack of sustainability expertise"] },
    { name: "Mike Rodriguez", age: 28, occupation: "Operations Manager", painPoints: ["Manual data collection", "Unclear ROI on green initiatives", "Complex reporting tools"] }
  ]
};

export const mockPlans = [
  { id: 1, name: "EcoTrack", domain: "Sustainability", created: "2024-06-20", status: "Complete" },
  { id: 2, name: "HealthBot", domain: "HealthTech", created: "2024-06-18", status: "Draft" },
  { id: 3, name: "EduStream", domain: "EdTech", created: "2024-06-15", status: "Complete" }
];

export const businessDomains = [
  'HealthTech', 'FinTech', 'EdTech', 'E-commerce', 'SaaS', 'Marketplace', 
  'Gaming', 'Social Media', 'IoT', 'AI/ML', 'Sustainability', 'Other'
];