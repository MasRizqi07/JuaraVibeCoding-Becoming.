import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

// Verify environment parameters are correctly built and loaded
if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("[Firebase Init Warning] Firebase configuration parameters appear to be incomplete or missing. Check firebase-applet-config.json.");
} else {
  console.log("[Firebase Init] Config variables loaded successfully for project:", firebaseConfig.projectId);
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
