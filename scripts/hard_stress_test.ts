import http from 'http';

interface TestResult {
  name: string;
  status: number;
  duration: number;
  ok: boolean;
  notes?: string;
  error?: string;
}

async function request(urlStr: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: any; rawBody: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = data;
        }
        resolve({
          status: res.statusCode || 0,
          headers: res.headers,
          body: parsed,
          rawBody: data
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function runHardTests() {
  console.log('=== STARTING HARD STRESS & SECURITY TEST SUITE ===');
  const results: TestResult[] = [];

  // Helper
  const runTest = async (name: string, fn: () => Promise<{ ok: boolean; status: number; notes?: string }>) => {
    const start = Date.now();
    try {
      const res = await fn();
      const dur = Date.now() - start;
      results.push({ name, status: res.status, duration: dur, ok: res.ok, notes: res.notes });
      console.log(`[${res.ok ? 'PASS' : 'FAIL'}] ${name} (${dur}ms, Status: ${res.status}${res.notes ? `, Note: ${res.notes}` : ''})`);
    } catch (err: any) {
      const dur = Date.now() - start;
      results.push({ name, status: 500, duration: dur, ok: false, error: err.message });
      console.log(`[FAIL] ${name} (${dur}ms, Error: ${err.message})`);
    }
  };

  // 1. SSRF: Loopback 127.0.0.1 image proxy
  await runTest('SSRF: Image Proxy Loopback 127.0.0.1', async () => {
    const res = await request('http://localhost:3000/api/image-proxy?url=http://127.0.0.1:3000/api/health');
    // It should either block with 400/403 or fall back to a safe public photo (NOT return health json)
    const isLeakingHealth = typeof res.body === 'object' && res.body?.status === 'ok';
    return {
      ok: !isLeakingHealth,
      status: res.status,
      notes: isLeakingHealth ? 'LEAKED internal health json!' : 'Protected'
    };
  });

  // 2. SSRF: Cloud Metadata IP (169.254.169.254)
  await runTest('SSRF: Image Proxy Cloud Metadata', async () => {
    const res = await request('http://localhost:3000/api/image-proxy?url=http://169.254.169.254/computeMetadata/v1/');
    return {
      ok: res.status === 400 || res.status === 403 || res.headers['content-type']?.includes('image'),
      status: res.status,
      notes: `Handled with status ${res.status}`
    };
  });

  // 3. SSRF: Download Endpoint Localhost Target
  await runTest('SSRF: Download Resource Endpoint Loopback', async () => {
    const res = await request('http://localhost:3000/api/v1/resources/test/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://127.0.0.1:3000/api/health', filename: 'secret.json' })
    });
    // Should be rejected with 400/403 or fail to stream internal secret
    const isLeaked = typeof res.body === 'object' && res.body?.status === 'ok';
    return {
      ok: !isLeaked,
      status: res.status,
      notes: isLeaked ? 'LEAKED internal API output!' : 'Protected'
    };
  });

  // 4. Large Query Payload (10,000 chars)
  await runTest('Stress: 10,000-char Query Payload', async () => {
    const giantQuery = 'galaxy '.repeat(1500);
    const res = await request('http://localhost:3000/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: giantQuery, category: 'all' })
    });
    return {
      ok: res.status === 200 && Array.isArray(res.body?.results),
      status: res.status,
      notes: `Returned ${res.body?.results?.length ?? 0} results`
    };
  });

  // 5. Control Characters & Null Byte Injection in Query
  await runTest('Edge: Control chars & Null bytes in Query', async () => {
    const dirtyQuery = 'quantum\x00\x01\x08\x1b\x07physics\r\nSELECT * FROM secret';
    const res = await request('http://localhost:3000/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: dirtyQuery, category: 'papers' })
    });
    return {
      ok: res.status === 200 && Array.isArray(res.body?.results),
      status: res.status,
      notes: `Returned ${res.body?.results?.length ?? 0} results`
    };
  });

  // 6. Unicode Emoji & Multilingual stress
  await runTest('Edge: Complex Multilingual and Emoji query', async () => {
    const complexQuery = '🚀 🌌 宇宙 银河 Astronomía & Relativité générale 💫';
    const res = await request('http://localhost:3000/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: complexQuery, category: 'all' })
    });
    return {
      ok: res.status === 200 && Array.isArray(res.body?.results),
      status: res.status,
      notes: `Returned ${res.body?.results?.length ?? 0} results`
    };
  });

  // 7. Negative & Fractional Page Numbers
  await runTest('Edge: Negative & Fractional Page Number', async () => {
    const res = await request('http://localhost:3000/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'planet', category: 'images', page: -99.5, pageSize: -20 })
    });
    return {
      ok: res.status === 200 && res.body?.page === 1 && res.body?.pageSize >= 6,
      status: res.status,
      notes: `Clamped to page=${res.body?.page}, pageSize=${res.body?.pageSize}`
    };
  });

  // 8. Enormous Page Number Overflow
  await runTest('Edge: Page Number Overflow (page=9999999)', async () => {
    const res = await request('http://localhost:3000/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'ocean', category: 'videos', page: 9999999, pageSize: 24 })
    });
    return {
      ok: res.status === 200 && Array.isArray(res.body?.results) && res.body.results.length === 0,
      status: res.status,
      notes: `Empty result slice returned cleanly`
    };
  });

  // 9. Huge PageSize Clamping
  await runTest('Edge: Huge PageSize Clamping (pageSize=1000000)', async () => {
    const res = await request('http://localhost:3000/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'nature', category: 'images', pageSize: 1000000 })
    });
    return {
      ok: res.status === 200 && res.body?.pageSize <= 100,
      status: res.status,
      notes: `Clamped to safe pageSize=${res.body?.pageSize}`
    };
  });

  // 10. Header Injection / CRLF in Download Filename
  await runTest('Security: CRLF / Header Injection in Download Filename', async () => {
    const evilFilename = 'test.png\r\nEvil-Header: Pwned\r\n\r\n<script>alert(1)</script>';
    const res = await request(`http://localhost:3000/api/download-proxy?url=https://images.unsplash.com/photo-1451187580459-43490279c0fa&filename=${encodeURIComponent(evilFilename)}`);
    const disp = res.headers['content-disposition'] || '';
    const hasCrlf = disp.includes('\r') || disp.includes('\n');
    return {
      ok: !hasCrlf,
      status: res.status,
      notes: `Disposition: ${disp}`
    };
  });

  // 11. Concurrency: 12 Simultaneous Requests to New Uncached Query (Thundering Herd)
  await runTest('Concurrency: 12 Parallel Searches for Same Uncached Query', async () => {
    const uniqueQuery = `stress_${Date.now()}_supernova`;
    const promises = Array.from({ length: 12 }, () =>
      request('http://localhost:3000/api/v1/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: uniqueQuery, category: 'images' })
      })
    );
    const responses = await Promise.all(promises);
    const all200 = responses.every(r => r.status === 200 && Array.isArray(r.body?.results));
    const firstCount = responses[0].body?.results?.length;
    const consistent = responses.every(r => r.body?.results?.length === firstCount);
    return {
      ok: all200 && consistent,
      status: 200,
      notes: `All 12 completed 200 OK with ${firstCount} items each`
    };
  });

  // 12. Non-String Types Injection in Search Body
  await runTest('Type Safety: Object/Array Injection in Query Field', async () => {
    const res = await request('http://localhost:3000/api/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { $gt: '' }, category: ['images', 'art'] })
    });
    return {
      ok: res.status === 200 && Array.isArray(res.body?.results),
      status: res.status,
      notes: `Handled non-string query safely`
    };
  });

  // 13. System Health & Stats under load
  await runTest('System Health Under Load', async () => {
    const res = await request('http://localhost:3000/api/health');
    const stats = await request('http://localhost:3000/api/v1/system/cache-stats');
    return {
      ok: res.status === 200 && stats.status === 200 && typeof stats.body?.cachedQueries === 'number',
      status: res.status,
      notes: `Cached queries in store: ${stats.body?.cachedQueries}`
    };
  });

  // Final Summary
  const failures = results.filter(r => !r.ok);
  console.log(`\n=== TEST SUITE COMPLETED: ${results.length} Tests, ${failures.length} Failures ===`);
  if (failures.length > 0) {
    console.log('Failing tests:', failures.map(f => f.name));
  }
}

runHardTests().catch(console.error);
