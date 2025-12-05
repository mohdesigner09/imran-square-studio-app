// auth.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// yahan Firebase console se mila hua config paste karo
const firebaseConfig = {
  apiKey: "AIzaSyA_D3AuwSzHKgs5svcwRoP0St2Nc-delF8",
  authDomain: "iimransquare.firebaseapp.com",
  projectId: "iimransquare",
  storageBucket: "iimransquare.firebasestorage.app",
  messagingSenderId: "431645042472",
  appId: "1:431645042472:web:87e7cea4659d6a0564121d",
  measurementId: "G-Z0EN14J4XM"
};


const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Firebase user -> tumhara local imranUser
function mapUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Guest",
    email: user.email,
    photo: user.photoURL,
    phone: user.phoneNumber,
    provider: user.providerData?.[0]?.providerId || "password"
  };
}

// state sync
onAuthStateChanged(auth, (user) => {
  const mapped = mapUser(user);
  if (mapped) {
    localStorage.setItem("imranUser", JSON.stringify(mapped));
  } else {
    localStorage.removeItem("imranUser");
  }
});

// global helpers
window.imranAuth = {
  signInWithGoogle: () => signInWithPopup(auth, provider),
  signUpWithEmail: (email, password) =>
    createUserWithEmailAndPassword(auth, email, password),
  signInWithEmail: (email, password) =>
    signInWithEmailAndPassword(auth, email, password),
  signOut: () => signOut(auth)
};
