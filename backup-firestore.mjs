// Eenmalig/herbruikbaar back-upscript: exporteert alle Firestore-collecties naar lokale JSON.
// Draai met: node backup-firestore.mjs
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { writeFileSync, mkdirSync } from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyBbj2R7hHQ-DaZxhmJoTaexbvXEWPucw0w",
  authDomain: "football-tracker-c0635.firebaseapp.com",
  projectId: "football-tracker-c0635",
  storageBucket: "football-tracker-c0635.firebasestorage.app",
  messagingSenderId: "949352436238",
  appId: "1:949352436238:web:09cb2453c0a9176b71e25f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const COLLECTIONS = ['players', 'games', 'parents'];

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir = new URL(`./backups/${timestamp}/`, import.meta.url).pathname;
  mkdirSync(outDir, { recursive: true });

  for (const name of COLLECTIONS) {
    const snapshot = await getDocs(collection(db, name));
    const docs = snapshot.docs.map((d) => ({ id: d.id, data: d.data() }));
    const filePath = `${outDir}${name}.json`;
    writeFileSync(filePath, JSON.stringify(docs, null, 2));
    console.log(`${name}: ${docs.length} document(en) -> ${filePath}`);
  }

  console.log(`\nBack-up compleet in: ${outDir}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error('FOUT tijdens back-up:', err);
  process.exit(1);
});
