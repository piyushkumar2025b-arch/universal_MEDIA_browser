import React, { useState } from 'react';
import { 
  Check, 
  Download, 
  X, 
  Package, 
  Loader2, 
  AlertCircle, 
  ExternalLink,
  FileText,
  Database,
  ShieldCheck,
  Zap,
  Layers
} from 'lucide-react';
import { ResourceItem } from '../types/resource';
import { 
  downloadResourceAsset, 
  downloadMetadataRecord, 
  downloadAttributionCitation, 
  downloadBatchZip,
  getBestAssetUrl,
  getAssetExtension,
  getSanitizedFilename
} from '../utils/downloadEngine';
import { sanitizeSafeLink } from '../utils/sanitizeUrl';

interface DownloadModalProps {
  resources: ResourceItem[];
  onClose: () => void;
  onRecordDownload: (resources: ResourceItem[]) => void;
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  resources,
  onClose,
  onRecordDownload
}) => {
  const isMultiple = resources.length > 1;
  const primaryItem = resources[0];

  const [selectedFormat, setSelectedFormat] = useState<'asset' | 'proxy' | 'citation' | 'metadata'>('asset');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  if (!primaryItem && resources.length === 0) return null;

  const ext = primaryItem ? getAssetExtension(primaryItem).toUpperCase() : 'ZIP';
  const cleanFilename = primaryItem ? getSanitizedFilename(primaryItem) : `URMIL_Batch_${resources.length}_Items.zip`;
  const rawDirectUrl = primaryItem ? getBestAssetUrl(primaryItem).url : '';
  const directUrl = sanitizeSafeLink(rawDirectUrl);

  const handleDownload = async (overrideMode?: 'asset' | 'proxy' | 'citation' | 'metadata') => {
    const mode = overrideMode || selectedFormat;
    setIsDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      if (isMultiple) {
        if (mode === 'metadata') {
          const jsonStr = JSON.stringify(resources, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `URMIL_Collection_${resources.length}_Items.json`;
          a.click();
        } else {
          await downloadBatchZip(resources, (pct, status) => {
            setProgressPercent(pct);
            setStatusMessage(status);
          });
        }
      } else {
        if (mode === 'citation') {
          downloadAttributionCitation(primaryItem);
        } else if (mode === 'metadata') {
          downloadMetadataRecord(primaryItem);
        } else {
          await downloadResourceAsset(primaryItem, {
            mode: mode === 'proxy' ? 'proxy' : 'direct',
            onProgress: (pct, msg) => {
              setProgressPercent(pct);
              setStatusMessage(msg);
            }
          });
        }
      }

      onRecordDownload(resources);
      setDownloadSuccess(true);
      setStatusMessage('Download started successfully!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Download execution failed:', err);
      setDownloadError(err.message || 'Download could not complete directly. Opening direct link...');
      if (directUrl) {
        window.open(directUrl, '_blank', 'noopener,noreferrer');
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-black/10 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-xs">
              <Download className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                {isMultiple ? `Download Package (${resources.length} Assets)` : 'Download Resource'}
              </h3>
              <p className="text-xs text-neutral-500">
                {isMultiple 
                  ? 'High-speed archive delivery with full attribution manifest' 
                  : `Original ${ext} file • ${primaryItem?.source?.providerName || 'Universal Repository'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Resource Preview Summary */}
        <div className="my-4 rounded-xl bg-neutral-50 border border-neutral-200/80 p-3.5 flex items-center gap-3">
          {primaryItem?.thumbnailUrl ? (
            <img 
              src={primaryItem.thumbnailUrl} 
              alt={primaryItem.title} 
              className="h-12 w-12 rounded-lg object-cover shrink-0 border border-neutral-200" 
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-neutral-200 flex items-center justify-center shrink-0 text-neutral-600">
              <Package className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-semibold text-neutral-900 truncate">
              {isMultiple ? `${resources.length} Selected Resources` : primaryItem?.title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500 font-mono">
              <span className="rounded bg-neutral-200/80 px-1.5 py-0.5 text-neutral-700 font-semibold">{ext}</span>
              <span className="truncate">{cleanFilename}</span>
            </div>
          </div>
        </div>

        {/* Download Format / Method Options */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-500">
            Select Download Option
          </label>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Option 1: Direct Asset */}
            <button
              type="button"
              onClick={() => setSelectedFormat('asset')}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                selectedFormat === 'asset'
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-800'
              }`}
            >
              <Zap className={`h-4 w-4 mt-0.5 shrink-0 ${selectedFormat === 'asset' ? 'text-amber-300' : 'text-neutral-500'}`} />
              <div>
                <span className="text-xs font-bold block">
                  {isMultiple ? 'Download All as ZIP' : 'Instant Direct Asset'}
                </span>
                <span className={`text-[11px] block mt-0.5 ${selectedFormat === 'asset' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  {isMultiple ? 'Bundled with manifest & metadata' : `Raw ${ext} file directly to disk`}
                </span>
              </div>
            </button>

            {/* Option 2: Gateway Proxy */}
            <button
              type="button"
              onClick={() => setSelectedFormat('proxy')}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                selectedFormat === 'proxy'
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-800'
              }`}
            >
              <ShieldCheck className={`h-4 w-4 mt-0.5 shrink-0 ${selectedFormat === 'proxy' ? 'text-emerald-400' : 'text-neutral-500'}`} />
              <div>
                <span className="text-xs font-bold block">Verified Gateway Stream</span>
                <span className={`text-[11px] block mt-0.5 ${selectedFormat === 'proxy' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  SHA-256 verified streaming proxy
                </span>
              </div>
            </button>

            {/* Option 3: Citation & Attribution */}
            <button
              type="button"
              onClick={() => setSelectedFormat('citation')}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                selectedFormat === 'citation'
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-800'
              }`}
            >
              <FileText className={`h-4 w-4 mt-0.5 shrink-0 ${selectedFormat === 'citation' ? 'text-blue-300' : 'text-neutral-500'}`} />
              <div>
                <span className="text-xs font-bold block">Citation Manifest</span>
                <span className={`text-[11px] block mt-0.5 ${selectedFormat === 'citation' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  BibTeX & APA academic attribution
                </span>
              </div>
            </button>

            {/* Option 4: Full Metadata JSON */}
            <button
              type="button"
              onClick={() => setSelectedFormat('metadata')}
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                selectedFormat === 'metadata'
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 text-neutral-800'
              }`}
            >
              <Database className={`h-4 w-4 mt-0.5 shrink-0 ${selectedFormat === 'metadata' ? 'text-purple-300' : 'text-neutral-500'}`} />
              <div>
                <span className="text-xs font-bold block">Metadata Record (.json)</span>
                <span className={`text-[11px] block mt-0.5 ${selectedFormat === 'metadata' ? 'text-neutral-300' : 'text-neutral-500'}`}>
                  Comprehensive provenance data
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Progress or status feedback */}
        {(progressPercent !== null || statusMessage) && (
          <div className="mt-4 rounded-xl bg-neutral-100 p-3">
            <div className="flex justify-between text-xs font-semibold text-neutral-700 mb-1">
              <span className="truncate">{statusMessage || 'Processing download...'}</span>
              {progressPercent !== null && <span>{progressPercent}%</span>}
            </div>
            {progressPercent !== null && (
              <div className="h-1.5 w-full rounded-full bg-neutral-200 overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-200 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {downloadError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="flex-1">{downloadError}</span>
            {directUrl && (
              <a 
                href={directUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline font-semibold text-amber-900"
              >
                Open Source
              </a>
            )}
          </div>
        )}

        {/* Bottom Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100">
          {directUrl ? (
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Direct Link</span>
            </a>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-execute-download"
              onClick={() => handleDownload()}
              disabled={isDownloading}
              className="flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition-all shadow-sm active:scale-95 disabled:opacity-60"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                  <span>Downloading...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 text-emerald-400" />
                  <span>Download Now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
