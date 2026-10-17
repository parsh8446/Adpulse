/**
 * AdPulse Analytics & Operations Dashboard (v3.5.1)
 */
import React, { useState } from 'react';
import { AdCreative, AdEventLog } from '../types';
import { formatCurrency, formatNumber } from '../utils/adEngine';
import { 
  Eye, 
  MousePointerClick, 
  Percent, 
  DollarSign, 
  Smartphone, 
  Monitor, 
  Tablet, 
  TrendingUp, 
  ArrowUpRight,
  Filter,
  RefreshCw,
  Activity
} from 'lucide-react';

interface DashboardViewProps {
  campaigns: AdCreative[];
  logs: AdEventLog[];
  onRefreshLogs: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  campaigns,
  logs,
  onRefreshLogs,
  onNavigateToTab
}) => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter logs by category if selected
  const filteredLogs = selectedCategory === 'all' 
    ? logs 
    : logs.filter((l) => l.category === selectedCategory);

  // Compute key stats
  const totalImpressions = filteredLogs.filter((l) => l.eventType === 'impression' || l.eventType === 'viewable_impression').length;
  const viewableImpressions = filteredLogs.filter((l) => l.eventType === 'viewable_impression').length;
  const viewableRate = totalImpressions > 0 ? (viewableImpressions / totalImpressions) * 100 : 0;
  const totalClicks = filteredLogs.filter((l) => l.eventType === 'click').length;
  const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const totalRevenue = filteredLogs.reduce((acc, curr) => acc + (curr.revenue || 0), 0);

  // Device breakdown
  const deviceCounts = {
    desktop: filteredLogs.filter((l) => l.device === 'desktop').length,
    mobile: filteredLogs.filter((l) => l.device === 'mobile').length,
    tablet: filteredLogs.filter((l) => l.device === 'tablet').length,
  };
  const totalDeviceEvents = Math.max(1, deviceCounts.desktop + deviceCounts.mobile + deviceCounts.tablet);

  // Per-ad performance ranking
  const adPerformance = campaigns.map((ad) => {
    const adLogs = filteredLogs.filter((l) => l.adId === ad.id);
    const imps = adLogs.filter((l) => l.eventType === 'impression' || l.eventType === 'viewable_impression').length;
    const viewable = adLogs.filter((l) => l.eventType === 'viewable_impression').length;
    const clicks = adLogs.filter((l) => l.eventType === 'click').length;
    const rev = adLogs.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const adCtr = imps > 0 ? (clicks / imps) * 100 : 0;
    return {
      id: ad.id,
      name: ad.name,
      advertiser: ad.advertiser,
      category: ad.category,
      format: ad.format,
      status: ad.status,
      impressions: imps,
      viewable,
      clicks,
      ctr: adCtr,
      revenue: rev
    };
  }).sort((a, b) => b.impressions - a.impressions);

  // Simulated chart data points (7 intervals)
  const chartPoints = [
    { label: 'Day 1', imps: Math.round(totalImpressions * 0.11), clicks: Math.round(totalClicks * 0.10) },
    { label: 'Day 2', imps: Math.round(totalImpressions * 0.13), clicks: Math.round(totalClicks * 0.12) },
    { label: 'Day 3', imps: Math.round(totalImpressions * 0.16), clicks: Math.round(totalClicks * 0.18) },
    { label: 'Day 4', imps: Math.round(totalImpressions * 0.14), clicks: Math.round(totalClicks * 0.15) },
    { label: 'Day 5', imps: Math.round(totalImpressions * 0.18), clicks: Math.round(totalClicks * 0.19) },
    { label: 'Day 6', imps: Math.round(totalImpressions * 0.15), clicks: Math.round(totalClicks * 0.14) },
    { label: 'Today', imps: Math.round(totalImpressions * 0.13), clicks: Math.round(totalClicks * 0.12) }
  ];

  const maxImp = Math.max(...chartPoints.map((p) => p.imps), 1);

  return (
    <div className="space-y-8">
      {/* Top Banner / Header controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Ad Serving & Performance Hub
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time delivery statistics, MRC viewability tracking, and affiliate conversions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {(['24h', '7d', '30d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timeRange === range
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={onRefreshLogs}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
            title="Refresh Real-time Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Impressions */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Impressions</span>
            <Eye className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {formatNumber(totalImpressions)}
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center">
              +14.2% <TrendingUp className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Raw ad fetch requests served</p>
        </div>

        {/* Metric 2: Verified Viewable Impressions */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">MRC Viewable Rate</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {viewableRate.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-slate-400">
              {formatNumber(viewableImpressions)} in-view
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">50% visible for &gt; 1s</p>
        </div>

        {/* Metric 3: Total Clicks */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Verified Clicks</span>
            <MousePointerClick className="w-4 h-4 text-sky-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {formatNumber(totalClicks)}
            </span>
            <span className="text-xs font-mono text-emerald-400 flex items-center">
              +8.5% <TrendingUp className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Debounced affiliate visits</p>
        </div>

        {/* Metric 4: Click-Through Rate (CTR) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Average CTR</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-white">
              {ctr.toFixed(2)}%
            </span>
            <span className="text-xs font-mono text-emerald-400">
              High Intent
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">AdSense benchmark: ~1.5%</p>
        </div>

        {/* Metric 5: Estimated Affiliate Earnings */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Estimated Revenue</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-amber-300">
              {formatCurrency(totalRevenue)}
            </span>
            <span className="text-xs font-mono text-slate-400">
              EPC ${(totalRevenue / Math.max(1, totalClicks)).toFixed(2)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Direct affiliate commission</p>
        </div>
      </div>

      {/* Main Charts & Segmentation Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart (Span 2) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white">
                Impression & Click Velocity
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Daily volume distribution across all connected ad slots
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500"></span>
                Impressions
              </span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400"></span>
                Clicks (x10 scale)
              </span>
            </div>
          </div>

          {/* SVG Bar / Area visualization */}
          <div className="h-56 w-full flex items-end gap-3 pt-4 pb-2 border-b border-slate-800">
            {chartPoints.map((point, idx) => {
              const impHeight = Math.max(12, Math.round((point.imps / maxImp) * 160));
              const clickHeight = Math.max(6, Math.min(160, Math.round(((point.clicks * 10) / maxImp) * 160)));

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1.5 h-44">
                    {/* Impression Bar */}
                    <div
                      style={{ height: `${impHeight}px` }}
                      className="w-1/2 max-w-[28px] bg-indigo-600/70 hover:bg-indigo-500 rounded-t transition-all relative group-hover:shadow-lg group-hover:shadow-indigo-500/20"
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white text-[10px] font-mono py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap transition-opacity z-10">
                        {point.imps} imps
                      </div>
                    </div>

                    {/* Click Bar */}
                    <div
                      style={{ height: `${clickHeight}px` }}
                      className="w-1/2 max-w-[28px] bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white text-[10px] font-mono py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap transition-opacity z-10">
                        {point.clicks} clicks
                      </div>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400">
                    {point.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Average daily delivery: <strong className="font-mono text-slate-200">{Math.round(totalImpressions / 7)} imps/day</strong></span>
            <button
              onClick={() => onNavigateToTab('simulator')}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              Test Live Ad Rotation &rarr;
            </button>
          </div>
        </div>

        {/* Traffic Segmentation by Device (Span 1) */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">
              Device Traffic Segmentation
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Breakdown of visitors fetching and interacting with your ads
            </p>

            <div className="mt-6 space-y-4">
              {/* Desktop */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                    Desktop (728x90, 160x600)
                  </span>
                  <span className="font-mono tabular-nums text-white font-medium">
                    {Math.round((deviceCounts.desktop / totalDeviceEvents) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${(deviceCounts.desktop / totalDeviceEvents) * 100}%` }}
                  />
                </div>
              </div>

              {/* Mobile */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                    Mobile (320x50, 300x250)
                  </span>
                  <span className="font-mono tabular-nums text-white font-medium">
                    {Math.round((deviceCounts.mobile / totalDeviceEvents) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-500 rounded-full"
                    style={{ width: `${(deviceCounts.mobile / totalDeviceEvents) * 100}%` }}
                  />
                </div>
              </div>

              {/* Tablet */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Tablet className="w-3.5 h-3.5 text-purple-400" />
                    Tablet / Responsive
                  </span>
                  <span className="font-mono tabular-nums text-white font-medium">
                    {Math.round((deviceCounts.tablet / totalDeviceEvents) * 100)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(deviceCounts.tablet / totalDeviceEvents) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 bg-slate-950/40 -mx-6 -mb-6 p-6 rounded-b-xl">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Mobile CTR Optimization</span>
              <span className="text-emerald-400 font-mono font-medium">+2.1% CTR</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Mobile sticky slots and in-feed 300x250 yield the highest conversion rate.
            </p>
          </div>
        </div>
      </div>

      {/* Top Performing Affiliate Campaigns Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Campaign & Creative Performance
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live leaderboard of active affiliate rotations ranked by delivery volume
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="all">All Categories</option>
              <option value="Hosting & Cloud">Hosting & Cloud</option>
              <option value="VPN & Security">VPN & Security</option>
              <option value="SaaS & Productivity">SaaS & Productivity</option>
              <option value="eCommerce & Marketing">eCommerce & Marketing</option>
              <option value="Developer Tools">Developer Tools</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 font-medium">
                <th className="py-3 px-4">Campaign & Sponsor</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Impressions</th>
                <th className="py-3 px-4 text-right">Viewable</th>
                <th className="py-3 px-4 text-right">Clicks</th>
                <th className="py-3 px-4 text-right">CTR</th>
                <th className="py-3 px-4 text-right">Est. Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {adPerformance.map((ad) => (
                <tr key={ad.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-sans">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${ad.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                      {ad.name}
                    </div>
                    <div className="text-[11px] text-slate-400">{ad.advertiser}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {ad.format.replace('_', ' ')}
                  </td>
                  <td className="py-3.5 px-4 font-sans text-slate-300">
                    {ad.category}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-100 tabular-nums">
                    {formatNumber(ad.impressions)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-400 tabular-nums">
                    {formatNumber(ad.viewable)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-sky-400 font-semibold tabular-nums">
                    {formatNumber(ad.clicks)}
                  </td>
                  <td className="py-3.5 px-4 text-right text-purple-400 tabular-nums">
                    {ad.ctr.toFixed(2)}%
                  </td>
                  <td className="py-3.5 px-4 text-right text-amber-300 font-semibold tabular-nums">
                    {formatCurrency(ad.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-Time Live Event Stream */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h2 className="text-base font-semibold text-white">
              Live Ad Server Stream
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Last {Math.min(10, logs.length)} events
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 font-mono text-xs">
          {logs.slice(0, 8).map((log) => {
            const timeAgo = new Date(log.timestamp).toLocaleTimeString();
            return (
              <div key={log.id} className="py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      log.eventType === 'click'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                        : log.eventType === 'viewable_impression'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {log.eventType === 'viewable_impression' ? 'Viewable' : log.eventType}
                  </span>
                  <span className="text-slate-200 font-sans truncate">
                    {log.adName}
                  </span>
                  <span className="text-slate-500 text-[11px] hidden sm:inline">
                    [{log.placementSlot}]
                  </span>
                </div>

                <div className="flex items-center gap-4 text-slate-400 shrink-0">
                  <span className="capitalize text-slate-400 text-[11px]">{log.device}</span>
                  {log.revenue > 0 && (
                    <span className="text-amber-400 font-semibold font-mono">
                      +{formatCurrency(log.revenue)}
                    </span>
                  )}
                  <span className="text-slate-500 text-[11px]">{timeAgo}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
