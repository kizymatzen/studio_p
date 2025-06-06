
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAzDdhkTEj7tQyeTQabzSbyR2b9GttaUMM",
  authDomain: "little-steps-778de.firebaseapp.com",
  projectId: "little-steps-778de",
  storageBucket: "little-steps-778de.appspot.com",
  messagingSenderId: "914168836535",
  appId: "1:914168836535:web:d0fd67316ea14ed338b832",
  measurementId: "G-B56JF9LP2B"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

auth = getAuth(app);
db = getFirestore(app);

export { app, auth, db };
