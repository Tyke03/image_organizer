
import { PhotoFile, Album } from "../types";

/**
 * Organizes photos into albums.
 * Goal: Create meaningful groups of approximately 20 photos (TARGET_SIZE).
 */
export const organizePhotos = (photos: PhotoFile[]): Album[] => {
  let albums: Album[] = [];
  const TARGET_SIZE = 20;

  // Filter valid photos
  let pool = photos.filter(p => 
    p.status === 'done' && 
    p.tags.length > 0 && 
    !p.tags.includes('unknown')
  );

  // Helper to calculate score (distance from target)
  // Lower score is better.
  const calculateScore = (count: number) => {
    // Heavy penalty for very small groups to prevent fragmentation
    if (count < 5) return 5000 + (5 - count) * 100; // Massive penalty for < 5
    if (count < 10) return 1000 + (10 - count) * 10; // Moderate penalty for < 10
    
    return Math.abs(count - TARGET_SIZE);
  };

  // --- 1. PRIMARY CLUSTERING PASS ---
  while (pool.length > 0) {
    const tagCounts = new Map<string, number>();
    pool.forEach(p => p.tags.forEach(t => tagCounts.set(t, (tagCounts.get(t) || 0) + 1)));

    // Only consider tags that appear in at least 3 photos to avoid micro-clusters
    const candidateTags = Array.from(tagCounts.keys()).filter(t => (tagCounts.get(t) || 0) >= 3);

    if (candidateTags.length === 0) break; 

    let bestGroup = {
      tags: [] as string[],
      ids: [] as string[],
      score: Infinity
    };

    for (const tag of candidateTags) {
      const photosWithTag = pool.filter(p => p.tags.includes(tag));
      const count = photosWithTag.length;
      
      const score = calculateScore(count);

      if (score < bestGroup.score) {
        bestGroup = { tags: [tag], ids: photosWithTag.map(p => p.id), score };
      }

      // Drill down logic for large groups
      if (count > TARGET_SIZE * 1.5) {
        const subTagCounts = new Map<string, number>();
        photosWithTag.forEach(p => p.tags.forEach(t => {
          if (t !== tag) subTagCounts.set(t, (subTagCounts.get(t) || 0) + 1);
        }));

        const subCandidates = Array.from(subTagCounts.keys()).filter(t => (subTagCounts.get(t) || 0) >= 3);

        for (const subTag of subCandidates) {
          const subCount = subTagCounts.get(subTag)!;
          const subScore = calculateScore(subCount);

          if (subScore < bestGroup.score) {
             const intersectIds = photosWithTag
                .filter(p => p.tags.includes(subTag))
                .map(p => p.id);
             
             bestGroup = { 
               tags: [tag, subTag], 
               ids: intersectIds, 
               score: subScore 
             };
          }
        }
      }
    }

    if (bestGroup.ids.length > 0 && bestGroup.score < 5000) { 
      const mainTag = bestGroup.tags[0];
      const name = bestGroup.tags.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' + ');
      
      albums.push({
        id: `album-${bestGroup.tags.join('-')}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: name,
        photoIds: bestGroup.ids,
        mainTag: mainTag
      });

      const groupedIdSet = new Set(bestGroup.ids);
      pool = pool.filter(p => !groupedIdSet.has(p.id));
    } else {
      break; 
    }
  }

  // --- 2. AGGRESSIVE MERGING PASS ---
  // Consolidate fragmentation (e.g. "Anime", "Anime Girl", "Anime Character")
  let mergedSomething = true;
  while (mergedSomething) {
    mergedSomething = false;
    
    // Sort by size descending so we merge smaller into larger
    albums.sort((a, b) => b.photoIds.length - a.photoIds.length);

    for (let i = 0; i < albums.length; i++) {
        if (mergedSomething) break;
        for (let j = i + 1; j < albums.length; j++) {
            const albumA = albums[i]; // Larger (usually)
            const albumB = albums[j]; // Smaller (usually)

            // CONDITIONS FOR MERGE:
            
            const nameA = albumA.name.toLowerCase();
            const nameB = albumB.name.toLowerCase();
            
            // 1. Name Containment / Similarity
            // "Anime" vs "Anime Girl" -> Overlap
            const wordsA = nameA.split(/[^a-z]+/);
            const wordsB = nameB.split(/[^a-z]+/);
            const intersection = wordsA.filter(w => wordsB.includes(w));
            
            const sharesWords = intersection.length > 0;
            const isSubString = nameA.includes(nameB) || nameB.includes(nameA);
            
            // 2. Size based logic
            const bIsSmall = albumB.photoIds.length < 15; // If B is reasonably small
            const combinedSize = albumA.photoIds.length + albumB.photoIds.length;
            const combinedIsOkay = combinedSize <= (TARGET_SIZE * 2.5); // Don't make mega-albums unless necessary

            // Decision:
            // Merge if they share words AND (B is small OR combined isn't huge)
            if ((sharesWords || isSubString) && (bIsSmall || combinedIsOkay)) {
                // MERGE B into A
                const uniqueIds = new Set([...albumA.photoIds, ...albumB.photoIds]);
                albumA.photoIds = Array.from(uniqueIds);
                
                // Update name: Keep the shorter, broader name usually (which is often A since we sorted by size, but let's check)
                // If A="Anime Girl" (10) and B="Anime" (5) -> merged (15). Name should be "Anime" (shorter).
                if (nameB.length < nameA.length && nameB.length > 3) {
                    albumA.name = albumB.name;
                    albumA.mainTag = albumB.mainTag;
                }

                albums.splice(j, 1); // Remove B
                mergedSomething = true;
                break;
            }
        }
    }
  }


  // --- 3. HANDLE LEFTOVERS (Misc) ---
  const failedOrSkipped = photos.filter(p => 
    !albums.some(a => a.photoIds.includes(p.id))
  );

  if (failedOrSkipped.length > 0) {
    const errors = failedOrSkipped.filter(p => p.status === 'error' || p.tags.length === 0);
    const misc = failedOrSkipped.filter(p => p.status === 'done' && p.tags.length > 0);

    if (misc.length > 0) {
        // Try to merge misc into existing albums if they contain the album's main tag
        const trulyMisc: PhotoFile[] = [];
        
        misc.forEach(p => {
            let placed = false;
            for (const alb of albums) {
                // Check if this photo has any tag that matches the album name words
                const albKeywords = alb.name.toLowerCase().split(/[^a-z]+/);
                const hasKeyword = p.tags.some(t => albKeywords.includes(t));
                
                if (hasKeyword) {
                    alb.photoIds.push(p.id);
                    placed = true;
                    break;
                }
            }
            if (!placed) trulyMisc.push(p);
        });

        // Final Misc Album
        if (trulyMisc.length > 0) {
            albums.push({
                id: `album-misc`,
                name: `Unsorted / Misc (${trulyMisc.length})`,
                photoIds: trulyMisc.map(p => p.id),
                mainTag: 'misc'
            });
        }
    }

    if (errors.length > 0) {
       albums.push({
        id: `album-failed`,
        name: `Failed / Retry Needed (${errors.length})`,
        photoIds: errors.map(p => p.id),
        mainTag: 'error'
      });
    }
  }
  
  // Final cleanup: Remove duplicates in photoIds if any crept in
  albums.forEach(a => {
      a.photoIds = Array.from(new Set(a.photoIds));
  });

  return albums;
};
