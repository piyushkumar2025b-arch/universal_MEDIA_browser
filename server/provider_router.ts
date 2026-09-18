import { ResourceItem, SearchFilters, ResourceCategory } from '../src/types/resource';
import { generateSearchPlan } from './search_planner';
import { deduplicateResources } from './deduplicator';
import { rankAndFilterResources } from './ranking';
import { resilientPool } from './pipeline/resilient_pool';
import { MediaProcessor } from './pipeline/media_processor';
import { resourceCache } from './cache_store';
import { APP_CONFIG } from './config/app_config';
import { normalizeCategory } from './normalizer';

// Import providers
import {
  queryNASAImages,
  queryNasaApod,
  queryNasaEpic,
  queryMarsRovers,
  queryNASAVideos,
  queryNasaAudio,
  queryNasaAsteroids,
  queryNASAExoplanets,
  queryNasaNtrs,
  queryNasaOsdr,
  queryNasaSpaceWeather,
  queryArchiveNasaDocs,
  queryAllNasa
} from './providers/nasa';
import { queryOpenverseImages, queryWikimediaImages, queryPexelsImages, queryUnsplashImages, queryPixabayImages, queryArchiveImages, queryINaturalistImages, queryClevelandImages, querySMKImages, queryVAMImages, queryArticImages, queryEuropeanaImages, queryWellcomeImages, queryGBIFImages, queryGoogleImages, queryDogCeoImages } from './providers/images';
import { queryWikimediaVideos, queryArchiveVideos, queryPexelsVideos, queryPeerTubeVideos, queryTVMazeVideos, queryArchiveFeatureFilms, queryPrelingerVideos, queryCartoonsVideos, queryYouTubeVideos, queryDailymotionVideos, queryVimeoVideos, queryPixabayVideos } from './providers/video';
import { queryOpenverseAudio, queryFreesound, queryMusicBrainz, queryArchiveAudio, queryWikimediaAudio, queryArchive78rpm, queryCCMixterAudio, queryRadioBrowser, queryApplePodcasts, queryLiveMusicArchive, queryLibriVoxAudiobooks, queryOldTimeRadio, queryArchiveNetlabels, queryAppleMusicSongs, queryWikimediaMusic } from './providers/audio';
import { queryWikimediaGifs, queryGiphy, queryTenor } from './providers/gifs';
import { queryOpenAlex, queryCrossref, queryArxiv, queryPubMed, queryZenodo, queryPLOS, queryDOAJ, queryEuropePMC, queryInspireHep, queryHalOpenScience, queryNcbiPmc } from './providers/papers';
import { queryOpenLibrary, queryArchiveBooks, queryGutendex, queryGoogleBooks, queryPoetryDB, queryArchiveComics, queryWikibooks, queryArchiveChildrensBooks } from './providers/books';
import { queryNominatim, queryUSGS, queryPhotonMaps, queryOpenMeteoGeocoding } from './providers/maps';
import { queryOpenMeteo, queryOpenMeteoAirQuality, queryOpenMeteoMarine, queryOpenMeteoElevation } from './providers/weather';
import { queryArtic, queryMetMuseum, queryClevelandArt } from './providers/art';
import { queryHuggingFace, queryZenodoDatasets, queryDataGov, queryWorldBank, queryUsgsEarthquakes, queryHarvardDataverse, queryCernOpenData } from './providers/datasets';
import { queryGitHub, queryNpm, queryHackerNewsCode, queryCratesIo, queryGitLab, queryCdnjs, queryDockerHub, queryPyPI, queryRubyGems, queryPackagist, queryHomebrew, queryMavenCentral } from './providers/code';
import { queryGBIF, queryINaturalistObservations, queryUniProt, queryChEMBL, queryWoRMS } from './providers/biodiversity';
import { queryWikipedia, queryWikidataEntities, queryWikiquote, queryWikisource, queryDBpedia, queryWiktionary, queryGoogleSearch, queryWikivoyage } from './providers/knowledge';
import { queryFrankfurter, queryCoinGecko, queryExchangeRates } from './providers/finance';
import { queryOpenFoodFacts, queryMealDB, queryCocktailDB, queryOpenBreweryDB, queryFruityvice } from './providers/food';
import { queryPokeAPI, queryOpen5e, queryOpenTriviaDB, queryArchiveGames, queryScryfallCards, queryYugiohCards, queryFreeToGame, queryDnD5e } from './providers/games';
import { queryArchive3D, queryArchiveTvCommercials, queryIconifyVectors, queryPicsumPhotos, queryArchiveHistoricalAudio, queryRadioBrowserLive, queryArchiveRadioDramas, queryWikimediaIllustrations } from './providers/extra_media';
import { querySmithsonianOpenAccess, queryUniversalNewsreels, querySilentFilms, queryComputerChronicles, queryFreeMusicArchive, queryPulpSciFi, queryHistoricUSGSMaps, queryInternetArcade, queryPubDev, queryClassicAnimation } from './providers/more_sources';
import {
  querySmkArt,
  queryHexPm,
  queryDataGovUk,
  queryFontsource,
  queryPaleoDb,
  queryMusopenClassical,
  queryArchiveRetroMagazines,
  queryArchiveComputerHistory,
  queryArchiveOpenMovies,
  queryArchiveCookbooks,
  queryArchiveFolkscanomy
} from './providers/extended_sources';
import {
  queryNuGetPackages,
  queryMetaCPAN,
  queryDataGovCanada,
  queryCatalogueOfLife,
  queryItisTaxonomy,
  queryBthlArchitecture,
  queryMovieTrailers,
  queryVintagePosters,
  queryOtrSciFi,
  queryFieldRecordings
} from './providers/further_sources';
import {
  queryNasaEonet,
  queryArchLinuxPackages,
  queryClojarsPackages,
  queryArchiveMsDosGames,
  queryArchiveMedicalHeritage,
  queryArchiveSheetMusic,
  queryArchiveOldTimeRadio,
  queryArchiveUsgsBulletins,
  queryArchiveNasaHistorical,
  queryArchiveAnimationShorts
} from './providers/universal_expansion';
import {
  queryArchiveFilmNoir,
  queryArchiveSpeedruns,
  queryArchiveBhlBotany,
  queryNihPubChem,
  queryArchiveApolloAudio,
  queryArchiveHistoricRadioNews,
  queryArchiveComputerManuals,
  queryArchiveGoldenAgeComics,
  queryArchiveUsPatents,
  queryArchiveDavidRumseyMaps
} from './providers/super_expansion';
import {
  queryLocDigitalCollections,
  queryNihClinicalTrials,
  queryArchiveCbsMysteryTheater,
  queryArchiveDemoscene,
  queryArchiveFlightManuals,
  queryArchiveVintageFashion,
  queryArchiveVintageAudiobooks,
  queryArchiveDriveInIntermissions,
  queryArchiveHistoricSoftware,
  queryArchiveClassicSciFiMovies
} from './providers/hyper_expansion';

