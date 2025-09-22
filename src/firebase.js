// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, increment, query, orderBy, where, getDoc } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
// import { debugFirebase } from "./debug.js"; // Commented out for production

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDiKKNFp9GHOj0pl6tqtzJBdLByWGilziY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "reportes-cr.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "reportes-cr",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "reportes-cr.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "726563480511",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:726563480511:web:c9acda60503611926af70a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-M7SN1PGPS3"
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
    console.log("Creating report with data:", reportData);
    const docRef = await addDoc(collection(db, "reports"), reportData);
    console.log("Report created with ID:", docRef.id);
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
  
  return onSnapshot(q, 
    (querySnapshot) => {
      const reports = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Raw report data from Firestore:', data);
        
        // Convert Firestore timestamp to JavaScript Date
        const processedData = {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
          // Ensure coordinates are at root level for backward compatibility
          latitude: data.latitude || data.location?.latitude,
          longitude: data.longitude || data.location?.longitude
        };
        
        console.log('Processed report data:', processedData);
        
        reports.push({
          id: doc.id,
          ...processedData
        });
      });
      console.log("Reports loaded:", reports.length);
      callback(reports);
    },
    (error) => {
      console.error("Error listening to reports:", error);
      // Return empty array on error
      callback([]);
    }
  );
};

export const confirmReport = async (reportId, userId = null) => {
  try {
    const reportRef = doc(db, "reports", reportId);
    // Get the current document first
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      throw new Error("Report not found");
    }
    
    const reportData = reportDoc.data();
    const confirmedBy = reportData.confirmed_by || [];
    
    // Check if user already confirmed (only if userId is provided)
    if (userId && confirmedBy.includes(userId)) {
      throw new Error("You have already confirmed this report");
    }
    
    // Update the document
    const updateData = {
      confirmations: increment(1)
    };
    
    // Only add to confirmed_by if userId is provided (authenticated user)
    if (userId) {
      updateData.confirmed_by = [...confirmedBy, userId];
    }
    
    await updateDoc(reportRef, updateData);
    
    console.log("Report confirmed successfully");
  } catch (error) {
    console.error("Error confirming report:", error);
    throw error;
  }
};