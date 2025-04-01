const DAILY_LIMIT = 5;
const STORAGE_KEY = 'avoai_daily_questions';

interface DailyQuestions {
  count: number;
  date: string;
}

export const getDailyQuestions = (): DailyQuestions => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { count: 0, date: new Date().toDateString() };
  }

  const data = JSON.parse(stored) as DailyQuestions;
  if (data.date !== new Date().toDateString()) {
    return { count: 0, date: new Date().toDateString() };
  }

  return data;
};

export const incrementDailyQuestions = (): number => {
  const current = getDailyQuestions();
  const newCount = current.count + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    count: newCount,
    date: new Date().toDateString()
  }));
  return DAILY_LIMIT - newCount;
};

export const getRemainingQuestions = (): number => {
  const current = getDailyQuestions();
  return DAILY_LIMIT - current.count;
};

export const hasReachedDailyLimit = (): boolean => {
  const current = getDailyQuestions();
  return current.count >= DAILY_LIMIT;
};