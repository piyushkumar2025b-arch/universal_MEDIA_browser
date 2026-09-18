import { Router } from 'express';
import { searchController } from '../controllers/search_controller';
import { mediaController } from '../controllers/media_controller';
import { downloadController } from '../controllers/download_controller';
import { systemController } from '../controllers/system_controller';

const router = Router();

// ==========================================
// Search & Discovery Endpoints
// ==========================================
router.post('/v1/search', (req, res, next) => searchController.searchV1(req, res, next));
router.get('/v1/search', (req, res, next) => searchController.searchLegacyGet(req, res, next));
router.post('/v1/search/poll-background', (req, res) => searchController.pollBackground(req, res));
router.post('/v1/search/fetch-deep', (req, res) => searchController.fetchDeep(req, res));

// Backward compatibility search endpoint
router.get('/search', (req, res, next) => searchController.searchLegacyGet(req, res, next));

// ==========================================
// Media & Image Proxy Endpoints
// ==========================================
router.get('/v1/media-tunnel', (req, res) => mediaController.universalMediaTunnel(req, res));
router.head('/v1/media-tunnel', (req, res) => mediaController.universalMediaTunnel(req, res));
router.options('/v1/media-tunnel', (req, res) => mediaController.universalMediaTunnel(req, res));
router.get('/media-tunnel', (req, res) => mediaController.universalMediaTunnel(req, res));
router.head('/media-tunnel', (req, res) => mediaController.universalMediaTunnel(req, res));
router.get('/image-proxy', (req, res) => mediaController.proxyImage(req, res));
router.get('/v1/content-photo', (req, res) => mediaController.getContentPhoto(req, res));
router.get('/v1/audio-stream', (req, res) => mediaController.proxyAudioStream(req, res));
router.get('/stream-audio', (req, res) => mediaController.proxyAudioStream(req, res));
router.get('/v1/video-stream', (req, res) => mediaController.proxyVideoStream(req, res));
router.get('/video-stream', (req, res) => mediaController.proxyVideoStream(req, res));
router.get('/v1/video-embed', (req, res) => mediaController.renderVideoEmbed(req, res));
router.get('/video-embed', (req, res) => mediaController.renderVideoEmbed(req, res));

// ==========================================
// Asset Download & Integrity Endpoints
// ==========================================
router.post('/v1/resources/:id/download', (req, res) => downloadController.downloadResource(req, res));
router.get('/download-proxy', (req, res) => downloadController.proxyDownload(req, res));

// ==========================================
// System Telemetry, Health & Specifications
// ==========================================
router.get('/v1/system/providers', (req, res) => systemController.getProviders(req, res));
router.post('/v1/system/test-provider/:id', (req, res) => systemController.testProvider(req, res));
router.get('/v1/system/test-provider/:id', (req, res) => systemController.testProvider(req, res));
router.get('/v1/system/provider-test', (req, res) => systemController.testProvider(req, res));
router.post('/v1/system/provider-test', (req, res) => systemController.testProvider(req, res));
router.post('/v1/system/benchmark', (req, res) => systemController.runBenchmark(req, res));
router.get('/v1/system/registry', (req, res) => systemController.getRegistry(req, res));
router.get('/v1/system/cache-stats', (req, res) => systemController.getCacheStats(req, res));
router.get('/v1/system/health', (req, res) => systemController.getHealth(req, res));
router.get('/health', (req, res) => systemController.getHealth(req, res));

export default router;
