const runtimeConfig = window.__FIREBASE_CONFIG__ ?? {};

export const firebaseWebConfig = {
  apiKey: runtimeConfig.apiKey ?? "REPLACE_ME",
  authDomain: runtimeConfig.authDomain ?? "REPLACE_ME",
  projectId: runtimeConfig.projectId ?? "REPLACE_ME",
  storageBucket: runtimeConfig.storageBucket ?? "REPLACE_ME",
  messagingSenderId: runtimeConfig.messagingSenderId ?? "REPLACE_ME",
  appId: runtimeConfig.appId ?? "REPLACE_ME",
  measurementId: runtimeConfig.measurementId ?? ""
};

export function isFirebaseConfigured() {
  return Object.values(firebaseWebConfig).every(
    (value) => typeof value === "string" && value.trim() !== "" && value !== "REPLACE_ME"
  );
}
