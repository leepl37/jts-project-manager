// Configuration file for JTS Project Manager
// Copy this file to .env.local and fill in your actual values

export const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDgJ7Asl02Uxp_CIx9Hutyq26Vyx2L_ESs",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "jts-project-manager.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "jts-project-manager",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "jts-project-manager.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "266438273855",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:266438273855:web:41c6ac44644bc5b49fc18a"
};

export const geminiApiKey = process.env.REACT_APP_GEMINI_API_KEY || "your_gemini_api_key_here";
export const appId = process.env.REACT_APP_APP_ID || firebaseConfig.projectId;
