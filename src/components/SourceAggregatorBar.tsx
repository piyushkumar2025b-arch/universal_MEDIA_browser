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
  Rocket
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
