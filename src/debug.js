// Debug utilities for Firebase
export const debugFirebase = {
  logAuthState: (user) => {
    console.group('🔐 Firebase Auth Debug');
    console.log('User authenticated:', !!user);
    if (user) {
      console.log('User ID:', user.uid);
      console.log('User email:', user.email);
      console.log('User display name:', user.displayName);
      console.log('User token valid:', !!user.accessToken);
    }
    console.groupEnd();
  },
  
  logFirestoreOperation: (operation, data, error = null) => {
    console.group(`🔥 Firestore ${operation}`);
    if (error) {
      console.error('Error:', error);
      console.log('Error code:', error.code);
      console.log('Error message:', error.message);
    } else {
      console.log('Data:', data);
      console.log('Operation successful');
    }
    console.groupEnd();
  }
};