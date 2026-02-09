import AsyncStorage from "@react-native-async-storage/async-storage";

const VISITOR_ID_KEY = "visitor_id";

function generateVisitorId(): string {
  if (typeof crypto !== "undefined" && (crypto as Crypto & { randomUUID?: () => string }).randomUUID) {
    return (crypto as Crypto & { randomUUID: () => string }).randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let cachedVisitorId: string | null = null;

export async function getVisitorId(): Promise<string> {
  if (cachedVisitorId) return cachedVisitorId;
  try {
    const stored = await AsyncStorage.getItem(VISITOR_ID_KEY);
    if (stored) {
      cachedVisitorId = stored;
      return stored;
    }
  } catch {}
  const id = generateVisitorId();
  try {
    await AsyncStorage.setItem(VISITOR_ID_KEY, id);
  } catch {}
  cachedVisitorId = id;
  return id;
}