export interface RouteExecutionResult {
  results: ResourceItem[];
  totalCount: number;
  executionTimeMs: number;
  categoryCounts: Record<ResourceCategory, number>;
  primaryProviderUsed: string;
  fallbackUsed?: string;
  providerErrors: string[];
}

// Top-level Provider Dispatcher Map for all 70+ open federated sources
export const PROVIDER_DISPATCH_MAP: Record<string, (q: string) => Promise<ResourceItem[]>> = {
  openverse: (q) => queryOpenverseImages(q),
  wikimedia: (q) => queryWikimediaImages(q),
  nasa: (q) => queryNASAImages(q),
  internet_archive_images: (q) => queryArchiveImages(q),
  inaturalist_images: (q) => queryINaturalistImages(q),
  cleveland_images: (q) => queryClevelandImages(q),
  smk_images: (q) => querySMKImages(q),
  vam_images: (q) => queryVAMImages(q),
  artic_images: (q) => queryArticImages(q),
  europeana_images: (q) => queryEuropeanaImages(q),
  wellcome_images: (q) => queryWellcomeImages(q),
  gbif_images: (q) => queryGBIFImages(q),
  nasa_apod: (q) => queryNasaApod(q),
  nasa_epic: (q) => queryNasaEpic(q),
  pexels: (q) => queryPexelsImages(q),
  unsplash: (q) => queryUnsplashImages(q),
  pixabay: (q) => queryPixabayImages(q),
  wikimedia_video: (q) => queryWikimediaVideos(q),
  youtube_video: (q) => queryYouTubeVideos(q),
  dailymotion_video: (q) => queryDailymotionVideos(q),
  vimeo_video: (q) => queryVimeoVideos(q),
  internet_archive_video: (q) => queryArchiveVideos(q),
  archive_feature_films: (q) => queryArchiveFeatureFilms(q),
  archive_prelinger: (q) => queryPrelingerVideos(q),
  archive_cartoons: (q) => queryCartoonsVideos(q),
  nasa_video: (q) => queryNASAVideos(q),
  peertube_video: (q) => queryPeerTubeVideos(q),
  tvmaze_video: (q) => queryTVMazeVideos(q),
  pexels_video: (q) => queryPexelsVideos(q),
  pixabay_video: (q) => queryPixabayVideos(q),
  apple_music: (q) => queryAppleMusicSongs(q),
  wikimedia_music: (q) => queryWikimediaMusic(q),
  openverse_audio: (q) => queryOpenverseAudio(q),
  wikimedia_audio: (q) => queryWikimediaAudio(q),
  archive_78rpm: (q) => queryArchive78rpm(q),
  archive_live_music: (q) => queryLiveMusicArchive(q),
  archive_librivox: (q) => queryLibriVoxAudiobooks(q),
  archive_otr: (q) => queryOldTimeRadio(q),
  nasa_audio: (q) => queryNasaAudio(q),
  ccmixter_audio: (q) => queryCCMixterAudio(q),
  radio_browser: (q) => queryRadioBrowser(q),
  apple_podcasts: (q) => queryApplePodcasts(q),
  freesound: (q) => queryFreesound(q),
  musicbrainz: (q) => queryMusicBrainz(q),
  internet_archive_audio: (q) => queryArchiveAudio(q),
  wikimedia_gifs: (q) => queryWikimediaGifs(q),
  giphy: (q) => queryGiphy(q),
  tenor: (q) => queryTenor(q),
  openalex: (q) => queryOpenAlex(q),
  crossref: (q) => queryCrossref(q),
  arxiv: (q) => queryArxiv(q),
  pubmed: (q) => queryPubMed(q),
  zenodo: (q) => queryZenodo(q),
  plos: (q) => queryPLOS(q),
  doaj: (q) => queryDOAJ(q),
  europe_pmc: (q) => queryEuropePMC(q),
  inspire_hep: (q) => queryInspireHep(q),
  hal_open_science: (q) => queryHalOpenScience(q),
  ncbi_pmc: (q) => queryNcbiPmc(q),
  open_library: (q) => queryOpenLibrary(q),
  internet_archive_books: (q) => queryArchiveBooks(q),
  gutendex: (q) => queryGutendex(q),
  poetrydb: (q) => queryPoetryDB(q),
  archive_comics: (q) => queryArchiveComics(q),
  google_books: (q) => queryGoogleBooks(q),
  nominatim: (q) => queryNominatim(q),
  usgs: (q) => queryUSGS(q),
  photon_maps: (q) => queryPhotonMaps(q),
  open_meteo: (q) => queryOpenMeteo(q),
  open_meteo_air: (q) => queryOpenMeteoAirQuality(q),
  open_meteo_marine: (q) => queryOpenMeteoMarine(q),
  artic: (q) => queryArtic(q),
  met_museum: (q) => queryMetMuseum(q),
  cleveland_art: (q) => queryClevelandArt(q),
  huggingface: (q) => queryHuggingFace(q),
  zenodo_datasets: (q) => queryZenodoDatasets(q),
  data_gov: (q) => queryDataGov(q),
  world_bank: (q) => queryWorldBank(q),
  nasa_exoplanets: (q) => queryNASAExoplanets(q),
  usgs_earthquakes: (q) => queryUsgsEarthquakes(q),
  github: (q) => queryGitHub(q),
  npm: (q) => queryNpm(q),
  hn_code: (q) => queryHackerNewsCode(q),
  crates_io: (q) => queryCratesIo(q),
  gitlab: (q) => queryGitLab(q),
  cdnjs: (q) => queryCdnjs(q),
  docker_hub: (q) => queryDockerHub(q),
  pypi: (q) => queryPyPI(q),
  gbif: (q) => queryGBIF(q),
  inaturalist_bio: (q) => queryINaturalistObservations(q),
  uniprot: (q) => queryUniProt(q),
  chembl: (q) => queryChEMBL(q),
  wikipedia: (q) => queryWikipedia(q),
  wikidata: (q) => queryWikidataEntities(q),
  wikiquote: (q) => queryWikiquote(q),
  wikisource: (q) => queryWikisource(q),
  dbpedia: (q) => queryDBpedia(q),
  frankfurter: (q) => queryFrankfurter(q),
  coingecko: (q) => queryCoinGecko(q),
  openfoodfacts: (q) => queryOpenFoodFacts(q),
  themealdb: (q) => queryMealDB(q),
  thecocktaildb: (q) => queryCocktailDB(q),
  openbrewerydb: (q) => queryOpenBreweryDB(q),
  pokeapi: (q) => queryPokeAPI(q),
  open5e_rpg: (q) => queryOpen5e(q),
  opentdb: (q) => queryOpenTriviaDB(q),
  archive_pcgames: (q) => queryArchiveGames(q),
  nasa_ntrs: (q) => queryNasaNtrs(q),
  harvard_dataverse: (q) => queryHarvardDataverse(q),
  cern_opendata: (q) => queryCernOpenData(q),
  scryfall: (q) => queryScryfallCards(q),
  yugioh: (q) => queryYugiohCards(q),
  freetogame: (q) => queryFreeToGame(q),
  dnd5e_srd: (q) => queryDnD5e(q),
  worms_marine: (q) => queryWoRMS(q),
  rubygems: (q) => queryRubyGems(q),
  packagist: (q) => queryPackagist(q),
  homebrew: (q) => queryHomebrew(q),
  wikibooks: (q) => queryWikibooks(q),
  archive_childrens_books: (q) => queryArchiveChildrensBooks(q),
  wiktionary: (q) => queryWiktionary(q),
  archive_netlabels: (q) => queryArchiveNetlabels(q),
  open_meteo_geocoding: (q) => queryOpenMeteoGeocoding(q),
  open_meteo_elevation: (q) => queryOpenMeteoElevation(q),
  exchange_rates: (q) => queryExchangeRates(q),
  google_search: (q) => queryGoogleSearch(q),
  google_images: (q) => queryGoogleImages(q),
  dog_ceo: (q) => queryDogCeoImages(q),
  maven_central: (q) => queryMavenCentral(q),
  wikivoyage: (q) => queryWikivoyage(q),
  fruityvice: (q) => queryFruityvice(q),
  archive_3d: (q) => queryArchive3D(q),
  archive_tv_commercials: (q) => queryArchiveTvCommercials(q),
  iconify_vectors: (q) => queryIconifyVectors(q),
  picsum_photos: (q) => queryPicsumPhotos(q),
  archive_historical_audio: (q) => queryArchiveHistoricalAudio(q),
  radio_browser_live: (q) => queryRadioBrowserLive(q),
  archive_radio_dramas: (q) => queryArchiveRadioDramas(q),
  wikimedia_illustrations: (q) => queryWikimediaIllustrations(q),
  smithsonian_open_access: (q) => querySmithsonianOpenAccess(q),
  archive_newsreels: (q) => queryUniversalNewsreels(q),
  archive_silent_films: (q) => querySilentFilms(q),
  archive_computer_chronicles: (q) => queryComputerChronicles(q),
  free_music_archive: (q) => queryFreeMusicArchive(q),
  archive_pulp_scifi: (q) => queryPulpSciFi(q),
  archive_historic_maps: (q) => queryHistoricUSGSMaps(q),
  archive_arcade_games: (q) => queryInternetArcade(q),
  pub_dev: (q) => queryPubDev(q),
  archive_animation_classics: (q) => queryClassicAnimation(q),
  nasa_mars_rovers: (q) => queryMarsRovers(q),
  nasa_asteroids: (q) => queryNasaAsteroids(q),
  nasa_osdr: (q) => queryNasaOsdr(q),
  nasa_spaceweather: (q) => queryNasaSpaceWeather(q),
  archive_nasa_docs: (q) => queryArchiveNasaDocs(q),
  nasa_all: (q) => queryAllNasa(q),
  smk_art: (q) => querySmkArt(q),
  hex_pm: (q) => queryHexPm(q),
  data_gov_uk: (q) => queryDataGovUk(q),
  fontsource: (q) => queryFontsource(q),
  paleo_db: (q) => queryPaleoDb(q),
  musopen_classical: (q) => queryMusopenClassical(q),
  archive_retro_magazines: (q) => queryArchiveRetroMagazines(q),
  archive_computer_history: (q) => queryArchiveComputerHistory(q),
  archive_open_movies: (q) => queryArchiveOpenMovies(q),
  archive_historic_cookbooks: (q) => queryArchiveCookbooks(q),
  archive_folkscanomy: (q) => queryArchiveFolkscanomy(q),
  nuget_packages: (q) => queryNuGetPackages(q),
  metacpan_perl: (q) => queryMetaCPAN(q),
  data_gov_ca: (q) => queryDataGovCanada(q),
  catalogue_of_life: (q) => queryCatalogueOfLife(q),
  itis_taxonomy: (q) => queryItisTaxonomy(q),
  archive_bthl_architecture: (q) => queryBthlArchitecture(q),
  archive_movie_trailers: (q) => queryMovieTrailers(q),
  archive_vintage_posters: (q) => queryVintagePosters(q),
  archive_otr_scifi: (q) => queryOtrSciFi(q),
  archive_field_recordings: (q) => queryFieldRecordings(q),
  nasa_eonet: (q) => queryNasaEonet(q),
  arch_linux_pkgs: (q) => queryArchLinuxPackages(q),
  clojars_packages: (q) => queryClojarsPackages(q),
  archive_msdos_games: (q) => queryArchiveMsDosGames(q),
  archive_medical_heritage: (q) => queryArchiveMedicalHeritage(q),
  archive_sheet_music: (q) => queryArchiveSheetMusic(q),
  archive_old_time_radio: (q) => queryArchiveOldTimeRadio(q),
  archive_usgs_bulletins: (q) => queryArchiveUsgsBulletins(q),
  archive_nasa_historical: (q) => queryArchiveNasaHistorical(q),
  archive_animation_shorts: (q) => queryArchiveAnimationShorts(q),
  archive_film_noir: (q) => queryArchiveFilmNoir(q),
  archive_speedruns: (q) => queryArchiveSpeedruns(q),
  archive_bhl_botany: (q) => queryArchiveBhlBotany(q),
  nih_pubchem: (q) => queryNihPubChem(q),
  archive_apollo_audio: (q) => queryArchiveApolloAudio(q),
  archive_historic_radio_news: (q) => queryArchiveHistoricRadioNews(q),
  archive_computer_manuals: (q) => queryArchiveComputerManuals(q),
  archive_golden_age_comics: (q) => queryArchiveGoldenAgeComics(q),
  archive_us_patents: (q) => queryArchiveUsPatents(q),
  archive_david_rumsey_maps: (q) => queryArchiveDavidRumseyMaps(q),
  loc_digital_collections: (q) => queryLocDigitalCollections(q),
  nih_clinical_trials: (q) => queryNihClinicalTrials(q),
  archive_cbs_mystery_theater: (q) => queryArchiveCbsMysteryTheater(q),
  archive_demoscene: (q) => queryArchiveDemoscene(q),
  archive_flight_manuals: (q) => queryArchiveFlightManuals(q),
  archive_vintage_fashion: (q) => queryArchiveVintageFashion(q),
  archive_vintage_audiobooks: (q) => queryArchiveVintageAudiobooks(q),
  archive_drive_in_intermissions: (q) => queryArchiveDriveInIntermissions(q),
  archive_historic_software: (q) => queryArchiveHistoricSoftware(q),
  archive_classic_sci_fi_movies: (q) => queryArchiveClassicSciFiMovies(q)
};

