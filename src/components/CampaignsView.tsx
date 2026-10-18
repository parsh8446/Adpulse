/**
 * AdPulse Campaigns Management View (v3.5.1)
 */
import React, { useState } from 'react';
import { AdCategory, AdCreative, AdFormat, DeviceType } from '../types';
import { BulkImportExportModal } from './BulkImportExportModal';
import { 
  Plus, 
  Search, 
  Sliders, 
  Play, 
  Pause, 
  Trash2, 
  Copy, 
  Edit3, 
  ExternalLink, 
  Eye, 
  Sparkles, 
  Check, 
  X,
  FileSpreadsheet,
  Image as ImageIcon,
  Upload,
  CheckCircle2
} from 'lucide-react';
import { compressImageFile, formatBytes, isDataUri, estimateImageBytes } from '../utils/imageCompressor';

interface CampaignsViewProps {
  campaigns: AdCreative[];
  onAddCampaign: (campaign: AdCreative) => void;
  onUpdateCampaign: (campaign: AdCreative) => void;
  onDeleteCampaign: (id: string) => void;
  onPreviewAd: (ad: AdCreative) => void;
  onBulkImportAds: (ads: AdCreative[], mode: 'append' | 'replace') => void;
  onClearAllCampaigns?: () => void;
  onRestoreDefaultCampaigns?: () => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  campaigns,
  onAddCampaign,
  onUpdateCampaign,
  onDeleteCampaign,
  onPreviewAd,
  onBulkImportAds,
  onClearAllCampaigns,
  onRestoreDefaultCampaigns
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdCreative | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [advertiser, setAdvertiser] = useState('');
  const [format, setFormat] = useState<AdFormat>('rectangle_300x250');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [callToAction, setCallToAction] = useState('Get Started');
  const [destinationUrl, setDestinationUrl] = useState('https://');
  const [displayUrl, setDisplayUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [price, setPrice] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [badgeText, setBadgeText] = useState('Featured');
  const [category, setCategory] = useState<AdCategory>('Hosting & Cloud');
  const [tagsInput, setTagsInput] = useState('cloud, hosting, speed');
  const [weight, setWeight] = useState(75);
  const [targetDevices, setTargetDevices] = useState<DeviceType[]>(['desktop', 'mobile', 'tablet']);
  const [accentColor, setAccentColor] = useState('#4F46E5');
  const [estimatedEPC, setEstimatedEPC] = useState(1.50);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);

  // Open modal for Create
  const handleOpenCreate = () => {
    setCompressionInfo(null);
    setEditingAd(null);
    setName('');
    setAdvertiser('');
    setFormat('rectangle_300x250');
    setHeadline('Accelerate Your Workflow with Next-Gen Cloud');
    setDescription('High-performance serverless architecture designed for modern engineering teams.');
    setCallToAction('Claim Free Trial');
    setDestinationUrl('https://example.com/partner/?ref=my_affiliate_id');
    setDisplayUrl('example.com/special-deal');
    setImageUrl('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80');
    setPrice('$29/mo');
    setOriginalPrice('$59/mo');
    setBadgeText('Special Offer');
    setCategory('Hosting & Cloud');
    setTagsInput('cloud, hosting, developer');
    setWeight(80);
    setTargetDevices(['desktop', 'mobile', 'tablet']);
    setAccentColor('#4F46E5');
    setEstimatedEPC(1.75);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (ad: AdCreative) => {
    setEditingAd(ad);
    setName(ad.name);
    setAdvertiser(ad.advertiser);
    setFormat(ad.format);
    setHeadline(ad.headline);
    setDescription(ad.description);
    setCallToAction(ad.callToAction);
    setDestinationUrl(ad.destinationUrl);
    setDisplayUrl(ad.displayUrl);
    setImageUrl(ad.imageUrl || '');
    setPrice(ad.price || '');
    setOriginalPrice(ad.originalPrice || '');
    setBadgeText(ad.badgeText || '');
    setCategory(ad.category);
    setTagsInput(ad.tags.join(', '));
    setWeight(ad.weight);
    setTargetDevices(ad.targetDevices);
    setAccentColor(ad.accentColor || '#4F46E5');
    setEstimatedEPC(ad.estimatedEPC);
    setIsModalOpen(true);
  };

  // Handle Save
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

    const campaignData: AdCreative = {
      id: editingAd ? editingAd.id : `ad_${Date.now()}`,
      name: name.trim() || 'Untitled Campaign',
      advertiser: advertiser.trim() || 'Sponsor',
      format,
      headline,
      description,
      callToAction,
      destinationUrl,
      displayUrl: displayUrl.trim() || 'example.com',
      imageUrl: imageUrl.trim() || undefined,
      price: price.trim() || undefined,
      originalPrice: originalPrice.trim() || undefined,
      badgeText: badgeText.trim() || undefined,
      category,
      tags,
      weight,
      status: editingAd ? editingAd.status : 'active',
      targetDevices,
      estimatedEPC,
      accentColor,
      createdAt: editingAd ? editingAd.createdAt : new Date().toISOString().split('T')[0]
    };

    if (editingAd) {
      onUpdateCampaign(campaignData);
    } else {
      onAddCampaign(campaignData);
    }

    setIsModalOpen(false);
  };

