/**
 * AdPulse Audience Targeting & Keyword Rule Manager (v3.5.1)
 */
import React, { useState } from 'react';
import { AdCategory, TargetingRule, AdCreative, AdEventLog } from '../types';
import { Plus, Sliders, Target, Check, Trash2, Zap, ArrowRight } from 'lucide-react';

interface TargetingViewProps {
  targetingRules: TargetingRule[];
  onAddRule: (rule: TargetingRule) => void;
  onToggleRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
  campaigns: AdCreative[];
  logs: AdEventLog[];
}

export const TargetingView: React.FC<TargetingViewProps> = ({
  targetingRules,
  onAddRule,
  onToggleRule,
  onDeleteRule,
  campaigns,
  logs
}) => {
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleKeywords, setNewRuleKeywords] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<AdCategory>('Hosting & Cloud');
  const [newRuleBoost, setNewRuleBoost] = useState(60);

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleKeywords.trim()) return;

    const rule: TargetingRule = {
      id: `rule_${Date.now()}`,
      name: newRuleName.trim(),
      keyword: newRuleKeywords.trim(),
      targetCategory: newRuleCategory,
      weightBoost: newRuleBoost,
      active: true
    };

    onAddRule(rule);
    setNewRuleName('');
    setNewRuleKeywords('');
    setNewRuleBoost(60);
  };

  // Category performance stats
  const categories: AdCategory[] = [
    'Hosting & Cloud',
    'VPN & Security',
    'SaaS & Productivity',
    'eCommerce & Marketing',
    'Developer Tools'
  ];

  const categoryStats = categories.map((cat) => {
    const catLogs = logs.filter((l) => l.category === cat);
    const imps = catLogs.filter((l) => l.eventType === 'impression' || l.eventType === 'viewable_impression').length;
    const clicks = catLogs.filter((l) => l.eventType === 'click').length;
    const rev = catLogs.reduce((sum, item) => sum + (item.revenue || 0), 0);
    const ctr = imps > 0 ? (clicks / imps) * 100 : 0;
    const epc = clicks > 0 ? rev / clicks : 0;
    return {
      category: cat,
      impressions: imps,
      clicks,
      ctr,
      revenue: rev,
      epc,
      activeAds: campaigns.filter((c) => c.category === cat && c.status === 'active').length
    };
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Contextual Targeting & Traffic Segmentation
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Match affiliate banners to visitor intent, URL keywords, and content categories for maximum conversion rates.
        </p>
      </div>

      {/* Rules Engine & Active Targeting */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Targeting Rules List (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Context Matching Rules
              </h2>
              <p className="text-xs text-slate-400">
                When a page contains these keywords, matching ads receive an automatic priority boost in rotation.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {targetingRules.filter((r) => r.active).length} Active Rules
            </span>
          </div>

          <div className="space-y-3">
            {targetingRules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                  rule.active
                    ? 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-900/30 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">
                      {rule.name}
                    </span>
                    <span className="text-[11px] font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      +{rule.weightBoost}% Boost
                    </span>
                  </div>

                  <div className="text-xs text-slate-400 mb-2">
                    Targets Category: <strong className="text-slate-200">{rule.targetCategory}</strong>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {rule.keyword.split(',').map((kw, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-mono text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60"
                      >
                        {kw.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onToggleRule(rule.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                      rule.active
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {rule.active ? 'Active' : 'Disabled'}
                  </button>

                  <button
                    onClick={() => onDeleteRule(rule.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                    title="Delete Rule"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add New Rule Form */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 mt-4">
            <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-400" />
              Add Contextual Keyword Rule
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Boost specific affiliate offers whenever articles mention related technologies or products.
            </p>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">Rule Name</label>
                  <input
                    type="text"
                    required
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    placeholder="e.g. AI & Machine Learning Match"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-300 mb-1">Target Category</label>
                  <select
                    value={newRuleCategory}
                    onChange={(e) => setNewRuleCategory(e.target.value as AdCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-300 mb-1">
                    Matching Keywords (comma separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={newRuleKeywords}
                    onChange={(e) => setNewRuleKeywords(e.target.value)}
                    placeholder="e.g. ai, llm, neural, openai, gemini, model"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all"
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Category Performance Breakdown (Span 1) */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-white">
              Category Conversion Efficiency
            </h2>
            <p className="text-xs text-slate-400">
              Live CTR and earnings comparison by affiliate vertical
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl divide-y divide-slate-800/80">
            {categoryStats.map((item) => (
              <div key={item.category} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{item.category}</span>
                  <span className="text-xs font-mono text-slate-400">
                    {item.activeAds} active ads
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">CTR</span>
                    <span className="font-mono text-purple-400 font-semibold">
                      {item.ctr.toFixed(2)}%
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Clicks</span>
                    <span className="font-mono text-sky-400 font-semibold">
                      {item.clicks}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Avg EPC</span>
                    <span className="font-mono text-amber-300 font-semibold">
                      ${item.epc.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${Math.min(100, (item.ctr / 4) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Tip Box */}
          <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4 text-xs text-indigo-300">
            <div className="font-semibold text-indigo-200 flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              Segmentation Best Practice
            </div>
            Targeting relevant affiliate offers to specific article niches typically yields <strong>2.5x higher CTR</strong> than generic programmatic banners.
          </div>
        </div>
      </div>
    </div>
  );
};
