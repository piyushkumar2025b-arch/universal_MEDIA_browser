import { ResourceItem } from '../../src/types/resource';
import { buildResourceItem } from '../normalizer';
import { registerTracker, recordProviderSuccess, recordProviderFailure } from '../telemetry';

const USER_AGENT = 'URMIL-Universal-Browser/1.0 (https://ai.studio; contact: team@urmil.org)';

registerTracker({
  id: 'gbif',
  name: 'Global Biodiversity Information Facility (GBIF)',
  category: 'Biodiversity',
  rateLimit: 'Unlimited / Polite',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'inaturalist_bio',
  name: 'iNaturalist Global Research Observations',
  category: 'Biodiversity',
  rateLimit: 'Open API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'uniprot',
  name: 'UniProt Knowledgebase (Protein Sequence & Function)',
  category: 'Genomics & Proteins',
  rateLimit: 'Unlimited / Open Scientific API',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'chembl',
  name: 'EMBL-EBI ChEMBL Bioactive Molecules Database',
  category: 'Chemistry & Pharmacology',
  rateLimit: 'Open REST API (Unlimited)',
  authRequired: false,
  authConfigured: true
});

registerTracker({
  id: 'worms_marine',
  name: 'World Register of Marine Species (WoRMS)',
  category: 'Marine Biology & Oceanography',
  rateLimit: 'Open Aphia REST API (Polite)',
  authRequired: false,
  authConfigured: true
});

const gbifTaxaCache = new Map<string, { timestamp: number; items: ResourceItem[] }>();

// GBIF Species & Taxa
export async function queryGBIF(query: string): Promise<ResourceItem[]> {
  const cacheKey = query.trim().toLowerCase();
  const cached = gbifTaxaCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 1000 * 60 * 30) {
    return cached.items;
  }

  const start = Date.now();
  const url = `https://api.gbif.org/v1/species/search?q=${encodeURIComponent(query)}&limit=12`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(9500) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('gbif', Date.now() - start);

    const items = (data.results || []).map((sp: any) =>
      buildResourceItem({
        id: `gbif-${sp.key}`,
        title: `${sp.canonicalName || sp.scientificName || 'Taxon'} (${sp.vernacularName || sp.rank || 'Species'})`,
        category: 'biodiversity',
        description: `Taxonomic rank: ${sp.rank || 'Unknown'} • Kingdom: ${sp.kingdom || 'N/A'} • Phylum: ${sp.phylum || 'N/A'} • Family: ${sp.family || 'N/A'}. Indexed in GBIF Global Backbone Taxonomy.`,
        previewUrl: `https://www.gbif.org/species/${sp.key}`,
        downloadUrl: `https://api.gbif.org/v1/species/${sp.key}`,
        providerId: 'gbif',
        providerName: 'Global Biodiversity Information Facility',
        resourceUrl: `https://www.gbif.org/species/${sp.key}`,
        externalId: String(sp.key),
        creatorName: 'GBIF Secretariat & Global Taxonomy Contributors',
        rawLicense: 'Creative Commons Zero (CC0 1.0) / Open Access',
        licenseUrl: 'https://www.gbif.org/terms/data-user',
        providerDefaultLicense: {
          type: 'Public Domain / CC0',
          commercialAllowed: true,
          attributionRequired: false
        },
        attributes: {
          format: 'json/darwin-core',
          scientificName: sp.scientificName,
          kingdom: sp.kingdom,
          quality: 'Original',
          tags: [sp.kingdom, sp.rank, sp.family].filter(Boolean)
        }
      })
    );

    gbifTaxaCache.set(cacheKey, { timestamp: Date.now(), items });
    return items;
  } catch (err: any) {
    recordProviderFailure('gbif', err.message);
    // Return empty array gracefully without throwing
    return [];
  }
}

