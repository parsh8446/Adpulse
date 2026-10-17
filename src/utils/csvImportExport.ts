/**
 * AdPulse CSV Parser & Exporter (v3.5.1)
 */
import { AdCreative, AdCategory, AdFormat, DeviceType } from '../types';

/**
 * Cleanly escapes a string value for standard CSV format (RFC 4180)
 */
function escapeCsv(val: any): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports campaigns to standard CSV format compatible with Excel and Google Sheets
 */
export function exportAdsToCsv(ads: AdCreative[]): string {
  const headers = [
    'Name',
    'Advertiser',
    'Format',
    'Headline',
    'Description',
    'CallToAction',
    'DestinationUrl',
    'DisplayUrl',
    'ImageUrl',
    'Price',
    'OriginalPrice',
    'BadgeText',
    'Category',
    'Tags',
    'Weight',
    'Status',
    'TargetDevices',
    'EstimatedEPC',
    'AccentColor'
  ];

  const rows = ads.map((ad) => [
    escapeCsv(ad.name),
    escapeCsv(ad.advertiser),
    escapeCsv(ad.format),
    escapeCsv(ad.headline),
    escapeCsv(ad.description),
    escapeCsv(ad.callToAction),
    escapeCsv(ad.destinationUrl),
    escapeCsv(ad.displayUrl),
    escapeCsv(ad.imageUrl || ''),
    escapeCsv(ad.price || ''),
    escapeCsv(ad.originalPrice || ''),
    escapeCsv(ad.badgeText || ''),
    escapeCsv(ad.category),
    escapeCsv(ad.tags.join('; ')),
    escapeCsv(ad.weight),
    escapeCsv(ad.status),
    escapeCsv(ad.targetDevices.join(',')),
    escapeCsv(ad.estimatedEPC),
    escapeCsv(ad.accentColor || '#4F46E5')
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Downloads a CSV string as a file in the user's browser
 */
export function downloadCsvFile(content: string, filename: string = 'adpulse-affiliate-ads.csv') {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Robust CSV/TSV parser supporting quotes, commas, tabs, and line breaks
 */
export function parseCsvRows(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  // Normalize CRLF to LF
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    const nextChar = clean[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote ("")
        currentField += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if ((char === ',' || char === '\t') && !insideQuotes) {
      // Delimiter found (comma or tab)
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      // End of line
      currentRow.push(currentField.trim());
      if (currentRow.some((f) => f.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Last field
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((f) => f.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

/**
 * Parses raw CSV or spreadsheet copy-paste text into AdCreative items.
 * Intelligently maps fuzzy column names commonly produced by web scrapers.
 */
export function parseCsvToAds(csvText: string): { ads: AdCreative[]; errors: string[] } {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    return { ads: [], errors: ['File or text must contain at least a header row and 1 data row.'] };
  }

  const rawHeaders = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const headerMap: Record<string, number> = {};

  rawHeaders.forEach((h, idx) => {
    headerMap[h] = idx;
  });

  // Helper to find column index with fallback aliases
  const getCol = (aliases: string[]): number => {
    for (const a of aliases) {
      const clean = a.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (headerMap[clean] !== undefined) return headerMap[clean];
    }
    return -1;
  };

  const nameCol = getCol(['name', 'title', 'productname', 'itemname', 'campaign']);
  const advertiserCol = getCol(['advertiser', 'brand', 'sponsor', 'vendor', 'store', 'merchant']);
  const formatCol = getCol(['format', 'size', 'adformat', 'dimensions']);
  const headlineCol = getCol(['headline', 'producttitle', 'title', 'pitch']);
  const descCol = getCol(['description', 'desc', 'body', 'snippet', 'details']);
  const ctaCol = getCol(['calltoaction', 'cta', 'button', 'buttontext', 'action']);
  const destCol = getCol(['destinationurl', 'affiliatelink', 'url', 'link', 'producturl', 'targeturl']);
  const displayCol = getCol(['displayurl', 'domain', 'site']);
  const imgCol = getCol(['imageurl', 'image', 'img', 'photo', 'picture', 'thumbnail', 'productimage']);
  const priceCol = getCol(['price', 'currentprice', 'saleprice', 'cost']);
  const origPriceCol = getCol(['originalprice', 'regularprice', 'msrp', 'listprice']);
  const badgeCol = getCol(['badgetext', 'badge', 'discount', 'tag', 'label']);
  const catCol = getCol(['category', 'niche', 'vertical', 'type']);
  const tagsCol = getCol(['tags', 'keywords']);
  const weightCol = getCol(['weight', 'priority', 'score']);
  const epcCol = getCol(['estimatedepc', 'epc', 'payout', 'commission']);
  const colorCol = getCol(['accentcolor', 'color', 'hex']);

  const parsedAds: AdCreative[] = [];
  const errors: string[] = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (row.length === 0 || row.every((c) => c === '')) continue;

    const getVal = (idx: number, fallback: string = ''): string => {
      return (idx !== -1 && row[idx] !== undefined) ? row[idx] : fallback;
    };

    const destUrl = getVal(destCol, '');
    const titleVal = getVal(nameCol, '') || getVal(headlineCol, 'Featured Product');

    if (!destUrl && !titleVal) {
      errors.push(`Row ${r + 1}: Skipped because missing both title and destination URL.`);
      continue;
    }

    // Determine ad format
    let rawFormat = getVal(formatCol, 'rectangle_300x250').toLowerCase();
    let format: AdFormat = 'rectangle_300x250';
    if (rawFormat.includes('728') || rawFormat.includes('leaderboard')) {
      format = 'leaderboard_728x90';
    } else if (rawFormat.includes('320') || rawFormat.includes('mobile')) {
      format = 'mobile_320x50';
    } else if (rawFormat.includes('160') || rawFormat.includes('skyscraper')) {
      format = 'skyscraper_160x600';
    } else if (rawFormat.includes('native') || rawFormat.includes('responsive')) {
      format = 'responsive_native';
    }

    // Determine category
    const catRaw = getVal(catCol, 'General');
    let category: AdCategory = 'General';
    if (/host|cloud|server|domain/i.test(catRaw)) category = 'Hosting & Cloud';
    else if (/vpn|secur|privacy/i.test(catRaw)) category = 'VPN & Security';
    else if (/saas|prod|doc|task|office/i.test(catRaw)) category = 'SaaS & Productivity';
    else if (/ecom|shop|retail|store|market/i.test(catRaw)) category = 'eCommerce & Marketing';
    else if (/dev|code|api|git|sql/i.test(catRaw)) category = 'Developer Tools';
    else if (/fin|crypto|money|invest/i.test(catRaw)) category = 'Finance & Crypto';

    // Tags
    const tagsRaw = getVal(tagsCol, '');
    const tags = tagsRaw
      ? tagsRaw.split(/[,;]/).map((t) => t.trim().toLowerCase()).filter(Boolean)
      : [category.toLowerCase()];

    // Display URL fallback
    let displayUrl = getVal(displayCol, '');
    if (!displayUrl && destUrl) {
      try {
        const u = new URL(destUrl.startsWith('http') ? destUrl : `https://${destUrl}`);
        displayUrl = u.hostname.replace('www.', '');
      } catch {
        displayUrl = 'affiliate.deal';
      }
    }

    const price = getVal(priceCol, '');
    const originalPrice = getVal(origPriceCol, '');
    const badgeText = getVal(badgeCol, '') || (price ? `Deal: ${price}` : undefined);
    const callToAction = getVal(ctaCol, '') || (price ? 'Buy Now' : 'Check Deal');

    parsedAds.push({
      id: `ad_bulk_${Date.now()}_${r}_${Math.random().toString(36).substring(2, 6)}`,
      name: titleVal,
      advertiser: getVal(advertiserCol, displayUrl || 'Featured Brand'),
      format,
      headline: getVal(headlineCol, titleVal),
      description: getVal(descCol, 'Exclusive partner offer. Click to view discount details and availability.'),
      callToAction,
      destinationUrl: destUrl.startsWith('http') ? destUrl : `https://${destUrl || 'example.com'}`,
      displayUrl,
      imageUrl: getVal(imgCol, '') || undefined,
      price: price || undefined,
      originalPrice: originalPrice || undefined,
      badgeText,
      category,
      tags,
      weight: Math.min(100, Math.max(5, parseInt(getVal(weightCol, '75'), 10) || 75)),
      status: 'active',
      targetDevices: ['desktop', 'mobile', 'tablet'],
      estimatedEPC: parseFloat(getVal(epcCol, '1.50')) || 1.50,
      accentColor: getVal(colorCol, '#4F46E5') || '#4F46E5',
      createdAt: new Date().toISOString().split('T')[0]
    });
  }

  return { ads: parsedAds, errors };
}

/**
 * Pre-made ready-to-test CSV Template with sample product images and affiliate data
 */
export const SAMPLE_CSV_TEMPLATE = `Name,Advertiser,Format,Headline,Description,CallToAction,DestinationUrl,DisplayUrl,ImageUrl,Price,OriginalPrice,BadgeText,Category,Tags,Weight,EstimatedEPC,AccentColor
Sony WH-1000XM5 Headphones,Sony Audio,rectangle_300x250,Industry Leading Noise Canceling Wireless Headphones,Magnificent sound with 30-hour battery life and ultra-comfortable design.,Buy Now,https://amazon.com/dp/B09XS7JWHH?tag=myaffiliate-20,amazon.com,https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&q=80,$348.00,$399.99,13% Off,eCommerce & Marketing,audio; headphones; tech; sony,85,2.40,#0F172A
Keychron Q1 Pro Mechanical Keyboard,Keychron,rectangle_300x250,Custom Wireless Mechanical Keyboard for Creators,Full aluminum body with hot-swappable switches and QMK/VIA support.,Get 15% Off,https://keychron.com/products/keychron-q1-pro?ref=adpulse,keychron.com,https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&q=80,$199.00,$220.00,Best Seller,Developer Tools,keyboard; hardware; developer; desk,80,1.90,#3B82F6
NordVPN 2-Year Plan,Nord Security,leaderboard_728x90,Secure All Your Devices with Next-Gen VPN Protection,Fastest VPN with Threat Protection malware blocker. 30-day money-back guarantee.,Claim Deal,https://nordvpn.com/special/?aff=adpulse,nordvpn.com,https://images.unsplash.com/photo-1563986768609-322da13575f3?w=400&q=80,$3.19/mo,$11.59/mo,72% Off,VPN & Security,vpn; privacy; cybersecurity; streaming,95,3.10,#2563EB
Apple MacBook Pro M3,Apple Inc.,responsive_native,Supercharged for Pros with Mind-Blowing Performance,Liquid Retina XDR display with up to 22 hours of battery life.,Order Now,https://apple.com/macbook-pro/?ref=adpulse,apple.com,https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&q=80,$1599.00,$1799.00,Special Offer,Developer Tools,macbook; laptop; apple; developer,90,4.50,#6366F1
Hostinger Cloud Startup,Hostinger,leaderboard_728x90,High Speed Cloud Hosting with Free Domain & SSL,300 websites with dedicated IP and automated daily backups.,Start for $2.99,https://hostinger.com/web-hosting?ref=adpulse,hostinger.com,https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&q=80,$2.99/mo,$9.99/mo,75% Off,Hosting & Cloud,hosting; cloud; wordpress; server,85,2.75,#673AB7
`;
