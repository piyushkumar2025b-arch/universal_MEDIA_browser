import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'github',
  name: 'GitHub Repositories',
  category: 'Code',
  rateLimit: '60 req/hr (10/min search unauth)',
  authRequired: false,
  authConfigured: Boolean(process.env.GITHUB_TOKEN)
});

registerTracker({
  id: 'npm',
  name: 'npm Package Registry',
  category: 'Code',
  rateLimit: 'Unlimited / Open',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'hn_code',
  name: 'Hacker News Open Tech & Code',
  category: 'Code',
  rateLimit: '10,000 req/hr (Free Algolia API)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'crates_io',
  name: 'Crates.io (Rust Package Registry)',
  category: 'Code',
  rateLimit: 'Open (1 req/sec with User-Agent)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'gitlab',
  name: 'GitLab Open Source Projects',
  category: 'Code',
  rateLimit: 'Open API (Unauthenticated & Token-Optional)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'cdnjs',
  name: 'cdnjs (Cloudflare Open Web Libraries Index)',
  category: 'Code',
  rateLimit: 'Open API (Unlimited / CDN-backed)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'docker_hub',
  name: 'Docker Hub Container Image Registry',
  category: 'Code & Containers',
  rateLimit: 'Open Public API (Unlimited Search)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'pypi',
  name: 'PyPI (Python Package Index)',
  category: 'Code & Python',
  rateLimit: 'Open Registry JSON API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'rubygems',
  name: 'RubyGems (Ruby Open Source Registry)',
  category: 'Code & Ruby',
  rateLimit: 'Open Public REST API (Unlimited)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'packagist',
  name: 'Packagist (PHP Composer Registry)',
  category: 'Code & PHP',
  rateLimit: 'Open Public Search API (Unlimited)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'homebrew',
  name: 'Homebrew Formulae (Open Source Software)',
  category: 'Code & CLI',
  rateLimit: 'CDN-Cached Open API (Unlimited)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'maven_central',
  name: 'Maven Central (Java / Kotlin / JVM Package Registry)',
  category: 'Code & JVM',
  rateLimit: 'Open Solr Search API (Unlimited)',
  authRequired: false,
  authConfigured: true
});

