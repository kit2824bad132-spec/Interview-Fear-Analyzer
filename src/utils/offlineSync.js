import { openDB } from 'idb';

const DB_NAME = 'AssessmentOfflineDB';
const DB_VERSION = 1;

const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('assessments')) {
        db.createObjectStore('assessments', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('answers')) {
        db.createObjectStore('answers', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

export const saveAnswerOffline = async (answerData) => {
  try {
    const db = await initDB();
    await db.add('answers', { ...answerData, timestamp: Date.now(), synced: false });
    console.log('Answer saved offline.');
  } catch (error) {
    console.error('Failed to save offline data:', error);
  }
};

export const getPendingAnswers = async () => {
  try {
    const db = await initDB();
    const allAnswers = await db.getAll('answers');
    return allAnswers.filter(a => !a.synced);
  } catch (error) {
    console.error('Failed to get pending answers:', error);
    return [];
  }
};

export const markAsSynced = async (id) => {
  try {
    const db = await initDB();
    const answer = await db.get('answers', id);
    if (answer) {
      answer.synced = true;
      await db.put('answers', answer);
    }
  } catch (error) {
    console.error('Failed to mark as synced:', error);
  }
};

// Listen for online event and sync
window.addEventListener('online', async () => {
  console.log('Network back online. Attempting to sync offline data...');
  const pending = await getPendingAnswers();
  if (pending.length > 0) {
    // In a real app, send these to your backend here
    console.log(`Syncing ${pending.length} answers to server...`);
    // After success:
    for (let p of pending) {
      await markAsSynced(p.id);
    }
    console.log('Sync complete.');
  }
});