  // Toggle Device Selection
  const toggleDevice = (dev: DeviceType) => {
    if (targetDevices.includes(dev)) {
      if (targetDevices.length > 1) {
        setTargetDevices(targetDevices.filter((d) => d !== dev));
      }
    } else {
      setTargetDevices([...targetDevices, dev]);
    }
  };

  // Duplicate
  const handleDuplicate = (ad: AdCreative) => {
    const duplicated: AdCreative = {
      ...ad,
      id: `ad_${Date.now()}`,
      name: `${ad.name} (Copy)`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    onAddCampaign(duplicated);
  };

  // Toggle Status
  const handleToggleStatus = (ad: AdCreative) => {
    onUpdateCampaign({
      ...ad,
      status: ad.status === 'active' ? 'paused' : 'active'
    });
  };

  // Filtered List
  const filteredCampaigns = campaigns.filter((ad) => {
    const matchesSearch = 
      ad.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.advertiser.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Affiliate Campaigns & Ad Creatives
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Configure affiliate destination links, A/B rotation weights, and responsive banner templates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0 flex-wrap">
          {campaigns.length > 0 && onClearAllCampaigns && (
            <button
              onClick={() => {
                if (window.confirm('Delete all campaigns? This ensures only brand-new ads created by you are served, with ZERO default ads.')) {
                  onClearAllCampaigns();
                }
              }}
              className="px-3 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              title="Delete all campaigns to ensure zero default ads are served"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All Ads
            </button>
          )}

          {campaigns.length === 0 && onRestoreDefaultCampaigns && (
            <button
              onClick={onRestoreDefaultCampaigns}
              className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Load Sample Templates
            </button>
          )}

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Bulk Import / Export (CSV)
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Affiliate Ad
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-3 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaigns, sponsors, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          {(['all', 'active', 'paused'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                statusFilter === status
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {status} ({campaigns.filter((c) => status === 'all' || c.status === status).length})
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCampaigns.map((ad) => (
          <div
            key={ad.id}
            className={`bg-slate-900/70 border rounded-xl p-5 flex flex-col justify-between transition-all ${
              ad.status === 'active'
                ? 'border-slate-800 hover:border-slate-700'
                : 'border-slate-800/50 opacity-75'
            }`}
          >
            <div>
              {/* Card Header: Advertiser, Badge & Status */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    {ad.advertiser}
                  </span>
                  <h3 className="text-base font-bold text-white line-clamp-1 mt-0.5">
                    {ad.name}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleToggleStatus(ad)}
                    className={`p-1.5 rounded-md transition-colors ${
                      ad.status === 'active'
                        ? 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20'
                        : 'text-slate-400 bg-slate-800 hover:bg-slate-700'
                    }`}
                    title={ad.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                  >
                    {ad.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Banner Visual Preview Box */}
              <div
                onClick={() => onPreviewAd(ad)}
                className="my-3 p-3.5 rounded-lg border border-slate-700/60 bg-slate-950/70 cursor-pointer hover:border-indigo-500/50 transition-all group relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                  <span className="font-mono">{ad.format.replace('_', ' ')}</span>
                  <span className="text-slate-500 flex items-center gap-1 group-hover:text-indigo-400">
                    <Eye className="w-3 h-3" /> Preview
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {ad.imageUrl && (
                    <img
                      src={ad.imageUrl}
                      alt=""
                      className="w-12 h-12 rounded-md object-cover shrink-0 border border-slate-800 bg-slate-900"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-100 line-clamp-1">
                      {ad.headline}
                    </div>
                    <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                      {ad.description}
                    </div>
                    {ad.price && (
                      <div className="flex items-baseline gap-1.5 mt-1 font-mono text-[11px]">
                        <span className="text-emerald-400 font-bold">{ad.price}</span>
                        {ad.originalPrice && <span className="text-slate-500 line-through text-[10px]">{ad.originalPrice}</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">
                    {ad.displayUrl}
                  </span>
                  <span
                    style={{ backgroundColor: ad.accentColor || '#4F46E5' }}
                    className="text-[10px] font-semibold text-white px-2 py-0.5 rounded shadow-xs"
                  >
                    {ad.callToAction} &rarr;
                  </span>
                </div>
              </div>

              {/* Metadata row */}
              <div className="space-y-1.5 text-xs text-slate-400 mt-3 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="text-slate-200 font-medium">{ad.category}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Rotation Weight:</span>
                  <span className="font-mono tabular-nums text-indigo-400 font-semibold">
                    {ad.weight} / 100
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Devices:</span>
                  <span className="text-slate-300 capitalize text-[11px]">
                    {ad.targetDevices.join(', ')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Affiliate Target:</span>
                  <a
                    href={ad.destinationUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono text-[11px] truncate max-w-[160px]"
                  >
                    {ad.destinationUrl.replace('https://', '')}
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleOpenEdit(ad)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  title="Edit Ad"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleDuplicate(ad)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                  title="Duplicate Campaign"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDeleteCampaign(ad.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors"
                  title="Delete Campaign"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="text-[11px] font-mono text-slate-500">
                Created {ad.createdAt}
              </span>
            </div>
          </div>
        ))}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-12 text-center">
          <p className="text-sm font-semibold text-white">
            {campaigns.length === 0 ? 'No campaigns in your ad network.' : 'No campaigns found matching your search filter.'}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {campaigns.length === 0 
              ? 'Default mock ads have been permanently removed. Your website will strictly serve only campaigns created by you.'
              : 'Try clearing your search query or switching the status filter.'}
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm"
            >
              Create Your First Affiliate Ad
            </button>
            {campaigns.length === 0 && onRestoreDefaultCampaigns && (
              <button
                onClick={onRestoreDefaultCampaigns}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
              >
                Load Sample Templates
              </button>
            )}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">
                {editingAd ? 'Edit Affiliate Campaign' : 'Create New Affiliate Ad'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              {/* Live Preview Box Inside Modal */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                  Live Creative Preview
                </span>
                <div className="p-3.5 bg-slate-900 border border-slate-700/80 rounded-lg flex items-center justify-between gap-4">
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover shrink-0 border border-slate-700 bg-slate-950"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {badgeText && (
                        <span
                          style={{ backgroundColor: accentColor }}
                          className="text-[9px] font-bold text-white px-1.5 py-0.5 rounded uppercase"
                        >
                          {badgeText}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 font-semibold">{advertiser || 'Advertiser'}</span>
                      <span className="text-[10px] text-slate-500 ml-auto">Sponsored</span>
                    </div>
                    <div className="text-sm font-bold text-white truncate">{headline || 'Your Headline Here'}</div>
                    <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{description || 'Offer details and pitch...'}</div>
                    {price && (
                      <div className="flex items-baseline gap-1.5 mt-1 font-mono text-xs">
                        <span className="text-emerald-400 font-bold">{price}</span>
                        {originalPrice && <span className="text-slate-500 line-through text-[10px]">{originalPrice}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{ backgroundColor: accentColor }}
                    className="px-3 py-1.5 text-xs font-semibold text-white rounded-md shrink-0 shadow-sm"
                  >
                    {callToAction} &rarr;
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sony WH-1000XM5 Headphones"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Advertiser / Brand Name
                  </label>
                  <input
                    type="text"
                    required
                    value={advertiser}
                    onChange={(e) => setAdvertiser(e.target.value)}
                    placeholder="e.g. Sony Audio"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Product Image & Preset Picker */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                    Product Image (URL or Upload)
                  </label>
                  <label className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30 transition-colors">
                    <Upload className="w-3 h-3" />
                    Upload & Compress to WebP
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCompressionInfo('Compressing to lightweight WebP...');
                          try {
                            const res = await compressImageFile(file, { maxWidth: 640, maxHeight: 400, quality: 0.82 });
                            setImageUrl(res.dataUrl);
                            setCompressionInfo(`Optimized: ${formatBytes(res.originalSize)} → ${formatBytes(res.compressedSize)} (${res.savingsPercent}% WebP savings)`);
                          } catch (err) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setImageUrl(ev.target?.result as string);
                            };
                            reader.readAsDataURL(file);
                            setCompressionInfo(null);
                          }
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="flex gap-3 items-center">
                  {imageUrl ? (
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 shrink-0 relative group">
                      <img
                        src={imageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-900 border border-dashed border-slate-700 shrink-0 flex items-center justify-center text-slate-500">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => {
                        setImageUrl(e.target.value);
                        if (!isDataUri(e.target.value) && e.target.value) {
                          setCompressionInfo('Hosted Image URL (0 KB local storage overhead)');
                        } else {
                          setCompressionInfo(null);
                        }
                      }}
                      placeholder="https://... or paste direct image URL (Imgur, Cloudflare, Amazon, CDN)"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                    {compressionInfo && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{compressionInfo}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Presets for fast testing */}
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] pt-1">
                  <span className="text-slate-500 text-[10px]">Sample Product Images:</span>
                  <button
                    type="button"
                    onClick={() => setImageUrl('https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Headphones
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Smart Watch
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Sneakers
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    MacBook
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Keyboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&q=80')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Coffee Maker
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Cloud Server
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageUrl('https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80')}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    VPN Shield
                  </button>
                  {imageUrl && (
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="px-2 py-0.5 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 ml-auto"
                    >
                      Clear Image
                    </button>
                  )}
                </div>
              </div>

              {/* Price & Original Price (Scraper Support) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Product Price / Deal (Optional)
                  </label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. $199.00 or $2.99/mo"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Original Regular Price (Optional crossed-out)
                  </label>
                  <input
                    type="text"
                    value={originalPrice}
                    onChange={(e) => setOriginalPrice(e.target.value)}
                    placeholder="e.g. $249.00"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Banner Format
                  </label>
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as AdFormat)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="leaderboard_728x90">728×90 Leaderboard (Header/Footer)</option>
                    <option value="rectangle_300x250">300×250 Medium Rectangle (In-Content)</option>
                    <option value="mobile_320x50">320×50 Mobile Banner</option>
                    <option value="skyscraper_160x600">160×600 Wide Skyscraper (Sidebar)</option>
                    <option value="responsive_native">Responsive Native Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AdCategory)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Hosting & Cloud">Hosting & Cloud</option>
                    <option value="VPN & Security">VPN & Security</option>
                    <option value="SaaS & Productivity">SaaS & Productivity</option>
                    <option value="eCommerce & Marketing">eCommerce & Marketing</option>
                    <option value="Developer Tools">Developer Tools</option>
                    <option value="Finance & Crypto">Finance & Crypto</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Ad Headline
                </label>
                <input
                  type="text"
                  required
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Punchy high-conversion headline"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Description / Body Text
                </label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Compelling reason to click the affiliate offer..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Call To Action Button
                  </label>
                  <input
                    type="text"
                    required
                    value={callToAction}
                    onChange={(e) => setCallToAction(e.target.value)}
                    placeholder="e.g. Claim 50% Off"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Badge Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={badgeText}
                    onChange={(e) => setBadgeText(e.target.value)}
                    placeholder="e.g. Exclusive, Best Deal"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Affiliate Destination URL (Where clicks will be redirected)
                </label>
                <input
                  type="url"
                  required
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://affiliate.network.com/click?pid=123"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Interest Keywords / Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="cloud, speed, webdev, hosting"
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    A/B Rotation Weight (1 - 100): <strong className="text-indigo-400 font-mono">{weight}</strong>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer mt-2"
                  />
                </div>
              </div>

              {/* Target Devices */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Target Devices
                </label>
                <div className="flex items-center gap-3">
                  {(['desktop', 'mobile', 'tablet'] as DeviceType[]).map((dev) => (
                    <button
                      key={dev}
                      type="button"
                      onClick={() => toggleDevice(dev)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg capitalize border transition-all ${
                        targetDevices.includes(dev)
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {targetDevices.includes(dev) && '✓ '}
                      {dev}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-all"
                >
                  {editingAd ? 'Save Changes' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk CSV / Excel Import & Export Modal */}
      <BulkImportExportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        campaigns={campaigns}
        onImportAds={onBulkImportAds}
      />
    </div>
  );
};
