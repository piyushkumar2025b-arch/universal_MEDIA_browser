import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; mailto:team@urmil.org)';

registerTracker({
  id: 'openalex',
  name: 'OpenAlex Scholarly Graph',
  category: 'Research',
  rateLimit: '100,000 req/day (Free Open)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'crossref',
  name: 'Crossref',
  category: 'Research',
  rateLimit: 'Polite (50 req/sec)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'arxiv',
  name: 'arXiv',
  category: 'Research',
  rateLimit: '1 req/3sec (Polite)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'pubmed',
  name: 'PubMed / NCBI',
  category: 'Research',
  rateLimit: '3 req/sec',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'europe_pmc',
  name: 'Europe PMC',
  category: 'Research',
  rateLimit: 'Polite',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'zenodo',
  name: 'Zenodo (CERN)',
  category: 'Research',
  rateLimit: '60 req/min',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'plos',
  name: 'PLOS Open Access',
  category: 'Research',
  rateLimit: 'Open Public API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'doaj',
  name: 'Directory of Open Access Journals (DOAJ)',
  category: 'Research',
  rateLimit: 'Open Public API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'europe_pmc',
  name: 'Europe PMC Life Sciences & Biomedical Research',
  category: 'Research',
  rateLimit: 'Open EBI Public API (40M+ articles)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'inspire_hep',
  name: 'INSPIRE-HEP & CERN High-Energy Physics',
  category: 'Research',
  rateLimit: 'Open Literature API (CERN/DESY/Fermilab/SLAC)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'hal_open_science',
  name: 'HAL Open Science (National Multi-Disciplinary Archive)',
  category: 'Research',
  rateLimit: 'Open REST API (French National Research)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'ncbi_pmc',
  name: 'PubMed Central (PMC) Full-Text Research',
  category: 'Biomedical & Life Sciences',
  rateLimit: 'Open NCBI E-Utilities API (Free Public Access)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'nasa_ntrs',
  name: 'NASA Technical Reports Server (NTRS)',
  category: 'Aerospace & Physical Sciences',
  rateLimit: 'Open NASA Public API (500k+ Reports)',
  authRequired: false,
  authConfigured: true
});

// 1. OpenAlex (Rich scholarly works)
export async function queryOpenAlex(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=15&mailto=team@urmil.org`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('openalex', Date.now() - start);

    return (data.results || []).map((work: any) => {
      const primaryLocation = work.primary_location || {};
      const oaUrl = work.open_access?.oa_url || primaryLocation.pdf_url || primaryLocation.landing_page_url;
      const authors = (work.authorships || []).map((a: any) => a.author?.display_name).filter(Boolean).slice(0, 3).join(', ');

      return buildResourceItem({
        id: `openalex-${work.id?.replace('https://openalex.org/', '')}`,
        title: work.title || 'Scholarly Publication',
        category: 'papers',
        description: work.abstract_inverted_index ? 'Peer-reviewed research work indexed in OpenAlex open graph.' : undefined,
        downloadUrl: oaUrl || work.doi,
        previewUrl: work.doi || primaryLocation.landing_page_url,
        providerId: 'openalex',
        providerName: 'OpenAlex Scholarly Graph',
        resourceUrl: work.doi || work.id,
        externalId: work.id,
        creatorName: authors || 'Scholarly Authors',
        creatorOrg: work.primary_location?.source?.display_name,
        rawLicense: work.open_access?.is_oa ? 'Open Access' : 'Scholarly Publication',
        licenseUrl: primaryLocation.license ? `https://spdx.org/licenses/${primaryLocation.license}` : undefined,
        providerDefaultLicense: {
          type: 'Open Access',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'pdf',
          doi: work.doi?.replace('https://doi.org/', ''),
          year: work.publication_year,
          citations: work.cited_by_count,
          journal: work.primary_location?.source?.display_name,
          pdfUrl: oaUrl,
          quality: work.open_access?.is_oa ? 'Original' : 'HD',
          tags: (work.concepts || []).slice(0, 4).map((c: any) => c.display_name)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('openalex', err.message);
    return [];
  }
}

