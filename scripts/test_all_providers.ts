import { queryOpenverseImages, queryWikimediaImages, queryNASAImages, queryPexelsImages, queryUnsplashImages, queryPixabayImages, queryArchiveImages, queryINaturalistImages, queryClevelandImages, querySMKImages, queryVAMImages, queryArticImages, queryEuropeanaImages, queryWellcomeImages, queryGBIFImages, queryNasaApod, queryNasaEpic } from '../server/providers/images';
import { queryWikimediaVideos, queryArchiveVideos, queryPexelsVideos, queryNASAVideos, queryPeerTubeVideos, queryTVMazeVideos, queryArchiveFeatureFilms, queryPrelingerVideos, queryCartoonsVideos } from '../server/providers/video';
import { queryOpenverseAudio, queryFreesound, queryMusicBrainz, queryArchiveAudio, queryWikimediaAudio, queryArchive78rpm, queryCCMixterAudio, queryRadioBrowser, queryApplePodcasts, queryLiveMusicArchive, queryLibriVoxAudiobooks, queryOldTimeRadio, queryNasaAudio } from '../server/providers/audio';
import { queryWikimediaGifs, queryGiphy, queryTenor } from '../server/providers/gifs';
import { queryOpenAlex, queryCrossref, queryArxiv, queryPubMed, queryZenodo, queryPLOS, queryDOAJ, queryEuropePMC, queryInspireHep, queryHalOpenScience, queryNcbiPmc } from '../server/providers/papers';
import { queryOpenLibrary, queryArchiveBooks, queryGutendex, queryGoogleBooks, queryPoetryDB, queryArchiveComics } from '../server/providers/books';
import { queryNominatim, queryUSGS, queryPhotonMaps } from '../server/providers/maps';
import { queryOpenMeteo, queryOpenMeteoAirQuality, queryOpenMeteoMarine } from '../server/providers/weather';
import { queryArtic, queryMetMuseum, queryClevelandArt } from '../server/providers/art';
import { queryHuggingFace, queryZenodoDatasets, queryDataGov, queryWorldBank, queryNASAExoplanets, queryUsgsEarthquakes } from '../server/providers/datasets';
import { queryGitHub, queryNpm, queryHackerNewsCode, queryCratesIo, queryGitLab, queryCdnjs, queryDockerHub, queryPyPI } from '../server/providers/code';
import { queryGBIF, queryINaturalistObservations, queryUniProt, queryChEMBL } from '../server/providers/biodiversity';
import { queryWikipedia, queryWikidataEntities, queryWikiquote, queryWikisource, queryDBpedia } from '../server/providers/knowledge';
import { queryFrankfurter, queryCoinGecko } from '../server/providers/finance';
import { queryOpenFoodFacts, queryMealDB, queryCocktailDB, queryOpenBreweryDB } from '../server/providers/food';
import { queryPokeAPI, queryOpen5e, queryOpenTriviaDB, queryArchiveGames } from '../server/providers/games';
import { ResourceItem } from '../src/types/resource';

interface ProviderTestSpec {
  id: string;
  name: string;
  category: string;
  testQuery: string;
  fn: (q: string) => Promise<ResourceItem[]>;
  requiresAuth?: boolean;
}