// iNaturalist Research Observations with real location and photography
export async function queryINaturalistObservations(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const url = `https://api.inaturalist.org/v1/observations?q=${encodeURIComponent(query)}&photos=true&per_page=20&order_by=votes`;

  try {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT }, signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('inaturalist_bio', Date.now() - start);

    const results = data.results || [];
    return results.map((obs: any) => {
      const photo = obs.photos?.[0]?.url?.replace('/square.', '/large.');
      const thumb = obs.photos?.[0]?.url?.replace('/square.', '/medium.');
      const sciName = obs.taxon?.name || obs.species_guess || 'Taxon';
      const commonName = obs.taxon?.preferred_common_name;

      return buildResourceItem({
        id: `inat-bio-${obs.id}`,
        title: commonName ? `${commonName} (${sciName})` : sciName,
        category: 'biodiversity',
        description: `Field observation at ${obs.place_guess || 'Global Coordinate'} • Iconic Taxon: ${obs.taxon?.iconic_taxon_name || 'Species'}`,
        thumbnailUrl: thumb,
        previewUrl: photo || obs.uri,
        downloadUrl: photo,
        providerId: 'inaturalist_bio',
        providerName: 'iNaturalist Global Research',
        resourceUrl: obs.uri || `https://www.inaturalist.org/observations/${obs.id}`,
        externalId: String(obs.id),
        creatorName: obs.user?.name || obs.user?.login || 'Field Naturalist',
        rawLicense: obs.license_code ? `CC ${obs.license_code.toUpperCase()}` : 'Creative Commons Attribution',
        attributes: {
          format: 'json/darwin-core',
          scientificName: sciName,
          region: obs.place_guess,
          quality: 'Original',
          tags: [obs.taxon?.iconic_taxon_name, 'Research Grade Observation', 'Field Specimen'].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('inaturalist_bio', err.message);
    return [];
  }
}

// 3. UniProt Knowledgebase (Protein Sequence & Function)
export async function queryUniProt(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'insulin';
  const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(clean)}&size=10&format=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('uniprot', Date.now() - start);

    return (data.results || []).map((entry: any) => {
      const acc = entry.primaryAccession || 'ENTRY';
      const recName = entry.proteinDescription?.recommendedName?.fullName?.value || entry.uniProtkbId || 'Protein';
      const org = entry.organism?.scientificName || 'Organism';
      const genes = (entry.genes || []).map((g: any) => g.geneName?.value).filter(Boolean).join(', ');
      const funcComment = entry.comments?.find((c: any) => c.commentType === 'FUNCTION')?.texts?.[0]?.value;
      const resourceUrl = `https://www.uniprot.org/uniprotkb/${acc}/entry`;

      return buildResourceItem({
        id: `uniprot-${acc}`,
        title: `${recName} [${acc}] — ${org}`,
        category: 'biodiversity',
        description: funcComment ? funcComment.substring(0, 280) + '...' : `UniProtKB curated protein sequence. Organism: ${org}. Gene: ${genes || 'N/A'}.`,
        previewUrl: resourceUrl,
        downloadUrl: `https://rest.uniprot.org/uniprotkb/${acc}.fasta`,
        providerId: 'uniprot',
        providerName: 'UniProt Knowledgebase',
        resourceUrl,
        externalId: acc,
        creatorName: 'UniProt Consortium (EMBL-EBI / SIB / PIR)',
        rawLicense: 'Creative Commons Attribution 4.0 (CC BY 4.0)',
        licenseUrl: 'https://www.uniprot.org/help/license',
        providerDefaultLicense: {
          type: 'Creative Commons BY',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'fasta/json',
          scientificName: org,
          quality: 'Curated Protein Knowledgebase Entry',
          tags: ['UniProt', 'Protein', 'Genomics', org, genes].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('uniprot', err.message);
    return [];
  }
}

// 4. EMBL-EBI ChEMBL Bioactive Molecules
export async function queryChEMBL(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = query.trim() || 'aspirin';
  const url = `https://www.ebi.ac.uk/chembl/api/data/molecule/search?q=${encodeURIComponent(clean)}&format=json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    recordProviderSuccess('chembl', Date.now() - start);

    return (data.molecules || []).slice(0, 10).map((mol: any) => {
      const chemblId = mol.molecule_chembl_id;
      const name = mol.pref_name || chemblId;
      const mwt = mol.molecule_properties?.full_mwt || 'N/A';
      const formula = mol.molecule_properties?.molecular_formula || '';
      const type = mol.molecule_type || 'Small molecule';
      const resourceUrl = `https://www.ebi.ac.uk/chembl/compound_report_card/${chemblId}/`;
      const structImg = `https://www.ebi.ac.uk/chembl/api/data/image/${chemblId}.png`;

      return buildResourceItem({
        id: `chembl-${chemblId}`,
        title: `${name} (${chemblId})`,
        category: 'biodiversity',
        description: `Bioactive compound: ${type}. Molecular Formula: ${formula}. Molecular Weight: ${mwt} g/mol. Curated by European Bioinformatics Institute.`,
        thumbnailUrl: structImg,
        previewUrl: resourceUrl,
        downloadUrl: `https://www.ebi.ac.uk/chembl/api/data/molecule/${chemblId}?format=json`,
        providerId: 'chembl',
        providerName: 'EMBL-EBI ChEMBL',
        resourceUrl,
        externalId: chemblId,
        creatorName: 'European Molecular Biology Laboratory (EMBL-EBI)',
        rawLicense: 'Creative Commons Attribution-ShareAlike 3.0 (CC BY-SA 3.0)',
        licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/',
        providerDefaultLicense: {
          type: 'Creative Commons SA',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'chemical/structure-json',
          quality: 'Curated Bioactive Compound Record',
          tags: ['ChEMBL', 'Pharmacology', 'Biomedical', formula, type].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('chembl', err.message);
    return [];
  }
}

// 5. WoRMS - World Register of Marine Species
export async function queryWoRMS(query: string): Promise<ResourceItem[]> {
  const start = Date.now();
  const clean = encodeURIComponent(query.trim() || 'Delphinus');
  const url = `https://www.marinespecies.org/rest/AphiaRecordsByName/${clean}?like=true`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(6500)
    });
    if (!res.ok) {
      if (res.status === 204 || res.status === 404) return [];
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    recordProviderSuccess('worms_marine', Date.now() - start);

    if (!Array.isArray(data)) return [];

    const records = data.slice(0, 15);
    return records.map((rec: any) => {
      const aphiaId = rec.AphiaID;
      const scientificName = rec.scientificname || 'Marine Organism';
      const authority = rec.authority || '';
      const kingdom = rec.kingdom || 'Animalia';
      const phylum = rec.phylum || '';
      const order = rec.order || '';
      const family = rec.family || '';
      const status = rec.status || 'accepted';
      const resourceUrl = rec.url || `https://www.marinespecies.org/aphia.php?p=taxdetails&id=${aphiaId}`;

      return buildResourceItem({
        id: `worms-${aphiaId}`,
        title: scientificName,
        category: 'biodiversity',
        description: `Taxon status: ${status}. Authority: ${authority}. Classification: Kingdom ${kingdom}, Phylum ${phylum}, Family ${family}. Verified by the World Register of Marine Species.`,
        previewUrl: resourceUrl,
        downloadUrl: `https://www.marinespecies.org/rest/AphiaRecordByAphiaID/${aphiaId}`,
        providerId: 'worms_marine',
        providerName: 'WoRMS Marine Species',
        resourceUrl,
        externalId: String(aphiaId),
        creatorName: authority || 'Marine Biologists & Taxonomists',
        creatorOrg: 'Flanders Marine Institute (VLIZ) / WoRMS',
        rawLicense: 'Creative Commons Attribution 4.0 International (CC BY 4.0)',
        licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
        providerDefaultLicense: {
          type: 'Creative Commons',
          commercialAllowed: true,
          attributionRequired: true
        },
        attributes: {
          format: 'taxonomic/aphia-record',
          quality: 'Expert Peer-Reviewed Marine Taxonomy',
          tags: ['WoRMS', 'Marine Biology', 'Ocean Life', kingdom, phylum, family].filter(Boolean)
        }
      });
    });
  } catch (err: any) {
    recordProviderFailure('worms_marine', err.message);
    return [];
  }
}



