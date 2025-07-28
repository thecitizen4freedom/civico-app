import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getDatabase, ref, get, set } from "firebase/database";

// Configuración Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCCbtUzA9CRe7yJBvgpHMIEGfK2oi3a5RY",
  authDomain: "civicoapp-7bfe5.firebaseapp.com",
  projectId: "civicoapp-7bfe5",
  storageBucket: "civicoapp-7bfe5.firebasestorage.app",
  messagingSenderId: "735064125721",
  appId: "1:735064125721:web:e749c08988a3d835c69588",
  measurementId: "G-8T8G3776W5"
};

// Verificar si ya está inicializada
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getDatabase(app);

export { auth, provider, db, ref, get, set, signInWithPopup };
