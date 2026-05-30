import { initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
} from "firebase/auth";

const requiredFirebaseEnv = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const localFirebaseConfig = {
    apiKey: "AIzaSyAd3JIr0OmH6Zzm-A4Uccgt_wcGZFSO6b8",
    authDomain: "markfinance-e9607.firebaseapp.com",
    projectId: "markfinance-e9607",
    storageBucket: "markfinance-e9607.firebasestorage.app",
    messagingSenderId: "110645427126",
    appId: "1:110645427126:web:f43b92e839172653fe5f17",
};

const firebaseConfig = {
    apiKey: requiredFirebaseEnv.apiKey || localFirebaseConfig.apiKey,
    authDomain:
        requiredFirebaseEnv.authDomain || localFirebaseConfig.authDomain,
    projectId:
        requiredFirebaseEnv.projectId || localFirebaseConfig.projectId,
    storageBucket:
        requiredFirebaseEnv.storageBucket || localFirebaseConfig.storageBucket,
    messagingSenderId:
        requiredFirebaseEnv.messagingSenderId ||
        localFirebaseConfig.messagingSenderId,
    appId: requiredFirebaseEnv.appId || localFirebaseConfig.appId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider =
    new GoogleAuthProvider();

googleProvider.setCustomParameters({
    prompt: "select_account",
});

export default app;
