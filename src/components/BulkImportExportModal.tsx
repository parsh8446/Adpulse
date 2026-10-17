/**
 * AdPulse Bulk CSV Import/Export Modal (v3.5.1)
 */
import React, { useState } from 'react';
import { AdCreative } from '../types';
import { 
  parseCsvToAds, 
  exportAdsToCsv, 
  downloadCsvFile, 
  SAMPLE_CSV_TEMPLATE 
} from '../utils/csvImportExport';
import { 
  X, 
  Upload, 
  Download, 
  FileSpreadsheet, 
  Check, 
  AlertCircle, 
  Plus, 
  FileText, 
  Code2, 
  Sparkles, 
  Image as ImageIcon,
  Copy,
  ExternalLink
} from 'lucide-react';

interface BulkImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: AdCreative[];
  onImportAds: (ads: AdCreative[], mode: 'append' | 'replace') => void;
}

export const BulkImportExportModal: React.FC<BulkImportExportModalProps> = ({
  isOpen,
  onClose,
  campaigns,
  onImportAds
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'json' | 'export'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [parsedPreview, setParsedPreview] = useState<AdCreative[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [hasParsed, setHasParsed] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (file.name.endsWith('.json')) {
        handleParseJsonString(content);
      } else {
        const { ads, errors } = parseCsvToAds(content);
        setParsedPreview(ads);
        setParseErrors(errors);
        setHasParsed(true);
      }
    };
    reader.readAsText(file);
  };

  // Paste CSV / Spreadsheet rows handler
  const handleParsePastedText = () => {
    if (!pasteText.trim()) return;
    const { ads, errors } = parseCsvToAds(pasteText);
    setParsedPreview(ads);
    setParseErrors(errors);
    setHasParsed(true);
  };

  // Parse JSON format
  const handleParseJsonString = (rawJson: string) => {
    try {
      const parsed = JSON.parse(rawJson);
      const items = Array.isArray(parsed) ? parsed : (parsed.campaigns || parsed.products || parsed.items || []);
      if (!Array.isArray(items) || items.length === 0) {
        setParseErrors(['JSON must be an array of products or contain a "campaigns" array.']);
        setParsedPreview([]);
        setHasParsed(true);
        return;
      }

      const ads: AdCreative[] = items.map((item: any, idx: number) => {
        const title = item.name || item.title || item.headline || item.productName || `Product #${idx + 1}`;
        const price = item.price || item.currentPrice || item.salePrice || '';
        return {
          id: item.id || `ad_json_${Date.now()}_${idx}`,
          name: title,
          advertiser: item.advertiser || item.brand || item.store || 'Affiliate Partner',
          format: item.format || 'rectangle_300x250',
          headline: item.headline || title,
          description: item.description || item.desc || 'Special promotional offer. Click to view availability.',
          callToAction: item.callToAction || item.cta || (price ? 'Buy Now' : 'Check Deal'),
          destinationUrl: item.destinationUrl || item.url || item.link || item.productUrl || 'https://',
          displayUrl: item.displayUrl || 'affiliate.store',
          imageUrl: item.imageUrl || item.image || item.thumbnail || item.photo || undefined,
          price: price || undefined,
          originalPrice: item.originalPrice || item.regularPrice || item.msrp || undefined,
          badgeText: item.badgeText || item.badge || (item.discount ? `${item.discount}% Off` : undefined),
          category: item.category || 'General',
          tags: Array.isArray(item.tags) ? item.tags : [item.category || 'general'],
          weight: item.weight || 75,
          status: 'active',
          targetDevices: item.targetDevices || ['desktop', 'mobile', 'tablet'],
          estimatedEPC: Number(item.estimatedEPC || 1.50),
          accentColor: item.accentColor || '#4F46E5',
          createdAt: new Date().toISOString().split('T')[0]
        };
      });

      setParsedPreview(ads);
      setParseErrors([]);
      setHasParsed(true);
    } catch (err: any) {
      setParseErrors([`Invalid JSON: ${err.message}`]);
      setParsedPreview([]);
      setHasParsed(true);
    }
  };

  // 1-Click Load Sample Scraped Store Products
  const handleLoadSampleData = () => {
    const { ads } = parseCsvToAds(SAMPLE_CSV_TEMPLATE);
    setParsedPreview(ads);
    setParseErrors([]);
    setHasParsed(true);
  };

  // Download sample CSV template
  const handleDownloadSample = () => {
    downloadCsvFile(SAMPLE_CSV_TEMPLATE, 'adpulse-scraped-products-sample.csv');
  };

  // Copy sample template to clipboard
  const handleCopySample = () => {
    navigator.clipboard.writeText(SAMPLE_CSV_TEMPLATE);
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  // Export current ads to CSV
  const handleExportCsv = () => {
    const csvData = exportAdsToCsv(campaigns);
    downloadCsvFile(csvData, `adpulse-campaigns-${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Export current ads to JSON
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(campaigns, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `adpulse-campaigns-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Confirm Import
  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    onImportAds(parsedPreview, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Bulk Ad & Scraped Product Insertion
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  CSV · Excel · JSON
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Easily import scraped product tables from web scrapers, Amazon, Shopify, or Excel spreadsheets with images and prices.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Click Sample Banner Alert */}
        {!hasParsed && (
          <div className="bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                Want to test bulk insertion immediately without preparing a file?
              </span>
            </div>
            <button
              type="button"
              onClick={handleLoadSampleData}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shrink-0 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              1-Click Load 5 Sample Product Ads
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => { setActiveTab('upload'); setHasParsed(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload CSV / Excel
            </button>

            <button
              onClick={() => { setActiveTab('paste'); setHasParsed(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'paste'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Paste Scraper Rows
            </button>

            <button
              onClick={() => { setActiveTab('json'); setHasParsed(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'json'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              JSON / Scraper Push
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Export Existing
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopySample}
              className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              {copiedSample ? 'Copied CSV Format!' : 'Copy CSV Format'}
            </button>

            <button
              onClick={handleDownloadSample}
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2.5 py-1.5 rounded-lg border border-indigo-500/20 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template (.csv)
            </button>
          </div>
        </div>

        {/* TAB 1: Upload File */}
        {activeTab === 'upload' && !hasParsed && (
          <div className="space-y-4">
            <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-950/40 group">
              <Upload className="w-10 h-10 text-slate-500 group-hover:text-indigo-400 transition-colors mb-3" />
              <span className="text-sm font-semibold text-slate-200">
                Click to upload CSV, Excel, or JSON export file
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Supports .csv, .tsv, .txt, and scraped product tables
              </span>
              <input
                type="file"
                accept=".csv,.tsv,.txt,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-2">
              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Automatic Column Matching for Web Scrapers:
              </div>
              <p className="leading-relaxed">
                AdPulse automatically maps any scraper columns:
                <br />
                • <strong>Product Title:</strong> <code className="text-indigo-300 font-mono">title</code>, <code className="text-indigo-300 font-mono">name</code>, <code className="text-indigo-300 font-mono">product_name</code>
                <br />
                • <strong>Affiliate Link:</strong> <code className="text-indigo-300 font-mono">url</code>, <code className="text-indigo-300 font-mono">destinationUrl</code>, <code className="text-indigo-300 font-mono">link</code>, <code className="text-indigo-300 font-mono">affiliate_link</code>
                <br />
                • <strong>Product Image:</strong> <code className="text-indigo-300 font-mono">imageUrl</code>, <code className="text-indigo-300 font-mono">image</code>, <code className="text-indigo-300 font-mono">thumbnail</code>, <code className="text-indigo-300 font-mono">photo</code>
                <br />
                • <strong>Prices:</strong> <code className="text-indigo-300 font-mono">price</code> (e.g. $49), <code className="text-indigo-300 font-mono">originalPrice / msrp</code> (e.g. $99)
                <br />
                • <strong>Brand / Store:</strong> <code className="text-indigo-300 font-mono">advertiser</code>, <code className="text-indigo-300 font-mono">brand</code>, <code className="text-indigo-300 font-mono">store</code>
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: Paste Rows directly from Excel / Scraper */}
        {activeTab === 'paste' && !hasParsed && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Paste Spreadsheet Rows (copy rows directly from Excel, Google Sheets, or Web Scraper)
              </label>
              <textarea
                rows={9}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Name\tAdvertiser\tHeadline\tDestinationUrl\tImageUrl\tPrice\tOriginalPrice\nSony WH-1000XM5\tSony\tNoise Canceling Headphones\thttps://amazon.com/dp/B09...ref=aff\thttps://images.unsplash.com/photo-1505740420928...\t$348.00\t$399.99\nKeychron Q1 Keyboard\tKeychron\tCustom Mechanical Keyboard\thttps://keychron.com/products/q1?ref=aff\thttps://images.unsplash.com/photo-158782974130...\t$199.00\t$220.00`}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Tip: Both comma-separated (CSV) and tab-separated (TSV from Excel) are supported.
              </span>

              <button
                type="button"
                onClick={handleParsePastedText}
                disabled={!pasteText.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                Parse & Preview Ads &rarr;
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: JSON Format & Web Scraper Push */}
        {activeTab === 'json' && !hasParsed && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Paste JSON Array of Products
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setJsonText(JSON.stringify([
                      {
                        name: "Bose QuietComfort 45",
                        advertiser: "Bose Audio",
                        format: "rectangle_300x250",
                        headline: "Iconic Quiet. Comfort. And Sound.",
                        destinationUrl: "https://amazon.com/dp/B098FKXT8L?tag=myaff-20",
                        imageUrl: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=400&q=80",
                        price: "$279.00",
                        originalPrice: "$329.00",
                        badgeText: "15% Off",
                        category: "eCommerce & Marketing"
                      },
                      {
                        name: "Logitech MX Master 3S",
                        advertiser: "Logitech",
                        format: "rectangle_300x250",
                        headline: "Performance Wireless Mouse with Quiet Clicks",
                        destinationUrl: "https://logitech.com/mx-master-3s?ref=aff",
                        imageUrl: "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=400&q=80",
                        price: "$99.99",
                        originalPrice: "$119.99",
                        badgeText: "Best Seller",
                        category: "Developer Tools"
                      }
                    ], null, 2));
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300"
                >
                  Insert Sample JSON
                </button>
              </div>
              <textarea
                rows={9}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={`[\n  {\n    "name": "Sony Headphones",\n    "advertiser": "Sony Audio",\n    "destinationUrl": "https://amazon.com/dp/...?tag=aff",\n    "imageUrl": "https://images.unsplash.com/...",\n    "price": "$348.00",\n    "originalPrice": "$399.00"\n  }\n]`}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Ideal for Python, Scrapy, Puppeteer, or Cheerio scraping pipelines.
              </span>

              <button
                type="button"
                onClick={() => handleParseJsonString(jsonText)}
                disabled={!jsonText.trim()}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                Parse JSON & Preview &rarr;
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: Export Existing Campaigns */}
        {activeTab === 'export' && (
          <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Export All Stored Campaigns
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export all {campaigns.length} campaigns currently stored in your ad server into a clean CSV spreadsheet or JSON array. Includes all product photos, prices, discounts, tags, and affiliate links.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleExportCsv}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download CSV ({campaigns.length} ads)
              </button>

              <button
                onClick={handleExportJson}
                className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download JSON Array
              </button>
            </div>
          </div>
        )}

        {/* PARSED PREVIEW SECTION */}
        {hasParsed && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-950 rounded-xl border border-indigo-500/30">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-white">
                  Successfully parsed <strong>{parsedPreview.length}</strong> product ads ready to insert!
                </span>
              </div>

              {/* Mode: Append or Replace */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-slate-400 font-medium">Insertion Mode:</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="importMode"
                    value="append"
                    checked={importMode === 'append'}
                    onChange={() => setImportMode('append')}
                    className="accent-indigo-500"
                  />
                  <span>Append (+{parsedPreview.length} ads)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={importMode === 'replace'}
                    onChange={() => setImportMode('replace')}
                    className="accent-rose-500"
                  />
                  <span className="text-rose-400">Replace existing ({campaigns.length})</span>
                </label>
              </div>
            </div>

            {parseErrors.length > 0 && (
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Parse Warnings:
                </div>
                {parseErrors.map((err, idx) => (
                  <div key={idx}>• {err}</div>
                ))}
              </div>
            )}

            {/* Live Visual Preview Table */}
            <div className="max-h-72 overflow-y-auto border border-slate-800 rounded-xl overflow-x-auto shadow-inner">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Product Image</th>
                    <th className="py-2.5 px-3">Title / Headline</th>
                    <th className="py-2.5 px-3">Brand / Store</th>
                    <th className="py-2.5 px-3">Price / Discount</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Affiliate Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {parsedPreview.map((ad, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3">
                        {ad.imageUrl ? (
                          <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-950 border border-slate-700 shrink-0">
                            <img
                              src={ad.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                            <ImageIcon className="w-4 h-4" />
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 font-sans max-w-[180px]">
                        <div className="text-white font-medium truncate">{ad.name}</div>
                        <div className="text-[11px] text-slate-400 truncate">{ad.headline}</div>
                      </td>
                      <td className="py-2 px-3 text-slate-300 max-w-[120px] truncate font-sans">
                        {ad.advertiser}
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-emerald-400 font-bold">{ad.price || 'Free'}</span>
                          {ad.originalPrice && (
                            <span className="text-slate-500 line-through text-[10px]">{ad.originalPrice}</span>
                          )}
                        </div>
                        {ad.badgeText && (
                          <span className="text-[9px] text-indigo-400 uppercase font-sans">
                            {ad.badgeText}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-400 text-[11px]">
                        {ad.format.replace('_', ' ')}
                      </td>
                      <td className="py-2 px-3 font-sans text-slate-300">
                        {ad.category}
                      </td>
                      <td className="py-2 px-3 text-indigo-400 max-w-[160px] truncate text-[11px]">
                        <a
                          href={ad.destinationUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline flex items-center gap-1"
                        >
                          {ad.destinationUrl}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setHasParsed(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                &larr; Choose Different File / Edit Input
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-950/40"
              >
                <Check className="w-4 h-4" />
                Confirm & Bulk Insert {parsedPreview.length} Ads
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