const ALL_PROVIDERS_SUITE: ProviderTestSpec[] = [
  // Images
  { id: 'wellcome_images', name: 'Wellcome Collection', category: 'images', testQuery: 'microscope', fn: queryWellcomeImages },
  { id: 'gbif_images', name: 'GBIF Wildlife Photos', category: 'images', testQuery: 'canis', fn: queryGBIFImages },
  { id: 'nasa_apod', name: 'NASA APOD', category: 'images', testQuery: 'galaxy', fn: queryNasaApod },
  { id: 'nasa_epic', name: 'NASA EPIC Earth', category: 'images', testQuery: 'earth', fn: queryNasaEpic },
  { id: 'wikimedia', name: 'Wikimedia Commons Images', category: 'images', testQuery: 'mountains', fn: queryWikimediaImages },
  { id: 'nasa', name: 'NASA Image Archive', category: 'images', testQuery: 'mars', fn: queryNASAImages },
  { id: 'internet_archive_images', name: 'Internet Archive Images', category: 'images', testQuery: 'botany', fn: queryArchiveImages },
  { id: 'artic_images', name: 'Art Institute of Chicago Photos', category: 'images', testQuery: 'painting', fn: queryArticImages },
  { id: 'cleveland_images', name: 'Cleveland Museum Photos', category: 'images', testQuery: 'sculpture', fn: queryClevelandImages },
  { id: 'smk_images', name: 'SMK National Gallery Photos', category: 'images', testQuery: 'portrait', fn: querySMKImages },
  { id: 'vam_images', name: 'Victoria and Albert Museum', category: 'images', testQuery: 'textile', fn: queryVAMImages },
  { id: 'inaturalist_images', name: 'iNaturalist Images', category: 'images', testQuery: 'fungi', fn: queryINaturalistImages },
  { id: 'europeana_images', name: 'Europeana', category: 'images', testQuery: 'renaissance', fn: queryEuropeanaImages, requiresAuth: true },
  { id: 'pexels', name: 'Pexels Photos', category: 'images', testQuery: 'forest', fn: queryPexelsImages, requiresAuth: true },
  { id: 'unsplash', name: 'Unsplash', category: 'images', testQuery: 'ocean', fn: queryUnsplashImages, requiresAuth: true },
  { id: 'pixabay', name: 'Pixabay', category: 'images', testQuery: 'sunset', fn: queryPixabayImages, requiresAuth: true },
  { id: 'openverse', name: 'Openverse Images', category: 'images', testQuery: 'vintage', fn: queryOpenverseImages, requiresAuth: true },

  // Videos
  { id: 'peertube_video', name: 'PeerTube Open Videos', category: 'videos', testQuery: 'linux', fn: queryPeerTubeVideos },
  { id: 'archive_feature_films', name: 'Archive Feature Films', category: 'videos', testQuery: 'cinema', fn: queryArchiveFeatureFilms },
  { id: 'archive_prelinger', name: 'Prelinger Historical Americana', category: 'videos', testQuery: 'san francisco', fn: queryPrelingerVideos },
  { id: 'archive_cartoons', name: 'Classic Cartoons & Animation', category: 'videos', testQuery: 'popeye', fn: queryCartoonsVideos },
  { id: 'tvmaze_video', name: 'TVMaze Television Registry', category: 'videos', testQuery: 'planet', fn: queryTVMazeVideos },
  { id: 'wikimedia_video', name: 'Wikimedia Commons Video', category: 'videos', testQuery: 'water', fn: queryWikimediaVideos },
  { id: 'internet_archive_video', name: 'Internet Archive Videos', category: 'videos', testQuery: 'space', fn: queryArchiveVideos },
  { id: 'nasa_video', name: 'NASA Video Footage', category: 'videos', testQuery: 'apollo', fn: queryNASAVideos },
  { id: 'pexels_video', name: 'Pexels Video', category: 'videos', testQuery: 'river', fn: queryPexelsVideos, requiresAuth: true },

  // Audio & Music
  { id: 'archive_live_music', name: 'Live Music Archive (LMA)', category: 'audio', testQuery: 'concert', fn: queryLiveMusicArchive },
  { id: 'archive_librivox', name: 'LibriVox Audiobooks', category: 'audio', testQuery: 'sherlock', fn: queryLibriVoxAudiobooks },
  { id: 'archive_otr', name: 'Old Time Radio Archive', category: 'audio', testQuery: 'shadow', fn: queryOldTimeRadio },
  { id: 'nasa_audio', name: 'NASA Historic Space Audio', category: 'audio', testQuery: 'apollo', fn: queryNasaAudio },
  { id: 'ccmixter_audio', name: 'ccMixter Remix Stems', category: 'audio', testQuery: 'groove', fn: queryCCMixterAudio },
  { id: 'radio_browser', name: 'Community Radio Browser', category: 'audio', testQuery: 'jazz', fn: queryRadioBrowser },
  { id: 'apple_podcasts', name: 'Apple Podcasts Open Directory', category: 'audio', testQuery: 'history', fn: queryApplePodcasts },
  { id: 'wikimedia_audio', name: 'Wikimedia Commons Audio', category: 'audio', testQuery: 'bird', fn: queryWikimediaAudio },
  { id: 'archive_78rpm', name: 'Internet Archive Great 78 Project', category: 'audio', testQuery: 'blues', fn: queryArchive78rpm },
  { id: 'musicbrainz', name: 'MusicBrainz Open Audio DB', category: 'audio', testQuery: 'beethoven', fn: queryMusicBrainz },
  { id: 'internet_archive_audio', name: 'Internet Archive Audio', category: 'audio', testQuery: 'podcast', fn: queryArchiveAudio },
  { id: 'freesound', name: 'Freesound Effects', category: 'audio', testQuery: 'wind', fn: queryFreesound, requiresAuth: true },
  { id: 'openverse_audio', name: 'Openverse Audio', category: 'audio', testQuery: 'guitar', fn: queryOpenverseAudio, requiresAuth: true },

  // GIFs
  { id: 'wikimedia_gifs', name: 'Wikimedia Animated GIFs', category: 'gifs', testQuery: 'rotation', fn: queryWikimediaGifs },
  { id: 'giphy', name: 'GIPHY', category: 'gifs', testQuery: 'celebrate', fn: queryGiphy, requiresAuth: true },
  { id: 'tenor', name: 'Google Tenor GIFs', category: 'gifs', testQuery: 'dance', fn: queryTenor, requiresAuth: true },

  // Papers & Science
  { id: 'openalex', name: 'OpenAlex Scientific Index', category: 'papers', testQuery: 'quantum computing', fn: queryOpenAlex },
  { id: 'inspire_hep', name: 'INSPIRE-HEP / CERN', category: 'papers', testQuery: 'higgs boson', fn: queryInspireHep },
  { id: 'hal_open_science', name: 'HAL Open Science (CNRS)', category: 'papers', testQuery: 'astronomy', fn: queryHalOpenScience },
  { id: 'ncbi_pmc', name: 'PubMed Central (PMC)', category: 'papers', testQuery: 'crispr', fn: queryNcbiPmc },
  { id: 'europe_pmc', name: 'Europe PMC Life Sciences', category: 'papers', testQuery: 'dna', fn: queryEuropePMC },
  { id: 'crossref', name: 'CrossRef Scholarly Metadata', category: 'papers', testQuery: 'relativity', fn: queryCrossref },
  { id: 'arxiv', name: 'arXiv Preprints (Cornell)', category: 'papers', testQuery: 'neural networks', fn: queryArxiv },
  { id: 'pubmed', name: 'PubMed Medline', category: 'papers', testQuery: 'oncology', fn: queryPubMed },
  { id: 'zenodo', name: 'Zenodo Open Research', category: 'papers', testQuery: 'climate', fn: queryZenodo },
  { id: 'plos', name: 'PLOS Open Access', category: 'papers', testQuery: 'genetics', fn: queryPLOS },
  { id: 'doaj', name: 'Directory of Open Access Journals', category: 'papers', testQuery: 'ecology', fn: queryDOAJ },

  // Books & Literature
  { id: 'internet_archive_books', name: 'Internet Archive Books', category: 'books', testQuery: 'frankenstein', fn: queryArchiveBooks },
  { id: 'open_library', name: 'Open Library', category: 'books', testQuery: 'tolkien', fn: queryOpenLibrary },
  { id: 'gutendex', name: 'Project Gutenberg', category: 'books', testQuery: 'dickens', fn: queryGutendex },
  { id: 'archive_comics', name: 'Golden Age Comics Archive', category: 'books', testQuery: 'batman', fn: queryArchiveComics },
  { id: 'poetrydb', name: 'PoetryDB Classic Verse', category: 'books', testQuery: 'shakespeare', fn: queryPoetryDB },
  { id: 'google_books', name: 'Google Books', category: 'books', testQuery: 'history', fn: queryGoogleBooks, requiresAuth: true },

  // Maps & Geospatial
  { id: 'nominatim', name: 'OpenStreetMap Nominatim', category: 'maps', testQuery: 'Paris', fn: queryNominatim },
  { id: 'photon_maps', name: 'Photon Komoot Maps', category: 'maps', testQuery: 'Tokyo', fn: queryPhotonMaps },
  { id: 'usgs', name: 'USGS National Science', category: 'maps', testQuery: 'Yellowstone', fn: queryUSGS },

  // Weather & Atmosphere
  { id: 'open_meteo', name: 'Open-Meteo Weather', category: 'weather', testQuery: 'London', fn: queryOpenMeteo },
  { id: 'open_meteo_air', name: 'Open-Meteo Air Quality', category: 'weather', testQuery: 'Berlin', fn: queryOpenMeteoAirQuality },
  { id: 'open_meteo_marine', name: 'Open-Meteo Marine Waves', category: 'weather', testQuery: 'Miami', fn: queryOpenMeteoMarine },

  // Art & Museums
  { id: 'artic', name: 'Art Institute of Chicago Art', category: 'art', testQuery: 'monet', fn: queryArtic },
  { id: 'met_museum', name: 'The Metropolitan Museum of Art', category: 'art', testQuery: 'egypt', fn: queryMetMuseum },
  { id: 'cleveland_art', name: 'Cleveland Museum of Art', category: 'art', testQuery: 'armor', fn: queryClevelandArt },

  // Datasets
  { id: 'data_gov', name: 'Data.gov Federal Catalog', category: 'datasets', testQuery: 'agriculture', fn: queryDataGov },
  { id: 'huggingface', name: 'Hugging Face Hub', category: 'datasets', testQuery: 'nlp', fn: queryHuggingFace },
  { id: 'zenodo_datasets', name: 'Zenodo Open Datasets', category: 'datasets', testQuery: 'physics', fn: queryZenodoDatasets },
  { id: 'world_bank', name: 'World Bank Open Data', category: 'datasets', testQuery: 'gdp', fn: queryWorldBank },
  { id: 'nasa_exoplanets', name: 'NASA Exoplanet Archive', category: 'datasets', testQuery: 'kepler', fn: queryNASAExoplanets },
  { id: 'usgs_earthquakes', name: 'USGS Real-Time Earthquakes', category: 'datasets', testQuery: 'all', fn: queryUsgsEarthquakes },

  // Code & Repositories
  { id: 'github', name: 'GitHub Repositories', category: 'code', testQuery: 'react', fn: queryGitHub },
  { id: 'docker_hub', name: 'Docker Hub Images', category: 'code', testQuery: 'redis', fn: queryDockerHub },
  { id: 'pypi', name: 'PyPI Python Packages', category: 'code', testQuery: 'fastapi', fn: queryPyPI },
  { id: 'crates_io', name: 'Crates.io Rust Packages', category: 'code', testQuery: 'tokio', fn: queryCratesIo },
  { id: 'gitlab', name: 'GitLab Open Projects', category: 'code', testQuery: 'parser', fn: queryGitLab },
  { id: 'cdnjs', name: 'cdnjs Web Libraries', category: 'code', testQuery: 'lodash', fn: queryCdnjs },
  { id: 'npm', name: 'npm Registry', category: 'code', testQuery: 'express', fn: queryNpm },
  { id: 'hn_code', name: 'Hacker News Open Tech', category: 'code', testQuery: 'compiler', fn: queryHackerNewsCode },

  // Biodiversity & Genomics
  { id: 'gbif', name: 'GBIF Biodiversity Records', category: 'biodiversity', testQuery: 'panthera', fn: queryGBIF },
  { id: 'inaturalist_bio', name: 'iNaturalist Observations', category: 'biodiversity', testQuery: 'monarch', fn: queryINaturalistObservations },
  { id: 'uniprot', name: 'UniProt Knowledgebase', category: 'biodiversity', testQuery: 'insulin', fn: queryUniProt },
  { id: 'chembl', name: 'ChEMBL Bioactive Molecules', category: 'biodiversity', testQuery: 'aspirin', fn: queryChEMBL },

  // Knowledge & Encyclopedias
  { id: 'wikipedia', name: 'Wikipedia Open Encyclopedia', category: 'knowledge', testQuery: 'quantum', fn: queryWikipedia },
  { id: 'wikidata', name: 'Wikidata Knowledge Graph', category: 'knowledge', testQuery: 'einstein', fn: queryWikidataEntities },
  { id: 'dbpedia', name: 'DBpedia Linked Data', category: 'knowledge', testQuery: 'aristotle', fn: queryDBpedia },
  { id: 'wikisource', name: 'Wikisource Primary Sources', category: 'knowledge', testQuery: 'declaration', fn: queryWikisource },
  { id: 'wikiquote', name: 'Wikiquote Compendium', category: 'knowledge', testQuery: 'plato', fn: queryWikiquote },

  // Finance & Economics
  { id: 'frankfurter', name: 'Frankfurter ECB Forex Rates', category: 'finance', testQuery: 'EUR', fn: queryFrankfurter },
  { id: 'coingecko', name: 'CoinGecko Crypto Assets', category: 'finance', testQuery: 'bitcoin', fn: queryCoinGecko },

  // Food & Mixology
  { id: 'openfoodfacts', name: 'Open Food Facts', category: 'food', testQuery: 'chocolate', fn: queryOpenFoodFacts },
  { id: 'themealdb', name: 'TheMealDB Culinary Recipes', category: 'food', testQuery: 'pasta', fn: queryMealDB },
  { id: 'thecocktaildb', name: 'TheCocktailDB Mixology', category: 'food', testQuery: 'mojito', fn: queryCocktailDB },
  { id: 'openbrewerydb', name: 'Open Brewery DB', category: 'food', testQuery: 'craft', fn: queryOpenBreweryDB },

  // Games & Lore
  { id: 'pokeapi', name: 'PokéAPI Creature Database', category: 'games', testQuery: 'pikachu', fn: queryPokeAPI },
  { id: 'archive_pcgames', name: 'Internet Archive PC Games', category: 'games', testQuery: 'doom', fn: queryArchiveGames },
  { id: 'open5e_rpg', name: 'Open5e Fantasy Lore SRD', category: 'games', testQuery: 'dragon', fn: queryOpen5e },
  { id: 'opentdb', name: 'Open Trivia DB', category: 'games', testQuery: 'science', fn: queryOpenTriviaDB }
];

