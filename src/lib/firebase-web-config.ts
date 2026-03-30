type FirebaseWebEnv = Readonly<Record<string, string | undefined>>;

export const DEFAULT_FIREBASE_API_KEY = "AIzaSyDVIBj0IL04by7bWQkTWHbqS_-3Oam2_D0";
export const DEFAULT_FIREBASE_PROJECT_ID = "gen-lang-client-0586185740";
export const DEFAULT_FIREBASE_AUTH_DOMAIN = "dailysparks.geledtech.com";
export const DEFAULT_FIREBASE_STORAGE_BUCKET =
  "gen-lang-client-0586185740.firebasestorage.app";
export const DEFAULT_FIREBASE_MESSAGING_SENDER_ID = "551520576044";
export const DEFAULT_FIREBASE_APP_ID = "1:551520576044:web:083f09f90728215ed1a789";
export const DEFAULT_FIREBASE_HELPER_ORIGIN =
  "https://gen-lang-client-0586185740.firebaseapp.com";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getFirebaseWebConfig(env: FirebaseWebEnv = {}) {
  return {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ?? DEFAULT_FIREBASE_API_KEY,
    authDomain:
      env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? DEFAULT_FIREBASE_AUTH_DOMAIN,
    projectId:
      env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? DEFAULT_FIREBASE_PROJECT_ID,
    storageBucket:
      env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? DEFAULT_FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
      DEFAULT_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID ?? DEFAULT_FIREBASE_APP_ID,
  };
}

export function getFirebaseHelperOrigin(env: FirebaseWebEnv = {}) {
  return trimTrailingSlash(
    env.FIREBASE_HELPER_ORIGIN ??
      env.NEXT_PUBLIC_FIREBASE_HELPER_ORIGIN ??
      DEFAULT_FIREBASE_HELPER_ORIGIN,
  );
}

export function getFirebaseAuthProxyRewrites(env: FirebaseWebEnv = {}) {
  const helperOrigin = getFirebaseHelperOrigin(env);

  return [
    {
      source: "/__/auth/:path*",
      destination: `${helperOrigin}/__/auth/:path*`,
    },
    {
      source: "/__/firebase/:path*",
      destination: `${helperOrigin}/__/firebase/:path*`,
    },
  ];
}
