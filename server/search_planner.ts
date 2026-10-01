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
        'nasa_images',
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
        primaryProviders: [
          'youtube_video',
          'internet_archive_video',
          'archive_feature_films',
          'archive_animation_classics',
          'vimeo_video',
          'peertube_video',
          'dailymotion_video',
          'archive_pre_code_cinema',
          'archive_classic_western_movies',
          'archive_classic_horror',
          'archive_classic_sci_fi_movies',
          'archive_film_noir',
          'archive_cartoons',
          'archive_silent_films',
          'archive_open_movies',
          'archive_animation_shorts',
          'archive_movie_trailers',
          'archive_prelinger_films',
          'archive_newsreels',
          'archive_tv_commercials',
          'wikimedia_video',
          'nasa_video',
          'tvmaze_video',
          'archive_early_cgi',
          'archive_drive_in_intermissions',
          'archive_speedruns',
          'archive_silent_comedy',
          'archive_computer_chronicles'
        ],
        fallbackProviders: ['pexels_video', 'pixabay_video'],
        planSummary: 'Primary: YouTube + Internet Archive Open Cinema + Vimeo + PeerTube + Dailymotion + Classic Animations + NASA Footage + Silent Films.'
      };

    case 'music': {
      const primary = [
        'rollingstone_music_wire',
        'billboard_chart_news',
        'somafm_radio',
        'archive_grateful_dead',
        'archive_modular_synthesizers',
        'archive_early_recorded_blues',
        'archive_delta_blues',
        'archive_78rpm_jazz',
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
        planSummary: 'Primary: Rolling Stone Music Wire + Billboard Charts Wire + SomaFM Live Radio + Grateful Dead Vault + Modular Synthesizers + Delta Blues + Apple Music.'
      };
    }

    case 'audio': {
      const primary = [
        'somafm_radio',
        'archive_grateful_dead',
        'archive_wax_cylinders',
        'archive_modular_synthesizers',
        'archive_dragnet_radio',
        'archive_jack_benny_comedy',
        'archive_vintage_sound_effects',
        'archive_sherlock_holmes_radio',
        'archive_oral_history',
        'archive_childrens_audio_classics',
        'archive_x_minus_one',
        'archive_wildlife_audio',
        'archive_cbs_mystery_theater',
        'archive_vintage_audiobooks',
        'archive_apollo_audio',
        'archive_historic_radio_news',
        'archive_old_time_radio',
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
        planSummary: 'Primary: SomaFM Channels + Grateful Dead Vault + Acoustic Wax Cylinders + Modular Synths + CBS Radio Mystery Theater + Apollo Loops + Old Time Radio.'
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
        primaryProviders: ['openalex', 'arxiv', 'pubmed', 'crossref', 'europe_pmc', 'ncbi_pmc', 'inspire_hep', 'hal_open_science', 'nasa_ntrs', 'plos', 'doaj', 'zenodo'],
        fallbackProviders: ['physorg_physics', 'medicalxpress_health'],
        planSummary: 'Primary: OpenAlex + arXiv + PubMed + Crossref + Europe PMC + PubMed Central (NIH) + INSPIRE-HEP + HAL Open Science.'
      };

    case 'books':
      return {
        category: 'books',
        primaryProviders: ['archive_vintage_computer_magazines', 'archive_pulp_sci_fi', 'archive_scientific_american_vintage', 'archive_vintage_magic_books', 'archive_weird_tales', 'archive_trade_catalogs', 'loc_chronicling_america', 'archive_railroad_history', 'archive_flight_manuals', 'archive_computer_manuals', 'archive_golden_age_comics', 'archive_medical_heritage', 'archive_nasa_historical', 'archive_retro_magazines', 'archive_folkscanomy', 'google_books', 'open_library', 'archive_pulp_scifi', 'gutendex', 'internet_archive_books', 'wikibooks', 'archive_childrens_books', 'archive_comics', 'poetrydb'],
        fallbackProviders: [],
        planSummary: 'Primary: Vintage Computer Magazines (Byte/Compute!) + Pulp Sci-Fi (Galaxy) + Scientific American Historical Periodicals + Houdini Magic + Google Books.'
      };

    case 'maps':
      return {
        category: 'maps',
        primaryProviders: ['archive_civil_war_historic_maps', 'iss_current_location', 'archive_historic_atlases', 'archive_usgs_topomaps', 'archive_david_rumsey_maps', 'nominatim', 'photon_maps', 'archive_historic_maps', 'wikivoyage', 'open_meteo_geocoding', 'open_meteo_elevation', 'usgs'],
        fallbackProviders: [],
        planSummary: 'Primary: American Civil War Battlefield Cartography + ISS Telemetry + Antique Atlases + USGS Quadrangle Maps + Nominatim.'
      };

    case 'weather':
      return {
        category: 'weather',
        primaryProviders: ['scidaily_earth_climate', 'noaa_weather_alerts', 'open_meteo', 'open_meteo_elevation', 'open_meteo_air', 'open_meteo_marine'],
        fallbackProviders: [],
        planSummary: 'Primary: ScienceDaily Earth & Climate Research Wire + NOAA NWS Weather Alerts + Open-Meteo Atmospheric Forecast + Terrestrial Elevation + Marine.'
      };

    case 'art':
      return {
        category: 'art',
        primaryProviders: ['archive_ancient_numismatics', 'smithsonian_mag_heritage', 'archive_world_war_posters', 'archive_usda_pomology', 'archive_architectural_pattern_books', 'archive_tin_pan_alley', 'archive_auto_brochures', 'loc_digital_collections', 'archive_demoscene', 'archive_vintage_fashion', 'archive_sheet_music', 'archive_bthl_architecture', 'archive_vintage_posters', 'smk_art', 'smithsonian_open_access', 'artic', 'met_museum', 'cleveland_art', 'smk_images', 'vam_images', 'europeana_images', 'wellcome_images'],
        fallbackProviders: [],
        planSummary: 'Primary: Ancient Numismatics Archive + Smithsonian Magazine Heritage + World War Propaganda Posters + USDA Pomology Watercolors + Victorian Architectural Patterns.'
      };

    case 'datasets':
      return {
        category: 'datasets',
        primaryProviders: ['openfda_devices', 'openfda_drugs', 'openfda_recalls', 'rest_countries_geo', 'archive_astronomy_heritage', 'nih_clinical_trials', 'nih_pubchem', 'archive_us_patents', 'nasa_eonet', 'archive_usgs_bulletins', 'data_gov_ca', 'data_gov_uk', 'data_gov', 'huggingface', 'harvard_dataverse', 'cern_opendata', 'zenodo_datasets', 'world_bank', 'nasa_exoplanets', 'usgs_earthquakes'],
        fallbackProviders: [],
        planSummary: 'Primary: openFDA Medical Devices 510(k) + openFDA Pharmaceuticals + Safety Recalls + REST Countries + NIH ClinicalTrials.gov + PubChem + Data.gov.'
      };

    case 'code':
      return {
        category: 'code',
        primaryProviders: ['the_verge_tech', 'engadget_tech', 'techradar_hardware', 'cnet_tech_reviews', 'archive_vintage_radio_schematics', 'hackaday_hardware', 'phoronix_hardware', 'archive_vintage_computer_magazines', 'archive_ham_radio_technical', 'archive_historic_software', 'arch_linux_pkgs', 'clojars_packages', 'nuget_packages', 'metacpan_perl', 'hex_pm', 'github', 'pub_dev', 'docker_hub', 'maven_central', 'pypi', 'rubygems', 'packagist', 'homebrew', 'crates_io', 'gitlab', 'cdnjs', 'npm', 'hn_code'],
        fallbackProviders: [],
        planSummary: 'Primary: The Verge Wire + Engadget Hardware + TechRadar Benchmarks + CNET Tech + Vintage Radio Schematics + Hackaday + Phoronix Linux + GitHub.'
      };

    case 'biodiversity':
      return {
        category: 'biodiversity',
        primaryProviders: ['archive_usda_pomology', 'archive_vintage_seed_catalogs', 'archive_historic_microscopy', 'archive_naturalist_expeditions', 'archive_bhl_botany', 'catalogue_of_life', 'itis_taxonomy', 'paleo_db', 'gbif', 'inaturalist_bio', 'dog_ceo', 'worms_marine', 'uniprot', 'chembl', 'gbif_images'],
        fallbackProviders: [],
        planSummary: 'Primary: USDA Pomology Botanical Watercolors + Heirloom Seed Catalogs + Historic Microscopy Atlases + BHL Botany + Catalogue of Life + GBIF.'
      };

    case 'knowledge': {
      const primary = ['eff_digital_rights', 'smithsonian_mag_heritage', 'archive_historical_patent_diagrams', 'openfda_drugs', 'archive_aviation_history', 'archive_computer_history', 'wikipedia', 'wikidata', 'wikivoyage', 'wiktionary', 'dbpedia', 'wikisource', 'wikiquote'];
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
          ? 'Primary: Google Custom Search + EFF Digital Rights + Smithsonian Magazine + Historic US Patent Blueprints + openFDA Drug Monographs + Wikipedia.'
          : 'Primary: EFF Digital Rights + Smithsonian Magazine + Historic US Patent Blueprints + openFDA Monographs + Wikipedia + Wikidata.'
      };
    }

    case 'finance':
      return {
        category: 'finance',
        primaryProviders: ['yahoo_finance_markets', 'cointelegraph_crypto', 'coindesk_markets', 'coinpaprika_crypto', 'cnbc_markets', 'frankfurter', 'coingecko', 'exchange_rates'],
        fallbackProviders: [],
        planSummary: 'Primary: Yahoo Finance Wire + Cointelegraph Web3 Wire + CoinDesk Markets + CoinPaprika Crypto Index + CNBC Financial Markets + Frankfurter / ECB Rates.'
      };

    case 'food':
      return {
        category: 'food',
        primaryProviders: ['archive_historic_culinary_ephemera', 'archive_brewing_history', 'archive_historical_menus', 'archive_historic_cookbooks', 'openfoodfacts', 'fruityvice', 'themealdb', 'thecocktaildb', 'openbrewerydb'],
        fallbackProviders: [],
        planSummary: 'Primary: Historic Culinary Treatises & Rare Recipes + Historic Brewing Heritage + Historic Restaurant Menus + Open Food Facts + TheMealDB.'
      };

    case 'games':
      return {
        category: 'games',
        primaryProviders: ['polygon_gaming', 'pcgamer_hardware', 'eurogamer_feed', 'rockpapershotgun_feed', 'archive_video_game_design', 'archive_wargame_simulations', 'archive_vintage_boardgames', 'archive_msdos_games', 'archive_arcade_games', 'pokeapi', 'scryfall', 'yugioh', 'freetogame', 'dnd5e_srd', 'archive_pcgames', 'open5e_rpg', 'opentdb'],
        fallbackProviders: [],
        planSummary: 'Primary: Polygon Gaming Wire + PC Gamer Rig & GPU Wire + Eurogamer News + Rock Paper Shotgun + Video Game Design Archives + PokéAPI.'
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
            'spacenews_aerospace',
            'universetoday_astronomy',
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

    case 'news': {
      const primary = [
        'latimes_world_news',
        'wsj_world_wire',
        'propublica_investigations',
        'bellingcat_osint',
        'theintercept_dispatches',
        'defensenews_global',
        'cbs_news',
        'abc_news',
        'time_magazine',
        'independent_news',
        'cnbc_markets',
        'politico_wire',
        'wired_tech',
        'mit_tech_review',
        'sciencedaily_wire',
        'nature_journal_news',
        'biorxiv_preprints',
        'google_news',
        'bbc_world_news',
        'the_guardian_news',
        'al_jazeera_news',
        'dw_news',
        'france24_news',
        'ars_technica_news',
        'the_register_news',
        'nasa_breaking_news',
        'openfda_recalls',
        'npr_news',
        'hacker_news_live',
        'techcrunch_news',
        'spaceflight_news',
        'wikinews_open',
        'devto_news'
      ];
      const fallback = [
        'archive_historic_radio_news',
        'archive_newsreels',
        'loc_chronicling_america'
      ];
      return {
        category: 'news',
        primaryProviders: primary,
        fallbackProviders: fallback,
        planSummary: 'Real-Time Global News Wire: LA Times + WSJ + ProPublica + Bellingcat + Intercept + CBS + ABC + TIME + The Independent + CNBC + Politico + WIRED.'
      };
    }

    case 'all':
    default: {
      const allPrimary = [
        'latimes_world_news',
        'wsj_world_wire',
        'yahoo_finance_markets',
        'the_verge_tech',
        'polygon_gaming',
        'physorg_physics',
        'cbs_news',
        'abc_news',
        'time_magazine',
        'independent_news',
        'cnbc_markets',
        'politico_wire',
        'wired_tech',
        'mit_tech_review',
        'sciencedaily_wire',
        'nature_journal_news',
        'biorxiv_preprints',
        'hackaday_hardware',
        'phoronix_hardware',
        'eurogamer_feed',
        'rockpapershotgun_feed',
        'iss_current_location',
        'coinpaprika_crypto',
        'archive_historical_patent_diagrams',
        'archive_early_recorded_blues',
        'archive_world_war_posters',
        'google_news',
        'bbc_world_news',
        'dw_news',
        'france24_news',
        'ars_technica_news',
        'the_register_news',
        'nasa_breaking_news',
        'openfda_drugs',
        'openfda_devices',
        'openfda_recalls',
        'noaa_weather_alerts',
        'somafm_radio',
        'archive_grateful_dead',
        'archive_wax_cylinders',
        'archive_vintage_computer_magazines',
        'archive_video_game_design',
        'archive_aviation_history',
        'archive_historic_atlases',
        'archive_pre_code_cinema',
        'archive_pulp_sci_fi',
        'archive_usda_pomology',
        'archive_modular_synthesizers',
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
        'nasa_eonet',
        'arch_linux_pkgs',
        'clojars_packages',
        'archive_msdos_games',
        'archive_medical_heritage',
        'archive_sheet_music',
        'archive_old_time_radio',
        'archive_usgs_bulletins',
        'archive_nasa_historical',
        'archive_animation_shorts',
        'archive_film_noir',
        'archive_speedruns',
        'archive_bhl_botany',
        'nih_pubchem',
        'archive_apollo_audio',
        'archive_historic_radio_news',
        'archive_computer_manuals',
        'archive_golden_age_comics',
        'archive_us_patents',
        'archive_david_rumsey_maps',
        'loc_digital_collections',
        'nih_clinical_trials',
        'archive_cbs_mystery_theater',
        'archive_demoscene',
        'archive_flight_manuals',
        'archive_vintage_fashion',
        'archive_vintage_audiobooks',
        'archive_drive_in_intermissions',
        'archive_historic_software',
        'archive_classic_sci_fi_movies',
        'loc_chronicling_america',
        'archive_x_minus_one',
        'archive_silent_comedy',
        'archive_railroad_history',
        'archive_auto_brochures',
        'archive_early_cgi',
        'archive_wildlife_audio',
        'archive_78rpm_jazz',
        'archive_vintage_boardgames',
        'archive_usgs_topomaps',
        'archive_historical_menus',
        'archive_sherlock_holmes_radio',
        'archive_weird_tales',
        'archive_astronomy_heritage',
        'archive_classic_horror',
        'archive_tin_pan_alley',
        'archive_oral_history',
        'archive_trade_catalogs',
        'archive_naturalist_expeditions',
        'archive_ham_radio_technical',
        'archive_childrens_audio_classics',
        'rest_countries_geo',
        'archive_dragnet_radio',
        'archive_vintage_seed_catalogs',
        'archive_classic_western_movies',
        'archive_delta_blues',
        'archive_scientific_american_vintage',
        'archive_jack_benny_comedy',
        'archive_architectural_pattern_books',
        'archive_vintage_sound_effects',
        'archive_brewing_history',
        'archive_vintage_magic_books',
        'archive_historic_microscopy',
        'archive_wargame_simulations',
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

      const queryStr = (filters.query || '').trim().toLowerCase();
      const isNewsQuery = /\b(news|breaking|latest|today|war|election|president|minister|conflict|crisis|update|press|politics|market|headline|economy)\b/i.test(queryStr);
      if (isNewsQuery) {
        allPrimary.unshift(
          'cbs_news',
          'abc_news',
          'time_magazine',
          'independent_news',
          'cnbc_markets',
          'politico_wire',
          'wired_tech',
          'mit_tech_review',
          'sciencedaily_wire',
          'nature_journal_news',
          'google_news',
          'bbc_world_news',
          'dw_news',
          'france24_news',
          'the_guardian_news',
          'al_jazeera_news',
          'ars_technica_news',
          'the_register_news',
          'nasa_breaking_news',
          'openfda_recalls',
          'npr_news',
          'hacker_news_live',
          'techcrunch_news',
          'spaceflight_news'
        );
      }

      return {
        category: 'all',
        primaryProviders: allPrimary,
        fallbackProviders: allFallback,
        planSummary: isNewsQuery
          ? 'Live News Priority Federation: Real-time global wire feeds boosted for breaking events & current reporting.'
          : 'High-Velocity Multi-Domain Federation across primary tier-1 nodes + deep fallback cluster.'
      };
    }
  }
}
