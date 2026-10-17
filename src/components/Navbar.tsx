/**
 * AdPulse Navigation & Status Header (v3.5.1)
 */
import React from 'react';
import { ActiveTab, SecurityConfig } from '../types';
import { Lock, Unlock, ShieldCheck, Terminal, PlayCircle } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  security: SecurityConfig;
  onToggleLock: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  security,
  onToggleLock
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm shadow-indigo-500/20">
            A
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            AdPulse
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            AdSense Engine
          </span>
        </div>

        {/* Zone 2: Navigation Links (Single line, whitespace-nowrap) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onTabChange('overview')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Overview & Stats
          </button>

          <button
            onClick={() => onTabChange('campaigns')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Campaigns & Creatives
          </button>

          <button
            onClick={() => onTabChange('targeting')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'targeting'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Targeting & Segments
          </button>

          <button
            onClick={() => onTabChange('embed')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'embed'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Header Tag & Embed
          </button>

          <button
            onClick={() => onTabChange('simulator')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'simulator'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
            Live Site Preview
          </button>

          <button
            onClick={() => onTabChange('security')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'security'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Security & Access
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (Session Lock / Auth Status) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleLock}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
              security.isUnlocked
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                : 'bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30'
            }`}
            title={security.isUnlocked ? 'Lock Admin Dashboard' : 'Unlock Dashboard'}
          >
            {security.isUnlocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Session Unlocked</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Passcode Locked</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav bar */}
      <div className="md:hidden flex items-center overflow-x-auto py-2 px-4 gap-2 border-t border-slate-800/60 bg-slate-900/60 scrollbar-none">
        {(['overview', 'campaigns', 'targeting', 'embed', 'simulator', 'security'] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap capitalize ${
              activeTab === tab ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'embed' ? 'Header Tag' : tab === 'simulator' ? 'Live Site' : tab}
          </button>
        ))}
      </div>
    </header>
  );
};