// 2. Crossref
export async function queryCrossref(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=15&mailto=team@urmil.org`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(7000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('crossref', Date.now() - start);

    const items = data.message?.items || [];
    return items.map((w: any) => {
      const authors = (w.author || []).map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).filter(Boolean).slice(0, 3).join(', ');
      const title = Array.isArray(w.title) ? w.title[0] : (w.title || 'Scholarly Paper');
      const year = w.published?.['date-parts']?.[0]?.[0] || w.created?.['date-parts']?.[0]?.[0];

      return buildResourceItem({
        id: `crossref-${w.DOI ? w.DOI.replace(/[^a-zA-Z0-9]/g, '-') : Math.random().toString(36).substring(7)}`,
        title,
        category: 'papers',
        description: w.abstract ? w.abstract.replace(/<[^>]+>/g, '').substring(0, 350) + '...' : undefined,
        previewUrl: w.URL || (w.DOI ? `https://doi.org/${w.DOI}` : undefined),
        downloadUrl: w.link?.[0]?.URL || w.URL,
        providerId: 'crossref',
        providerName: 'Crossref',
        resourceUrl: w.URL || `https://doi.org/${w.DOI}`,
        externalId: w.DOI,
        creatorName: authors || undefined,
        creatorOrg: w['container-title']?.[0] || w.publisher,
        rawLicense: w.license?.[0]?.URL ? 'Open Access / Publisher License' : 'Peer-Reviewed Research',
        licenseUrl: w.license?.[0]?.URL,
        attributes: {
          format: 'pdf',
          doi: w.DOI,
          year: year ? Number(year) : undefined,
          citations: w['is-referenced-by-count'],
          journal: w['container-title']?.[0],
          quality: 'Original'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('crossref', err.message);
    return [];
  }
}

// 3. arXiv
export async function queryArxiv(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=12`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(1800) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    const items: ResourceItem[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1];
      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
      const rawId = idMatch ? idMatch[1].trim() : '';
      const cleanId = rawId.split('/abs/').pop() || rawId;
      const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'arXiv Preprint';

      items.push(
        buildResourceItem({
          id: `arxiv-${cleanId.replace(/[^a-zA-Z0-9]/g, '-')}`,
          title,
          category: 'papers',
          description: summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim().substring(0, 300) + '...' : undefined,
          previewUrl: rawId,
          downloadUrl: `https://arxiv.org/pdf/${cleanId}.pdf`,
          providerId: 'arxiv',
          providerName: 'arXiv',
          resourceUrl: rawId,
          externalId: cleanId,
          rawLicense: 'Open Access (arXiv Pre-print Repository)',
          licenseUrl: 'https://arxiv.org/help/license',
          providerDefaultLicense: {
            type: 'Open Access',
            commercialAllowed: true,
            attributionRequired: true
          },
          attributes: {
            format: 'pdf',
            year: publishedMatch ? new Date(publishedMatch[1]).getFullYear() : undefined,
            pdfUrl: `https://arxiv.org/pdf/${cleanId}.pdf`,
            quality: 'Original'
          }
        })
      );
    }
    if (items.length > 0) {
      recordProviderSuccess('arxiv', Date.now() - start);
      return items;
    }
    throw new Error('No arXiv XML entries parsed');
  } catch (err: any) {
    recordProviderFailure('arxiv', err.message);
    // Tunnel/Proxy via InspireHEP arXiv mirror
    try {
      const proxyUrl = `https://inspirehep.net/api/literature?q=${encodeURIComponent(query)}&size=15`;
      const pRes = await fetch(proxyUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(4500) });
      if (pRes.ok) {
        const pData = await pRes.json();
        const hits = pData.hits?.hits || [];
        if (hits.length > 0) {
          recordProviderSuccess('arxiv', Date.now() - start);
          return hits.map((hit: any) => {
            const meta = hit.metadata || {};
            const arxivEprint = meta.arxiv_eprints?.[0]?.value || hit.id;
            const title = meta.titles?.[0]?.title || 'arXiv Research Paper';
            const authors = (meta.authors || []).map((a: any) => a.full_name).slice(0, 3).join(', ') || 'arXiv Researchers';
            const abstract = meta.abstracts?.[0]?.value ? meta.abstracts[0].value.replace(/\s+/g, ' ').substring(0, 300) + '...' : undefined;
            const absUrl = `https://arxiv.org/abs/${arxivEprint}`;
            const pdfUrl = `https://arxiv.org/pdf/${arxivEprint}.pdf`;

            return buildResourceItem({
              id: `arxiv-${String(arxivEprint).replace(/[^a-zA-Z0-9]/g, '-')}`,
              title,
              category: 'papers',
              description: abstract || `arXiv Open Access preprint. Authors: ${authors}`,
              previewUrl: absUrl,
              downloadUrl: pdfUrl,
              providerId: 'arxiv',
              providerName: 'arXiv',
              resourceUrl: absUrl,
              externalId: String(arxivEprint),
              creatorName: authors,
              rawLicense: 'Open Access (arXiv Repository)',
              licenseUrl: 'https://arxiv.org/help/license',
              providerDefaultLicense: {
                type: 'Open Access',
                commercialAllowed: true,
                attributionRequired: true
              },
              attributes: {
                format: 'pdf',
                year: meta.publication_info?.[0]?.year || (meta.legacy_creation_date ? parseInt(meta.legacy_creation_date.substring(0, 4), 10) : undefined),
                pdfUrl,
                quality: 'Peer-reviewed/Preprint'
              }
            });
          });
        }
      }
    } catch {}
    return [];
  }
}

