import axios, { AxiosError } from 'axios';

const API_KEY = 'YOUR-API-KEY';
const PROJECT = 'all';
const API_URL = `https://my-api.plantnet.org/v2/identify/${PROJECT}?api-key=${API_KEY}`;

/**
 * Identifies a plant from an image using Pl@ntNet API
 * @param file The image file to analyze
 * @returns A promise that resolves to a string describing the plant
 */
export async function identifyPlant(file: File): Promise<string> {
  try {
    // Validate file size (max 5MB)
    const MAX_FILE_SIZE = 7 * 1024 * 1024; // 7MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Image file is too large. Maximum size is 5MB.');
    }

    const formData = new FormData();
    formData.append('organs', 'auto');
    formData.append('images', file);

    const response = await axios.post(API_URL, formData, {
      headers: {
        'Accept': 'application/json'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });

    if (response.status !== 200) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const { results } = response.data;
    if (!results || results.length === 0) {
      return 'Sorry, I could not identify this plant. Please try with a clearer image that shows the entire plant or specific parts like leaves, flowers, or fruits.';
    }

    const bestMatch = results[0];
    const scientificName = bestMatch.species.scientificNameWithoutAuthor;
    const commonNames = bestMatch.species.commonNames?.join(', ') || 'no common name available';
    const family = bestMatch.species.family.scientificNameWithoutAuthor;
    const genus = bestMatch.species.genus.scientificNameWithoutAuthor;
    const score = Math.round(bestMatch.score * 100);

    return `I identified this plant as ${scientificName} (${commonNames}).\n` +
           `Family: ${family}\n` +
           `Genus: ${genus}\n` +
           `Confidence: ${score}%`;
  } catch (error) {
    console.error('Error identifying plant:', error);

    if (error instanceof AxiosError) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timed out. Please try again.');
      }
      if (error.response) {
        const status = error.response.status;
        if (status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        if (status === 413) {
          throw new Error('Image file is too large. Please use a smaller image.');
        }
        if (status === 400) {
          throw new Error('Invalid request. Please ensure you\'re uploading a valid image file.');
        }
        if (status === 401 || status === 403) {
          throw new Error('API authentication failed. Please try again later.');
        }
        throw new Error(`API request failed: ${error.response.data?.message || error.message}`);
      }
      if (error.request) {
        throw new Error('No response received from the server. Please check your internet connection and try again.');
      }
    }

    // For any other type of error
    throw new Error(`Failed to identify plant: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
  }
}