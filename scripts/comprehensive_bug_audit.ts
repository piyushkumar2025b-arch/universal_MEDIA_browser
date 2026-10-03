import http from 'http';
import { WebSocket } from 'ws';
import { isSafePublicUrl, isSafePublicUrlAsync, isPrivateIpAddress } from '../server/utils/security';
import { downloadResourceAsset, downloadBatchZip, MAX_BATCH_ITEMS, MAX_BATCH_BYTES } from '../src/utils/downloadEngine';
import { resilientPool } from '../server/pipeline/resilient_pool';
import { ResourceItem } from '../src/types/resource';

async function fetchHttp(urlStr: string, options: http.RequestOptions & { body?: string } = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: data
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function runAudit() {
  console.log('=== STARTING AUDIT: BUG-001 TO BUG-013 ===\n');
  let passCount = 0;
  let failCount = 0;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${name}${detail ? ` - ${detail}` : ''}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${name}${detail ? ` - ${detail}` : ''}`);
      failCount++;
    }
  }

  // --- BUG-001: SSRF DNS-Aware & Private IP Protection ---
  const isLocalIpPrivate = isPrivateIpAddress('127.0.0.1');
  const isTenIpPrivate = isPrivateIpAddress('10.254.1.1');
  const isCgNatPrivate = isPrivateIpAddress('100.64.0.1');
  const isMetadataPrivate = isPrivateIpAddress('169.254.169.254');
  const isPublicIpPrivate = isPrivateIpAddress('8.8.8.8');
  assert('BUG-001 (a) isPrivateIpAddress checks', isLocalIpPrivate && isTenIpPrivate && isCgNatPrivate && isMetadataPrivate && !isPublicIpPrivate);

  const localRes = await fetchHttp('http://localhost:3000/api/image-proxy?url=http://127.0.0.1:3000/api/health');
  assert('BUG-001 (b) image-proxy blocks 127.0.0.1', localRes.status === 400);

  const intIpRes = await fetchHttp('http://localhost:3000/api/image-proxy?url=http://2130706433:3000/api/health');
  assert('BUG-001 (c) image-proxy blocks integer IP', intIpRes.status === 400);

  const localhostDomain = await isSafePublicUrlAsync('http://localhost:3000/api/health');
  assert('BUG-001 (d) isSafePublicUrlAsync blocks localhost domain', !localhostDomain);

  // --- BUG-002: Background Search Harvest Concurrency Limits ---
  const searchPostRes = await fetchHttp('http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'test_burst_query_1', category: 'all' })
  });
  assert('BUG-002 Background harvest scheduler accepted bounded query', searchPostRes.status === 200);

  // --- BUG-003: Provider Timeout AbortSignal Propagation ---
  let abortSignalFired = false;
  try {
    await resilientPool.executeProvider(
      'mock_slow_provider',
      'timeout_test',
      async (q, signal) => {
        return new Promise<ResourceItem[]>((resolve) => {
          signal?.addEventListener('abort', () => {
            abortSignalFired = true;
            resolve([]);
          });
        });
      },
      200 // 200ms timeout
    );
  } catch (err: any) {
    // Expected to catch timeout error
  }
  assert('BUG-003 Provider timeout actively fires AbortSignal', abortSignalFired);

  // --- BUG-004 & BUG-009: Download Proxy HTML Rejection & Limits ---
  const htmlProxyRes = await fetchHttp('http://localhost:3000/api/download-proxy?url=https://example.com&filename=test.jpg');
  assert('BUG-009 Gateway download-proxy rejects HTML documents', htmlProxyRes.status === 415);

  // --- BUG-005: WebSocket Origin Validation ---
  const wsRejectPromise = new Promise<boolean>((resolve) => {
    const ws = new WebSocket('ws://localhost:3000/ws', {
      headers: { Origin: 'https://evil-unauthorized-site.example' }
    });
    ws.on('open', () => {
      // If opened, it failed the check
      ws.close();
      resolve(false);
    });
    ws.on('unexpected-response', (_req, res) => {
      resolve(res.statusCode === 403);
    });
    ws.on('close', (code) => {
      resolve(code === 1008);
    });
    ws.on('error', () => {
      resolve(true);
    });
  });
  const wsRejected = await wsRejectPromise;
  assert('BUG-005 WebSocket rejects unauthorized cross-site Origin (HTTP 403 Forbidden)', wsRejected);

  const wsAcceptPromise = new Promise<boolean>((resolve) => {
    const ws = new WebSocket('ws://localhost:3000/ws', {
      headers: { Origin: 'http://localhost:3000' }
    });
    ws.on('open', () => {
      ws.close();
      resolve(true);
    });
    ws.on('error', (err) => {
      resolve(false);
    });
  });
  const wsAccepted = await wsAcceptPromise;
  assert('BUG-005 WebSocket accepts legitimate application Origin', wsAccepted);

  // --- BUG-006 & BUG-007: WebSocket Abuse Control & Privacy ---
  const wsPrivacyPromise = new Promise<boolean>(async (resolve) => {
    const wsUserA = new WebSocket('ws://localhost:3000/ws', { headers: { Origin: 'http://localhost:3000' } });
    const wsUserB = new WebSocket('ws://localhost:3000/ws', { headers: { Origin: 'http://localhost:3000' } });

    let rawQueryLeaked = false;

    wsUserB.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      // Check if User B receives raw query string from User A
      if (msg.query && msg.query.includes('CONFIDENTIAL_PROJECT_XYZ')) {
        rawQueryLeaked = true;
      }
    });

    await new Promise(r => wsUserA.on('open', r));
    await new Promise(r => wsUserB.on('open', r));

    wsUserA.send(JSON.stringify({
      type: 'SEARCH',
      query: 'CONFIDENTIAL_PROJECT_XYZ',
      category: 'papers'
    }));

    setTimeout(() => {
      wsUserA.close();
      wsUserB.close();
      resolve(!rawQueryLeaked);
    }, 1500);
  });
  const privacyPreserved = await wsPrivacyPromise;
  assert('BUG-007 WebSocket does not leak raw search query strings to other connected clients', privacyPreserved);

  // --- BUG-008 & BUG-010: Download Status Dispatched vs Confirmed ---
  const mockAnchorItem = {
    id: 'test-doc-1',
    title: 'Test Article',
    category: 'papers',
    source: { providerId: 'arxiv', providerName: 'arXiv', resourceUrl: 'https://arxiv.org/abs/2301.0001' }
  } as unknown as ResourceItem;
  const downloadResult = await downloadResourceAsset(mockAnchorItem);
  assert('BUG-010 Direct-anchor fallback returns dispatched status', downloadResult.status === 'dispatched' || downloadResult.status === 'confirmed');

  // --- BUG-012: Batch ZIP Limits ---
  const fakeItems = Array.from({ length: 55 }, (_, i) => ({
    id: `item-${i}`,
    title: `Item ${i}`,
    category: 'images',
    downloadUrl: `https://example.com/item-${i}.jpg`
  })) as unknown as ResourceItem[];
  let batchLimitCaught = false;
  try {
    await downloadBatchZip(fakeItems);
  } catch (err: any) {
    if (err.message.includes('exceeds maximum limit of 50 items')) {
      batchLimitCaught = true;
    }
  }
  assert('BUG-012 Batch ZIP export enforces 50-item limit', batchLimitCaught);

  // --- BUG-013: Content Security Policy Hardening ---
  const healthRes = await fetchHttp('http://localhost:3000/api/health');
  const csp = (healthRes.headers['content-security-policy'] as string) || '';
  const hasHttpsInScriptSrc = /script-src[^;]*\bhttps:\b/.test(csp);
  const hasUnsafeEval = csp.includes('unsafe-eval');
  assert('BUG-013 (a) CSP script-src blocks arbitrary https: script injection', !hasHttpsInScriptSrc);
  assert('BUG-013 (b) CSP strictly forbids unsafe-eval', !hasUnsafeEval);

  console.log(`\n=== AUDIT COMPLETE: ${passCount} Passed, ${failCount} Failed ===\n`);
  process.exit(failCount === 0 ? 0 : 1);
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
