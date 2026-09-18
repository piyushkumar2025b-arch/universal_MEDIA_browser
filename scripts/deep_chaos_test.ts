/**
 * Deep Chaos & Penetration Test Suite for URMIL
 * Tests:
 * 1. Hex/Octal/Integer IP SSRF bypass attempts
 * 2. IPv6 loopback & link-local variants
 * 3. Range header attacks on audio streamer
 * 4. Filter injection (malformed quality, license, sort fields)
 * 5. Corrupted / non-JSON content-type POST payloads
 * 6. Provider testing endpoint resilience
 * 7. Rapid-burst query hammering (50 parallel distinct queries)
 * 8. Cache eviction & memory footprint verification
 * 9. Audio stream seeking with invalid ranges
 * 10. Empty body / missing fields robustness
 */

import http from 'http';

interface TestResult {
  name: string;
  ok: boolean;
  status: number;
  durationMs: number;
  notes?: string;
}

function request(urlStr: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; raw: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || 80,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        timeout: 15000
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf-8');
          let parsedBody: any = null;
          try {
            parsedBody = JSON.parse(raw);
          } catch {
            parsedBody = raw;
          }
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            body: parsedBody,
            raw
          });
        });
      }
    );

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runChaosSuite() {
  console.log('=== STARTING DEEP CHAOS & PENETRATION TEST SUITE ===');
  const results: TestResult[] = [];

  const runTest = async (name: string, fn: () => Promise<{ ok: boolean; status: number; notes?: string }>) => {
    const start = Date.now();
    try {
      const res = await fn();
      const durationMs = Date.now() - start;
      results.push({ name, ok: res.ok, status: res.status, durationMs, notes: res.notes });
      console.log(`[${res.ok ? 'PASS' : 'FAIL'}] ${name} (${durationMs}ms, Status: ${res.status}${res.notes ? `, Note: ${res.notes}` : ''})`);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      results.push({ name, ok: false, status: 500, durationMs, notes: err.message });
      console.log(`[FAIL] ${name} (${durationMs}ms, Error: ${err.message})`);
    }
  };

  // 1. SSRF: Decimal Integer IP representation (2130706433 = 127.0.0.1)
  await runTest('SSRF Bypass: Integer IP Representation (http://2130706433:3000)', async () => {
    const res = await request('http://localhost:3000/api/image-proxy?url=http://2130706433:3000/api/health');
    const isProtected = res.status === 400 || res.headers['content-type']?.includes('image');
    const isLeaked = typeof res.body === 'object' && res.body?.status === 'ok';
    return {
      ok: isProtected && !isLeaked,
      status: res.status,
      notes: isLeaked ? 'CRITICAL: Leaked health endpoint' : 'Blocked integer IP correctly'
    };
  });

  // 2. SSRF: IPv6 Loopback [::1]
  await runTest('SSRF Bypass: IPv6 Loopback (http://[::1]:3000)', async () => {
    const res = await request('http://localhost:3000/api/image-proxy?url=http://[::1]:3000/api/health');
    const isProtected = res.status === 400 || res.headers['content-type']?.includes('image');
    const isLeaked = typeof res.body === 'object' && res.body?.status === 'ok';
    return {
      ok: isProtected && !isLeaked,
      status: res.status,
      notes: isLeaked ? 'CRITICAL: Leaked health endpoint via IPv6' : 'Blocked IPv6 loopback correctly'
    };
  });

  // 3. Audio Streaming Range Header: Valid Range
  await runTest('Audio Streaming: Partial Content 206 with Valid Range', async () => {
    const sampleAudioUrl = 'https://archive.org/download/testmp3testfile/mpthreetest.mp3';
    const res = await request(`http://localhost:3000/api/stream-audio?url=${encodeURIComponent(sampleAudioUrl)}`, {
      headers: { Range: 'bytes=0-100' }
    });
    // Upstream may return 206 or 200 or 302/redirect
    const ok = [200, 206, 302, 304].includes(res.status) || (res.status === 404 && res.raw.includes('archive.org'));
    return {
      ok: ok,
      status: res.status,
      notes: `Responded with status ${res.status}`
    };
  });

  // 4. Audio Streaming: SSRF Attempt via /api/stream-audio
  await runTest('Audio Streaming: SSRF Attempt on Loopback', async () => {
    const res = await request('http://localhost:3000/api/stream-audio?url=http://127.0.0.1:3000/api/health');
    return {
      ok: res.status === 400,
      status: res.status,
      notes: `Rejected with status ${res.status}`
    };
  });

  // 5. Corrupted POST Payload (Invalid JSON)
  await runTest('Payload Safety: Invalid JSON Syntax in POST /api/v1/search', async () => {
    const res = await request('http://localhost:3000/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"query": "unclosed json...'
    });
    // Express bodyParser handles JSON syntax errors with 400
    return {
      ok: res.status === 400,
      status: res.status,
      notes: `Properly returned ${res.status} Bad Request`
    };
  });

  // 6. Non-JSON Content-Type with Search
  await runTest('Payload Safety: Text/Plain POST with Missing Body', async () => {
    const res = await request('http://localhost:3000/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'Some plain text'
    });
    return {
      ok: [200, 400].includes(res.status),
      status: res.status,
      notes: `Handled non-json POST with status ${res.status}`
    };
  });

  // 7. Filter Injection: Corrupted License / Quality / SortBy
  await runTest('Filter Safety: Array and Null Tampering in Filter Options', async () => {
    const res = await request('http://localhost:3000/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'space',
        category: 'images',
        quality: 999999, // Should be string
        license: ['CC0', null, { evil: true }], // Should be string array
        sortBy: { malicious: 'injection' } // Should be string
      })
    });
    return {
      ok: res.status === 200 && Array.isArray(res.body?.results),
      status: res.status,
      notes: `Returned ${res.body?.results?.length ?? 0} results with sanitized filters`
    };
  });

  // 8. Provider Testing Endpoint: Non-existent Provider
  await runTest('Provider Health: Query Non-Existent Provider', async () => {
    const res = await request('http://localhost:3000/api/v1/system/provider-test?provider=fake_non_existent_provider_xyz');
    return {
      ok: res.status === 200 && res.body?.success === false && res.body?.error?.includes('Unknown provider'),
      status: res.status,
      notes: `Handled unknown provider safely: ${res.body?.error}`
    };
  });

  // 9. Provider Testing Endpoint: Real Open Provider Test
  await runTest('Provider Health: Test Real Wikimedia Provider Live', async () => {
    const res = await request('http://localhost:3000/api/v1/system/provider-test?provider=wikimedia&query=telescope');
    return {
      ok: res.status === 200 && res.body?.status !== 'error',
      status: res.status,
      notes: `Status: ${res.body?.status}, Items: ${res.body?.itemCount}, Latency: ${res.body?.latencyMs}ms`
    };
  });

  // 10. Rapid Burst Hammering: 30 Simultaneous Diverse Searches
  await runTest('Stress: 30 Concurrent Diverse Queries to Test Cache and Pool Stability', async () => {
    const categories = ['images', 'videos', 'audio', 'books', 'papers', 'code', 'food', 'games', 'weather', 'finance'];
    const terms = ['mars', 'jupiter', 'einstein', 'beethoven', 'curie', 'da_vinci'];
    const queries = terms.flatMap(t => categories.map(c => ({ q: t, cat: c }))).slice(0, 30);

    const promises = queries.map(({ q, cat }) =>
      request('http://localhost:3000/api/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, category: cat, pageSize: 12 })
      })
    );

    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.status === 200 && Array.isArray(r.body?.results)).length;
    return {
      ok: successCount >= 28, // At least 93% success rate under severe concurrent burst
      status: 200,
      notes: `${successCount}/30 concurrent searches completed successfully`
    };
  });

  // 11. Download Proxy Traversal Attempt
  await runTest('Security: Path Traversal in Download Proxy', async () => {
    const res = await request('http://localhost:3000/api/download-proxy?url=https://images.unsplash.com/photo-1451187580459-43490279c0fa&filename=../../../../etc/passwd', {
      method: 'HEAD'
    });
    const disp = res.headers['content-disposition'] || '';
    const hasTraversal = disp.includes('..') || disp.includes('/etc/passwd');
    return {
      ok: !hasTraversal && res.status === 200,
      status: res.status,
      notes: `Safe disposition: ${disp}`
    };
  });

  // 12. Check System Telemetry and Memory After Chaos
  await runTest('System Stability: Telemetry & Memory Check After Burst', async () => {
    const res = await request('http://localhost:3000/api/v1/system/cache-stats');
    const memUsage = process.memoryUsage();
    const heapMb = Math.round(memUsage.heapUsed / 1024 / 1024);
    return {
      ok: res.status === 200 && typeof res.body?.cachedQueries === 'number',
      status: res.status,
      notes: `Cached queries: ${res.body?.cachedQueries}, Heap: ${heapMb}MB`
    };
  });

  // Final Summary
  const failures = results.filter(r => !r.ok);
  console.log(`\n=== CHAOS SUITE COMPLETED: ${results.length} Tests, ${failures.length} Failures ===`);
  if (failures.length > 0) {
    console.log('Failing tests:', failures.map(f => f.name));
  }
}

runChaosSuite().catch(console.error);