export const DEFAULT_PROVIDER_TEST_QUERIES: Record<string, string> = {
  loc_digital_collections: 'lincoln',
  nih_clinical_trials: 'oncology',
  archive_cbs_mystery_theater: 'mansion',
  archive_demoscene: 'future crew',
  archive_flight_manuals: 'spitfire',
  archive_vintage_fashion: 'couture',
  archive_vintage_audiobooks: 'edgar allan poe',
  archive_drive_in_intermissions: 'popcorn',
  archive_historic_software: 'unix',
  archive_classic_sci_fi_movies: 'mars',
  archive_film_noir: 'detour',
  archive_speedruns: 'mario',
  archive_bhl_botany: 'flora',
  nih_pubchem: 'caffeine',
  archive_apollo_audio: 'apollo 11',
  archive_historic_radio_news: 'broadcast',
  archive_computer_manuals: 'apple',
  archive_golden_age_comics: 'captain',
  archive_us_patents: 'telephone',
  archive_david_rumsey_maps: 'california',
  nasa_eonet: 'wildfires',
  arch_linux_pkgs: 'neovim',
  clojars_packages: 'cheshire',
  archive_msdos_games: 'pacman',
  archive_medical_heritage: 'anatomy',
  archive_sheet_music: 'ragtime',
  archive_old_time_radio: 'sherlock',
  archive_usgs_bulletins: 'mineral',
  archive_nasa_historical: 'apollo',
  archive_animation_shorts: 'cartoon',
  nuget_packages: 'json',
  metacpan_perl: 'moose',
  data_gov_ca: 'climate',
  catalogue_of_life: 'panthera',
  itis_taxonomy: 'panthera',
  archive_bthl_architecture: 'bungalow',
  archive_movie_trailers: 'noir',
  archive_vintage_posters: 'travel',
  archive_otr_scifi: 'space',
  archive_field_recordings: 'rain',
  smk_art: 'rembrandt',
  hex_pm: 'phoenix',
  data_gov_uk: 'transport',
  fontsource: 'sans',
  paleo_db: 'dinosaur',
  musopen_classical: 'beethoven',
  archive_retro_magazines: 'apple',
  archive_computer_history: 'unix',
  archive_open_movies: 'animation',
  archive_historic_cookbooks: 'bread',
  archive_folkscanomy: 'radio',
  nasa_mars_rovers: 'curiosity',
  nasa_asteroids: 'asteroid',
  nasa_osdr: 'microgravity',
  nasa_spaceweather: 'weather',
  archive_nasa_docs: 'apollo',
  smithsonian_open_access: 'painting',
  archive_newsreels: 'aviation',
  archive_silent_films: 'chaplin',
  archive_computer_chronicles: 'silicon',
  free_music_archive: 'ambient',
  archive_pulp_scifi: 'science',
  archive_historic_maps: 'colorado',
  archive_arcade_games: 'arcade',
  pub_dev: 'http',
  archive_animation_classics: 'cartoon',
  archive_3d: 'space',
  archive_tv_commercials: 'vintage',
  iconify_vectors: 'media',
  picsum_photos: 'nature',
  archive_historical_audio: 'jazz',
  radio_browser_live: 'chill',
  archive_radio_dramas: 'detective',
  wikimedia_illustrations: 'botanical',
  google_search: 'quantum computing',
  google_images: 'aurora borealis',
  dog_ceo: 'hound',
  maven_central: 'guava',
  wikivoyage: 'Kyoto',
  fruityvice: 'apple',
  open_meteo_elevation: 'Denver',
  nasa_ntrs: 'aerodynamics',
  harvard_dataverse: 'climate',
  cern_opendata: 'higgs',
  scryfall: 'dragon',
  yugioh: 'magician',
  freetogame: 'shooter',
  dnd5e_srd: 'fireball',
  worms_marine: 'Delphinus',
  rubygems: 'rails',
  packagist: 'symfony',
  homebrew: 'git',
  wikibooks: 'astronomy',
  archive_childrens_books: 'fairy',
  wiktionary: 'ephemeral',
  archive_netlabels: 'ambient',
  open_meteo_geocoding: 'Tokyo',
  exchange_rates: 'USD',
  wellcome_images: 'microscope',
  gbif_images: 'canis',
  nasa_apod: 'galaxy',
  nasa_epic: 'earth',
  wikimedia: 'mountains',
  nasa: 'mars',
  internet_archive_images: 'botany',
  artic_images: 'painting',
  cleveland_images: 'sculpture',
  smk_images: 'portrait',
  vam_images: 'textile',
  inaturalist_images: 'fungi',
  europeana_images: 'renaissance',
  pexels: 'forest',
  unsplash: 'ocean',
  pixabay: 'sunset',
  pixabay_video: 'ocean',
  openverse: 'vintage',
  youtube_video: 'science',
  dailymotion_video: 'nature',
  vimeo_video: 'cinema',
  peertube_video: 'linux',
  archive_feature_films: 'cinema',
  archive_prelinger: 'san francisco',
  archive_cartoons: 'popeye',
  tvmaze_video: 'planet',
  wikimedia_video: 'water',
  internet_archive_video: 'space',
  nasa_video: 'apollo',
  pexels_video: 'river',
  archive_live_music: 'concert',
  archive_librivox: 'sherlock',
  archive_otr: 'shadow',
  nasa_audio: 'apollo',
  ccmixter_audio: 'groove',
  radio_browser: 'jazz',
  apple_podcasts: 'history',
  wikimedia_audio: 'bird',
  archive_78rpm: 'blues',
  musicbrainz: 'beethoven',
  internet_archive_audio: 'podcast',
  freesound: 'wind',
  openverse_audio: 'guitar',
  wikimedia_gifs: 'rotation',
  giphy: 'celebrate',
  tenor: 'dance',
  openalex: 'quantum',
  inspire_hep: 'higgs',
  hal_open_science: 'astronomy',
  ncbi_pmc: 'crispr',
  europe_pmc: 'dna',
  crossref: 'relativity',
  arxiv: 'quantum',
  pubmed: 'oncology',
  zenodo: 'climate',
  plos: 'genetics',
  doaj: 'ecology',
  internet_archive_books: 'frankenstein',
  open_library: 'tolkien',
  gutendex: 'dickens',
  archive_comics: 'batman',
  poetrydb: 'shakespeare',
  google_books: 'history',
  nominatim: 'Paris',
  photon_maps: 'Tokyo',
  usgs: 'Yellowstone',
  open_meteo: 'London',
  open_meteo_air: 'Berlin',
  open_meteo_marine: 'Miami',
  artic: 'monet',
  met_museum: 'egypt',
  cleveland_art: 'armor',
  data_gov: 'agriculture',
  huggingface: 'nlp',
  zenodo_datasets: 'physics',
  world_bank: 'gdp',
  nasa_exoplanets: 'kepler',
  usgs_earthquakes: 'all',
  github: 'react',
  docker_hub: 'redis',
  pypi: 'fastapi',
  crates_io: 'tokio',
  gitlab: 'parser',
  cdnjs: 'lodash',
  npm: 'express',
  hn_code: 'compiler',
  gbif: 'panthera',
  inaturalist_bio: 'monarch',
  uniprot: 'insulin',
  chembl: 'aspirin',
  wikipedia: 'quantum',
  wikidata: 'einstein',
  dbpedia: 'aristotle',
  wikisource: 'declaration',
  wikiquote: 'plato',
  frankfurter: 'EUR',
  coingecko: 'bitcoin',
  openfoodfacts: 'chocolate',
  themealdb: 'pasta',
  thecocktaildb: 'mojito',
  openbrewerydb: 'craft',
  pokeapi: 'pikachu',
  archive_pcgames: 'doom',
  open5e_rpg: 'dragon',
  opentdb: 'science'
};

