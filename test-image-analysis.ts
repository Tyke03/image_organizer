import { analyzeImage, isConfigured } from './services/imageAnalysisTool';
import * as fs from 'fs';
import * as path from 'path';

// --- Configuration ---
// IMPORTANT: Ensure your OPENROUTER_API_KEY is set in a .env.local file
// or directly in your environment for this script to work.
// Example: OPENROUTER_API_KEY=your_key_here

// Path to a sample image file (e.g., a small JPEG or PNG)
// Make sure this image exists in your project's root or adjust the path.
const SAMPLE_IMAGE_PATH = path.join(__dirname, 'sample-image.jpg'); 

// --- Main Test Function ---
async function runImageAnalysisTest() {
  if (!isConfigured()) {
    console.error('Error: OPENROUTER_API_KEY is not configured. Please set it in your .env.local file or environment variables.');
    process.exit(1);
  }

  try {
    // 1. Read the image file
    const imageBuffer = fs.readFileSync(SAMPLE_IMAGE_PATH);
    // 2. Convert to Base64
    const base64Image = imageBuffer.toString('base64');

    console.log(`Analyzing image: ${SAMPLE_IMAGE_PATH}`);
    console.log('Calling analyzeImage function...');

    // 3. Call the analyzeImage function
    const result = await analyzeImage(base64Image);

    // 4. Print the results
    console.log('\n--- Analysis Result ---');
    console.log('Description:', result.description);
    console.log('Tags:', result.tags);
    console.log('Model Used:', result.modelUsed);
    console.log('-----------------------');

  } catch (error) {
    console.error('An error occurred during image analysis:', error);
  }
}

// Execute the test function
runImageAnalysisTest();