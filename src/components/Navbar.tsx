import React from 'react';
import { 
  Bookmark, 
  Sparkles, 
  Activity, 
  DownloadCloud,
  FolderHeart,
  Globe,
  Radio,
  ShieldCheck
} from 'lucide-react';

interface NavbarProps {
  favoriteCount: number;
  downloadCount: number;
  wsStatus?: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
  liveActivity?: { query: string; category: string; providerCount?: number } | null;
  onOpenLibrary: () => void;
  onOpenDownloads?: () => void;
  onOpenTelemetry: () => void;
  onOpenGoogleSearch?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  favoriteCount,
  downloadCount,
  wsStatus = 'connected',
  liveActivity,
  onOpenLibrary,
  onOpenDownloads,
  onOpenTelemetry,
  onOpenGoogleSearch
}) => {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-neutral-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm">
            <Sparkles className="h-5 w-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold tracking-tight text-neutral-900">
                URMIL
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">
                Universal Browser
              </span>
            </div>
            <p className="hidden text-xs text-neutral-500 sm:block">
              Free, openly licensed media &amp; research
            </p>
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Universal Bypass Management Status */}
          <div
            id="badge-bypass-management"
            title="Bypass Management Active: Multi-tier streaming tunnels, CORS proxying, Range scrubbing, and Referer spoofing guarantee zero-block media delivery."
            className="hidden md:flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50/80 px-2.5 py-1.5 text-xs font-semibold text-teal-800"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-teal-600" />
            <span className="hidden xl:inline">Bypass Management:</span>
            <span>Unblocked</span>
          </div>

          {/* Live WebSocket Real-Time Status */}
          <div 
            id="badge-websocket-status"
            title={wsStatus === 'connected' ? 'WebSocket Real-Time Gateway: Connected (Live Streaming Active)' : `WebSocket Status: ${wsStatus}`}
            className={`hidden lg:flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all ${
              wsStatus === 'connected'
                ? 'border-emerald-200 bg-emerald-50/70 text-emerald-800'
                : wsStatus === 'connecting' || wsStatus === 'reconnecting'
                ? 'border-amber-200 bg-amber-50/70 text-amber-800'
                : 'border-neutral-200 bg-neutral-50 text-neutral-600'
            }`}
          >
            <Radio className={`h-3.5 w-3.5 ${wsStatus === 'connected' ? 'text-emerald-600 animate-pulse' : 'text-neutral-400'}`} />
            <span>{wsStatus === 'connected' ? 'WS Live' : wsStatus === 'reconnecting' ? 'Reconnecting' : 'Connecting'}</span>
          </div>

          {/* Live Activity Broadcast Pulse */}
          {liveActivity && (
            <div 
              id="badge-live-activity"
              className="hidden xl:flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50/80 px-2.5 py-1.5 text-[11px] font-medium text-purple-700 animate-fade-in"
              title="Recent network federated query"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75"></span>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-purple-500"></span>
              </span>
              <span className="max-w-[120px] truncate">Live: "{liveActivity.query}"</span>
            </div>
          )}

          {/* Google Programmable Web Search Button */}
          {onOpenGoogleSearch && (
            <button
              id="btn-open-google-search"
              onClick={onOpenGoogleSearch}
              title="Open Google Programmable Search (Web & Images)"
              className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 hover:border-blue-300"
            >
              <Globe className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">Google Search</span>
            </button>
          )}

          {/* Subtle Engine Status (Quiet Developer Telemetry) */}
          <button
            id="btn-engine-telemetry"
            onClick={onOpenTelemetry}
            title="Gateway Engine Telemetry & Provider Health (Admin/Dev)"
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <Activity className="h-3.5 w-3.5 text-neutral-500" />
            <span className="hidden md:inline">Gateway Health</span>
          </button>

          {/* Dedicated Downloads Button */}
          <button
            id="btn-open-downloads"
            onClick={onOpenDownloads || onOpenLibrary}
            className="flex items-center gap-1.5 sm:gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 sm:px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-xs transition-all hover:border-neutral-300 hover:bg-neutral-50"
            title="View Download History & Saved Assets"
          >
            <DownloadCloud className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Downloads</span>
            {downloadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                {downloadCount}
              </span>
            )}
          </button>

          {/* Library & Collections Button */}
          <button
            id="btn-open-library"
            onClick={onOpenLibrary}
            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-neutral-800"
          >
            <FolderHeart className="h-4 w-4 text-pink-300" />
            <span>My Library</span>
            {favoriteCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white">
                {favoriteCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
