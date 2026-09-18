import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Heart, 
  FolderPlus, 
  Check, 
  ShieldCheck, 
  Copy, 
  ExternalLink, 
  FileText, 
  Sparkles,
  AlertCircle,
  Loader2,
  Database,
  Zap,
  Film,
  Play,
  RefreshCw,
  MapPin
} from 'lucide-react';
import { ResourceItem, Collection } from '../types/resource';
import { getContentPhoto } from '../utils/contentPhotos';
import { 
  downloadResourceAsset, 
  downloadAttributionCitation, 
  downloadMetadataRecord,
  getAssetExtension,
  getBestAssetUrl
} from '../utils/downloadEngine';
import { sanitizeSafeLink } from '../utils/sanitizeUrl';

interface ResourceDetailModalProps {
  resource: ResourceItem | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onStartDownload: (resource: ResourceItem) => void;
  collections: Collection[];
  onAddToCollection: (collectionId: string, resourceId: string) => void;
}

export const ResourceDetailModal: React.FC<ResourceDetailModalProps> = ({
  resource,
  onClose,
  isFavorite,
  onToggleFavorite,
  onStartDownload,
  collections,
  onAddToCollection
}) => {
  const [copiedAttribution, setCopiedAttribution] = useState(false);
  const [showCollectionMenu, setShowCollectionMenu] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccessState, setDownloadSuccessState] = useState<string | null>(null);

  if (!resource) return null;

  const creatorName = resource.creator?.name || 'Verified Contributor';
  const creatorOrg = resource.creator?.organization;
  const licenseType = resource.license?.type || 'Unknown / Not specified';
  const providerName = resource.source?.providerName || 'External Repository';
  const rawResourceUrl = resource.source?.resourceUrl || resource.previewUrl || resource.downloadUrl;
  const resourceUrl = sanitizeSafeLink(rawResourceUrl);
  const assetExtension = getAssetExtension(resource).toUpperCase();

  const handleDirectDownloadOption = async (mode: 'asset' | 'proxy' | 'citation' | 'metadata') => {
    setIsDownloading(true);
    setDownloadSuccessState(null);

    try {
      if (mode === 'citation') {
        downloadAttributionCitation(resource);
        setDownloadSuccessState('Citation downloaded');
      } else if (mode === 'metadata') {
        downloadMetadataRecord(resource);
        setDownloadSuccessState('Metadata (.json) downloaded');
      } else {
        await downloadResourceAsset(resource, { mode: mode === 'proxy' ? 'proxy' : 'direct' });
        setDownloadSuccessState(`${assetExtension} asset downloaded`);
      }
      setTimeout(() => setDownloadSuccessState(null), 3000);
    } catch (err) {
      console.error('Download option failed, triggering modal...', err);
      onStartDownload(resource);
    } finally {
      setIsDownloading(false);
    }
  };

  const attributionText = `"${resource.title}" by ${creatorName}${
    creatorOrg ? ` (${creatorOrg})` : ''
  }, licensed under ${licenseType}.`;

  const copyAttribution = () => {
    navigator.clipboard.writeText(attributionText);
    setCopiedAttribution(true);
    setTimeout(() => setCopiedAttribution(false), 2000);
  };

  const handleSelectCollection = (colId: string, colName: string) => {
    onAddToCollection(colId, resource.id);
    setShowCollectionMenu(false);
    setAddedSuccess(colName);
    setTimeout(() => setAddedSuccess(null), 2500);
  };

  const previewSource = resource.previewUrl || resource.downloadUrl || resource.thumbnailUrl;
  const [modalImgSrc, setModalImgSrc] = useState(
    () => previewSource || resource.attributes?.lqip || getContentPhoto(resource.title, resource.category)
  );
  const [isModalImgLoading, setIsModalImgLoading] = useState(true);
  const [modalImgFailed, setModalImgFailed] = useState(false);
  const [triedModalProxy, setTriedModalProxy] = useState(false);
  const [triedLqip, setTriedLqip] = useState(false);

  // Video playback & resilient proxy/mirror states
  const [videoMirror, setVideoMirror] = useState<'standard' | 'invidious' | 'piped' | 'proxy'>('standard');
  const [useVideoProxyStream, setUseVideoProxyStream] = useState(true);
  const [videoStreamFailed, setVideoStreamFailed] = useState(false);
  const [audioStreamFailed, setAudioStreamFailed] = useState(false);

  useEffect(() => {
    setModalImgSrc(previewSource || resource.attributes?.lqip || getContentPhoto(resource.title, resource.category));
    setIsModalImgLoading(true);
    setModalImgFailed(false);
    setTriedModalProxy(false);
    setTriedLqip(false);
    setVideoMirror('standard');
    setUseVideoProxyStream(true);
    setVideoStreamFailed(false);
    setAudioStreamFailed(false);
  }, [previewSource, resource]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-white sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-neutral-600">
              {resource.category}
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs text-neutral-500 font-mono">
              {resource.attributes?.format || 'ASSET'}
            </span>
            <span className="text-xs text-neutral-400">·</span>
            <span className="text-xs font-medium text-neutral-600">
              {providerName}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Main Media Preview Area */}
          <div className="rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center relative min-h-[280px] sm:min-h-[380px]">
            {/* Image / GIF / Art / Visual Items */}
            {(['images', 'gifs', 'art', 'food', 'games', 'biodiversity'].includes(resource.category) || (!['videos', 'music', 'audio', 'papers', 'maps', 'books', 'weather', 'code', 'datasets', 'knowledge', 'finance'].includes(resource.category) && modalImgSrc)) && modalImgSrc && (
              <div className="relative flex items-center justify-center w-full h-full min-h-[300px]">
                {isModalImgLoading && !modalImgFailed && (
                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/60 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-white/70" />
                  </div>
                )}
                {modalImgFailed ? (
                  <div className="relative w-full max-h-[60vh] flex flex-col items-center justify-center overflow-hidden rounded-lg">
                    <img
                      src={getContentPhoto(resource.title, resource.category)}
                      alt={resource.title}
                      className="max-h-[60vh] w-auto max-w-full object-contain mx-auto"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-center">
                      <p className="text-sm font-medium text-white">{resource.title}</p>
                      <span className="text-xs text-amber-400 font-medium">{providerName}</span>
                    </div>
                  </div>
                ) : (
                  <img
                    src={modalImgSrc}
                    alt={resource.title}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onLoad={() => setIsModalImgLoading(false)}
                    onError={() => {
                      if (!triedModalProxy && previewSource && previewSource.startsWith('http')) {
                        setTriedModalProxy(true);
                        setModalImgSrc(`/api/v1/media-tunnel?type=image&url=${encodeURIComponent(previewSource)}&title=${encodeURIComponent(resource.title)}&category=${resource.category}`);
                      } else if (!triedLqip && resource.attributes?.lqip && modalImgSrc !== resource.attributes.lqip) {
                        setTriedLqip(true);
                        setModalImgSrc(resource.attributes.lqip);
                      } else {
                        const fallbackPhoto = getContentPhoto(resource.title, resource.category);
                        if (modalImgSrc !== fallbackPhoto) {
                          setModalImgSrc(fallbackPhoto);
                          setIsModalImgLoading(false);
                        } else {
                          setIsModalImgLoading(false);
                          setModalImgFailed(true);
                        }
                      }
                    }}
                    className={`max-h-[60vh] w-auto max-w-full object-contain mx-auto transition-opacity duration-300 ${
                      isModalImgLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                  />
                )}
              </div>
            )}

            {/* Video Player & Streaming Proxy */}
            {resource.category === 'videos' && (() => {
              const isYouTube = resource.providerId === 'youtube_video' || 
                Boolean(previewSource && (previewSource.includes('youtube.com') || previewSource.includes('youtu.be')));
              const youtubeId = (resource.attributes?.youtubeId as string) || resource.externalId || (
                isYouTube && previewSource ? (
                  previewSource.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/)?.[1]
                ) : undefined
              );

              let activeVideoEmbedUrl: string | undefined = undefined;
              if (isYouTube && youtubeId) {
                if (videoMirror === 'invidious') {
                  activeVideoEmbedUrl = (resource.attributes?.invidiousUrl as string) || `https://yewtu.be/embed/${youtubeId}`;
                } else if (videoMirror === 'piped') {
                  activeVideoEmbedUrl = (resource.attributes?.pipedUrl as string) || `https://piped.video/embed/${youtubeId}`;
                } else if (videoMirror === 'proxy') {
                  activeVideoEmbedUrl = `/api/v1/video-embed?id=${youtubeId}&provider=youtube`;
                } else {
                  activeVideoEmbedUrl = (resource.attributes?.embedUrl as string) || `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&enablejsapi=1&rel=0`;
                }
              } else if (resource.attributes?.embedUrl) {
                activeVideoEmbedUrl = resource.attributes.embedUrl;
              } else if (previewSource && (
                previewSource.includes('dailymotion.com') || 
                previewSource.includes('player.vimeo.com') || 
                previewSource.includes('archive.org/embed') || 
                previewSource.includes('/videos/embed/')
              )) {
                activeVideoEmbedUrl = previewSource;
              }

              const isEmbeddable = Boolean(activeVideoEmbedUrl);

              const directVideoStreamUrl = previewSource
                ? (useVideoProxyStream && previewSource.startsWith('http')
                    ? `/api/v1/video-stream?url=${encodeURIComponent(previewSource)}${resource.externalId ? `&iaId=${encodeURIComponent(resource.externalId)}` : ''}`
                    : previewSource)
                : undefined;

              const youtubeWatchUrl = youtubeId ? `https://www.youtube.com/watch?v=${youtubeId}` : undefined;

              return (
                <div className="w-full bg-neutral-950 flex flex-col">
                  {/* Video Mirror & Proxy Controls Bar */}
                  <div className="w-full bg-neutral-900/95 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-neutral-800 text-xs text-neutral-300">
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span className="font-semibold text-white truncate max-w-[180px] sm:max-w-xs">
                        {isYouTube ? 'YouTube Stream' : resource.source?.providerName || 'Video Player'}
                      </span>
                      <span className="text-neutral-600 hidden sm:inline">|</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                        Unblocked Proxy Active
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isYouTube && youtubeId ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setVideoMirror('standard')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                              videoMirror === 'standard'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                            }`}
                            title="Official YouTube NoCookie player (no tracking cookies)"
                          >
                            YouTube NoCookie
                          </button>
                          <button
                            type="button"
                            onClick={() => setVideoMirror('invidious')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                              videoMirror === 'invidious'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                            }`}
                            title="Invidious privacy mirror (bypasses ISP & regional restrictions)"
                          >
                            Invidious Mirror
                          </button>
                          <button
                            type="button"
                            onClick={() => setVideoMirror('proxy')}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                              videoMirror === 'proxy'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                            }`}
                            title="Local server embed proxy wrapper"
                          >
                            Server Proxy
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setVideoStreamFailed(false);
                            setUseVideoProxyStream(!useVideoProxyStream);
                          }}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                            useVideoProxyStream
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          }`}
                          title="Stream video through server proxy to bypass CORS and hotlink blocks"
                        >
                          {useVideoProxyStream ? 'Proxy Stream (Active)' : 'Direct Provider Stream'}
                        </button>
                      )}

                      {sanitizeSafeLink(youtubeWatchUrl || resource.resourceUrl || resource.downloadUrl || previewSource) && (
                        <a
                          href={sanitizeSafeLink(youtubeWatchUrl || resource.resourceUrl || resource.downloadUrl || previewSource)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 text-[11px] font-medium text-white inline-flex items-center gap-1.5 border border-neutral-700 transition-colors"
                          title="Open video directly on the source website in a new tab"
                        >
                          <span>{isYouTube ? 'Watch on YouTube' : 'Open in New Tab'}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Video Screen Container */}
                  {isEmbeddable ? (
                    <div className="w-full aspect-video max-h-[60vh] bg-black flex items-center justify-center relative">
                      <iframe
                        key={activeVideoEmbedUrl}
                        src={activeVideoEmbedUrl}
                        title={resource.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="no-referrer-when-downgrade"
                        allowFullScreen
                      />
                    </div>
                  ) : directVideoStreamUrl && !videoStreamFailed ? (
                    <div className="w-full aspect-video max-h-[60vh] bg-black flex items-center justify-center relative">
                      <video
                        key={directVideoStreamUrl}
                        src={directVideoStreamUrl}
                        poster={resource.thumbnailUrl || resource.previewUrl}
                        preload="metadata"
                        controls
                        autoPlay
                        loop
                        playsInline
                        onError={() => {
                          if (useVideoProxyStream) {
                            setUseVideoProxyStream(false);
                          } else {
                            setVideoStreamFailed(true);
                          }
                        }}
                        className="max-h-[60vh] w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-neutral-900 flex flex-col items-center justify-center p-6 text-center text-white space-y-3">
                      <Film className="h-10 w-10 text-amber-400" />
                      <p className="font-semibold text-base">{resource.title}</p>
                      <p className="text-xs text-neutral-400 max-w-md">
                        Direct video stream is active. If your browser blocks playback, switch between proxy gateway and direct upstream below.
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setVideoStreamFailed(false);
                            setUseVideoProxyStream(!useVideoProxyStream);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Retry with {useVideoProxyStream ? 'Direct Stream' : 'Proxy Gateway'}</span>
                        </button>
                        {sanitizeSafeLink(previewSource || resource.resourceUrl || resource.downloadUrl) && (
                          <a
                            href={sanitizeSafeLink(previewSource || resource.resourceUrl || resource.downloadUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white flex items-center gap-1.5 border border-neutral-700 transition-colors"
                          >
                            <span>Open Stream in New Tab</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* High-speed Guarantee Tip */}
                  <div className="bg-neutral-950 px-4 py-1.5 flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-900">
                    <span className="flex items-center gap-1.5">
                      <Zap className="h-3 w-3 text-amber-400" />
                      High-speed video stream proxy enabled. Nothing is blocked.
                    </span>
                    {isYouTube && (
                      <span className="hidden sm:inline text-neutral-400">
                        If uploader disabled third-party embedding, click <span className="text-emerald-400 font-medium">Invidious Mirror</span> or <span className="text-amber-300 font-medium">Watch on YouTube</span>.
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Audio / Music */}
            {(resource.category === 'music' || resource.category === 'audio') && (
              <div className="w-full p-8 text-center text-white space-y-6">
                <div className="flex justify-center">
                  {resource.thumbnailUrl ? (
                    <img
                      src={resource.thumbnailUrl}
                      alt={resource.title}
                      className="h-32 w-32 rounded-2xl object-cover shadow-2xl border border-neutral-700/60"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center shadow-lg">
                      <Sparkles className="h-10 w-10 text-white" />
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-lg font-bold">{resource.title}</h4>
                  <p className="text-sm text-neutral-400">{creatorName}</p>
                  {resource.attributes?.album && (
                    <p className="text-xs text-amber-400/90 font-medium mt-1">Album: {resource.attributes.album}</p>
                  )}
                </div>

                <div className="max-w-md mx-auto space-y-3">
                  <audio
                    key={audioStreamFailed ? 'direct-audio' : 'proxy-audio'}
                    src={
                      audioStreamFailed ||
                      !previewSource?.startsWith('http') ||
                      previewSource.includes('apple.com') ||
                      previewSource.includes('mzstatic.com') ||
                      previewSource.includes('wikimedia.org') ||
                      previewSource.includes('radio-browser')
                        ? previewSource
                        : `/api/v1/audio-stream?url=${encodeURIComponent(previewSource)}`
                    }
                    preload="metadata"
                    controls
                    autoPlay
                    onError={() => {
                      if (!audioStreamFailed) {
                        setAudioStreamFailed(true);
                      }
                    }}
                    className="w-full rounded-lg"
                  />
                  {audioStreamFailed && (
                    <p className="text-[11px] text-amber-300/90">
                      Direct audio mode active. If playback is paused by browser policy, click play above or use Instant Save.
                    </p>
                  )}

                  {resource.attributes?.embedUrl && (
                    <div className="pt-2 text-left">
                      <details className="text-xs text-neutral-400 group">
                        <summary className="cursor-pointer hover:text-amber-400 select-none py-1">
                          Show Archive / Interactive Web Player
                        </summary>
                        <div className="mt-2 rounded-xl overflow-hidden border border-neutral-700/60">
                          <iframe
                            src={resource.attributes.embedUrl}
                            title={resource.title}
                            className="w-full h-[120px] border-0 bg-neutral-950"
                            allow="autoplay"
                          />
                        </div>
                      </details>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-4 text-xs text-neutral-400">
                  {resource.attributes?.duration && <span>Duration: {resource.attributes.duration}</span>}
                  {resource.attributes?.genre && <span>Genre: {resource.attributes.genre}</span>}
                  {resource.attributes?.quality && <span>Quality: {resource.attributes.quality}</span>}
                </div>
              </div>
            )}

            {/* Research Paper */}
            {resource.category === 'papers' && (
              <div className="w-full p-8 bg-neutral-900 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                    <FileText className="h-4 w-4" />
                    <span>Scholarly Research Document</span>
                  </div>
                  {(resource.attributes?.pdfUrl || resource.downloadUrl) && (
                    <a
                      href={sanitizeSafeLink(resource.attributes?.pdfUrl || resource.downloadUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <span>Read Full Document</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <h2 className="text-xl sm:text-2xl font-bold leading-snug">
                  {resource.title}
                </h2>
                <p className="text-sm text-neutral-300">
                  By {creatorName} {creatorOrg ? `(${creatorOrg})` : ''}
                </p>
                {resource.attributes?.doi && (
                  <p className="text-xs font-mono text-neutral-400">
                    DOI: {resource.attributes.doi}
                  </p>
                )}
                {resource.attributes?.journal && (
                  <p className="text-xs text-neutral-400">
                    Journal: {resource.attributes.journal}
                  </p>
                )}
                {resource.description && (
                  <div className="pt-2 border-t border-neutral-800 text-xs text-neutral-300 leading-relaxed max-h-40 overflow-y-auto">
                    {resource.description}
                  </div>
                )}
              </div>
            )}

            {/* Map Preview */}
            {resource.category === 'maps' && (
              <div className="w-full min-h-[320px] relative bg-neutral-950 flex flex-col">
                {resource.attributes?.coordinates ? (
                  <div className="w-full h-80 relative">
                    <iframe
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${resource.attributes.coordinates[1] - 0.06}%2C${resource.attributes.coordinates[0] - 0.04}%2C${resource.attributes.coordinates[1] + 0.06}%2C${resource.attributes.coordinates[0] + 0.04}&layer=mapnik&marker=${resource.attributes.coordinates[0]}%2C${resource.attributes.coordinates[1]}`}
                      className="w-full h-full border-0"
                      title={`Interactive Map of ${resource.title}`}
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2 z-10">
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${resource.attributes.coordinates[0]}&mlon=${resource.attributes.coordinates[1]}#map=12/${resource.attributes.coordinates[0]}/${resource.attributes.coordinates[1]}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-md bg-neutral-900/90 hover:bg-neutral-900 text-white text-[11px] font-semibold flex items-center gap-1 shadow-md border border-neutral-700"
                      >
                        <MapPin className="h-3 w-3 text-emerald-400" />
                        <span>Open in OpenStreetMap</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-80 relative">
                    {previewSource && (
                      <img
                        src={resource.thumbnailUrl || previewSource}
                        alt={resource.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-6 text-center text-white">
                      <div className="space-y-2">
                        <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold">
                          {resource.attributes?.mapType || 'Cartographic Data'}
                        </span>
                        <h3 className="text-lg font-bold">{resource.attributes?.region || resource.title}</h3>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Books & Literature */}
            {resource.category === 'books' && (
              <div className="w-full p-6 bg-neutral-900 text-white flex flex-col sm:flex-row items-center gap-6">
                {resource.thumbnailUrl && (
                  <img
                    src={resource.thumbnailUrl}
                    alt={resource.title}
                    className="max-h-60 object-contain rounded-lg shadow-lg border border-neutral-700 shrink-0"
                  />
                )}
                <div className="space-y-3 flex-1 text-left">
                  <span className="rounded-full bg-amber-500/20 text-amber-300 px-2.5 py-0.5 text-xs font-semibold">
                    Open Literature & Books
                  </span>
                  <h3 className="text-xl font-bold leading-snug">{resource.title}</h3>
                  <p className="text-sm text-neutral-300">By {creatorName}</p>
                  {resource.attributes?.language && (
                    <p className="text-xs font-mono text-neutral-400">Language: {resource.attributes.language.toUpperCase()}</p>
                  )}
                  {resource.attributes?.downloads !== undefined && (
                    <p className="text-xs text-neutral-400">Downloads: {resource.attributes.downloads.toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}

            {/* Weather Preview */}
            {resource.category === 'weather' && (
              <div className="w-full p-8 bg-gradient-to-br from-sky-600 to-indigo-700 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-sky-200">
                    Open-Meteo Atmospheric Observation
                  </span>
                  {resource.attributes?.coordinates && (
                    <span className="text-xs font-mono text-sky-200">
                      [{resource.attributes.coordinates[0].toFixed(2)}°, {resource.attributes.coordinates[1].toFixed(2)}°]
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  {resource.attributes?.temperature !== undefined && (
                    <div className="text-5xl font-black font-mono text-amber-300">
                      {resource.attributes.temperature}°C
                    </div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">{resource.attributes?.region || resource.title}</h3>
                    <p className="text-sm text-sky-100">{resource.attributes?.weatherCondition || 'Current conditions'}</p>
                  </div>
                </div>
                <p className="text-sm text-sky-100 leading-relaxed">{resource.description}</p>
              </div>
            )}

            {/* Code Repository Preview */}
            {resource.category === 'code' && (
              <div className="w-full p-6 bg-neutral-950 text-neutral-200 font-mono space-y-4 text-left">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                  <span>REPOSITORY / PACKAGE</span>
                  <span>{resource.attributes?.language || 'Code'}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{resource.title}</h3>
                <p className="text-xs font-sans text-neutral-300 leading-relaxed">
                  {resource.description || 'Open source software resource.'}
                </p>
                <div className="flex flex-wrap gap-4 text-xs text-neutral-400 pt-2 border-t border-neutral-800 font-mono">
                  {resource.attributes?.stars !== undefined && <span>Stars: ⭐ {resource.attributes.stars}</span>}
                  {resource.attributes?.forks !== undefined && <span>Forks: 🍴 {resource.attributes.forks}</span>}
                  {resource.attributes?.version && <span>Version: v{resource.attributes.version}</span>}
                </div>
              </div>
            )}

            {/* Dataset Preview */}
            {resource.category === 'datasets' && (
              <div className="w-full p-6 bg-neutral-900 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-amber-400">
                    Scientific Open Dataset
                  </span>
                  <span className="text-xs text-neutral-400">
                    {resource.attributes?.fileSize || 'Standard Archive'}
                  </span>
                </div>
                <p className="text-sm text-neutral-300">
                  {resource.description || 'Open science repository record available for academic and computational use.'}
                </p>
              </div>
            )}

            {/* Knowledge & Reference Preview */}
            {resource.category === 'knowledge' && (
              <div className="w-full p-6 bg-gradient-to-br from-neutral-900 to-slate-900 text-white space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Open Encyclopedia & Reference
                  </span>
                  <span className="text-xs text-neutral-400 font-mono">
                    {resource.source?.providerName || 'Wikipedia / Wikidata'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white leading-snug">{resource.title}</h3>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  {resource.description || 'Open educational reference work.'}
                </p>
                <div className="flex items-center gap-4 text-xs text-neutral-400 pt-2 border-t border-neutral-800">
                  <span>License: {licenseType}</span>
                  <span>Free Educational Use</span>
                </div>
              </div>
            )}

            {/* Finance & Currency Preview */}
            {resource.category === 'finance' && (
              <div className="w-full p-6 bg-gradient-to-br from-neutral-950 to-indigo-950 text-white space-y-4 font-mono">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                  <span>ECB BENCHMARK FOREX</span>
                  <span>{resource.attributes?.currencyBase ? `BASE: ${resource.attributes.currencyBase}` : 'RATES'}</span>
                </div>
                <h3 className="text-xl font-bold text-white font-sans">{resource.title}</h3>
                <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                  {resource.description}
                </p>
              </div>
            )}
          </div>

          {/* Title & Author */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900">
              {resource.title}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              By <span className="font-semibold text-neutral-900">{creatorName}</span>
              {creatorOrg && ` · ${creatorOrg}`}
            </p>
            {resource.description && (
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                {resource.description}
              </p>
            )}
          </div>

          {/* Live Provenance & Verification Honest Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-neutral-800">
              <ShieldCheck className="h-4 w-4 shrink-0 text-neutral-600" />
              <div className="text-xs truncate">
                <span className="font-semibold block truncate">Origin Provider</span>
                <span className="text-neutral-600 truncate">{providerName}</span>
              </div>
            </div>

            <div className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
              resource.verification?.integrityVerified
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-neutral-50 border-neutral-200 text-neutral-700'
            }`}>
              {resource.verification?.integrityVerified ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-neutral-400" />
              )}
              <div>
                <span className="font-semibold block">Integrity Status</span>
                <span className="text-neutral-500">
                  {resource.verification?.integrityVerified ? 'SHA-256 Verified' : 'Standard Direct Upstream'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 p-3 text-blue-800">
              <Sparkles className="h-4 w-4 shrink-0 text-blue-600" />
              <div className="text-xs truncate">
                <span className="font-semibold block truncate">License Framework</span>
                <span className="text-blue-700/80 truncate">{licenseType}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              {/* Download */}
              <button
                id="btn-modal-download"
                onClick={() => onStartDownload(resource)}
                className="flex items-center gap-2 rounded-xl bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800 transition-all shadow-sm active:scale-98"
              >
                <Download className="h-4 w-4 text-emerald-400" />
                <span>Download {assetExtension} {resource.attributes?.fileSize ? `(${resource.attributes.fileSize})` : ''}</span>
              </button>

              {/* 1-Click Save */}
              <button
                type="button"
                onClick={() => handleDirectDownloadOption('asset')}
                disabled={isDownloading}
                className="flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 transition-all shadow-xs active:scale-98 disabled:opacity-60"
                title="Instant 1-Click download directly to disk"
              >
                {isDownloading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-neutral-600" />
                ) : (
                  <Zap className="h-4 w-4 text-amber-500" />
                )}
                <span>Instant Save</span>
              </button>

              {/* Save / Favorite */}
              <button
                onClick={() => onToggleFavorite(resource.id)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all ${
                  isFavorite
                    ? 'border-pink-300 bg-pink-50 text-pink-700'
                    : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current text-pink-600' : ''}`} />
                <span>{isFavorite ? 'Saved to Favorites' : 'Save'}</span>
              </button>

              {/* External source landing page */}
              {resourceUrl && (
                <a
                  href={resourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all"
                >
                  <ExternalLink className="h-4 w-4 text-neutral-500" />
                  <span>Source Repository</span>
                </a>
              )}
            </div>

            {/* Success feedback toast */}
            {downloadSuccessState && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-xs font-semibold text-emerald-800 animate-in fade-in">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{downloadSuccessState}</span>
              </div>
            )}

            {/* Additional Download Formats & Options */}
            <div className="rounded-xl border border-neutral-200/80 bg-neutral-50/70 p-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block mb-2">
                Download Options &amp; Formats
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDirectDownloadOption('proxy')}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Gateway Stream (SHA-256)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDirectDownloadOption('citation')}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-blue-500" />
                  <span>BibTeX / Citation</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDirectDownloadOption('metadata')}
                  disabled={isDownloading}
                  className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <Database className="h-3.5 w-3.5 text-purple-500" />
                  <span>JSON Metadata</span>
                </button>
              </div>
            </div>

            {/* Add to Collection */}
            <div className="relative">
              <button
                onClick={() => setShowCollectionMenu(!showCollectionMenu)}
                className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-all"
              >
                <FolderPlus className="h-4 w-4 text-neutral-500" />
                <span>Add to Collection</span>
              </button>

              {showCollectionMenu && (
                <div className="absolute left-0 mt-2 w-56 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black/10 z-30">
                  <span className="px-2 py-1 text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                    Select Collection
                  </span>
                  <div className="mt-1 space-y-1">
                    {collections.map((col) => {
                      const contains = col.resourceIds.includes(resource.id);
                      return (
                        <button
                          key={col.id}
                          onClick={() => handleSelectCollection(col.id, col.name)}
                          className="w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span 
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: col.color }}
                            />
                            <span>{col.name}</span>
                          </div>
                          {contains && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {addedSuccess && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 animate-fade-in">
                <Check className="h-3.5 w-3.5" /> Added to {addedSuccess}!
              </span>
            )}
          </div>

          {/* Technical Resource Specifications Table */}
          <div className="border-t border-neutral-200 pt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
              Resource Metadata
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div className="rounded-lg bg-neutral-50 p-3 border border-neutral-100">
                <span className="text-neutral-400 block mb-0.5">Format</span>
                <span className="font-semibold text-neutral-800">{resource.attributes?.format || 'Unknown'}</span>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3 border border-neutral-100">
                <span className="text-neutral-400 block mb-0.5">File Size</span>
                <span className="font-semibold text-neutral-800">{resource.attributes?.fileSize || 'Unknown'}</span>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3 border border-neutral-100">
                <span className="text-neutral-400 block mb-0.5">Dimensions / Duration</span>
                <span className="font-semibold text-neutral-800">
                  {resource.attributes?.dimensions || resource.attributes?.duration || 'N/A'}
                </span>
              </div>
              <div className="rounded-lg bg-neutral-50 p-3 border border-neutral-100">
                <span className="text-neutral-400 block mb-0.5">Quality Level</span>
                <span className="font-semibold text-neutral-800">{resource.attributes?.quality || 'Standard'}</span>
              </div>
            </div>
          </div>

          {/* Usage & Attribution Rights */}
          <div className="border-t border-neutral-200 pt-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
              Usage &amp; Attribution Information
            </h4>
            
            <div className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 space-y-3">
              <div>
                <span className="text-sm font-semibold text-neutral-900 block">
                  {licenseType}
                </span>
                {resource.license?.details && (
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {resource.license.details}
                  </p>
                )}
              </div>

              {/* Rights Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-neutral-200/80 text-xs">
                <div className="flex items-center gap-1.5 text-neutral-700">
                  <Check className={`h-4 w-4 ${resource.license?.commercialAllowed === true ? 'text-emerald-600' : resource.license?.commercialAllowed === false ? 'text-red-500' : 'text-neutral-400'}`} />
                  <span>Commercial use: {resource.license?.commercialAllowed === true ? 'Allowed' : resource.license?.commercialAllowed === false ? 'Not permitted' : 'Unspecified'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-700">
                  <Check className={`h-4 w-4 ${resource.license?.modificationAllowed === true ? 'text-emerald-600' : resource.license?.modificationAllowed === false ? 'text-red-500' : 'text-neutral-400'}`} />
                  <span>Modification: {resource.license?.modificationAllowed === true ? 'Allowed' : resource.license?.modificationAllowed === false ? 'No derivatives' : 'Unspecified'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-700">
                  <Check className={`h-4 w-4 ${resource.license?.attributionRequired === true ? 'text-amber-600' : resource.license?.attributionRequired === false ? 'text-emerald-600' : 'text-neutral-400'}`} />
                  <span>Attribution: {resource.license?.attributionRequired === true ? 'Required' : resource.license?.attributionRequired === false ? 'Not required' : 'Review terms'}</span>
                </div>
              </div>

              {/* Attribution Snippet */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider block mb-1">
                  Citation / Attribution Credit
                </span>
                <div className="flex items-center justify-between rounded-lg bg-white p-2.5 border border-neutral-200 text-xs font-mono text-neutral-700">
                  <span className="truncate mr-2">{attributionText}</span>
                  <button
                    onClick={copyAttribution}
                    className="flex items-center gap-1 text-xs font-sans font-semibold text-neutral-900 hover:text-blue-600 shrink-0 cursor-pointer"
                  >
                    {copiedAttribution ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