// 4. PubMed / NCBI
export async function queryPubMed(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  try {
    const esearchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(query + ' AND open access[filter]')}&retmode=json&retmax=10`;
    const searchRes = await fetch(esearchUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!searchRes.ok) throw new Error(`HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const idList = searchData.esearchresult?.idlist || [];

    if (idList.length === 0) return [];

    const esummaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=${idList.join(',')}&retmode=json`;
    const sumRes = await fetch(esummaryUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!sumRes.ok) throw new Error(`HTTP ${sumRes.status}`);
    const sumData = await sumRes.json();
    recordProviderSuccess('pubmed', Date.now() - start);

    const result = sumData.result || {};
    return idList.map((id: string) => {
      const doc = result[id] || {};
      const authors = (doc.authors || []).map((a: any) => a.name).slice(0, 3).join(', ');
      return buildResourceItem({
        id: `pubmed-pmc-${id}`,
        title: doc.title || 'Biomedical Research Paper',
        category: 'papers',
        previewUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/`,
        downloadUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/pdf/`,
        providerId: 'pubmed',
        providerName: 'PubMed Central (NIH)',
        resourceUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/`,
        externalId: `PMC${id}`,
        creatorName: authors || undefined,
        creatorOrg: doc.source,
        rawLicense: 'Open Access (PMC Open Access Subset)',
        licenseUrl: 'https://www.ncbi.nlm.nih.gov/pmc/about/openftlist/',
        providerDefaultLicense: {
          type: 'Open Access',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'pdf',
          doi: doc.articleids?.find((a: any) => a.idtype === 'doi')?.value,
          year: doc.pubdate ? new Date(doc.pubdate).getFullYear() : undefined,
          journal: doc.source,
          pdfUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${id}/pdf/`,
          quality: 'Original'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('pubmed', err.message);
    return [];
  }
}

// 5. Zenodo
export async function queryZenodo(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://zenodo.org/api/records?q=${encodeURIComponent(query)}&size=12`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('zenodo', Date.now() - start);

    return (data.hits?.hits || []).map((hit: any) => {
      const meta = hit.metadata || {};
      const file = hit.files?.[0];
      return buildResourceItem({
        id: `zenodo-${hit.id}`,
        title: meta.title || 'Zenodo Open Research',
        category: meta.resource_type?.type === 'dataset' ? 'datasets' : 'papers',
        description: meta.description?.replace(/<[^>]+>/g, '').substring(0, 300) + '...',
        previewUrl: hit.links?.html,
        downloadUrl: file?.links?.self,
        providerId: 'zenodo',
        providerName: 'Zenodo (CERN)',
        resourceUrl: hit.links?.html,
        externalId: String(hit.id),
        creatorName: meta.creators?.map((c: any) => c.name).slice(0, 3).join(', '),
        rawLicense: meta.license?.id || 'Creative Commons Open Access',
        licenseUrl: meta.license?.id ? `https://spdx.org/licenses/${meta.license.id}` : undefined,
        attributes: {
          format: file?.type || 'zip',
          doi: hit.doi,
          fileSize: file?.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : undefined,
          year: meta.publication_date ? new Date(meta.publication_date).getFullYear() : undefined,
          quality: 'Original'
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('zenodo', err.message);
    return [];
  }
}

// 7. PLOS Open Access Research Papers (High-impact open scientific literature)
export async function queryPLOS(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = query.replace(/[^\w\s]/g, ' ').trim() || 'science';
  const url = `https://api.plos.org/search?q=${encodeURIComponent(cleanQ)}&rows=20&fl=id,title,author_display,abstract,journal,publication_date`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('plos', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const doi = doc.id;
      const pdfUrl = `https://journals.plos.org/plosone/article/file?id=${doi}&type=printable`;
      return buildResourceItem({
        id: `plos-${doi.replace(/[^a-zA-Z0-9]/g, '_')}`,
        title: doc.title || 'PLOS Research Article',
        category: 'papers',
        description: Array.isArray(doc.abstract) ? doc.abstract[0]?.substring(0, 300) + '...' : doc.abstract,
        previewUrl: `https://doi.org/${doi}`,
        downloadUrl: pdfUrl,
        providerId: 'plos',
        providerName: 'PLOS Open Access',
        resourceUrl: `https://doi.org/${doi}`,
        externalId: doi,
        creatorName: Array.isArray(doc.author_display) ? doc.author_display.slice(0, 3).join(', ') : doc.author_display,
        rawLicense: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        providerDefaultLicense: {
          type: 'Open Access',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'pdf',
          doi,
          journal: doc.journal,
          year: doc.publication_date ? new Date(doc.publication_date).getFullYear() : undefined,
          quality: 'Original',
          pdfUrl,
          tags: ['Peer-Reviewed', 'Open Access', doc.journal].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('plos', err.message);
    return [];
  }
}

// 8. DOAJ (Directory of Open Access Journals)
export async function queryDOAJ(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const cleanQ = query.replace(/[^\w\s]/g, ' ').trim() || 'science';
  const url = `https://doaj.org/api/v2/search/articles/${encodeURIComponent(cleanQ)}?pageSize=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(9500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('doaj', Date.now() - start);

    const results = data.results || [];
    return results.map((item: any) => {
      const bib = item.bibjson || {};
      const fulltextLink = bib.link?.find((l: any) => l.type === 'fulltext')?.url || bib.link?.[0]?.url;
      const authors = (bib.author || []).map((a: any) => a.name).slice(0, 3).join(', ');
      const doi = bib.identifier?.find((i: any) => i.type === 'doi')?.id;

      return buildResourceItem({
        id: `doaj-${item.id}`,
        title: bib.title || 'Scholarly Journal Article',
        category: 'papers',
        description: bib.abstract ? bib.abstract.substring(0, 300) + '...' : undefined,
        previewUrl: fulltextLink || `https://doaj.org/article/${item.id}`,
        downloadUrl: fulltextLink,
        providerId: 'doaj',
        providerName: 'Directory of Open Access Journals (DOAJ)',
        resourceUrl: `https://doaj.org/article/${item.id}`,
        externalId: item.id,
        creatorName: authors || 'Open Access Scholar',
        rawLicense: bib.license?.[0]?.type || 'DOAJ Open Access (CC BY)',
        licenseUrl: bib.license?.[0]?.url || 'https://doaj.org',
        attributes: {
          format: 'pdf',
          doi,
          journal: bib.journal?.title,
          year: bib.year ? Number(bib.year) : undefined,
          quality: 'Original',
          tags: ['DOAJ', 'Open Access Journal', bib.journal?.title].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('doaj', err.message);
    return [];
  }
}

// 9. Europe PMC (European Bioinformatics Institute - 40M+ Life Sciences & Biomedical Publications)
export async function queryEuropePMC(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query)}&format=json&pageSize=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('europe_pmc', Date.now() - start);

    const results = data.resultList?.result || [];
    return results.map((doc: any) => {
      const id = doc.id || doc.pmid || Math.random().toString(36).substring(7);
      const doi = doc.doi;
      const articleUrl = doi ? `https://doi.org/${doi}` : `https://europepmc.org/article/MED/${id}`;
      const hasFullText = doc.hasPDF === 'Y' || doc.isOpenAccess === 'Y';
      const pdfUrl = hasFullText && doc.pmcid ? `https://europepmc.org/articles/${doc.pmcid}?pdf=render` : undefined;

      return buildResourceItem({
        id: `epmc-${id}`,
        title: doc.title ? doc.title.replace(/\.$/, '') : 'Biomedical Research Paper',
        category: 'papers',
        description: doc.abstractText ? doc.abstractText.substring(0, 320) + '...' : `Europe PMC publication in ${doc.journalTitle || 'biomedical literature'}.`,
        previewUrl: articleUrl,
        downloadUrl: pdfUrl || articleUrl,
        providerId: 'europe_pmc',
        providerName: 'Europe PMC Life Sciences',
        resourceUrl: articleUrl,
        externalId: id,
        creatorName: doc.authorString || 'Life Sciences Research Group',
        creatorOrg: doc.journalTitle || 'Europe PMC',
        rawLicense: doc.isOpenAccess === 'Y' ? 'Open Access (CC-BY or equivalent)' : 'PubMed / EBI Public Scholarly Access',
        licenseUrl: 'https://europepmc.org/About',
        attributes: {
          format: 'pdf',
          doi,
          journal: doc.journalTitle,
          year: doc.pubYear ? Number(doc.pubYear) : undefined,
          quality: 'Peer-Reviewed',
          pdfUrl,
          tags: ['Europe PMC', 'Biomedical', doc.journalTitle].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('europe_pmc', err.message);
    return [];
  }
}

// 9. INSPIRE-HEP & CERN High-Energy Physics
export async function queryInspireHep(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://inspirehep.net/api/literature?q=${encodeURIComponent(query)}&size=12`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('inspire_hep', Date.now() - start);

    const hits = data.hits?.hits || [];
    return hits.map((hit: any) => {
      const meta = hit.metadata || {};
      const id = hit.id || meta.control_number || Math.random().toString(36).substring(7);
      const title = meta.titles?.[0]?.title || 'Physics Research Preprint';
      const abstract = meta.abstracts?.[0]?.value || `High-energy physics and astrophysics literature from CERN / INSPIRE-HEP.`;
      const authors = (meta.authors || []).map((a: any) => a.full_name).slice(0, 5).join(', ');
      const doi = meta.dois?.[0]?.value;
      const arxivId = meta.arxiv_eprints?.[0]?.value;
      const directPdf = arxivId ? `https://arxiv.org/pdf/${arxivId}.pdf` : (doi ? `https://doi.org/${doi}` : `https://inspirehep.net/literature/${id}`);
      const resourceUrl = `https://inspirehep.net/literature/${id}`;

      return buildResourceItem({
        id: `inspire-${id}`,
        title: title.replace(/\.$/, ''),
        category: 'papers',
        description: abstract.substring(0, 320) + (abstract.length > 320 ? '...' : ''),
        previewUrl: resourceUrl,
        downloadUrl: directPdf,
        providerId: 'inspire_hep',
        providerName: 'INSPIRE-HEP & CERN',
        resourceUrl,
        externalId: String(id),
        creatorName: authors || 'High-Energy Physics Collaboration',
        creatorOrg: 'CERN / DESY / Fermilab / SLAC Consortium',
        rawLicense: 'Open Access / Creative Commons',
        licenseUrl: 'https://inspirehep.net',
        attributes: {
          format: 'pdf',
          doi,
          arxivId,
          citations: meta.citation_count,
          quality: 'Preprint/Peer-Reviewed',
          pdfUrl: directPdf,
          tags: ['INSPIRE-HEP', 'Physics', 'CERN', arxivId ? `arXiv:${arxivId}` : undefined].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('inspire_hep', err.message);
    return [];
  }
}

// 10. HAL Open Science (French National Open Multi-Disciplinary Archive)
export async function queryHalOpenScience(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.archives-ouvertes.fr/search/?q=${encodeURIComponent(query)}&wt=json&rows=12&fl=docid,title_s,abstract_s,uri_s,files_s,authFullName_s,producedDate_s,journalTitle_s`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('hal_open_science', Date.now() - start);

    const docs = data.response?.docs || [];
    return docs.map((doc: any) => {
      const docid = doc.docid || Math.random().toString(36).substring(7);
      const title = Array.isArray(doc.title_s) ? doc.title_s[0] : (doc.title_s || 'Scientific Article');
      const abstract = Array.isArray(doc.abstract_s) ? doc.abstract_s[0] : (doc.abstract_s || `HAL Open Science multidisciplinary research publication.`);
      const authors = Array.isArray(doc.authFullName_s) ? doc.authFullName_s.slice(0, 4).join(', ') : 'HAL Research Group';
      const fileUrl = Array.isArray(doc.files_s) && doc.files_s[0] ? doc.files_s[0] : undefined;
      const resourceUrl = doc.uri_s || `https://hal.science/hal-${docid}`;

      return buildResourceItem({
        id: `hal-${docid}`,
        title: title.replace(/\.$/, ''),
        category: 'papers',
        description: abstract.substring(0, 320) + (abstract.length > 320 ? '...' : ''),
        previewUrl: resourceUrl,
        downloadUrl: fileUrl || resourceUrl,
        providerId: 'hal_open_science',
        providerName: 'HAL Open Science Archive',
        resourceUrl,
        externalId: String(docid),
        creatorName: authors,
        creatorOrg: doc.journalTitle_s || 'HAL Open Science',
        rawLicense: 'Open Access / Creative Commons',
        licenseUrl: 'https://hal.science',
        attributes: {
          format: 'pdf',
          year: doc.producedDate_s ? parseInt(doc.producedDate_s.substring(0, 4), 10) : undefined,
          quality: 'Peer-Reviewed Archive',
          pdfUrl: fileUrl,
          tags: ['HAL', 'Open Science', 'Research'].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('hal_open_science', err.message);
    return [];
  }
}

// 12. PubMed Central (PMC) Full-Text Biomedical Archive
export async function queryNcbiPmc(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'crispr';
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pmc&term=${encodeURIComponent(clean)}&retmode=json&retmax=10`;

  try {
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!searchRes.ok) throw new Error(`Search HTTP ${searchRes.status}`);
    const searchData = await searchRes.json();
    const idList: string[] = searchData.esearchresult?.idlist || [];

    if (idList.length === 0) return [];

    const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pmc&id=${idList.join(',')}&retmode=json`;
    const sumRes = await fetch(summaryUrl, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6000)
    });
    if (!sumRes.ok) throw new Error(`Summary HTTP ${sumRes.status}`);
    const sumData = await sumRes.json();
    recordProviderSuccess('ncbi_pmc', Date.now() - start);

    const resultObj = sumData.result || {};
    return idList.map((uid: string) => {
      const doc = resultObj[uid] || {};
      const title = doc.title || 'Biomedical Research Article';
      const authors = (doc.authors || []).slice(0, 4).map((a: any) => a.name).join(', ') || 'Research Collaborators';
      const journal = doc.source || doc.fulljournalname || 'PMC Open Access';
      const pubDate = doc.pubdate || doc.epubdate || '';
      const year = pubDate ? parseInt(pubDate.substring(0, 4), 10) : undefined;
      const resourceUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${uid}/`;
      const pdfUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${uid}/pdf/`;

      return buildResourceItem({
        id: `pmc-${uid}`,
        title: title.replace(/\.$/, ''),
        category: 'papers',
        description: `Published in ${journal} (${pubDate || 'Recent'}). Authors: ${authors}. Preserved in the NIH National Library of Medicine PubMed Central open archive.`,
        previewUrl: resourceUrl,
        downloadUrl: pdfUrl,
        providerId: 'ncbi_pmc',
        providerName: 'PubMed Central (NIH/NLM)',
        resourceUrl,
        externalId: `PMC${uid}`,
        creatorName: authors,
        creatorOrg: journal,
        rawLicense: 'PMC Open Access / Free Full Text',
        licenseUrl: 'https://www.ncbi.nlm.nih.gov/pmc/about/openftlist/',
        providerDefaultLicense: {
          type: 'Public Domain / CC BY',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'pdf/html',
          year,
          quality: 'Peer-Reviewed Biomedical Article',
          pdfUrl,
          tags: ['PubMed Central', 'PMC', 'NIH', 'Biomedical', journal].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('ncbi_pmc', err.message);
    return [];
  }
}

// 12. NASA Technical Reports Server (NTRS)
export async function queryNasaNtrs(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'aerospace');
  const url = `https://ntrs.nasa.gov/api/citations/search?q=${clean}&page.size=15`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(1800)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const items = data.results || [];
    if (items.length > 0) {
      recordProviderSuccess('nasa_ntrs', Date.now() - start);
      return items.map((doc: any) => {
        const id = doc.id;
        const title = doc.title || 'NASA Technical Report';
        const authors = (doc.authorAffiliations || [])
          .map((a: any) => a.meta?.author?.name)
          .filter(Boolean)
          .slice(0, 3)
          .join(', ') || 'NASA Research Team';
        const pubDate = doc.publicationDate || doc.creationDate || '';
        const year = pubDate ? parseInt(pubDate.substring(0, 4), 10) : undefined;
        const resourceUrl = `https://ntrs.nasa.gov/citations/${id}`;
        const relativePdf = doc.downloads?.[0]?.links?.pdf;
        const pdfUrl = relativePdf
          ? (relativePdf.startsWith('http') ? relativePdf : `https://ntrs.nasa.gov${relativePdf}`)
          : undefined;

        return buildResourceItem({
          id: `nasa-ntrs-${id}`,
          title,
          category: 'papers',
          description: doc.abstract
            ? `${doc.abstract.substring(0, 300)}... Published ${pubDate || 'NASA Archive'}. Authors: ${authors}.`
            : `Official NASA Scientific and Technical Information (STI) report. Authors: ${authors}. Published ${pubDate}.`,
          previewUrl: pdfUrl || resourceUrl,
          downloadUrl: pdfUrl || resourceUrl,
          providerId: 'nasa_ntrs',
          providerName: 'NASA Technical Reports (NTRS)',
          resourceUrl,
          externalId: String(id),
          creatorName: authors,
          creatorOrg: 'National Aeronautics and Space Administration (NASA)',
          rawLicense: 'Public Domain / NASA STI Open Access',
          licenseUrl: 'https://ntrs.nasa.gov/',
          providerDefaultLicense: {
            type: 'Public Domain / CC0',
            commercialAllowed: true,
            attributionRequired: false
          },
          attributes: {
            format: 'pdf',
            year,
            quality: 'Official NASA Technical Paper',
            pdfUrl,
            abstract: doc.abstract,
            tags: ['NASA', 'Aerospace', 'Space Science', 'Technical Report'].filter(Boolean)
          }
        });
      });
    }
    throw new Error('NTRS returned 0 items');
  } catch (err: any) {
    recordProviderFailure('nasa_ntrs', err.message);
    try {
      const iaUrl = `https://archive.org/advancedsearch.php?q=collection:(nasa)+AND+(${encodeURIComponent(query)})&fl[]=identifier,title,creator,description,year,licenseurl&sort[]=downloads+desc&rows=15&output=json`;
      const iaRes = await fetch(iaUrl, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(4500) });
      if (iaRes.ok) {
        const iaData = await iaRes.json();
        const docs = iaData.response?.docs || [];
        if (docs.length > 0) {
          recordProviderSuccess('nasa_ntrs', Date.now() - start);
          return docs.map((doc: any) =>
            buildResourceItem({
              id: `nasa-doc-${doc.identifier}`,
              title: doc.title || 'NASA Aeronautics & Space Technical Report',
              category: 'papers',
              description: doc.description ? String(doc.description).replace(/<[^>]*>?/gm, '').substring(0, 300) : 'NASA Technical & Scientific document.',
              previewUrl: `https://archive.org/details/${doc.identifier}`,
              downloadUrl: `https://archive.org/download/${doc.identifier}`,
              providerId: 'nasa_ntrs',
              providerName: 'NASA Technical Reports (NTRS)',
              resourceUrl: `https://archive.org/details/${doc.identifier}`,
              externalId: doc.identifier,
              creatorName: doc.creator || 'NASA',
              creatorOrg: 'National Aeronautics and Space Administration',
              rawLicense: 'Public Domain (NASA US Govt Work)',
              licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/',
              providerDefaultLicense: {
                type: 'Public Domain',
                commercialAllowed: true,
                attributionRequired: false
              },
              attributes: {
                format: 'pdf',
                year: doc.year ? Number(doc.year) : undefined,
                quality: 'NASA Archived Technical Document',
                tags: ['NASA', 'Aeronautics', 'Space Technology']
              }
            })
          );
        }
      }
    } catch {}
    return [];
  }
}




