import React, { useState } from 'react';
import { 
  Layers, 
  Image as ImageIcon, 
  Video, 
  Music, 
  BookOpen, 
  FileText, 
  Database, 
  Check, 
  Info, 
  ExternalLink, 
  X, 
  Sparkles,
  Palette,
  Compass,
  Box,
  Rocket,
  Newspaper
} from 'lucide-react';
import { ResourceItem, ResourceCategory } from '../types/resource';

interface ProviderStat {
  id: string;
  name: string;
  count: number;
  category: ResourceCategory;
  url?: string;
}

interface SourceAggregatorBarProps {
  resources: ResourceItem[];
  selectedProvider: string | null;
  onSelectProvider: (providerId: string | null) => void;
  selectedCategory: ResourceCategory;
  onSelectCategory: (category: ResourceCategory) => void;
}

export const SourceAggregatorBar: React.FC<SourceAggregatorBarProps> = ({
  resources,
  selectedProvider,
  onSelectProvider,
  selectedCategory,
  onSelectCategory
}) => {
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);

  // Compute live counts per provider from currently active items
  const providerStats = resources.reduce((acc, item) => {
    const pid = item.source?.providerId || 'other';
    const pname = item.source?.providerName || 'Open Repository';
    if (!acc[pid]) {
      acc[pid] = {
        id: pid,
        name: pname,
        count: 0,
        category: item.category,
        url: item.source?.resourceUrl
      };
    }
    acc[pid].count += 1;
    return acc;
  }, {} as Record<string, ProviderStat>);

  const activeProviders: ProviderStat[] = (Object.values(providerStats) as ProviderStat[]).sort(
    (a, b) => b.count - a.count
  );

  // Media modality clusters
  const modalityClusters = [
    {
      id: 'all' as ResourceCategory,
      label: 'All Media Unified',
      icon: Layers,
      color: 'text-neutral-900 bg-neutral-900 text-white'
    },
    {
      id: 'news' as ResourceCategory,
      label: 'Live News Wire',
      icon: Newspaper,
      color: 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
    },
    {
      id: 'images' as ResourceCategory,
      label: 'Pictures & Imagery',
      icon: ImageIcon,
      color: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200'
    },
    {
      id: 'art' as ResourceCategory,
      label: 'Museum Art & Culture',
      icon: Palette,
      color: 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
    },
    {
      id: 'videos' as ResourceCategory,
      label: 'Videos & Footage',
      icon: Video,
      color: 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-200'
    },
    {
      id: '3d' as ResourceCategory,
      label: '3D & Spatial',
      icon: Box,
      color: 'text-orange-700 bg-orange-50 hover:bg-orange-100 border-orange-200'
    },
    {
      id: 'audio' as ResourceCategory,
      label: 'Audio & Music',
      icon: Music,
      color: 'text-cyan-700 bg-cyan-50 hover:bg-cyan-100 border-cyan-200'
    },
    {
      id: 'books' as ResourceCategory,
      label: 'Books & Texts',
      icon: BookOpen,
      color: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
    },
    {
      id: 'papers' as ResourceCategory,
      label: 'Research Papers',
      icon: FileText,
      color: 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200'
    },
    {
      id: 'nasa' as ResourceCategory,
      label: 'NASA Space Hub',
      icon: Rocket,
      color: 'text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-200'
    },
    {
      id: 'datasets' as ResourceCategory,
      label: 'Open Data & Geo',
      icon: Database,
      color: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200'
    }
  ];

  return (
    <div className="mb-6 rounded-2xl border border-neutral-200/90 bg-white p-4 shadow-xs">
      {/* Header with Modality Clusters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-xs">
            <Compass className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-neutral-900 tracking-tight">Connected Media Sources</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                {activeProviders.length} Archives Active
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Aggregating authentic cultural, scientific, and open media into one unified interface.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMatrixOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <Info className="h-3.5 w-3.5 text-neutral-500" />
            <span>Sources Directory</span>
          </button>
        </div>
      </div>

      {/* Modality Clusters Scrollable Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar">
        {modalityClusters.map((cluster) => {
          const Icon = cluster.icon;
          const isActive = selectedCategory === cluster.id;
          return (
            <button
              key={cluster.id}
              type="button"
              onClick={() => onSelectCategory(cluster.id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{cluster.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Repositories Contributing to Current Search */}
      {activeProviders.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-neutral-100 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-neutral-500 mr-1">Filter by Archive:</span>
          
          <button
            type="button"
            onClick={() => onSelectProvider(null)}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
              selectedProvider === null
                ? 'bg-neutral-900 text-white font-semibold'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {selectedProvider === null && <Check className="h-3 w-3" />}
            <span>All Sources ({resources.length})</span>
          </button>

          {activeProviders.map((p) => {
            const isSelected = selectedProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectProvider(isSelected ? null : p.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium border transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-white border-neutral-200 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                }`}
                title={`Show only items from ${p.name}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                <span>{p.name}</span>
                <span className={`rounded-full px-1.5 text-[10px] ${
                  isSelected ? 'bg-indigo-700 text-white' : 'bg-neutral-100 text-neutral-500'
                }`}>
                  {p.count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sources Directory Modal */}
      {isMatrixOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200">
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-base font-bold text-neutral-900">Open-Access Global Repositories</h3>
                  <p className="text-xs text-neutral-500">Every picture, video, text, and dataset is retrieved from official open archives.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMatrixOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {/* Pictures & Art Section */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-amber-600" />
                  <span>Fine Art, Museums & Pictures</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Smithsonian Open Access (SI)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Millions of CC0 museum treasures, portraits, and art from Smithsonian collections.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Europeana Cultural Heritage</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">50M+ European artworks, cultural items, and historical documents.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Wellcome Collection (London)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Art & science IIIF open collection with 100,000+ public domain works.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">SMK National Gallery (Denmark)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">200,000+ digitized public domain masterpieces in full resolution under CC0.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Art Institute of Chicago (AIC)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Renowned collection with high-resolution IIIF open access and CC0 rights.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Victoria & Albert Museum (V&A)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">World's leading museum of art and design with 1.2M+ historic scans & records.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Cleveland Museum of Art</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Open access CC0 fine art collections spanning world cultures and centuries.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">GBIF Wildlife Imagery</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Millions of authentic wild species occurrences and high-res nature photos.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Wikimedia Commons</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">100M+ freely usable images, historical documents, and cultural photographs.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">NASA EPIC & APOD Astronomy</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Daily deep space planetary images and Earth Polychromatic Imaging Camera discs.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Fontsource Open Typography</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">1,500+ open-source typography fonts & typefaces with variable weights and specimens.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Building Technology Heritage Library (BTHL)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historic architectural catalogs, Victorian pattern books, blueprints, and house designs.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Vintage Posters & Lithographs</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historical travel lithographs, commercial advertising art, and public service posters.</div>
                  </div>
                </div>
              </div>

              {/* Videos & Audio Section */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-purple-600" />
                  <span>Moving Images & Sound</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Universal Newsreels (1929-1967)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historic cinema newsreel footage preserving major 20th century historical events.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Silent Films Classic Cinema</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Landmark silent cinema masterpieces (Keaton, Chaplin, Méliès) with direct streaming.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Computer Chronicles (1983-2002)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Legendary PBS series documenting the dawn of the personal computer revolution.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Free Music Archive (FMA)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Curated Creative Commons independent music recordings with streamable audio.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Classic Cartoons & Animation</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Golden Age animation shorts (Fleischer, early public domain cinema) with stream proxy.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Radio Browser Global Streams</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">40,000+ community live online radio stations broadcasting worldwide.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Apple Podcasts Directory</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Millions of audio broadcasts, series, episodes, and feed artwork.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">PeerTube Federated Open Video</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Decentralized open video network with thousands of creators and open licenses.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">TVMaze Broadcast Directory</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Open television shows, documentaries, episodic series, and cast metadata.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">NASA Video & Media Library</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Space missions, planetary rover expeditions, telescope footage in public domain.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">ccMixter Creative Commons Music</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Community remix stems, vocal tracks, and open license instrumental music.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Internet Archive Audio & 78rpm</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historical recordings, live concerts, early 20th-century shellac discs.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Wikimedia Commons Video & Audio</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Nature recordings, classical performances, spoken archives, and historical clips.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">LibriVox Free Audiobooks & OTR</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Public domain unabridged spoken audiobooks and Golden Age radio drama broadcasts.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Archive Classic PC Games & Arcade</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historic emulated DOS games, arcade software, and software preservation titles.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Rick Prelinger Ephemeral Films</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Preserved mid-century educational films, industrial cinema, and American cultural history.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Open Source Cinema & Movies</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Creative Commons independent cinema, open documentaries, and digital films.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Musopen Classical Music Library</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Public domain classical orchestral recordings, symphonies, and solo instruments.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historic Cinema Previews & Trailers</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Original theatrical preview reels, teasers, and promotional film reels from Hollywood Golden Age.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Sci-Fi & Mystery Radio Theater</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Legendary audio drama adaptations of Bradbury, Asimov, and Heinlein (X Minus One, Dimension X).</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Global Field Recordings & Ambiances</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">87,000+ acoustic ecology recordings, wildlife choruses, rainfall soundscapes, and environmental audio.</div>
                  </div>
                </div>
              </div>

              {/* Science, Code & Knowledge */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Literature, Science, Datasets & Knowledge</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Vintage Pulp & Sci-Fi Archive</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Golden Age speculative fiction, fantasy, and retro-futuristic pulp magazines.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">USGS Historical Topographic Maps</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">59,000+ antique topographic surveys and geological cartography in high resolution.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Internet Arcade Coin-Op Games</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">2,600+ classic coin-operated arcade video games with browser emulation.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">pub.dev Dart & Flutter Registry</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Official open package registry for Dart & Flutter multiplatform libraries and SDKs.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">NASA Exoplanet Archive (Caltech)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Confirmed extrasolar planets, host stars, and observatory mission discoveries.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">PoetryDB Classic Verse Archive</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Thousands of classical public domain poems, sonnets, and historical literature.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Open5e Gaming Lore & SRD</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Open Gaming License fantasy creatures, stat blocks, and tabletop lore.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Wikiquote Notable Quotations</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Verified historical quotes, speeches, and philosophical maxims.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Project Gutenberg & Open Library</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Over 70,000 classic literature books and universal library catalogue.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">OpenAlex, Europe PMC & PubMed</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">250M+ open scientific research papers, preprints, and biomedical studies.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Data.gov & World Bank Open Data</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Official US federal data catalog and global economic development records.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Wikidata & Wikipedia</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Global linked data knowledge graph and comprehensive open encyclopedia.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">GitHub, npm & Hacker News</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Open-source code repositories, package registries, and developer discussions.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">cdnjs & Crates.io Open Registries</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Global web front-end CDN libraries, Rust crates, and developer toolchains.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">DBpedia & Open Linked Data</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Structured RDF ontologies, entity relations, and semantic web knowledge.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Open-Meteo & Air Quality Index</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Atmospheric forecasts, real-time AQI, PM2.5, and global environmental metrics.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">GBIF & iNaturalist</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Global Biodiversity Information Facility and global nature observations.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Open Food Facts & Open Brewery DB</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Crowdsourced global food ingredients, mixology cocktails, and craft breweries.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Paleobiology Database (PaleoDB)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Global paleontology records, fossil specimens, dinosaur taxonomy, and prehistoric eras.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Retro Computing Magazines Archive</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Preserved scans of Byte, Compute!, PC Mag, and classic 8-bit/16-bit computer literature.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Computer History Museum Digital Archive</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Pioneering hardware blueprints, corporate computing documentation, and Unix oral history.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Folkscanomy Curated Historical Texts</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Rare technical handbooks, radio manuals, and historical craft documentation.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historic Cookbooks & Gastronomy</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Public domain historic recipe books, 19th-century culinary manuals, and regional baking guides.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Hex.pm Package Registry</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Open ecosystem for Elixir, Erlang, and the BEAM virtual machine with package specs.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">data.gov.uk Open Data Catalog</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Official UK government datasets across transport, health, education, and geography.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Open Data Canada (open.canada.ca)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Official Canadian federal datasets across environmental observation, climate, and geography.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">NuGet .NET Package Registry</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Microsoft official package ecosystem for .NET, C#, and F# development libraries.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">MetaCPAN Perl Archive Network</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Comprehensive open repository of Perl modules, distributions, and documentation.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Catalogue of Life (COL Species)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">2,000,000+ verified living species taxonomic classifications and phylogenetic lineages.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Integrated Taxonomic Information System (USGS / ITIS)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Official biological taxonomy database across kingdoms Animalia, Plantae, Fungi, and Monera with TSN identifiers.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">NASA Earth Observatory Natural Event Tracker (EONET)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Active real-time planetary events: wildfires, severe storms, volcanic eruptions, and icebergs.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Arch Linux Official & Community Packages</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Linux system software, tools, and developer libraries indexed across core, extra, and multilib repos.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Clojars Clojure & JVM Artifact Registry</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Community repository for Clojure and JVM libraries, build tools, and functional software packages.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Internet Archive MS-DOS Games Showcase</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Playable vintage 80s/90s MS-DOS PC games, shareware classics, and retro computing titles via DOSBox.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Medical Heritage Library (MHL)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Rare historical medicine treatises, anatomical plates, apothecary guides, and public health volumes.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historical Sheet Music & Musical Scores</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Preserved public domain musical scores, classical piano compositions, and ragtime notation with PDF scans.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Old Time Radio Golden Age Broadcasts</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Vintage dramatic radio plays, mystery theaters, and detective episodes with streamable audio.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">USGS Geological Survey Historic Bulletins</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Official geological field investigations, mineral maps, volcanic reports, and hydrology bulletins.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">NASA Apollo & Spaceflight Mission Documents</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Apollo flight plans, technical mission transcripts, astronaut manuals, and spacecraft schematics.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Classic Animation & Cartoon Shorts (Golden Age)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Golden Age public domain animated cinema, early 20th century cartoons, and streaming animation reels.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Internet Archive Film Noir Masterpieces</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">1940s-1950s dramatic cinema classics, high-contrast chiaroscuro cinematography, and suspense reels.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Video Game Speedruns & Longplays Archive</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Preserved video game speedruns, tool-assisted speedruns (TAS), and gameplay playthroughs.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Biodiversity Heritage Library (BHL)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Rare natural history treatises, botanical color plates, and historical zoology volumes.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">NIH PubChem Chemical & Molecular Database</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Official National Library of Medicine chemical records, molecular formulas, weights, and 2D diagrams.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">NASA Apollo Lunar Mission Audio Archives</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Original air-to-ground mission audio loops, Capcom Houston dialogue, and launch transmissions.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">20th Century Historic Radio News Broadcasts</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Original historic radio news flashes, wartime bulletins, and mid-century broadcast journalism.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Vintage Computer Manuals & Schematics</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historical computing manuals, mainframe and microcomputer schematics, and hardware specifications.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Golden Age Comics & Graphic Novels (1930s-1950s)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Scanned Golden Age comic books, classic sci-fi serials, superheroes, and vintage pop art.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">US Patent Office Historic Inventions & Schematics</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historical USPTO patent grants, invention diagrams, engineering blueprints, and mechanical claims.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historical Cartography & Antique World Maps</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">High-resolution scans of antique world maps, topographic charts, and 18th-20th century cartography.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Library of Congress Digital Collections</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historic photographs, architectural drawings, civil war surveys, and presidential manuscripts from the US national library.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">NIH ClinicalTrials.gov Protocol Registry</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Official National Library of Medicine clinical trial records, investigated drugs, trial phases, and outcomes.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">CBS Radio Mystery Theater Complete Archive</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">1,300+ full remastered radio mystery episodes hosted by E.G. Marshall with gothic drama and suspense.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">International Demoscene Art & Music</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Amiga and PC computer demoparty releases, real-time procedural animations, and MOD tracker chiptunes.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Aviation History & Flight Operations Manuals</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historic pilot operating handbooks (POH), Boeing, Cessna, Spitfire, and supersonic jet flight checklists.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historical Costume & Fashion Plates (18th-20th C.)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Hand-colored Victorian, Edwardian, and Art Deco couture engravings and historic garment tailoring guides.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Spoken Word Classic Literature & Poetry</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Classic dramatic literary narrations, poetry recitations, and Shakespearean spoken audiobooks.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Classic Drive-In Theater Intermission Reels</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Nostalgic 1950s/1960s drive-in theater intermission countdowns, animated concession trailers, and shorts.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historical Software & Digital Computing Showcase</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Landmark software releases, early operating systems, compilers, and pioneering digital historical artifacts.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Atomic Age Sci-Fi & Drive-In Cinema Classics</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Golden Age 1950s science fiction cinema, creature features, UFO movies, and atomic monster reels.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Library of Congress Chronicling America (1777-1963)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historic American newspapers, front page headlines, regional journalism, and digitized PDF scans from 1777 to 1963.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">NBC X Minus One Sci-Fi Radio Theater</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">1950s Golden Age NBC radio dramatizations of legendary sci-fi authors Asimov, Heinlein, and Bradbury.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Classic Silent Comedy & Slapstick Masterpieces</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Pioneering physical comedy and silent cinema features from Buster Keaton, Charlie Chaplin, and Harold Lloyd.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historic Railroad Documents & Locomotive Schematics</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">19th/20th century steam locomotive blueprints, train schedules, railroad network maps, and transit history.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Classic Automotive Brochures & Coachwork Design</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Vintage car showroom brochures, coachwork illustrations, concept cars, and automotive engineering guides.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">SIGGRAPH Early Computer Graphics & CGI Animation</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Pioneering 1980s-1990s CGI animation festival reels, early 3D wireframes, raytracing milestones, and procedural art.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Avian Bioacoustics & Wildlife Soundscapes</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Pristine outdoor field recordings of bird song repertoires, animal vocalizations, and natural acoustic wilderness.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">The Great 78 Project Early Jazz & Blues Discs</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Digitized historical 78 RPM shellac phonograph discs preserving early jazz, delta blues, swing, and ragtime.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Vintage Tabletop Board Game Manuals & Box Art</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Vintage tabletop rulebooks, box art graphics, strategy manuals, and classic board game design heritage.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">USGS Historical Topographic Quadrangle Maps</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Detailed historical 7.5- and 15-minute quadrangle survey maps with elevation contours, trails, and old settlements.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historical Restaurant & Ocean Liner Menus (1850s-1980s)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Vintage culinary menus from famous restaurants, grand hotels, transatlantic steamships, and railway dining cars.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Sherlock Holmes Golden Age Radio Mysteries</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Original broadcast recordings starring Basil Rathbone as Sherlock Holmes and Nigel Bruce as Dr. Watson.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Weird Tales & Classic Supernatural Pulp Archive</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Original digitized pulp magazine issues featuring cosmic horror, dark fantasy, and iconic cover illustrations.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historical Observatory Sky Surveys & Lunar Atlases</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historical observatory photographic glass plate scans, lunar surface atlases, and early astrophysical surveys.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Classic Gothic Horror & Monster Cinema (1920s-1960s)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Public domain gothic horror films, vampire cinema, creature features, and early expressionist masterpieces.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Tin Pan Alley & Broadway Sheet Music Lithographs</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Original piano sheet music editions with elaborate multi-color lithograph cover art from the 1890s through 1930s.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historical Eyewitness Testimonies & Spoken Memoirs</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Primary source spoken oral history audio accounts and interviews documenting 20th-century historical events.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Industrial Machinery & Craft Tool Trade Catalogs</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Engraved 19th/20th-century commercial catalogs for iron foundries, machine tools, woodworking, and steam power.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Naturalist Field Notes & Historical Expedition Journals</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Handwritten expedition field journals, biological specimen logs, and Darwinian naturalist field sketches.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Vintage Ham Radio & Vacuum Tube Schematics</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historic amateur radio manuals, transmitter schematics, antenna theory guides, and vacuum tube circuit designs.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Golden Age Children's Storybook Audio & Fables</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Vintage phonograph children's records with orchestral scores, voice actor dramatizations, and classic fairy tales.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">REST Countries Global Geopolitical Database</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Open geopolitical registry providing official nation names, high-resolution SVG flags, capitals, currencies, and coordinates.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Dragnet Golden Age Detective Radio OTR</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Original Los Angeles police procedural radio broadcasts starring Jack Webb as Sergeant Joe Friday.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Heirloom Seed & Botanical Nursery Catalogs (1850-1980)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historic horticultural seed catalogs with vintage chromolithographs of heirloom vegetables, fruits, and garden flora.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Classic Western & Frontier Cinema Masterpieces</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Golden Age Western cinema, frontier cowboy adventures, and classic public domain feature films.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Early Delta Blues & Country Blues Field Recordings</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">78 RPM shellac recordings and field tapes preserving acoustic delta blues, slide guitar, and harmonica traditions.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Scientific American Historical Archive (1845-1909)</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">19th-century issues of Scientific American documenting steam power, early electricity, telegraphy, and patent inventions.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">The Jack Benny Program Golden Age Radio Comedy</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Classic radio comedy masterworks starring Jack Benny, Mary Livingstone, and Eddie 'Rochester' Anderson.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Victorian Architectural Pattern & Carpentry Handbooks</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">19th-century architectural pattern books with building elevations, floor plans, joinery details, and masonry guides.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historic Foley & Radio Drama Sound Effects Archive</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Vintage mechanical and acoustic sound design foley libraries from historic radio dramas and theater productions.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historic Brewing Treatises & Zymurgy Heritage</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Historical beer brewing handbooks, fermentation science treatises, and heritage craft brewing recipes.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Houdini & Historic Conjuring Arts Manuals</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Rare 19th/20th-century illusionism handbooks, sleight-of-hand secrets, and Harry Houdini escape treatises.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historic Microscopy Drawings & Micro-Life Atlases</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Engraved 19th-century microscopic atlases detailing diatoms, radiolarians, protozoans, and optical investigations.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-neutral-200/90 bg-neutral-50/50">
                    <div className="font-semibold text-neutral-900">Historical Tabletop Conflict Simulation & Wargame Manuals</div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">Classic hex-and-counter conflict simulation rulebooks, military history scenarios, and tactical tabletop manuals.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      Google News Real-Time Wire
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">Global breaking news RSS feed across international topics, geopolitics, and science.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      BBC World News Live
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">Verified international reporting, top global headlines, and breaking investigative journalism.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      The Guardian World Wire
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">International news, global politics, climate reports, and independent investigative coverage.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      Al Jazeera English Live Wire
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">Global journalism with deep coverage of Middle Eastern geopolitics and international affairs.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      NPR National & World News
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">National Public Radio breaking domestic and international reporting, politics, and culture.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      Hacker News Real-Time Wire
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">Y Combinator community live tech, computer science, startup, and AI development news.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      TechCrunch Silicon & VC Wire
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">Breaking startup tech reporting, venture capital financing, and frontier technology updates.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      Spaceflight News API (SNAPI)
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">Orbital rocket launches, SpaceX, NASA, ESA missions, space exploration, and planetary science.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      Wikinews Open Wire
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">Wikimedia Foundation open-source collaborative journalism and neutral international updates.</div>
                  </div>
                  <div className="p-2.5 rounded-xl border border-red-200 bg-red-50/40">
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
                      DEV Community Real-Time News
                    </div>
                    <div className="text-[11px] text-neutral-600 mt-0.5">Software developer ecosystem news, modern web architecture, and programming insights.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-[11px] text-neutral-500">Zero mock items · All rights & licenses respected</span>
              <button
                type="button"
                onClick={() => setIsMatrixOpen(false)}
                className="rounded-lg bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
              >
                Close Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
