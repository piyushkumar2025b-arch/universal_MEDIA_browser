import { ResourceCategory, SearchFilters } from '../src/types/resource';
import { getGoogleApiKey, getGoogleSearchEngineId } from './config/google_keys';
import { normalizeCategory } from './normalizer';

export interface ProviderPlanItem {
  id: string;
  name: string;
  category: ResourceCategory;
  isKeyRequired: boolean;
  isConfigured: boolean;
  priority: number; // 1 = highest
}

export interface SearchPlan {
  category: ResourceCategory;
  primaryProviders: string[];
  fallbackProviders: string[];
  planSummary: string;
}

export function generateSearchPlan(filters: SearchFilters): SearchPlan {
  const cat = normalizeCategory(filters.category);

  switch (cat) {
    case 'images': {
      const primary = [
        'archive_vintage_posters',
        'fontsource',
        'iconify_vectors',
        'picsum_photos',
        'wikimedia_illustrations',
        'wellcome_images',
        'gbif_images',
        'nasa_apod',
        'nasa_epic',
        'wikimedia',
        'nasa',
        'internet_archive_images',
        'dog_ceo',
        'artic_images',
        'cleveland_images',
        'smk_images',
        'vam_images',
        'inaturalist_images'
      ];
      const fallback = ['europeana_images', 'pexels', 'unsplash', 'pixabay'];
      const hasGoogle = !!(getGoogleApiKey() && getGoogleSearchEngineId());
      if (hasGoogle) {
        primary.unshift('google_images');
      } else {
        fallback.push('google_images');
      }
      if (process.env.EUROPEANA_API_KEY) {
        primary.unshift('europeana_images');
      }
      if (process.env.OPENVERSE_ACCESS_TOKEN) {
        primary.unshift('openverse');
      } else {
        fallback.unshift('openverse');
      }
      return {
        category: 'images',
        primaryProviders: primary,
        fallbackProviders: fallback,
        planSummary: hasGoogle
          ? 'Primary: Google Images + Iconify Vectors + Picsum Photos + Wikimedia Botanical Plates + Wellcome Collection + GBIF Wildlife + NASA APOD + Dog CEO + Wikimedia Commons.'
          : 'Primary: Iconify Open Vectors + Picsum Curated Photos + Wikimedia Illustrations + Wellcome + GBIF + NASA APOD + Dog CEO + NASA EPIC + Wikimedia + Archives.'
      };
    }

    case 'videos':
      return {
        category: 'videos',
        primaryProviders: ['archive_movie_trailers', 'archive_open_movies', 'archive_prelinger_films', 'archive_newsreels', 'archive_silent_films', 'archive_computer_chronicles', 'archive_animation_classics', 'archive_tv_commercials', 'youtube_video', 'dailymotion_video', 'vimeo_video', 'peertube_video', 'archive_feature_films', 'archive_cartoons', 'archive_prelinger', 'tvmaze_video', 'wikimedia_video', 'internet_archive_video', 'nasa_video'],
        fallbackProviders: ['pexels_video', 'pixabay_video'],
        planSummary: 'Primary: Cinema Trailers + Open Source Movies + Prelinger Films + Universal Newsreels + Silent Classics + Computer Chronicles + Cartoons + Commercials + YouTube + PeerTube.'
      };

    case 'music': {
      const primary = [
        'apple_music',
        'musopen_classical',
        'free_music_archive',
        'wikimedia_music',
        'radio_browser',
        'radio_browser_live',
        'ccmixter_audio',
        'archive_live_music',
        'archive_netlabels',
        'archive_78rpm',
        'archive_historical_audio',
        'musicbrainz'
      ];
      const fallback = ['freesound', 'openverse_audio'];
      return {
        category: 'music',
        primaryProviders: primary,
        fallbackProviders: fallback,
        planSummary: 'Primary: Apple Music + Musopen Symphony Archive + Free Music Archive (FMA) + Radio Browser Live + 78rpm + Wikimedia + ccMixter + Live Music Archive.'
      };
    }

    case 'audio': {
      const primary = [
        'archive_otr_scifi',
        'archive_field_recordings',
        'apple_podcasts',
        'radio_browser_live',
        'archive_radio_dramas',
        'archive_historical_audio',
        'radio_browser',
        'archive_librivox',
        'wikimedia_audio',
        'archive_otr',
        'nasa_audio',
        'internet_archive_audio',
        'ccmixter_audio'
      ];
      const fallback = ['freesound', 'openverse_audio'];
      return {
        category: 'audio',
        primaryProviders: primary,
        fallbackProviders: fallback,
        planSummary: 'Primary: Sci-Fi Radio Theater + Acoustic Field Recordings + Live Radio + Great 78s + Apple Podcasts + LibriVox Audiobooks + Wikimedia Sounds + NASA Audio.'
      };
    }

    case '3d':
      return {
        category: '3d',
        primaryProviders: ['archive_3d'],
        fallbackProviders: [],
        planSummary: 'Primary: Internet Archive 3D Models & Spatial Photogrammetry Assets (GLTF/GLB/OBJ).'
      };

    case 'gifs':
      return {
        category: 'gifs',
        primaryProviders: ['wikimedia_gifs'],
        fallbackProviders: ['giphy', 'tenor'],
        planSummary: 'Primary: Wikimedia Commons Animated GIFs. Fallback: GIPHY + Tenor.'
      };

    case 'papers':
      return {
        category: 'papers',
        primaryProviders: ['openalex', 'nasa_ntrs', 'inspire_hep', 'hal_open_science', 'ncbi_pmc', 'europe_pmc', 'crossref', 'arxiv', 'pubmed', 'zenodo', 'plos', 'doaj'],
        fallbackProviders: [],
        planSummary: 'Primary: OpenAlex + NASA Technical Reports (NTRS) + PubMed Central (PMC) + INSPIRE-HEP / CERN + HAL Open Science + Europe PMC + Crossref + arXiv + Zenodo + PLOS + DOAJ.'
      };

    case 'books':
      return {
        category: 'books',
        primaryProviders: ['archive_retro_magazines', 'archive_folkscanomy', 'google_books', 'open_library', 'archive_pulp_scifi', 'gutendex', 'internet_archive_books', 'wikibooks', 'archive_childrens_books', 'archive_comics', 'poetrydb'],
        fallbackProviders: [],
        planSummary: 'Primary: Retro Computing Magazines + Folkscanomy + Google Books + Open Library + Vintage Pulp Sci-Fi + Project Gutenberg + Internet Archive.'
      };

    case 'maps':
      return {
        category: 'maps',
        primaryProviders: ['nominatim', 'photon_maps', 'archive_historic_maps', 'wikivoyage', 'open_meteo_geocoding', 'open_meteo_elevation', 'usgs'],
        fallbackProviders: [],
        planSummary: 'Primary: OpenStreetMap Nominatim + Photon Komoot Engine + USGS Historical Topographic Maps + Wikivoyage Travel Guides + Open-Meteo Geocoding + Terrestrial Elevation + USGS Earth Science.'
      };

    case 'weather':
      return {
        category: 'weather',
        primaryProviders: ['open_meteo', 'open_meteo_elevation', 'open_meteo_air', 'open_meteo_marine'],
        fallbackProviders: [],
        planSummary: 'Primary: Open-Meteo Atmospheric Forecast + Terrestrial Elevation & Altitudes + Air Quality Index + Ocean Wave & Marine Model.'
      };

    case 'art':
      return {
        category: 'art',
        primaryProviders: ['archive_bthl_architecture', 'archive_vintage_posters', 'smk_art', 'smithsonian_open_access', 'artic', 'met_museum', 'cleveland_art', 'smk_images', 'vam_images', 'europeana_images', 'wellcome_images'],
        fallbackProviders: [],
        planSummary: 'Primary: Architectural Blueprints (BTHL) + Vintage Posters + Statens Museum for Kunst (SMK) + Smithsonian Open Access + Art Institute of Chicago + The Met + Cleveland Museum.'
      };

    case 'datasets':
      return {
        category: 'datasets',
        primaryProviders: ['data_gov_ca', 'data_gov_uk', 'data_gov', 'huggingface', 'harvard_dataverse', 'cern_opendata', 'zenodo_datasets', 'world_bank', 'nasa_exoplanets', 'usgs_earthquakes'],
        fallbackProviders: [],
        planSummary: 'Primary: Canada Open Data + UK Open Data + Data.gov + Hugging Face Hub + Harvard Dataverse + CERN Open Data + USGS Earthquakes + Zenodo.'
      };

    case 'code':
      return {
        category: 'code',
        primaryProviders: ['nuget_packages', 'metacpan_perl', 'hex_pm', 'github', 'pub_dev', 'docker_hub', 'maven_central', 'pypi', 'rubygems', 'packagist', 'homebrew', 'crates_io', 'gitlab', 'cdnjs', 'npm', 'hn_code'],
        fallbackProviders: [],
        planSummary: 'Primary: NuGet (.NET) + MetaCPAN (Perl) + Hex.pm (Elixir/Erlang) + GitHub + Dart & Flutter pub.dev + Docker Hub + Maven Central + PyPI + RubyGems + Packagist.'
      };

    case 'biodiversity':
      return {
        category: 'biodiversity',
        primaryProviders: ['catalogue_of_life', 'itis_taxonomy', 'paleo_db', 'gbif', 'inaturalist_bio', 'dog_ceo', 'worms_marine', 'uniprot', 'chembl', 'gbif_images'],
        fallbackProviders: [],
        planSummary: 'Primary: Catalogue of Life (COL 2M Species) + ITIS Biological Taxonomy (USGS) + Paleobiology Database + GBIF + iNaturalist + Dog CEO + WoRMS.'
      };

    case 'knowledge': {
      const primary = ['archive_computer_history', 'wikipedia', 'wikidata', 'wikivoyage', 'wiktionary', 'dbpedia', 'wikisource', 'wikiquote'];
      const fallback: string[] = [];
      const hasGoogle = !!(getGoogleApiKey() && getGoogleSearchEngineId());
      if (hasGoogle) {
        primary.unshift('google_search');
      } else {
        fallback.push('google_search');
      }
      return {
        category: 'knowledge',
        primaryProviders: primary,
        fallbackProviders: fallback,
        planSummary: hasGoogle
          ? 'Primary: Google Custom Search + Computer History Museum + Wikipedia + Wikidata + Wikivoyage + Wiktionary + DBpedia + Wikisource + Wikiquote.'
          : 'Primary: Computer History Museum Archive + Wikipedia + Wikidata + Wikivoyage + Wiktionary + DBpedia + Wikisource + Wikiquote. Fallback: Google Custom Search.'
      };
    }

    case 'finance':
      return {
        category: 'finance',
        primaryProviders: ['frankfurter', 'coingecko', 'exchange_rates'],
        fallbackProviders: [],
        planSummary: 'Primary: Frankfurter / European Central Bank Exchange Rates + CoinGecko Digital Assets + Open Exchange Rates FX Matrix.'
      };

    case 'food':
      return {
        category: 'food',
        primaryProviders: ['archive_historic_cookbooks', 'openfoodfacts', 'fruityvice', 'themealdb', 'thecocktaildb', 'openbrewerydb'],
        fallbackProviders: [],
        planSummary: 'Primary: Historic Cookbooks & Gastronomy + Open Food Facts + Fruityvice Botanical Data + TheMealDB + TheCocktailDB + Open Brewery DB.'
      };

    case 'games':
      return {
        category: 'games',
        primaryProviders: ['archive_arcade_games', 'pokeapi', 'scryfall', 'yugioh', 'freetogame', 'dnd5e_srd', 'archive_pcgames', 'open5e_rpg', 'opentdb'],
        fallbackProviders: [],
        planSummary: 'Primary: Internet Arcade Coin-Op Preservation + PokéAPI Creature Database + Scryfall MTG + Yu-Gi-Oh! Cards + FreeToGame Catalog + D&D 5e SRD + Archive Retro PC Games + Open5e + Open Trivia DB.'
      };

    case 'nasa': {
      const sub = filters.nasaSubCategory || 'all';
      let primary: string[] = [];
      let fallback: string[] = ['data_gov', 'cern_opendata'];

      switch (sub) {
        case 'images':
          primary = ['nasa', 'nasa_apod'];
          fallback = ['smithsonian_open_access', 'internet_archive_images'];
          break;
        case 'mars':
          primary = ['nasa_mars_rovers', 'nasa'];
          fallback = ['internet_archive_images'];
          break;
        case 'epic':
          primary = ['nasa_epic'];
          fallback = ['nasa'];
          break;
        case 'videos':
          primary = ['nasa_video'];
          fallback = ['internet_archive_video', 'archive_feature_films'];
          break;
        case 'audio':
          primary = ['nasa_audio'];
          fallback = ['internet_archive_audio', 'archive_historical_audio'];
          break;
        case 'asteroids':
          primary = ['nasa_asteroids'];
          fallback = ['usgs_earthquakes', 'cern_opendata'];
          break;
        case 'exoplanets':
          primary = ['nasa_exoplanets'];
          fallback = ['cern_opendata', 'zenodo_datasets'];
          break;
        case 'papers':
          primary = ['nasa_ntrs', 'archive_nasa_docs'];
          fallback = ['arxiv', 'inspire_hep', 'openalex'];
          break;
        case 'biology':
          primary = ['nasa_osdr'];
          fallback = ['pubmed', 'ncbi_pmc', 'europe_pmc'];
          break;
        case 'spaceweather':
          primary = ['nasa_spaceweather'];
          fallback = ['open_meteo', 'open_meteo_air'];
          break;
        case 'all':
        default:
          primary = [
            'nasa',
            'nasa_apod',
            'nasa_mars_rovers',
            'nasa_epic',
            'nasa_asteroids',
            'nasa_exoplanets',
            'nasa_video',
            'nasa_audio',
            'nasa_ntrs',
            'nasa_osdr',
            'nasa_spaceweather',
            'archive_nasa_docs'
          ];
          fallback = ['inspire_hep', 'cern_opendata', 'data_gov'];
          break;
      }

      return {
        category: 'nasa',
        primaryProviders: primary,
        fallbackProviders: fallback,
        planSummary: `NASA Deep Space Multi-Mission Observatory Federation [Sub-Domain: ${sub.toUpperCase()}]`
      };
    }

    case 'all':
    default: {
      const allPrimary = [
        'wikipedia',
        'smithsonian_open_access',
        'youtube_video',
        'google_books',
        'wikimedia',
        'pub_dev',
        'open_library',
        'openalex',
        'gutendex',
        'apple_music',
        'free_music_archive',
        'radio_browser_live',
        'archive_newsreels',
        'dailymotion_video',
        'archive_feature_films',
        'ccmixter_audio',
        'archive_arcade_games',
        'archive_live_music',
        'cleveland_images',
        'artic_images',
        'wellcome_images',
        'peertube_video',
        'wikimedia_audio',
        'ncbi_pmc',
        'archive_historic_maps',
        'nominatim',
        'open_meteo',
        'data_gov',
        'pypi',
        'hex_pm',
        'fontsource',
        'smk_art',
        'data_gov_uk',
        'musopen_classical',
        'archive_3d',
        'iconify_vectors',
        'picsum_photos',
        'archive_tv_commercials',
        'archive_open_movies',
        'archive_retro_magazines',
        'archive_computer_history',
        'archive_historic_cookbooks',
        'archive_folkscanomy',
        'paleo_db',
        'nuget_packages',
        'catalogue_of_life',
        'data_gov_ca',
        'archive_bthl_architecture',
        'archive_movie_trailers',
        'archive_vintage_posters',
        'archive_otr_scifi',
        'archive_field_recordings',
        'pokeapi'
      ];
      const allFallback = [
        'archive_pulp_scifi',
        'archive_silent_films',
        'archive_computer_chronicles',
        'archive_animation_classics',
        'archive_feature_films',
        'archive_librivox',
        'apple_podcasts',
        'archive_cartoons',
        'cleveland_images',
        'nasa',
        'inspire_hep',
        'crossref',
        'poetrydb',
        'huggingface',
        'docker_hub',
        'rubygems',
        'harvard_dataverse',
        'scryfall',
        'wikibooks',
        'archive_netlabels',
        'dbpedia',
        'inaturalist_bio',
        'coingecko',
        'exchange_rates',
        'themealdb',
        'gbif_images',
        'pexels',
        'giphy',
        'freesound'
      ];
      if (process.env.EUROPEANA_API_KEY) {
        allPrimary.unshift('europeana_images');
      } else {
        allFallback.unshift('europeana_images');
      }
      if (process.env.OPENVERSE_ACCESS_TOKEN) {
        allPrimary.unshift('openverse');
      } else {
        allFallback.unshift('openverse');
      }
      const hasGoogle = !!(getGoogleApiKey() && getGoogleSearchEngineId());
      if (hasGoogle) {
        allPrimary.unshift('google_search', 'google_images');
      } else {
        allFallback.push('google_search', 'google_images');
      }
      return {
        category: 'all',
        primaryProviders: allPrimary,
        fallbackProviders: allFallback,
        planSummary: 'High-Velocity Multi-Domain Federation across primary tier-1 nodes + deep fallback cluster.'
      };
    }
  }
}
