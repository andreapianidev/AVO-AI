/**
 * Constants for daily question limit management
 */
const DAILY_LIMIT = 5;
const PLANT_LIMIT = 3;
const STORAGE_KEY = 'avoai_daily_questions';
const PLANT_STORAGE_KEY = 'avoai_daily_plants';

/**
 * Interface for storing daily questions data
 */
interface DailyQuestions {
  count: number;          // Number of questions asked today
  date: string;          // Current date in string format
  lastUpdate: number;    // Timestamp of last update
}

interface DailyPlants {
  count: number;         // Number of plants identified today
  date: string;         // Current date in string format
  lastUpdate: number;   // Timestamp of last update
}

/**
 * Get the current daily questions state
 * Includes validation and data integrity checks
 */
export const getDailyQuestions = (): DailyQuestions => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const currentDate = new Date().toDateString();
    
    // If no data exists, initialize with default values
    if (!stored) {
      return { 
        count: 0, 
        date: currentDate,
        lastUpdate: Date.now()
      };
    }

    const data = JSON.parse(stored) as DailyQuestions;
    
    // Reset counter if it's a new day
    if (data.date !== currentDate) {
      return { 
        count: 0, 
        date: currentDate,
        lastUpdate: Date.now()
      };
    }

    // Validate data integrity
    if (typeof data.count !== 'number' || data.count < 0 || data.count > DAILY_LIMIT) {
      console.warn('Invalid question count detected, resetting counter');
      return { 
        count: 0, 
        date: currentDate,
        lastUpdate: Date.now()
      };
    }

    return data;
  } catch (error) {
    console.error('Error reading daily questions data:', error);
    // Return fresh state if there's any error
    return { 
      count: 0, 
      date: new Date().toDateString(),
      lastUpdate: Date.now()
    };
  }
};

/**
 * Get the current daily plants state
 */
export const getDailyPlants = (): DailyPlants => {
  try {
    const stored = localStorage.getItem(PLANT_STORAGE_KEY);
    const currentDate = new Date().toDateString();
    
    if (!stored) {
      return { 
        count: 0, 
        date: currentDate,
        lastUpdate: Date.now()
      };
    }

    const data = JSON.parse(stored) as DailyPlants;
    
    if (data.date !== currentDate) {
      return { 
        count: 0, 
        date: currentDate,
        lastUpdate: Date.now()
      };
    }

    if (typeof data.count !== 'number' || data.count < 0 || data.count > PLANT_LIMIT) {
      console.warn('Invalid plant count detected, resetting counter');
      return { 
        count: 0, 
        date: currentDate,
        lastUpdate: Date.now()
      };
    }

    return data;
  } catch (error) {
    console.error('Error reading daily plants data:', error);
    return { 
      count: 0, 
      date: new Date().toDateString(),
      lastUpdate: Date.now()
    };
  }
};

/**
 * Increment the daily questions counter
 * Returns the number of questions remaining
 */
export const incrementDailyQuestions = (): number => {
  try {
    const current = getDailyQuestions();
    const newCount = Math.min(current.count + 1, DAILY_LIMIT);
    
    const updatedData = {
      count: newCount,
      date: new Date().toDateString(),
      lastUpdate: Date.now()
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData));
    return DAILY_LIMIT - newCount;
  } catch (error) {
    console.error('Error incrementing daily questions:', error);
    return 0; // Return 0 remaining questions on error to prevent further queries
  }
};

/**
 * Increment the daily plants counter
 * Returns the number of plants remaining
 */
export const incrementDailyPlants = (): number => {
  try {
    const current = getDailyPlants();
    const newCount = Math.min(current.count + 1, PLANT_LIMIT);
    
    const updatedData = {
      count: newCount,
      date: new Date().toDateString(),
      lastUpdate: Date.now()
    };

    localStorage.setItem(PLANT_STORAGE_KEY, JSON.stringify(updatedData));
    return PLANT_LIMIT - newCount;
  } catch (error) {
    console.error('Error incrementing daily plants:', error);
    return 0;
  }
};

/**
 * Get the number of remaining questions for today
 */
export const getRemainingQuestions = (): number => {
  try {
    const current = getDailyQuestions();
    return Math.max(0, DAILY_LIMIT - current.count);
  } catch (error) {
    console.error('Error getting remaining questions:', error);
    return 0; // Return 0 on error to prevent further queries
  }
};

/**
 * Get the number of remaining plant identifications for today
 */
export const getRemainingPlants = (): number => {
  try {
    const current = getDailyPlants();
    return Math.max(0, PLANT_LIMIT - current.count);
  } catch (error) {
    console.error('Error getting remaining plants:', error);
    return 0;
  }
};

/**
 * Check if the daily limit has been reached
 */
export const hasReachedDailyLimit = (): boolean => {
  try {
    const current = getDailyQuestions();
    return current.count >= DAILY_LIMIT;
  } catch (error) {
    console.error('Error checking daily limit:', error);
    return true; // Return true on error to prevent further queries
  }
};

/**
 * Check if the daily plant identification limit has been reached
 */
export const hasReachedPlantLimit = (): boolean => {
  try {
    const current = getDailyPlants();
    return current.count >= PLANT_LIMIT;
  } catch (error) {
    console.error('Error checking plant limit:', error);
    return true;
  }
};