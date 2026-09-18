import React from 'react';
import {
  Rocket,
  Camera,
  Globe2,
  Video,
  Volume2,
  Orbit,
  Telescope,
  FileText,
  Dna,
  SunMedium,
  Layers,
  Sparkles,
  Radio,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { NasaSubCategory } from '../types/resource';

interface NasaSpaceSectionProps {
  activeSubCategory: NasaSubCategory;
  onSelectSubCategory: (subCat: NasaSubCategory) => void;
  onSelectQueryPrompt: (query: string) => void;
  currentQuery: string;
  totalNasaCount: number;
}

export const NasaSpaceSection: React.FC<NasaSpaceSectionProps> = ({
  activeSubCategory,
  onSelectSubCategory,
  onSelectQueryPrompt,
  currentQuery,
  totalNasaCount
}) => {
  const subCategories: {
    id: NasaSubCategory;
    name: string;
    description: string;
    icon: React.ElementType;
    badge: string;
    color: string;
    activeColor: string;
  }[] = [
    {
      id: 'all',
      name: 'All NASA Missions',
      description: 'Federated across all 12 deep space archives & science satellites',
      icon: Layers,
      badge: '12 APIs',
      color: 'border-neutral-200 hover:border-neutral-300 text-neutral-800 bg-white',
      activeColor: 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
    },
    {
      id: 'images',
      name: 'Imagery & APOD',
      description: 'Astronomy Picture of the Day, James Webb (JWST) & Hubble deep space',
      icon: Camera,
      badge: 'APOD + STScI',
      color: 'border-blue-200/80 hover:border-blue-300 text-blue-900 bg-blue-50/50',
      activeColor: 'bg-blue-600 text-white border-blue-600 shadow-sm'
    },
    {
      id: 'mars',
      name: 'Mars Rovers',
      description: 'Curiosity & Perseverance surface mast, navcam & hazard camera imagery',
      icon: Rocket,
      badge: 'JPL Rovers',
      color: 'border-amber-200/80 hover:border-amber-300 text-amber-900 bg-amber-50/50',
      activeColor: 'bg-amber-600 text-white border-amber-600 shadow-sm'
    },
    {
      id: 'epic',
      name: 'Earth EPIC (DSCOVR)',
      description: 'Full-disc natural colour Earth photos from Lagrange Point L1',
      icon: Globe2,
      badge: '1M Miles',
      color: 'border-emerald-200/80 hover:border-emerald-300 text-emerald-900 bg-emerald-50/50',
      activeColor: 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
    },
    {
      id: 'videos',
      name: 'Mission Video',
      description: 'Artemis, Apollo, Space Shuttle, Falcon & ISS launch footage',
      icon: Video,
      badge: '4K / HD Video',
      color: 'border-purple-200/80 hover:border-purple-300 text-purple-900 bg-purple-50/50',
      activeColor: 'bg-purple-600 text-white border-purple-600 shadow-sm'
    },
    {
      id: 'audio',
      name: 'Audio & Comms',
      description: 'Apollo flight radio, Quindar beeps, shuttle comms & space sounds',
      icon: Volume2,
      badge: 'Air-to-Ground',
      color: 'border-cyan-200/80 hover:border-cyan-300 text-cyan-900 bg-cyan-50/50',
      activeColor: 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
    },
    {
      id: 'asteroids',
      name: 'Asteroids & CAD',
      description: 'JPL Near-Earth Object Close Approach Data & miss distances',
      icon: Orbit,
      badge: 'CNEOS Real-time',
      color: 'border-orange-200/80 hover:border-orange-300 text-orange-900 bg-orange-50/50',
      activeColor: 'bg-orange-600 text-white border-orange-600 shadow-sm'
    },
    {
      id: 'exoplanets',
      name: 'Exoplanets Archive',
      description: 'Caltech / NASA confirmed extrasolar worlds & habitable zones',
      icon: Telescope,
      badge: 'Caltech IPAC',
      color: 'border-indigo-200/80 hover:border-indigo-300 text-indigo-900 bg-indigo-50/50',
      activeColor: 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
    },
    {
      id: 'papers',
      name: 'NTRS Research',
      description: 'NASA Technical Reports Server aerospace, propulsion & rocket science',
      icon: FileText,
      badge: 'NTRS Papers',
      color: 'border-slate-200/80 hover:border-slate-300 text-slate-900 bg-slate-50/50',
      activeColor: 'bg-slate-700 text-white border-slate-700 shadow-sm'
    },
    {
      id: 'biology',
      name: 'Astrobiology OSDR',
      description: 'Open Science Data Repository microgravity & spaceflight genomics',
      icon: Dna,
      badge: 'ISS Biology',
      color: 'border-teal-200/80 hover:border-teal-300 text-teal-900 bg-teal-50/50',
      activeColor: 'bg-teal-600 text-white border-teal-600 shadow-sm'
    },
    {
      id: 'spaceweather',
      name: 'Space Weather SWPC',
      description: 'NOAA / NASA real-time planetary geomagnetic Kp-index & solar flare monitors',
      icon: SunMedium,
      badge: 'Live Solar Flux',
      color: 'border-rose-200/80 hover:border-rose-300 text-rose-900 bg-rose-50/50',
      activeColor: 'bg-rose-600 text-white border-rose-600 shadow-sm'
    }
  ];

  const missionPrompts = [
    { label: 'James Webb Deep Field', query: 'James Webb Space Telescope' },
    { label: 'Perseverance Jezero Crater', query: 'Perseverance Mars Rover Jezero' },
    { label: 'Apollo 11 Lunar Landing', query: 'Apollo 11 Eagle' },
    { label: 'TRAPPIST-1 Habitable Worlds', query: 'Trappist-1' },
    { label: 'Voyager Interstellar Record', query: 'Voyager interstellar' },
    { label: 'Artemis Lunar Gateway', query: 'Artemis lunar mission' },
    { label: 'Black Hole Event Horizon', query: 'black hole singularity' },
    { label: 'ISS Spacewalk EVA', query: 'spacewalk EVA astronaut' },
    { label: 'Near Earth Asteroids', query: 'asteroid close approach' }
  ];

  return (
    <div id="section-nasa-observatory" className="mb-8 rounded-3xl border border-sky-200/70 bg-gradient-to-b from-sky-50/60 via-white to-slate-50/50 p-5 sm:p-7 shadow-xs">
      {/* Top Banner with Telemetry Badges */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-sky-100">
        <div className="flex items-start sm:items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-sky-400 shadow-md ring-1 ring-sky-300/40 shrink-0">
            <Rocket className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-neutral-950">
                NASA Deep Space Observatory & Science Hub
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-900 border border-sky-200">
                <ShieldCheck className="h-3.5 w-3.5 text-sky-700" />
                NASA Verified Open Access
              </span>
            </div>
            <p className="text-xs text-neutral-600 mt-1 max-w-2xl">
              Real-time deep space telemetry, planetary surface imagery, astronomical spectral data, and astronautics research federated directly from official NASA endpoints.
            </p>
          </div>
        </div>

        {/* Live Mission Telemetry Indicators */}
        <div className="flex items-center gap-2 flex-wrap text-[11px] font-medium text-neutral-600">
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-2.5 py-1 text-emerald-900">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span>DSN: Online</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-sky-200/80 bg-sky-50/80 px-2.5 py-1 text-sky-900">
            <Radio className="h-3 w-3 text-sky-600 animate-pulse" />
            <span>JPL CAD: Live Feed</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-amber-900">
            <SunMedium className="h-3 w-3 text-amber-600" />
            <span>Space Weather: Kp 1 Quiet</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-neutral-700 shadow-2xs">
            <span className="font-bold text-neutral-900">{totalNasaCount}</span>
            <span>Items Retrieved</span>
          </div>
        </div>
      </div>

      {/* NASA Sub-Category Selector */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-sky-600" />
            <span>Select NASA Sub-Category Domain</span>
          </span>
          <span className="text-[11px] text-neutral-500">
            Active: <strong className="text-sky-900 capitalize">{activeSubCategory}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {subCategories.map((sub) => {
            const isSelected = activeSubCategory === sub.id;
            const Icon = sub.icon;

            return (
              <button
                key={sub.id}
                id={`btn-nasa-sub-${sub.id}`}
                onClick={() => onSelectSubCategory(sub.id)}
                className={`flex flex-col text-left p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  isSelected ? sub.activeColor : sub.color
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1.5">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : 'bg-white/80 shadow-2xs'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600'
                  }`}>
                    {sub.badge}
                  </span>
                </div>
                <div className="font-bold text-xs leading-tight mb-0.5">
                  {sub.name}
                </div>
                <div className={`text-[10px] line-clamp-2 leading-relaxed ${
                  isSelected ? 'text-white/80' : 'text-neutral-500'
                }`}>
                  {sub.description}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Curated NASA Mission Exploration Chips */}
      <div className="mt-5 pt-4 border-t border-sky-100/80 flex flex-wrap items-center gap-1.5">
        <span className="text-xs font-semibold text-neutral-500 mr-1">
          Explore Missions:
        </span>
        {missionPrompts.map((p) => {
          const isActive = currentQuery.toLowerCase().includes(p.query.toLowerCase());
          return (
            <button
              key={p.query}
              onClick={() => onSelectQueryPrompt(p.query)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-sky-900 text-white shadow-2xs'
                  : 'bg-white hover:bg-sky-50 text-neutral-700 border border-neutral-200/80 hover:border-sky-200'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
