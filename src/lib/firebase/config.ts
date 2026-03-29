// Firebase Configuration
// Simulador de Votación Peruana - Exit Poll

export const firebaseConfig = {
  apiKey: "AIzaSyDQcALdYlFLdo-bR34wIeAi_e-j1_TwiEg",
  authDomain: "exitpollsimulator.firebaseapp.com",
  projectId: "exitpollsimulator",
  storageBucket: "exitpollsimulator.firebasestorage.app",
  messagingSenderId: "306550697165",
  appId: "1:306550697165:web:3764508062c8ec6f9c8d84",
  measurementId: "G-GS8PBV6KHR"
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
  totalSimulations?: number; // Contador de simulaciones completadas (1 por cédula entregada)
  lastUpdated: number;
  categories: {
    president: Record<string, number>;  // partyId -> count
    senatorsNational: Record<string, number>;
    senatorsRegional: Record<string, number>;
    deputies: Record<string, number>;
    andeanParliament: Record<string, number>;
  };
  metadata?: {
    [category: string]: {
      [partyId: string]: {
        partyName: string;
        partyColor: string;
        partySymbolUrl: string;
      };
    };
  };
}
