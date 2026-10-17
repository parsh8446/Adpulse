/**
 * AdPulse Creative Preview Modal (v3.5.1)
 */
import React, { useState } from 'react';
import { AdCreative } from '../types';
import { X, Copy, Check, ExternalLink, Smartphone, Monitor } from 'lucide-react';

interface CreativePreviewModalProps {
  ad: AdCreative | null;
  onClose: () => void;
}

export const CreativePreviewModal: React.FC<CreativePreviewModalProps> = ({
  ad,
  onClose
}) => {
  if (!ad) return null;

  const [copiedLink, setCopiedLink] = useState(false);
  const accent = ad.accentColor || '#4F46E5';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(ad.destinationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                {ad.advertiser}
              </span>
              <span>·</span>
              <span className="text-xs text-indigo-400 font-medium">
                {ad.category}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-0.5">
              {ad.name}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Affiliate link bar */}
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-slate-500 shrink-0 font-medium">Affiliate Link:</span>
            <span className="text-xs font-mono text-slate-300 truncate">
              {ad.destinationUrl}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? 'Copied' : 'Copy'}
            </button>

            <a
              href={ad.destinationUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Test
            </a>
          </div>
        </div>

        {/* Format Previews */}
        <div className="space-y-6">
          {/* 1. 728x90 Leaderboard */}
          <div>
            <span className="text-xs font-mono font-semibold text-slate-400 mb-2 block">
              1. Leaderboard (728×90 Desktop Header/Footer)
            </span>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-4 max-w-[728px] overflow-hidden">
              {ad.imageUrl && (
                <img
                  src={ad.imageUrl}
                  alt=""
                  className="w-14 h-14 rounded-md object-cover shrink-0 border border-slate-800"
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {ad.badgeText && (
                    <span
                      style={{ backgroundColor: accent }}
                      className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded uppercase"
                    >
                      {ad.badgeText}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-semibold">{ad.advertiser}</span>
                  <span className="text-[10px] text-slate-500">Sponsored</span>
                </div>
                <div className="text-sm font-bold text-white truncate">{ad.headline}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{ad.description}</div>
                {ad.price && (
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-emerald-400 font-mono font-bold text-xs">{ad.price}</span>
                    {ad.originalPrice && <span className="text-slate-500 font-mono line-through text-[10px]">{ad.originalPrice}</span>}
                  </div>
                )}
              </div>
              <button
                type="button"
                style={{ backgroundColor: accent }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white rounded-md shrink-0 shadow-sm"
              >
                {ad.callToAction} &rarr;
              </button>
            </div>
          </div>

          {/* 2. 300x250 Medium Rectangle & 320x50 Mobile */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <span className="text-xs font-mono font-semibold text-slate-400 mb-2 block">
                2. Medium Rectangle (300×250 In-Content / Sidebar)
              </span>
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg max-w-[300px] h-[270px] flex flex-col justify-between">
                <div>
                  {ad.imageUrl ? (
                    <div className="h-24 w-full rounded-md overflow-hidden bg-slate-900 border border-slate-800 mb-2">
                      <img
                        src={ad.imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLElement).parentElement!.style.display = 'none'; }}
                      />
                    </div>
                  ) : null}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-400">{ad.advertiser}</span>
                    {ad.badgeText && (
                      <span
                        style={{ backgroundColor: accent }}
                        className="text-[9px] font-bold text-white px-2 py-0.5 rounded uppercase"
                      >
                        {ad.badgeText}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1 line-clamp-1 leading-snug">
                    {ad.headline}
                  </h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {ad.description}
                  </p>
                  {ad.price && (
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-emerald-400 font-mono font-bold text-xs">{ad.price}</span>
                      {ad.originalPrice && <span className="text-slate-500 font-mono line-through text-[10px]">{ad.originalPrice}</span>}
                    </div>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    style={{ backgroundColor: accent }}
                    className="w-full py-1.5 text-xs font-semibold text-white rounded-md shadow-sm"
                  >
                    {ad.callToAction} &rarr;
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-mono font-semibold text-slate-400 mb-2 block">
                  3. Mobile Leaderboard (320×50 Smartphone Sticky)
                </span>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg max-w-[320px] h-[58px] flex items-center justify-between gap-2 overflow-hidden">
                  {ad.imageUrl && (
                    <img
                      src={ad.imageUrl}
                      alt=""
                      className="w-9 h-9 rounded object-cover shrink-0 border border-slate-800"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white truncate leading-tight">
                      {ad.headline}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      {ad.advertiser} · {ad.price || 'Sponsored'}
                    </div>
                  </div>
                  <button
                    type="button"
                    style={{ backgroundColor: accent }}
                    className="px-2 py-1 text-[10px] font-semibold text-white rounded shrink-0"
                  >
                    {ad.callToAction}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-xs font-mono font-semibold text-slate-400 mb-2 block">
                  4. Responsive Native Card
                </span>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-3">
                  {ad.imageUrl && (
                    <img
                      src={ad.imageUrl}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover shrink-0 border border-slate-800"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-indigo-400 font-semibold uppercase mb-0.5">
                      Promoted Recommendation
                    </div>
                    <div className="text-xs font-bold text-white truncate">{ad.headline}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{ad.description}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {ad.displayUrl}
                      </span>
                      {ad.price && (
                        <span className="text-emerald-400 font-mono font-bold text-[11px]">
                          {ad.price}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
