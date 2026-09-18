/**
 * Regressive Test Suite for Universal Media Browser
 */
async function testEndpoint(name: string, url: string, options?: RequestInit) {
  const start = Date.now();
  try {
    const res = await fetch(url, options);
    const duration = Date.now() - start;
    const isJson = res.headers.get('content-type')?.includes('application/json');
    let body: any = null;
    if (isJson) {
      body = await res.json();
    } else {
      body = await res.text();
    }
    const list = Array.isArray(body?.results) ? body.results : (Array.isArray(body?.items) ? body.items : null);
    return {
      name,
      status: res.status,
      ok: res.ok,
      duration,
      dataType: isJson ? 'json' : typeof body,
      itemCount: list ? list.length : undefined,
      error: body?.error,
      providers: body?.providersContacted,
      body: isJson ? (list ? { count: list.length, sample: list[0] } : body) : body.slice(0, 100)
    };
  } catch (err: any) {
    return {
      name,
      status: 0,
      ok: false,
      duration: Date.now() - start,
      error: err.message
    };
  }
}

async function runAllTests() {
  console.log('=== RUNNING REGRESSION TESTS ===\n');
  const results: any[] = [];

  // 1. Health check
  results.push(await testEndpoint('Health Check', 'http://localhost:3000/api/health'));

  // 2. System Providers
  results.push(await testEndpoint('System Providers', 'http://localhost:3000/api/v1/system/providers'));

  // 3. System Cache Stats
  results.push(await testEndpoint('Cache Stats', 'http://localhost:3000/api/v1/system/cache-stats'));

  // 4. Search V1: category=all, query="space"
  results.push(await testEndpoint('Search V1 (All: space)', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'space', category: 'all' })
  }));

  // 5. Search V1: category=video, query="ocean"
  results.push(await testEndpoint('Search V1 (Video: ocean)', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'ocean', category: 'video' })
  }));

  // 6. Search V1: category=books, query="sherlock holmes"
  results.push(await testEndpoint('Search V1 (Books: sherlock holmes)', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'sherlock holmes', category: 'books' })
  }));

  // 7. Search V1: category=images, query="flower"
  results.push(await testEndpoint('Search V1 (Images: flower)', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'flower', category: 'images' })
  }));

  // 8. Search V1: category=audio, query="piano"
  results.push(await testEndpoint('Search V1 (Audio: piano)', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'piano', category: 'audio' })
  }));

  // 9. Search V1: category=papers, query="relativity"
  results.push(await testEndpoint('Search V1 (Papers: relativity)', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'relativity', category: 'papers' })
  }));

  // 10. Search V1: category=knowledge, query="einstein"
  results.push(await testEndpoint('Search V1 (Knowledge: einstein)', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'einstein', category: 'knowledge' })
  }));

  // 11. Search Legacy GET: /api/search?q=space&category=all
  results.push(await testEndpoint('Search Legacy GET', 'http://localhost:3000/api/search?q=space&category=all'));

  // 12. Edge Case: Empty Query
  results.push(await testEndpoint('Edge Case: Empty Query', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '', category: 'all' })
  }));

  // 13. Edge Case: Special characters
  results.push(await testEndpoint('Edge Case: Special chars', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'c++ & c# <script> "test" 100%', category: 'all' })
  }));

  // 14. Edge Case: Invalid Category
  results.push(await testEndpoint('Edge Case: Invalid Category', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'test', category: 'non_existent_xyz' })
  }));

  // 15. Image Proxy Test: safe URL
  results.push(await testEndpoint('Image Proxy (Valid)', 'http://localhost:3000/api/image-proxy?url=' + encodeURIComponent('https://images.unsplash.com/photo-1579783900882-c0d3dad7b119')));

  // 16. Image Proxy Test: Invalid/Missing URL
  results.push(await testEndpoint('Image Proxy (Missing URL)', 'http://localhost:3000/api/image-proxy'));

  // 17. Download Proxy Test: Missing URL
  results.push(await testEndpoint('Download Proxy (Missing URL)', 'http://localhost:3000/api/download-proxy'));

  // 18. Normalization Test: Singular 'image'
  results.push(await testEndpoint('Category Normalization (image)', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'nebula', category: 'image' })
  }));

  // 19. Normalization Test: Singular 'book'
  results.push(await testEndpoint('Category Normalization (book)', 'http://localhost:3000/api/v1/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'pride and prejudice', category: 'book' })
  }));

  // 20. Poll Background Job
  results.push(await testEndpoint('Poll Background Job', 'http://localhost:3000/api/v1/search/poll-background', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'space', category: 'all', knownCount: 0 })
  }));

  // 21. Fetch Deep Job Trigger
  results.push(await testEndpoint('Fetch Deep Trigger', 'http://localhost:3000/api/v1/search/fetch-deep', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'space', category: 'all' })
  }));

  // 22. Content Photo Endpoint
  results.push(await testEndpoint('Content Photo Resolver', 'http://localhost:3000/api/v1/content-photo?q=astronomy&category=images'));

  // Output test results
  let failures = 0;
  for (const r of results) {
    const isExpected = r.ok || (r.name.includes('Missing URL') && (r.status === 400 || r.status === 200)) || (r.name.includes('Invalid Category') && (r.status === 200 || r.status === 400));
    console.log(`[${isExpected ? 'PASS' : 'FAIL'}] ${r.name} (Status: ${r.status}, Time: ${r.duration}ms, Items: ${r.itemCount ?? 'N/A'})`);
    if (!isExpected) {
      console.log(`  Error: ${r.error || JSON.stringify(r.body)}`);
      failures++;
    }
  }

  console.log(`\nTests completed. Total: ${results.length}, Failures: ${failures}`);
}

runAllTests().catch(console.error);
