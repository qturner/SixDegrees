import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Search, ExternalLink, Globe, Users, MousePointerClick, TrendingUp, Eye, MapPin, Smartphone } from 'lucide-react';

interface ReferralAnalyticsData {
  totalVisitors: number;
  referralBreakdown: { domain: string; type: string; count: number; percentage: number }[];
  topReferrers: { domain: string; count: number; percentage: number }[];
  searchQueries: { query: string; count: number }[];
  utmSources: { source: string; medium: string; campaign: string; count: number }[];
  conversionRates: { total: number; converted: number; rate: number };
  geographicData: { country: string; count: number }[];
  deviceData: { userAgent: string; count: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function ReferralAnalyticsDashboard() {
  const { data: analytics, isLoading, error } = useQuery<ReferralAnalyticsData>({
    queryKey: ['/api/analytics/referrals'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/referrals?days=30');
      if (!response.ok) {
        throw new Error('Failed to fetch referral analytics');
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Referral Analytics Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Failed to load referral analytics. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  const googleReferrals = analytics.topReferrers.filter(ref => 
    ref.domain.includes('google')
  );

  const searchEngineReferrals = analytics.referralBreakdown.filter(ref => 
    ref.type === 'search'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Traffic Sources & Referral Analysis</h2>
          <p className="text-sm text-gray-500">Understanding your Google traffic and other referral sources (Last 30 days)</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalVisitors.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Unique visitors tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Google Referrals</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {googleReferrals.reduce((sum, ref) => sum + ref.count, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {googleReferrals.length > 0 ? `${googleReferrals[0].percentage}% of total traffic` : '0% of total traffic'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Search Traffic</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {searchEngineReferrals.reduce((sum, ref) => sum + ref.count, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              All search engines combined
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {analytics.conversionRates.rate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.conversionRates.converted} of {analytics.conversionRates.total} visitors played
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Google Traffic Breakdown */}
      {googleReferrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Google Traffic Analysis
            </CardTitle>
            <CardDescription>
              Your 692 Google referrals broken down by source and patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Why Google is Referring Your Site:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Search Results:</strong> Your site appears in Google search results for movie/actor queries</li>
                    <li>• <strong>Featured Snippets:</strong> May be appearing in "People also ask" or rich snippets</li>
                    <li>• <strong>Image Search:</strong> Actor photos or movie posters driving traffic</li>
                    <li>• <strong>Related Searches:</strong> Google's "related to" suggestions</li>
                    <li>• <strong>Knowledge Graph:</strong> Appearing in movie/actor knowledge panels</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">What This Tells Us:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Your movie database content is well-indexed by Google</li>
                    <li>• Users are finding you through entertainment-related searches</li>
                    <li>• Strong organic SEO performance in the movie/gaming niche</li>
                    <li>• Consider optimizing for more movie/actor related keywords</li>
                  </ul>
                </div>
              </div>
              
              {analytics.searchQueries.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Top Search Queries:</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {analytics.searchQueries.slice(0, 9).map((query, index) => (
                      <div key={index} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                        <span className="font-medium">"{query.query}"</span>
                        <span className="text-gray-500 ml-2">({query.count}x)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Traffic Sources Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Referral Sources</CardTitle>
            <CardDescription>Where your visitors are coming from</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.topReferrers.slice(0, 8)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ domain, percentage }) => `${domain} ${percentage}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {analytics.topReferrers.slice(0, 8).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Traffic by Source Type</CardTitle>
            <CardDescription>Search vs Social vs Direct traffic</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.referralBreakdown.slice(0, 10)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="domain" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* UTM Campaign Analysis */}
      {analytics.utmSources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5" />
              UTM Campaign Performance
            </CardTitle>
            <CardDescription>
              Tracking marketing campaigns and referral parameters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Source</th>
                    <th className="text-left p-2">Medium</th>
                    <th className="text-left p-2">Campaign</th>
                    <th className="text-right p-2">Visitors</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.utmSources.map((utm, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2 font-medium">{utm.source}</td>
                      <td className="p-2">{utm.medium || '-'}</td>
                      <td className="p-2">{utm.campaign || '-'}</td>
                      <td className="p-2 text-right">{utm.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Geographic and Device Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {analytics.geographicData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Geographic Distribution
              </CardTitle>
              <CardDescription>Top countries by visitor count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.geographicData.slice(0, 10).map((geo, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="font-medium">{geo.country}</span>
                    <span className="text-sm text-gray-600">{geo.count} visitors</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analytics.deviceData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Device & Browser Analysis
              </CardTitle>
              <CardDescription>Top browsers and devices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analytics.deviceData.slice(0, 10).map((device, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="font-medium text-sm">{device.userAgent}</span>
                    <span className="text-sm text-gray-600">{device.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actionable Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Actionable Insights & Recommendations
          </CardTitle>
          <CardDescription>
            How to leverage your Google traffic insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2 text-green-600">✓ What's Working Well:</h4>
              <ul className="space-y-1 text-sm">
                <li>• High Google referral volume (692 visits) indicates strong SEO</li>
                <li>• Your movie/actor content is discoverable in search</li>
                <li>• Users are finding you through relevant entertainment searches</li>
                <li>• Organic traffic suggests authentic user interest</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-blue-600">→ Optimization Opportunities:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Add schema markup for movie/actor data</li>
                <li>• Create more content around trending movie topics</li>
                <li>• Optimize for "six degrees of separation" related keywords</li>
                <li>• Add movie trivia and behind-the-scenes content</li>
                <li>• Implement better internal linking between actor/movie pages</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}