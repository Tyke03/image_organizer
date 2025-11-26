import { organizePhotos } from './services/clusteringService';
import { PhotoFile, Album } from './types';

// --- Mock Data ---
// This data simulates the output from the Image Analysis & Tagging Tool
const mockPhotos: PhotoFile[] = [
  { id: 'img1', file: new File([], 'photo1.jpg'), previewUrl: '', status: 'done', description: 'A cat sitting on a couch', tags: ['cat', 'pet', 'animal', 'couch', 'indoor'] },
  { id: 'img2', file: new File([], 'photo2.jpg'), previewUrl: '', status: 'done', description: 'A dog playing in a park', tags: ['dog', 'pet', 'animal', 'park', 'outdoor'] },
  { id: 'img3', file: new File([], 'photo3.jpg'), previewUrl: '', status: 'done', description: 'A group of friends at a beach', tags: ['beach', 'friends', 'people', 'ocean', 'outdoor'] },
  { id: 'img4', file: new File([], 'photo4.jpg'), previewUrl: '', status: 'done', description: 'A golden retriever running', tags: ['dog', 'pet', 'animal', 'running', 'outdoor'] },
  { id: 'img5', file: new File([], 'photo5.jpg'), previewUrl: '', status: 'done', description: 'A fluffy white cat sleeping', tags: ['cat', 'pet', 'animal', 'sleeping', 'indoor'] },
  { id: 'img6', file: new File([], 'photo6.jpg'), previewUrl: '', status: 'done', description: 'Sunset over the ocean', tags: ['sunset', 'ocean', 'beach', 'sky', 'nature'] },
  { id: 'img7', file: new File([], 'photo7.jpg'), previewUrl: '', status: 'done', description: 'A mountain landscape', tags: ['mountain', 'landscape', 'nature', 'outdoor', 'scenery'] },
  { id: 'img8', file: new File([], 'photo8.jpg'), previewUrl: '', status: 'done', description: 'A small kitten playing', tags: ['cat', 'kitten', 'pet', 'animal', 'playful'] },
  { id: 'img9', file: new File([], 'photo9.jpg'), previewUrl: '', status: 'done', description: 'A city skyline at night', tags: ['city', 'skyline', 'night', 'urban', 'lights'] },
  { id: 'img10', file: new File([], 'photo10.jpg'), previewUrl: '', status: 'done', description: 'A person hiking in the forest', tags: ['hiking', 'forest', 'person', 'outdoor', 'adventure'] },
  { id: 'img11', file: new File([], 'photo11.jpg'), previewUrl: '', status: 'done', description: 'Another cat picture', tags: ['cat', 'feline', 'animal'] },
  { id: 'img12', file: new File([], 'photo12.jpg'), previewUrl: '', status: 'done', description: 'A dog fetching a ball', tags: ['dog', 'fetch', 'play', 'animal'] },
  { id: 'img13', file: new File([], 'photo13.jpg'), previewUrl: '', status: 'done', description: 'A beautiful beach scene', tags: ['beach', 'sand', 'water', 'tropical'] },
  { id: 'img14', file: new File([], 'photo14.jpg'), previewUrl: '', status: 'done', description: 'A cute puppy', tags: ['dog', 'puppy', 'cute', 'animal'] },
  { id: 'img15', file: new File([], 'photo15.jpg'), previewUrl: '', status: 'done', description: 'A majestic lion', tags: ['lion', 'wildlife', 'animal', 'safari'] },
  { id: 'img16', file: new File([], 'photo16.jpg'), previewUrl: '', status: 'error', description: 'Failed to analyze', tags: [] }, // An error photo
  { id: 'img17', file: new File([], 'photo17.jpg'), previewUrl: '', status: 'done', description: 'A person on a mountain peak', tags: ['mountain', 'person', 'peak', 'outdoor'] },
  { id: 'img18', file: new File([], 'photo18.jpg'), previewUrl: '', status: 'done', description: 'A forest path', tags: ['forest', 'path', 'trees', 'nature'] },
  { id: 'img19', file: new File([], 'photo19.jpg'), previewUrl: '', status: 'done', description: 'A cityscape at dusk', tags: ['city', 'dusk', 'buildings', 'urban'] },
  { id: 'img20', file: new File([], 'photo20.jpg'), previewUrl: '', status: 'done', description: 'A playful kitten', tags: ['kitten', 'cat', 'playful', 'animal'] },
];

// --- Main Test Function ---
function runClusteringTest() {
  console.log('Running Image Grouping & Clustering Tool with mock data...');

  // Call the organizePhotos function
  const albums: Album[] = organizePhotos(mockPhotos);

  // Print the results
  console.log('\n--- Organized Albums ---');
  if (albums.length === 0) {
    console.log('No albums were created.');
  } else {
    albums.forEach((album, index) => {
      console.log(`\nAlbum ${index + 1}:`);
      console.log(`  ID: ${album.id}`);
      console.log(`  Name: ${album.name}`);
      console.log(`  Main Tag: ${album.mainTag}`);
      console.log(`  Photo IDs (${album.photoIds.length}):`, album.photoIds.join(', '));
    });
  }
  console.log('------------------------');
}

// Execute the test function
runClusteringTest();