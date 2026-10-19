export const getRandomActivities = (activities, min = 2, max = 3) => {
  if (!Array.isArray(activities) || activities.length === 0) {
    return [];
  }

  const shuffled = [...activities].sort(() => Math.random() - 0.5);
  const count = Math.min(shuffled.length, Math.floor(Math.random() * (max - min + 1)) + min);

  return shuffled.slice(0, count);
};