async function runTestSuite() {
  console.log(`\n======================================================`);
  console.log(`STARTING SYSTEM-WIDE TEST SUITE ACROSS ALL ${ALL_PROVIDERS_SUITE.length} PROVIDERS`);
  console.log(`======================================================\n`);

  let successCount = 0;
  let authSkippedCount = 0;
  let failureCount = 0;

  const results: Array<{
    id: string;
    name: string;
    category: string;
    status: 'PASS' | 'AUTH_REQUIRED' | 'EMPTY' | 'FAIL';
    items: number;
    latencyMs: number;
    sample?: string;
    error?: string;
  }> = [];

  // Run in concurrent chunks of 4 to prevent socket saturation while completing swiftly
  const CHUNK_SIZE = 4;
  for (let i = 0; i < ALL_PROVIDERS_SUITE.length; i += CHUNK_SIZE) {
    const chunk = ALL_PROVIDERS_SUITE.slice(i, i + CHUNK_SIZE);

    const chunkPromises = chunk.map(async (spec) => {
      const start = Date.now();
      try {
        const items = await spec.fn(spec.testQuery);
        const duration = Date.now() - start;

        if (Array.isArray(items) && items.length > 0) {
          successCount++;
          return {
            id: spec.id,
            name: spec.name,
            category: spec.category,
            status: 'PASS' as const,
            items: items.length,
            latencyMs: duration,
            sample: items[0]?.title
          };
        } else {
          if (spec.requiresAuth) {
            authSkippedCount++;
            return {
              id: spec.id,
              name: spec.name,
              category: spec.category,
              status: 'AUTH_REQUIRED' as const,
              items: 0,
              latencyMs: duration,
              sample: 'API key optional / not configured'
            };
          } else {
            return {
              id: spec.id,
              name: spec.name,
              category: spec.category,
              status: 'EMPTY' as const,
              items: 0,
              latencyMs: duration,
              sample: 'No items returned for query'
            };
          }
        }
      } catch (err: any) {
        const duration = Date.now() - start;
        failureCount++;
        return {
          id: spec.id,
          name: spec.name,
          category: spec.category,
          status: 'FAIL' as const,
          items: 0,
          latencyMs: duration,
          error: err.message
        };
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    for (const r of chunkResults) {
      results.push(r);
      const icon = r.status === 'PASS' ? '✓ [PASS]' : r.status === 'AUTH_REQUIRED' ? '🔒 [AUTH]' : r.status === 'EMPTY' ? '○ [ZERO]' : '✗ [FAIL]';
      console.log(`${icon.padEnd(9)} | ${r.id.padEnd(25)} | ${r.items.toString().padStart(3)} items | ${r.latencyMs.toString().padStart(5)}ms | ${r.sample || r.error || ''}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`TEST SUITE SUMMARY:`);
  console.log(`Total Tested Providers: ${ALL_PROVIDERS_SUITE.length}`);
  console.log(`Active & Returning Data: ${successCount}`);
  console.log(`Optional Auth Required (Key dependent): ${authSkippedCount}`);
  console.log(`Failures / Empty: ${failureCount}`);
  console.log(`======================================================\n`);
}

runTestSuite().catch(console.error);
