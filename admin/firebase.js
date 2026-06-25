import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

const firebaseConfig = {
   apiKey: "AIzaSyBMScsarZua1lDu29-oc4P74-Km3GItMsg",
   authDomain: "milfey-kondyterka.firebaseapp.com",
   projectId: "milfey-kondyterka",
   storageBucket: "milfey-kondyterka.firebasestorage.app",
   messagingSenderId: "68782081603",
   appId: "1:68782081603:web:c8ebf7a592707fe3cd76f6",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
