/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * AdPulse Self-Hosted Ad Network Dashboard (v3.5.1)
 */

import React, { useState, useEffect } from 'react';
import { ActiveTab, AdCreative, AdEventLog, DeliveryConfig, SecurityConfig, TargetingRule } from './types';
import { 
  INITIAL_CAMPAIGNS, 
  INITIAL_DELIVERY_CONFIG,
  INITIAL_SECURITY_CONFIG, 
  INITIAL_TARGETING_RULES, 
  generateHistoricLogs 
} from './data/initialData';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { CampaignsView } from './components/CampaignsView';
import { TargetingView } from './components/TargetingView';
import { EmbedCenterView } from './components/EmbedCenterView';
import { LiveSimulatorView } from './components/LiveSimulatorView';
import { SecurityView } from './components/SecurityView';
import { CreativePreviewModal } from './components/CreativePreviewModal';
import { PasscodeLockModal } from './components/PasscodeLockModal';

export default function App() {
  // 1. Navigation state
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // 2. Persistent State initialization with fallback
  const [campaigns, setCampaigns] = useState<AdCreative[]>(() => {
    try {
      const saved = localStorage.getItem('adpulse_campaigns');
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return INITIAL_CAMPAIGNS;
    } catch {
      return INITIAL_CAMPAIGNS;
    }
  });

  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig>(() => {
    try {
      const saved = localStorage.getItem('adpulse_delivery_config');
      return saved ? JSON.parse(saved) : INITIAL_DELIVERY_CONFIG;
    } catch {
      return INITIAL_DELIVERY_CONFIG;
    }
  });

  const [syncState, setSyncState] = useState<{
    status: 'synced' | 'syncing' | 'error' | 'idle';
    lastSyncTime?: string;
  }>({
    status: 'idle',
    lastSyncTime: 'Ready'
  });

  const [targetingRules, setTargetingRules] = useState<TargetingRule[]>(() => {
    try {
      const saved = localStorage.getItem('adpulse_targeting_rules');
      return saved ? JSON.parse(saved) : INITIAL_TARGETING_RULES;
    } catch {
      return INITIAL_TARGETING_RULES;
    }
  });

  const [security, setSecurity] = useState<SecurityConfig>(() => {
    let cfg = INITIAL_SECURITY_CONFIG;
    try {
      const saved = localStorage.getItem('adpulse_security');
      if (saved) {
        const parsed = JSON.parse(saved);
        cfg = { ...cfg, ...parsed };
      }
    } catch {}

    const sessionPasscode = sessionStorage.getItem('adpulse_admin_passcode');
    if (sessionPasscode) {
      cfg.masterPasscode = sessionPasscode;
    }

    // Check if current browser session is already unlocked
    const isSessionUnlocked = sessionStorage.getItem('adpulse_dashboard_unlocked') === 'true';
    return {
      ...cfg,
      isUnlocked: cfg.isPasscodeProtected ? isSessionUnlocked : true
    };
  });

  const [logs, setLogs] = useState<AdEventLog[]>(() => {
    try {
      const saved = localStorage.getItem('adpulse_event_logs');
      return saved ? JSON.parse(saved) : generateHistoricLogs();
    } catch {
      return generateHistoricLogs();
    }
  });

  // Modal states
  const [previewAd, setPreviewAd] = useState<AdCreative | null>(null);

  // Background Server Sync function with master passcode authentication
  const pushCampaignsToServer = async (cList: AdCreative[]) => {
    try {
      setSyncState((prev) => ({ ...prev, status: 'syncing' }));
      const activePasscode = security.masterPasscode || '2026';
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-adpulse-passcode': activePasscode
        },
        body: JSON.stringify(cList)
      });
      if (res.ok) {
        setSyncState({
          status: 'synced',
          lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });
      } else {
        setSyncState((prev) => ({ ...prev, status: 'idle' }));
      }
    } catch {
      setSyncState((prev) => ({ ...prev, status: 'idle' }));
    }
  };

  const handleClearAllCampaigns = () => {
    setCampaigns([]);
    try {
      localStorage.setItem('adpulse_campaigns', JSON.stringify([]));
    } catch {}
    pushCampaignsToServer([]);
  };

  const handleRestoreDefaultCampaigns = () => {
    setCampaigns(INITIAL_CAMPAIGNS);
    try {
      localStorage.setItem('adpulse_campaigns', JSON.stringify(INITIAL_CAMPAIGNS));
    } catch {}
    pushCampaignsToServer(INITIAL_CAMPAIGNS);
  };

  // Initial sync with backend /api/campaigns
  useEffect(() => {
    const savedLocal = localStorage.getItem('adpulse_campaigns');
    if (savedLocal !== null) {
      try {
        const parsed = JSON.parse(savedLocal);
        pushCampaignsToServer(parsed);
      } catch (e) {}
      return;
    }

    // Only fetch from server if local storage was never initialized
    fetch('/api/campaigns')
      .then((res) => {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.json();
      })
      .then((serverCampaigns) => {
        if (Array.isArray(serverCampaigns)) {
          setCampaigns(serverCampaigns);
          setSyncState({
            status: 'synced',
            lastSyncTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          });
        }
      })
      .catch(() => {
        setSyncState({ status: 'idle', lastSyncTime: 'Local Storage' });
      });
  }, []);

  // Sync state to localStorage & server
  useEffect(() => {
    try {
      localStorage.setItem('adpulse_campaigns', JSON.stringify(campaigns));
    } catch (e) {
      console.warn('Failed to save campaigns to localStorage', e);
    }
    pushCampaignsToServer(campaigns);
  }, [campaigns]);

  useEffect(() => {
    try {
      localStorage.setItem('adpulse_delivery_config', JSON.stringify(deliveryConfig));
    } catch (e) {}
  }, [deliveryConfig]);

  useEffect(() => {
    try {
      localStorage.setItem('adpulse_targeting_rules', JSON.stringify(targetingRules));
    } catch (e) {
      console.warn('Failed to save rules to localStorage', e);
    }
  }, [targetingRules]);

  useEffect(() => {
    try {
      localStorage.setItem('adpulse_security', JSON.stringify(security));
    } catch (e) {
      console.warn('Failed to save security to localStorage', e);
    }
  }, [security]);

  useEffect(() => {
    try {
      localStorage.setItem('adpulse_event_logs', JSON.stringify(logs.slice(0, 500)));
    } catch (e) {
      console.warn('Failed to save logs to localStorage', e);
    }
  }, [logs]);

  // Campaign Handlers
  const handleAddCampaign = (newAd: AdCreative) => {
    setCampaigns([newAd, ...campaigns]);
  };

  const handleUpdateCampaign = (updatedAd: AdCreative) => {
    setCampaigns(campaigns.map((c) => (c.id === updatedAd.id ? updatedAd : c)));
  };

  const handleDeleteCampaign = (id: string) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      setCampaigns(campaigns.filter((c) => c.id !== id));
    }
  };

  const handleImportCampaigns = (imported: AdCreative[]) => {
    setCampaigns(imported);
  };

  const handleBulkImportAds = (newAds: AdCreative[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setCampaigns(newAds);
    } else {
      setCampaigns([...newAds, ...campaigns]);
    }
  };

  // Targeting Rules Handlers
  const handleAddRule = (newRule: TargetingRule) => {
    setTargetingRules([...targetingRules, newRule]);
  };

  const handleToggleRule = (id: string) => {
    setTargetingRules(
      targetingRules.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const handleDeleteRule = (id: string) => {
    setTargetingRules(targetingRules.filter((r) => r.id !== id));
  };

  // Security Handlers
  const handleUpdateSecurity = async (updatedSecurity: SecurityConfig) => {
    setSecurity(updatedSecurity);
    try {
      localStorage.setItem('adpulse_security', JSON.stringify(updatedSecurity));
      await fetch('/api/security/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-adpulse-passcode': security.masterPasscode
        },
        body: JSON.stringify({
          newPasscode: updatedSecurity.masterPasscode,
          allowedDomains: updatedSecurity.allowedDomains,
          blockUnlistedDomains: updatedSecurity.blockUnlistedDomains,
          isPasscodeProtected: updatedSecurity.isPasscodeProtected
        })
      });
    } catch (e) {
      console.warn('Could not sync security update with server:', e);
    }
  };

  const handleLockNow = () => {
    try {
      sessionStorage.removeItem('adpulse_dashboard_unlocked');
      sessionStorage.removeItem('adpulse_admin_passcode');
    } catch {}
    setSecurity((prev) => ({ ...prev, isUnlocked: false }));
  };

  const handleUnlockSuccess = (verifiedPasscode: string) => {
    try {
      sessionStorage.setItem('adpulse_dashboard_unlocked', 'true');
      sessionStorage.setItem('adpulse_admin_passcode', verifiedPasscode);
    } catch {}
    setSecurity((prev) => ({ 
      ...prev, 
      masterPasscode: verifiedPasscode,
      isUnlocked: true 
    }));
  };

  const handleToggleNavbarLock = () => {
    if (security.isUnlocked) {
      handleLockNow();
    } else {
      // Prompt modal will open
    }
  };

  // Event recording
  const handleRecordEvent = (eventData: Omit<AdEventLog, 'id'>) => {
    const newLog: AdEventLog = {
      ...eventData,
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 499)]);
  };

  const handleRefreshLogs = () => {
    // Inject a quick fresh impression/click event to show live update
    const randomAd = campaigns[Math.floor(Math.random() * campaigns.length)];
    if (randomAd) {
      handleRecordEvent({
        adId: randomAd.id,
        adName: randomAd.name,
        eventType: 'impression',
        timestamp: new Date().toISOString(),
        device: 'desktop',
        category: randomAd.category,
        placementSlot: 'auto_header',
        pageUrl: 'https://mysite.com/',
        revenue: 0
      });
    }
  };

  const isScreenLocked = security.isPasscodeProtected && !security.isUnlocked;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Strict Top Bar Contract */}
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (isScreenLocked) return;
          setActiveTab(tab);
        }}
        security={security}
        onToggleLock={handleToggleNavbarLock}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Render Active View */}
        {activeTab === 'overview' && (
          <DashboardView
            campaigns={campaigns}
            logs={logs}
            onRefreshLogs={handleRefreshLogs}
            onNavigateToTab={(tab) => setActiveTab(tab)}
          />
        )}

        {activeTab === 'campaigns' && (
          <CampaignsView
            campaigns={campaigns}
            onAddCampaign={handleAddCampaign}
            onUpdateCampaign={handleUpdateCampaign}
            onDeleteCampaign={handleDeleteCampaign}
            onPreviewAd={(ad) => setPreviewAd(ad)}
            onBulkImportAds={handleBulkImportAds}
            onClearAllCampaigns={handleClearAllCampaigns}
            onRestoreDefaultCampaigns={handleRestoreDefaultCampaigns}
          />
        )}

        {activeTab === 'targeting' && (
          <TargetingView
            targetingRules={targetingRules}
            onAddRule={handleAddRule}
            onToggleRule={handleToggleRule}
            onDeleteRule={handleDeleteRule}
            campaigns={campaigns}
            logs={logs}
          />
        )}

        {activeTab === 'embed' && (
          <EmbedCenterView
            campaigns={campaigns}
            security={security}
            deliveryConfig={deliveryConfig}
            onUpdateDeliveryConfig={setDeliveryConfig}
            syncState={syncState}
            onForceSync={() => pushCampaignsToServer(campaigns)}
            onImportCampaigns={handleImportCampaigns}
          />
        )}

        {activeTab === 'simulator' && (
          <LiveSimulatorView
            campaigns={campaigns}
            targetingRules={targetingRules}
            onRecordEvent={handleRecordEvent}
            debounceSeconds={security.clickDebounceSeconds}
          />
        )}

        {activeTab === 'security' && (
          <SecurityView
            security={security}
            onUpdateSecurity={handleUpdateSecurity}
            onLockNow={handleLockNow}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>AdPulse Self-Hosted Ad Engine · Ready for Cloudflare Pages & Git</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab('embed')}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Get Header Script
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Security Settings
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              Live Sandbox
            </button>
          </div>
        </div>
      </footer>

      {/* Modal: Full Creative Preview */}
      <CreativePreviewModal
        ad={previewAd}
        onClose={() => setPreviewAd(null)}
      />

      {/* Modal: Master Passcode Lock Gate */}
      {isScreenLocked && (
        <PasscodeLockModal
          onUnlock={handleUnlockSuccess}
        />
      )}
    </div>
  );
}
