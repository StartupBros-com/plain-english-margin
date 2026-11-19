import type { FirebaseApp } from 'firebase/app';
import { sanitizeTermsForSync, type TermSync } from './sync';

/**
 * Optional sync of the known-terms list only (term names, never page text).
 * Anonymous Firebase Auth gives each install its own document; Firestore rules should
 * let a user read and write only `users/{uid}`. Loaded lazily, so it costs nothing while the setting is off.
 */
export async function createFirestoreSync(app: FirebaseApp): Promise<TermSync> {
  const [{ getAuth, signInAnonymously }, { doc, getDoc, getFirestore, setDoc }] = await Promise.all([
    import('firebase/auth'),
    import('firebase/firestore'),
  ]);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const ref = async () => {
    const uid = auth.currentUser?.uid ?? (await signInAnonymously(auth)).user.uid;
    return doc(db, 'users', uid);
  };
  return {
    async pull() {
      const snap = await getDoc(await ref());
      const data = snap.data();
      return Array.isArray(data?.knownTerms) ? sanitizeTermsForSync(data.knownTerms.filter((t: unknown): t is string => typeof t === 'string')) : [];
    },
    async push(terms) {
      await setDoc(await ref(), { knownTerms: sanitizeTermsForSync(terms) });
    },
  };
}
