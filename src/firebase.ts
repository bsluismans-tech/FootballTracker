import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  // PLAK HIER DE CONFIG DIE JE BIJ STAP 1 HEBT GEKOPIEERD
  apiKey: "AIzaSyBbj2R7hHQ-DaZxhmJoTaexbvXEWPucw0w",
  authDomain: "football-tracker-c0635.firebaseapp.com",
  projectId: "football-tracker-c0635",
  storageBucket: "football-tracker-c0635.firebasestorage.app",
  messagingSenderId: "949352436238",
  appId: "1:949352436238:web:09cb2453c0a9176b71e25f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);