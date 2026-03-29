// Firebase Configuration Template
// Reemplaza estos valores con tu configuración de Firebase Console

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

// Colecciones de Firestore
export const COLLECTIONS = {
  USERS: 'users',
  VOTES: 'votes',
  GLOBAL_STATS: 'globalStats',
  DAILY_RESULTS: 'dailyResults'
} as const;

// Tipos de datos
export interface UserVote {
  userId: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  votes: Record<string, UserDayVotes>;  // fecha como key
  createdAt: number;
  lastVoteAt: number;
}

export interface UserDayVotes {
  president?: VoteEntry | null;
  senatorsNational?: VoteEntry | null;
  senatorsRegional?: VoteEntry | null;
  deputies?: VoteEntry | null;
  andeanParliament?: VoteEntry | null;
  completedAt?: number | null;
  [key: string]: VoteEntry | number | null | undefined;  // Flexible para otros campos
}

export interface VoteEntry {
  partyId: string;
  partyName: string;
  timestamp: number;
}

export interface GlobalStats {
  date: string;
  totalVotes: number;
  lastUpdated: number;
  categories: {
    president: Record<string, number>;  // partyId -> count
    senatorsNational: Record<string, number>;
    senatorsRegional: Record<string, number>;
    deputies: Record<string, number>;
    andeanParliament: Record<string, number>;
  };
}
