import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, enableIndexedDbPersistence } from 'firebase/firestore';

/**
 * Firebase Configuration
 * 
 * To enable cross-device synchronization, create a Firebase project and replace these values:
 * 
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or use an existing one)
 * 3. Enable Firestore Database in the project
 * 4. Go to Project Settings > Your apps > Add app (Web)
 * 5. Copy the firebaseConfig values below
 * 6. For production, set these as environment variables:
 *    - VITE_FIREBASE_API_KEY
 *    - VITE_FIREBASE_AUTH_DOMAIN
 *    - VITE_FIREBASE_PROJECT_ID
 *    - VITE_FIREBASE_STORAGE_BUCKET
 *    - VITE_FIREBASE_MESSAGING_SENDER_ID
 *    - VITE_FIREBASE_APP_ID
 * 
 * IMPORTANT: Set Firestore security rules to allow read/write:
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /{document=**} {
 *       allow read, write: if true;
 *     }
 *   }
 * }
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Check if Firebase is properly configured
const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.apiKey !== "YOUR_API_KEY" &&
         firebaseConfig.projectId && 
         firebaseConfig.projectId !== "YOUR_PROJECT_ID";
};

// Initialize Firebase only if configured
let app = null;
let db = null;

if (isFirebaseConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    // Enable offline persistence for better UX
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firestore persistence unavailable: multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Firestore persistence unavailable: browser not supported');
      }
    });
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
} else {
  console.info('Firebase not configured. Data will be stored locally only. See src/firebase.js for setup instructions.');
}

// Collection references
const GAMES_COLLECTION = 'games';
const TRACKS_COLLECTION = 'tracks';

/**
 * Check if Firebase is available and configured
 * @returns {boolean} True if Firebase is ready to use
 */
export const isFirebaseAvailable = () => {
  return db !== null && isFirebaseConfigured();
};

/**
 * Generates a unique session ID with timestamp and random component
 * Format: SESSION-{timestamp}-{random4chars}-{random4chars}
 */
export const generateSessionId = () => {
  const timestamp = Date.now();
  const random1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const random2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SESSION-${timestamp}-${random1}-${random2}`;
};

/**
 * Subscribe to real-time updates for games collection
 * @param {Function} callback - Function to call when data changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToGames = (callback) => {
  if (!isFirebaseAvailable()) {
    // Return empty unsubscribe function if Firebase is not configured
    return () => {};
  }
  
  const gamesQuery = query(collection(db, GAMES_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(gamesQuery, (snapshot) => {
    const games = snapshot.docs.map(doc => ({
      ...doc.data(),
      firestoreId: doc.id
    }));
    callback(games);
  }, (error) => {
    console.error('Error subscribing to games:', error);
    // Fallback to empty array on error
    callback([]);
  });
};

/**
 * Subscribe to real-time updates for tracks collection
 * @param {Function} callback - Function to call when data changes
 * @returns {Function} Unsubscribe function
 */
export const subscribeToTracks = (callback) => {
  if (!isFirebaseAvailable()) {
    // Return empty unsubscribe function if Firebase is not configured
    return () => {};
  }
  
  const tracksQuery = query(collection(db, TRACKS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(tracksQuery, (snapshot) => {
    const tracks = snapshot.docs.map(doc => ({
      ...doc.data(),
      firestoreId: doc.id
    }));
    callback(tracks);
  }, (error) => {
    console.error('Error subscribing to tracks:', error);
    callback([]);
  });
};

/**
 * Save a new game to Firestore
 * @param {Object} game - Game object to save
 * @returns {Promise<Object>} The saved game with Firestore ID
 */
export const saveGame = async (game) => {
  if (!isFirebaseAvailable()) {
    console.info('Firebase not configured. Game saved locally only.');
    return game;
  }
  
  const gameData = {
    ...game,
    sessionId: game.sessionId || generateSessionId(),
    createdAt: game.createdAt || Date.now(),
    updatedAt: Date.now(),
    // Store metadata about the content
    metadata: {
      hasCustomImage: !!game.customImage,
      hasAudioTrack: !!game.audioTrack,
      imageSize: game.customImage ? game.customImage.length : 0,
      timestamp: new Date().toISOString()
    }
  };

  try {
    const docRef = await addDoc(collection(db, GAMES_COLLECTION), gameData);
    return { ...gameData, firestoreId: docRef.id };
  } catch (error) {
    console.error('Error saving game:', error);
    throw error;
  }
};

/**
 * Update an existing game in Firestore
 * @param {string} firestoreId - The Firestore document ID
 * @param {Object} game - Updated game data
 * @returns {Promise<Object>} The updated game
 */
export const updateGame = async (firestoreId, game) => {
  if (!isFirebaseAvailable()) {
    console.info('Firebase not configured. Game updated locally only.');
    return game;
  }
  
  const gameData = {
    ...game,
    updatedAt: Date.now(),
    metadata: {
      ...game.metadata,
      hasCustomImage: !!game.customImage,
      hasAudioTrack: !!game.audioTrack,
      imageSize: game.customImage ? game.customImage.length : 0,
      lastModified: new Date().toISOString()
    }
  };

  try {
    const docRef = doc(db, GAMES_COLLECTION, firestoreId);
    await updateDoc(docRef, gameData);
    return { ...gameData, firestoreId };
  } catch (error) {
    console.error('Error updating game:', error);
    throw error;
  }
};

/**
 * Delete a game from Firestore
 * @param {string} firestoreId - The Firestore document ID
 */
export const deleteGame = async (firestoreId) => {
  if (!isFirebaseAvailable()) {
    console.info('Firebase not configured. Cannot delete from cloud.');
    return;
  }
  
  try {
    await deleteDoc(doc(db, GAMES_COLLECTION, firestoreId));
  } catch (error) {
    console.error('Error deleting game:', error);
    throw error;
  }
};

/**
 * Save a new track to Firestore
 * @param {Object} track - Track object to save
 * @returns {Promise<Object>} The saved track with Firestore ID
 */
export const saveTrack = async (track) => {
  if (!isFirebaseAvailable()) {
    console.info('Firebase not configured. Track saved locally only.');
    return track;
  }
  
  const trackData = {
    ...track,
    sessionId: track.sessionId || generateSessionId(),
    createdAt: track.createdAt || Date.now(),
    updatedAt: Date.now(),
    metadata: {
      hasUrl: !!track.url,
      type: track.type,
      timestamp: new Date().toISOString()
    }
  };

  try {
    const docRef = await addDoc(collection(db, TRACKS_COLLECTION), trackData);
    return { ...trackData, firestoreId: docRef.id };
  } catch (error) {
    console.error('Error saving track:', error);
    throw error;
  }
};

/**
 * Delete a track from Firestore
 * @param {string} firestoreId - The Firestore document ID
 */
export const deleteTrack = async (firestoreId) => {
  if (!isFirebaseAvailable()) {
    console.info('Firebase not configured. Cannot delete from cloud.');
    return;
  }
  
  try {
    await deleteDoc(doc(db, TRACKS_COLLECTION, firestoreId));
  } catch (error) {
    console.error('Error deleting track:', error);
    throw error;
  }
};

export { db };
