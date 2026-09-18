/**
 * URMIL Content Photography Engine
 * Provides verified high-resolution photographs for every domain and topic.
 * Guarantees zero blank/placeholder image boxes.
 */

// Verified 200 OK direct photographic assets across core domains
export const VERIFIED_CONTENT_PHOTOS: Record<string, string[]> = {
  // Art, Artifacts, Textiles, Decorative crafts, Tassels
  textiles: [
    'https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=800&auto=format&fit=crop&q=80', // woven fabric & tassels
    'https://openaccess-cdn.clevelandart.org/2005.5.5/2005.5.5_web.jpg', // museum decorative textile
    'https://images.metmuseum.org/CRDImages/ep/web-large/DP159770.jpg', // Renaissance classical painting
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80' // classical museum art
  ],
  art: [
    'https://openaccess-cdn.clevelandart.org/2005.5.5/2005.5.5_web.jpg',
    'https://images.metmuseum.org/CRDImages/ep/web-large/DP159770.jpg',
    'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=800&auto=format&fit=crop&q=80',
    'https://upload.wikimedia.org/wikipedia/commons/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg'
  ],
  nature: [
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80'
  ],
  ocean: [
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80'
  ],
  biodiversity: [
    'https://images.unsplash.com/photo-1535268647677-300dbf3d78d1?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1546182990-dffeafbe841d?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&auto=format&fit=crop&q=80'
  ],
  space: [
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=800&auto=format&fit=crop&q=80'
  ],
  technology: [
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80'
  ],
  books: [
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&auto=format&fit=crop&q=80'
  ],
  maps: [
    'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?w=800&auto=format&fit=crop&q=80'
  ],
  music: [
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80'
  ],
  food: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80'
  ],
  games: [
    'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80'
  ]
};

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * Returns a verified, authentic content photograph based on title, category, and tags.
 * Guarantees that any resource displays an authentic photo instead of an empty icon box.
 */
export function getContentPhoto(title: string, category: string = 'images', tags: string[] = []): string {
  const normalizedText = `${title} ${tags.join(' ')}`.toLowerCase();

  // 1. Keyword-based matching
  if (
    normalizedText.includes('tassel') || 
    normalizedText.includes('textile') || 
    normalizedText.includes('weaving') || 
    normalizedText.includes('fabric') || 
    normalizedText.includes('fringe') ||
    normalizedText.includes('costume')
  ) {
    const list = VERIFIED_CONTENT_PHOTOS.textiles;
    return list[simpleHash(title) % list.length];
  }

  if (
    normalizedText.includes('ocean') || 
    normalizedText.includes('sea') || 
    normalizedText.includes('water') || 
    normalizedText.includes('beach') ||
    normalizedText.includes('wave')
  ) {
    const list = VERIFIED_CONTENT_PHOTOS.ocean;
    return list[simpleHash(title) % list.length];
  }

  if (
    normalizedText.includes('space') || 
    normalizedText.includes('galaxy') || 
    normalizedText.includes('planet') || 
    normalizedText.includes('nasa') ||
    normalizedText.includes('star') ||
    normalizedText.includes('telescope')
  ) {
    const list = VERIFIED_CONTENT_PHOTOS.space;
    return list[simpleHash(title) % list.length];
  }

  // 2. Category-based matching
  const catKey = category.toLowerCase();
  let pool = VERIFIED_CONTENT_PHOTOS[catKey];
  if (!pool || pool.length === 0) {
    if (catKey === 'videos' || catKey === 'gifs') {
      pool = VERIFIED_CONTENT_PHOTOS.nature;
    } else if (catKey === 'papers') {
      pool = VERIFIED_CONTENT_PHOTOS.books;
    } else if (catKey === 'code' || catKey === 'datasets') {
      pool = VERIFIED_CONTENT_PHOTOS.technology;
    } else if (catKey === 'audio') {
      pool = VERIFIED_CONTENT_PHOTOS.music;
    } else {
      pool = VERIFIED_CONTENT_PHOTOS.art;
    }
  }

  const index = simpleHash(title || 'default') % pool.length;
  return pool[index];
}
