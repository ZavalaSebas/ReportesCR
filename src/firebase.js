// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, increment, query, orderBy, where, getDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDiKKNFp9GHOj0pl6tqtzJBdLByWGilziY",
  authDomain: "reportes-cr.firebaseapp.com",
  projectId: "reportes-cr",
  storageBucket: "reportes-cr.firebasestorage.app",
  messagingSenderId: "726563480511",
  appId: "1:726563480511:web:c9acda60503611926af70a",
  measurementId: "G-M7SN1PGPS3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Authentication functions
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error logging in with Google:", error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error logging out:", error);
    throw error;
  }
};

// Firestore functions for reports
export const createReport = async (reportData) => {
  try {
    const docRef = await addDoc(collection(db, "reports"), {
      ...reportData,
      createdAt: new Date(),
      confirmations: 0,
      confirmed_by: []
    });
    console.log("Report created with ID: ", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating report:", error);
    throw error;
  }
};

export const subscribeToReports = (callback) => {
  const q = query(
    collection(db, "reports"),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const reports = [];
    querySnapshot.forEach((doc) => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(reports);
  });
};

export const confirmReport = async (reportId, userId) => {
  try {
    const reportRef = doc(db, "reports", reportId);
    await updateDoc(reportRef, {
      confirmations: increment(1),
      confirmed_by: [...(await getDoc(reportRef)).data().confirmed_by || [], userId]
    });
  } catch (error) {
    console.error("Error confirming report:", error);
    throw error;
  }
};