// 1. GitHub Repositories
export async function queryGitHub(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=12&sort=stars`;
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github.v3+json'
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('github', Date.now() - start);

    return (data.items || []).map((repo: any) =>
      buildResourceItem({
        id: `gh-${repo.id}`,
        title: repo.full_name,
        category: 'code',
        description: repo.description || undefined,
        previewUrl: repo.html_url,
        downloadUrl: `${repo.html_url}/archive/refs/heads/${repo.default_branch || 'main'}.zip`,
        thumbnailUrl: repo.owner?.avatar_url,
        providerId: 'github',
        providerName: 'GitHub',
        resourceUrl: repo.html_url,
        externalId: String(repo.id),
        creatorName: repo.owner?.login,
        creatorProfileUrl: repo.owner?.html_url,
        rawLicense: repo.license?.name || repo.license?.spdx_id || 'Open Source License',
        licenseUrl: repo.license?.url || undefined,
        attributes: {
          format: 'git/zip',
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          quality: 'Original',
          tags: [repo.language, `⭐ ${repo.stargazers_count}`, repo.license?.spdx_id].filter(Boolean)
        }
      })
    );
  } catch (err: any) {
    recordProviderFailure('github', err.message);
    return [];
  }
}

// 2. npm Registry
export async function queryNpm(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=12`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('npm', Date.now() - start);

    return (data.objects || []).map((obj: any) => {
      const pkg = obj.package || {};
      return buildResourceItem({
        id: `npm-${pkg.name?.replace('/', '-')}`,
        title: `${pkg.name} (v${pkg.version})`,
        category: 'code',
        description: pkg.description || undefined,
        previewUrl: pkg.links?.npm || `https://www.npmjs.com/package/${pkg.name}`,
        downloadUrl: pkg.links?.repository || pkg.links?.npm,
        providerId: 'npm',
        providerName: 'npm Registry',
        resourceUrl: pkg.links?.npm || `https://www.npmjs.com/package/${pkg.name}`,
        externalId: pkg.name,
        creatorName: pkg.publisher?.username || pkg.author?.name,
        rawLicense: pkg.license ? `${pkg.license} License` : 'Open Source Package',
        attributes: {
          format: 'tgz/npm',
          version: pkg.version,
          language: 'JavaScript/TypeScript',
          tags: (pkg.keywords || []).slice(0, 4),
          quality: 'Original'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('npm', err.message);
    return [];
  }
}

// 3. Hacker News Open Tech & Code Showcase
export async function queryHackerNewsCode(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('hn_code', Date.now() - start);

    return (data.hits || [])
      .filter((hit: any) => hit.title && (hit.url || hit.story_text || hit.objectID))
      .map((hit: any) => {
        const targetUrl = hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`;
        const isGitHub = targetUrl.includes('github.com');
        return buildResourceItem({
          id: `hn-${hit.objectID}`,
          title: hit.title,
          category: 'code',
          description: `${hit.points || 0} points • ${hit.num_comments || 0} comments • Shared by ${hit.author || 'contributor'}`,
          previewUrl: targetUrl,
          downloadUrl: isGitHub ? `${targetUrl}/archive/refs/heads/main.zip` : targetUrl,
          providerId: 'hn_code',
          providerName: 'Hacker News Open Tech & Code',
          resourceUrl: `https://news.ycombinator.com/item?id=${hit.objectID}`,
          externalId: hit.objectID,
          creatorName: hit.author || 'HN Contributor',
          rawLicense: 'Open Web / Public Tech Reference',
          licenseUrl: 'https://news.ycombinator.com',
          attributes: {
            format: isGitHub ? 'git' : 'article/code',
            quality: hit.points > 100 ? 'Original' : 'High',
            tags: ['Hacker News', isGitHub ? 'GitHub Repository' : 'Tech Story', `▲ ${hit.points || 0}`]
          }
        });
      });
  } catch (err: any) {
    recordProviderFailure('hn_code', err.message);
    return [];
  }
}

// 4. Crates.io (The Official Rust Package Registry)
export async function queryCratesIo(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://crates.io/api/v1/crates?q=${encodeURIComponent(query)}&per_page=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'URMIL-Universal-Browser/1.0 (contact: team@urmil.org)' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('crates_io', Date.now() - start);

    return (data.crates || []).map((crate: any) => {
      const pageUrl = `https://crates.io/crates/${crate.id}`;
      const docUrl = crate.documentation || `https://docs.rs/${crate.id}`;
      const downloadUrl = `https://static.crates.io/crates/${crate.id}/${crate.id}-${crate.max_version || crate.newest_version}.crate`;

      return buildResourceItem({
        id: `crate-${crate.id}`,
        title: `${crate.name} v${crate.max_version || crate.newest_version || '1.0'}`,
        category: 'code',
        description: crate.description ? `${crate.description} (${(crate.downloads || 0).toLocaleString()} total downloads)` : `Rust library crate with ${(crate.downloads || 0).toLocaleString()} downloads.`,
        previewUrl: pageUrl,
        downloadUrl,
        providerId: 'crates_io',
        providerName: 'Crates.io Rust Registry',
        resourceUrl: pageUrl,
        externalId: crate.id,
        creatorName: 'Rust Community',
        rawLicense: crate.license || 'MIT OR Apache-2.0',
        licenseUrl: 'https://crates.io',
        attributes: {
          format: 'crate/tar.gz',
          version: crate.max_version || crate.newest_version,
          repository: crate.repository,
          documentation: docUrl,
          downloads: crate.downloads,
          quality: 'Original',
          tags: ['Rust', 'Crates.io', 'Cargo', `v${crate.max_version || crate.newest_version}`]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('crates_io', err.message);
    return [];
  }
}

// 5. GitLab Open Source Projects
export async function queryGitLab(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://gitlab.com/api/v4/projects?search=${encodeURIComponent(query)}&per_page=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const projects = await res.json();
    recordProviderSuccess('gitlab', Date.now() - start);

    const items = (Array.isArray(projects) ? projects : []).map((proj: any) => {
      const branch = proj.default_branch || 'main';
      const downloadZip = proj.http_url_to_repo
        ? `${proj.web_url}/-/archive/${branch}/${proj.name}-${branch}.zip`
        : proj.web_url;

      return buildResourceItem({
        id: `gl-${proj.id}`,
        title: proj.name_with_namespace || proj.name,
        category: 'code',
        description: proj.description || `GitLab open source project with ★ ${proj.star_count || 0} stars and ${proj.forks_count || 0} forks.`,
        previewUrl: proj.web_url,
        downloadUrl: downloadZip,
        thumbnailUrl: proj.avatar_url || undefined,
        providerId: 'gitlab',
        providerName: 'GitLab Open Source',
        resourceUrl: proj.web_url,
        externalId: String(proj.id),
        creatorName: proj.namespace?.name || 'GitLab Community',
        creatorProfileUrl: proj.namespace?.web_url,
        rawLicense: 'Open Source License',
        licenseUrl: proj.web_url,
        attributes: {
          format: 'git/zip',
          stars: proj.star_count,
          forks: proj.forks_count,
          branch,
          quality: (proj.star_count || 0) > 10 ? 'High' : 'Standard',
          tags: ['GitLab', 'Open Source', `★ ${proj.star_count || 0}`, ...(proj.tag_list || [])].slice(0, 5)
        }
      });
    });
    if (items.length > 0) return items;
    return await queryGitHub(query);
  } catch (err: any) {
    recordProviderFailure('gitlab', err.message);
    return await queryGitHub(query);
  }
}

// 6. cdnjs (Cloudflare Open Source Libraries)
export async function queryCdnjs(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.cdnjs.com/libraries?search=${encodeURIComponent(query)}&fields=version,description,homepage,author&limit=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('cdnjs', Date.now() - start);

    return (data.results || []).map((lib: any) => {
      const pageUrl = lib.homepage || `https://cdnjs.com/libraries/${lib.name}`;
      const cdnUrl = lib.latest || `https://cdnjs.cloudflare.com/ajax/libs/${lib.name}/${lib.version}/${lib.name}.min.js`;

      return buildResourceItem({
        id: `cdnjs-${lib.name}`,
        title: `${lib.name} (v${lib.version || 'latest'})`,
        category: 'code',
        description: lib.description || `Open source web library hosted on cdnjs global CDN.`,
        previewUrl: pageUrl,
        downloadUrl: cdnUrl,
        providerId: 'cdnjs',
        providerName: 'cdnjs Web Libraries',
        resourceUrl: pageUrl,
        externalId: lib.name,
        creatorName: lib.author || 'Open Source Community',
        rawLicense: 'MIT / Open Source',
        licenseUrl: pageUrl,
        attributes: {
          format: 'javascript/cdn',
          version: lib.version,
          repository: pageUrl,
          documentation: `https://cdnjs.com/libraries/${lib.name}`,
          quality: 'Original CDN Script',
          tags: ['cdnjs', 'JavaScript', 'Frontend', 'CDN', lib.name]
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('cdnjs', err.message);
    return [];
  }
}

// 7. Docker Hub Container Image Registry
export async function queryDockerHub(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'ubuntu';
  const url = `https://hub.docker.com/v2/search/repositories/?query=${encodeURIComponent(clean)}&page_size=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('docker_hub', Date.now() - start);

    return (data.results || []).map((repo: any) => {
      const name = repo.repo_name;
      const isOfficial = repo.is_official;
      const stars = repo.star_count ?? 0;
      const pulls = repo.pull_count ? (typeof repo.pull_count === 'number' ? repo.pull_count.toLocaleString() : repo.pull_count) : '10K+';
      const hubUrl = isOfficial ? `https://hub.docker.com/_/${name}` : `https://hub.docker.com/r/${name}`;
      const pullCmd = `docker pull ${name}`;

      return buildResourceItem({
        id: `docker-${name.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
        title: `${name} ${isOfficial ? '★ Official Docker Image' : ''}`,
        category: 'code',
        description: repo.short_description || `Container image on Docker Hub (${pulls} pulls, ${stars} stars). Command: ${pullCmd}`,
        previewUrl: hubUrl,
        downloadUrl: hubUrl,
        providerId: 'docker_hub',
        providerName: 'Docker Hub Registry',
        resourceUrl: hubUrl,
        externalId: name,
        creatorName: isOfficial ? 'Docker Official Library' : (name.split('/')[0] || 'Community Contributor'),
        rawLicense: 'Open Source Container Image',
        licenseUrl: hubUrl,
        attributes: {
          format: 'docker/container-image',
          repository: hubUrl,
          documentation: hubUrl,
          quality: isOfficial ? 'Verified Official Container Image' : 'Community Image',
          stars,
          tags: ['Docker', 'Container', isOfficial ? 'Official' : 'Community', name.split('/')[0]].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('docker_hub', err.message);
    return [];
  }
}

// 8. PyPI (Python Package Index)
export async function queryPyPI(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim().toLowerCase().replace(/\s+/g, '-');
  if (!clean) return [];

  // Try direct package name first
  try {
    const directUrl = `https://pypi.org/pypi/${encodeURIComponent(clean)}/json`;
    const res = await fetch(directUrl, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      const data = await res.json();
      recordProviderSuccess('pypi', Date.now() - start);
      const info = data.info || {};
      const name = info.name || clean;
      const ver = info.version || 'latest';
      const summary = info.summary || `Python package available on PyPI. Command: pip install ${name}`;
      const pkgUrl = info.project_url || info.package_url || `https://pypi.org/project/${name}/`;
      const author = info.author || info.maintainer || 'Python Package Developer';
      const license = info.license || 'OSI Approved';

      return [
        buildResourceItem({
          id: `pypi-${name}`,
          title: `${name} (v${ver})`,
          category: 'code',
          description: `${summary} • pip install ${name}`,
          previewUrl: pkgUrl,
          downloadUrl: (data.urls && data.urls[0]?.url) || pkgUrl,
          providerId: 'pypi',
          providerName: 'Python Package Index (PyPI)',
          resourceUrl: pkgUrl,
          externalId: name,
          creatorName: author,
          rawLicense: license,
          licenseUrl: pkgUrl,
          attributes: {
            format: 'python/wheel-tarball',
            version: ver,
            repository: info.project_urls?.Source || info.project_urls?.Homepage || pkgUrl,
            documentation: info.project_urls?.Documentation || pkgUrl,
            quality: 'Official Python Package Index Release',
            tags: ['PyPI', 'Python', 'pip', name]
          }
        })
      ];
    }
  } catch (err: any) {
    recordProviderFailure('pypi', err.message);
    return [];
  }

  // Not found is not an infrastructure failure, simply 0 items
  return [];
}

// 9. RubyGems (Ruby Open Source Packages)
export async function queryRubyGems(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'rails');
  const url = `https://rubygems.org/api/v1/search.json?query=${clean}`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('rubygems', Date.now() - start);

    if (!Array.isArray(data)) return [];

    const items = data.slice(0, 15);
    return items.map((gem: any) => {
      const name = gem.name;
      const desc = gem.info || 'Ruby Gem open source package';
      const ver = gem.version || 'latest';
      const authors = gem.authors || 'Ruby Developer';
      const licenses = (gem.licenses || []).join(', ') || 'MIT / Open Source';
      const resourceUrl = gem.project_uri || `https://rubygems.org/gems/${name}`;
      const downloadUrl = gem.gem_uri || resourceUrl;

      return buildResourceItem({
        id: `rubygem-${name}`,
        title: `${name} (v${ver})`,
        category: 'code',
        description: `${desc.substring(0, 250)} • gem install ${name} • Downloads: ${gem.downloads?.toLocaleString() || '1,000+'}.`,
        previewUrl: resourceUrl,
        downloadUrl,
        providerId: 'rubygems',
        providerName: 'RubyGems Registry',
        resourceUrl,
        externalId: name,
        creatorName: authors,
        rawLicense: licenses,
        licenseUrl: gem.source_code_uri || resourceUrl,
        providerDefaultLicense: {
          type: 'Open Source',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'ruby/gem',
          version: ver,
          repository: gem.source_code_uri || gem.homepage_uri || resourceUrl,
          documentation: gem.documentation_uri || resourceUrl,
          quality: 'Official RubyGems Index Package',
          tags: ['Ruby', 'Gem', 'Open Source', name].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('rubygems', err.message);
    return [];
  }
}

// 10. Packagist (PHP Composer Packages)
export async function queryPackagist(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'monolog');
  const url = `https://packagist.org/search.json?q=${clean}&per_page=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('packagist', Date.now() - start);

    const items = data.results || [];
    return items.map((pkg: any) => {
      const name = pkg.name;
      const desc = pkg.description || 'PHP Composer package';
      const resourceUrl = pkg.url || `https://packagist.org/packages/${name}`;
      const repoUrl = pkg.repository || resourceUrl;

      return buildResourceItem({
        id: `packagist-${name.replace('/', '-')}`,
        title: name,
        category: 'code',
        description: `${desc.substring(0, 250)} • composer require ${name} • Total Downloads: ${pkg.downloads?.toLocaleString() || '1,000+'}.`,
        previewUrl: resourceUrl,
        downloadUrl: repoUrl,
        providerId: 'packagist',
        providerName: 'Packagist (PHP)',
        resourceUrl,
        externalId: name,
        creatorName: name.split('/')[0] || 'PHP Maintainer',
        rawLicense: 'Open Source / Composer Package',
        licenseUrl: resourceUrl,
        providerDefaultLicense: {
          type: 'Open Source',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'php/composer',
          repository: repoUrl,
          quality: 'Verified Packagist Package',
          tags: ['PHP', 'Composer', 'Packagist', name].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('packagist', err.message);
    return [];
  }
}

// 11. Homebrew Formulae (Open Source CLI & Software)
export async function queryHomebrew(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (!clean) return [];

  try {
    const url = `https://formulae.brew.sh/api/formula/${encodeURIComponent(clean)}.json`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      const f = await res.json();
      recordProviderSuccess('homebrew', Date.now() - start);

      const name = f.name;
      const desc = f.desc || 'Homebrew formula package';
      const ver = f.versions?.stable || 'latest';
      const license = f.license || 'Open Source';
      const homepage = f.homepage || `https://formulae.brew.sh/formula/${name}`;
      const resourceUrl = `https://formulae.brew.sh/formula/${name}`;

      return [
        buildResourceItem({
          id: `brew-${name}`,
          title: `${name} (brew formula)`,
          category: 'code',
          description: `${desc} • brew install ${name} • Stable: ${ver}. License: ${license}.`,
          previewUrl: resourceUrl,
          downloadUrl: homepage,
          providerId: 'homebrew',
          providerName: 'Homebrew Formulae',
          resourceUrl,
          externalId: name,
          creatorName: 'Homebrew & OSS Maintainers',
          rawLicense: license,
          licenseUrl: resourceUrl,
          providerDefaultLicense: {
            type: 'Open Source',
            commercialAllowed: true,
            attributionRequired: true
          },
          attributes: {
            format: 'cli/brew-formula',
            version: ver,
            repository: f.urls?.stable?.url || homepage,
            documentation: resourceUrl,
            quality: 'Official Homebrew Formula',
            tags: ['Homebrew', 'CLI', 'macOS', 'Linux', name].filter(Boolean)
          }
        })
      ];
    }
  } catch (err: any) {
    recordProviderFailure('homebrew', err.message);
    return [];
  }

  return [];
}

/**
 * Maven Central - Central Repository for Java, Kotlin, Scala, and Android
 * Solr REST Search API
 */
export async function queryMavenCentral(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://search.maven.org/solrsearch/select?q=${encodeURIComponent(query)}&rows=12&wt=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('maven_central', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const g = doc.g || '';
      const a = doc.a || '';
      const version = doc.latestVersion || doc.v || 'latest';
      const packageId = `${g}:${a}`;
      const repoUrl = `https://central.sonatype.com/artifact/${encodeURIComponent(g)}/${encodeURIComponent(a)}/${encodeURIComponent(version)}`;
      const jarUrl = `https://repo1.maven.org/maven2/${g.replace(/\./g, '/')}/${a}/${version}/${a}-${version}.jar`;

      return buildResourceItem({
        id: `maven-${doc.id || packageId}`,
        title: `${packageId} (${version})`,
        category: 'code',
        description: `JVM Package: ${packageId} • Latest Version: ${version} • Packaging: ${doc.p || 'jar'} • Available on Maven Central & Gradle.`,
        previewUrl: repoUrl,
        downloadUrl: jarUrl,
        providerId: 'maven_central',
        providerName: 'Maven Central Repository',
        resourceUrl: repoUrl,
        externalId: packageId,
        creatorName: g,
        creatorOrg: 'Sonatype / Apache Maven Central',
        rawLicense: 'Open Source (Apache 2.0 / MIT / BSD / GPL)',
        licenseUrl: 'https://central.sonatype.com/',
        providerDefaultLicense: {
          type: 'Open Source',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'jvm/artifact',
          version,
          repository: repoUrl,
          documentation: `https://javadoc.io/doc/${g}/${a}/${version}`,
          quality: 'Verified Maven Central Artifact',
          tags: ['Maven', 'Java', 'Kotlin', 'JVM', 'Gradle', a].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('maven_central', err.message);
    return [];
  }
}




