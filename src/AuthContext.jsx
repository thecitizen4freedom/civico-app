import React, { useState, useEffect, useContext, createContext } from "react";
import {
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { auth, db } from "./firebase"; // Usa la instancia ya inicializada

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = ref(db, `usuarios/${user.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        await set(userRef, {
          correo: user.email,
          nombre: user.displayName,
          foto: user.photoURL,
          nivel: 1,
          experiencia: 0,
          titulo: "prospecto",
          rol: user.email === "thefenixrise@gmail.com" ? "admin" : "usuario"
        });
      }

      setCurrentUser(user);
    } catch (error) {
      console.error("Error en login con Google:", error);
    }
  };

  const logOut = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ currentUser, signInWithGoogle, logOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