export async function testSingleProvider(providerId: string, customQuery?: string) {
  const fn = PROVIDER_DISPATCH_MAP[providerId];
  if (!fn) {
    return {
      providerId,
      success: false,
      status: 'error' as const,
      latencyMs: 0,
      itemCount: 0,
      error: `Unknown provider ID: ${providerId}`
    };
  }

  const query = customQuery?.trim() || DEFAULT_PROVIDER_TEST_QUERIES[providerId] || 'science';
  const start = Date.now();
  try {
    const items = await resilientPool.executeProvider(providerId, query, fn, 7000);
    const latencyMs = Date.now() - start;
    return {
      providerId,
      success: items.length > 0,
      status: (items.length > 0 ? 'healthy' : 'empty') as 'healthy' | 'empty',
      latencyMs,
      itemCount: items.length,
      sampleTitle: items[0]?.title
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return {
      providerId,
      success: false,
      status: 'error' as const,
      latencyMs,
      itemCount: 0,
      error: err.message
    };
  }
}

export async function executeRoutedSearch(filters: SearchFilters): Promise<RouteExecutionResult> {
  const startTime = Date.now();
  const query = (filters.query || '').trim();
  const plan = generateSearchPlan(filters);

  const providerErrors: string[] = [];
  const fetchedItems: ResourceItem[] = [];

  const dispatchMap = PROVIDER_DISPATCH_MAP;

  // Check which providers to run
  const activeProviders = [...plan.primaryProviders];

  // If any key-required fallback providers have keys configured, run them concurrently
  const keyRequiredCheck: Record<string, string | undefined> = {
    openverse: process.env.OPENVERSE_ACCESS_TOKEN,
    openverse_audio: process.env.OPENVERSE_ACCESS_TOKEN,
    pexels: process.env.PEXELS_API_KEY,
    unsplash: process.env.UNSPLASH_ACCESS_KEY,
    pixabay: process.env.PIXABAY_API_KEY,
    giphy: process.env.GIPHY_API_KEY,
    tenor: process.env.TENOR_API_KEY,
    freesound: process.env.FREESOUND_API_KEY,
    github: process.env.GITHUB_TOKEN
  };

  const fallbackProviders = plan.fallbackProviders || [];
  for (const fpid of fallbackProviders) {
    if (keyRequiredCheck[fpid] && !activeProviders.includes(fpid)) {
      activeProviders.push(fpid);
    }
  }

  // Execute federation via ResilientProviderPool with fast quorum and strict latency protection
  const { results: fedResults, errors: fedErrors } = await resilientPool.executeFederation(
    activeProviders,
    query,
    dispatchMap,
    { 
      timeoutMs: APP_CONFIG.search.providerTimeoutMs, 
      overallDeadlineMs: 3800, 
      fastQuorumCount: APP_CONFIG.search.fastQuorumTarget,
      fastYieldMinTimeMs: APP_CONFIG.search.fastQuorumTimeoutMs,
      maxConcurrency: 16,
      onBackgroundResult: (moreItems) => {
        if (moreItems && moreItems.length > 0) {
          const category = normalizeCategory(filters.category);
          resourceCache.append(query, category, moreItems);
        }
      }
    }
  );

  fetchedItems.push(...fedResults);
  providerErrors.push(...fedErrors);

  // If primary returned few results and fallbacks are available without keys, run fallbacks
  let fallbackUsed: string | undefined = undefined;
  if (fetchedItems.length === 0 && fallbackProviders.length > 0) {
    const { results: fbResults, errors: fbErrors } = await resilientPool.executeFederation(
      fallbackProviders,
      query,
      dispatchMap,
      { timeoutMs: 3000, overallDeadlineMs: 3500, maxConcurrency: 6 }
    );
    if (fbResults.length > 0) {
      fetchedItems.push(...fbResults);
      fallbackUsed = fallbackProviders[0];
    }
    providerErrors.push(...fbErrors);
  }

  // Deduplicate
  const deduped = deduplicateResources(fetchedItems);

  // Rank and filter
  const ranked = rankAndFilterResources(deduped, filters);

  // Clean and normalize metadata attributes, titles, and thumbnails
  const processed = MediaProcessor.processItems(ranked);

  // Compute category counts strictly from real retrieved items
  const categoryCounts: Record<ResourceCategory, number> = {
    all: processed.length,
    images: processed.filter((i) => i.category === 'images').length,
    videos: processed.filter((i) => i.category === 'videos').length,
    gifs: processed.filter((i) => i.category === 'gifs').length,
    music: processed.filter((i) => i.category === 'music').length,
    audio: processed.filter((i) => i.category === 'audio').length,
    papers: processed.filter((i) => i.category === 'papers').length,
    books: processed.filter((i) => i.category === 'books').length,
    maps: processed.filter((i) => i.category === 'maps').length,
    weather: processed.filter((i) => i.category === 'weather').length,
    datasets: processed.filter((i) => i.category === 'datasets').length,
    art: processed.filter((i) => i.category === 'art').length,
    code: processed.filter((i) => i.category === 'code').length,
    finance: processed.filter((i) => i.category === 'finance').length,
    biodiversity: processed.filter((i) => i.category === 'biodiversity').length,
    knowledge: processed.filter((i) => i.category === 'knowledge').length,
    food: processed.filter((i) => i.category === 'food').length,
    games: processed.filter((i) => i.category === 'games').length,
    '3d': processed.filter((i) => i.category === '3d').length,
    nasa: processed.filter((i) => i.category === 'nasa').length
  };

  return {
    results: processed,
    totalCount: processed.length,
    executionTimeMs: Date.now() - startTime,
    categoryCounts,
    primaryProviderUsed: plan.planSummary,
    fallbackUsed,
    providerErrors: processed.length === 0 ? providerErrors : []
  };
}
