const CREDENTIALS_KEY = "iam_credentials";
const DIDS_KEY = "iam_dids";

export interface StoredCredential {
  id: string;
  jwt: string;
  credential: any;
  receivedAt: string;
  issuer: string;
  holder: string;
  expirationDate?: string;
  ipfsURI?: string;
}

export interface StoredDID {
  did: string;
  address: string;
  publicKey?: string;
  createdAt: string;
}

export function storeCredential(credential: StoredCredential) {
  try {
    const stored = localStorage.getItem(CREDENTIALS_KEY);
    const credentials: StoredCredential[] = stored ? JSON.parse(stored) : [];

    if (!credentials.find(c => c.id === credential.id)) {
      credentials.push(credential);
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(credentials));
    }
  } catch (error) {
  }
}

export function getCredentials(): StoredCredential[] {
  try {
    const stored = localStorage.getItem(CREDENTIALS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

export function getCredential(id: string): StoredCredential | null {
  const credentials = getCredentials();
  return credentials.find(c => c.id === id) || null;
}

export function removeCredential(id: string) {
  try {
    const credentials = getCredentials();
    const filtered = credentials.filter(c => c.id !== id);
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(filtered));
  } catch (error) {
  }
}

export function storeDID(did: StoredDID) {
  try {
    const stored = localStorage.getItem(DIDS_KEY);
    const dids: StoredDID[] = stored ? JSON.parse(stored) : [];

    if (!dids.find(d => d.did === did.did)) {
      dids.push(did);
      localStorage.setItem(DIDS_KEY, JSON.stringify(dids));
    } else {
      const updated = dids.map(d => d.did === did.did ? did : d);
      localStorage.setItem(DIDS_KEY, JSON.stringify(updated));
    }
  } catch (error) {
  }
}

export function getDIDs(): StoredDID[] {
  try {
    const stored = localStorage.getItem(DIDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

export function getDID(did: string): StoredDID | null {
  const dids = getDIDs();
  return dids.find(d => d.did === did) || null;
}

export function clearStorage() {
  try {
    localStorage.removeItem(CREDENTIALS_KEY);
    localStorage.removeItem(DIDS_KEY);
  } catch (error) {
  }
}

