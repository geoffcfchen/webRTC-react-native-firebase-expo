import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBlYEAHVWYmDghYf1sHWap9c8UFAKlSYNc",
  authDomain: "wp-clone-256aa.firebaseapp.com",
  projectId: "wp-clone-256aa",
  storageBucket: "wp-clone-256aa.appspot.com",
  messagingSenderId: "979935378743",
  appId: "1:979935378743:web:c2ca33520c51cc8dbdaeb2",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const db = getFirestore(app);

export function signIn(email, password) {
  try {
    signInWithEmailAndPassword(auth, email, password).catch((error) => {
      console.log("Incorrect Email address or Password");
    });
  } catch (error) {
    alert(error.message);
  }
  return;
}

export function signUp(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}
