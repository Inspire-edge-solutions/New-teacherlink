// import { createContext, useContext, useEffect, useState } from 'react';
// import { getFirebaseAuth, getAuthMethods } from '../firebase';
// import axios from 'axios';
// import { toast } from 'react-toastify';

// // Define a more complete context type
// const AuthContext = createContext({
//   user: null,
//   loading: true,
//   setUser: (user) => {},
//   logout: () => Promise.resolve()
// });

// export const AuthProvider = ({ children }) => {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   // Add logout function
//   const logout = async () => {
//     try {
//       const auth = await getFirebaseAuth();
//       const { signOut } = await getAuthMethods();
//       await signOut(auth);
//       setUser(null);
//       localStorage.removeItem("user"); // Clear user data from localStorage
//       localStorage.removeItem("token"); // Remove token from localStorage
//       window.history.replaceState({}, '', '/'); // Clear browser history
//       toast.success('Logged out successfully');
//     } catch (error) {
//       console.error("Logout error:", error);
//       toast.error('Error during logout');
//       throw error;
//     }
//   };

//   useEffect(() => {
//     let unsubscribe = null;
    
//     const initFirebaseAuth = async () => {
//       try {
//         const auth = await getFirebaseAuth();
//         const { onAuthStateChanged } = await getAuthMethods();
        
//         unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
//           if (firebaseUser) {
//             try {
//               // Get the auth token from Firebase
//               const token = await firebaseUser.getIdToken();
              
//               // Fetch user data from your API
//               const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${firebaseUser.uid}`, {
//                 headers: {
//                   'Authorization': `Bearer ${token}`
//                 }
//               });

//               if (!response.ok) {
//                 console.error("API error:", await response.text());
//                 setUser(null);
//                 setLoading(false);
//                 return;
//               }

//               const userData = await response.json();
//               setUser(userData);
//             } catch (error) {
//               console.error("Error fetching user data:", error);
//               setUser(null);
//             }
//           } else {
//             setUser(null);
//           }
//           setLoading(false);
//         });
//       } catch (error) {
//         console.error("Error initializing Firebase Auth:", error);
//         setLoading(false);
//       }
//     };

//     initFirebaseAuth();

//     return () => {
//       if (unsubscribe) {
//         unsubscribe();
//       }
//     };
//   }, []);

//   // Create a value object with all the context values
//   const value = {
//     user,
//     loading,
//     setUser,
//     logout
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {!loading && children}
//     </AuthContext.Provider>
//   );
// };

// export const useAuth = () => {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// }; 



import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { getFirebaseAuth, getAuthMethods } from '../firebase';
import axios from 'axios';
import { toast } from 'react-toastify';
import { checkIfBlocked } from '../utils/blockedUserCheck';

// Define a more complete context type
const AuthContext = createContext({
  user: null,
  loading: true,
  setUser: (user) => {},
  logout: () => Promise.resolve()
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const lastProcessedUid = useRef(null); // Track last processed user ID
  const lastProcessedTime = useRef(0); // Track when last processed

  // Add logout function
  const logout = async () => {
    try {
      console.log("Starting logout process...");
      setIsLoggingOut(true); // Prevent API calls during logout
      setUser(null); // Clear user immediately
      lastProcessedUid.current = null; // Reset the last processed UID
      lastProcessedTime.current = 0; // Reset the last processed time
      
      const auth = await getFirebaseAuth();
      const { signOut } = await getAuthMethods();
      
      // Force sign out and clear persistence
      await signOut(auth);
      console.log("Firebase signOut completed");
      
      // Clear all stored data
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.clear(); // Clear session storage too
      console.log("Local storage cleared");
      
      // Clear browser history
      window.history.replaceState({}, '', '/');
      
      // Navigate to home page
      window.location.href = '/home';
      
      toast.success('Logged out successfully');
      console.log("Logout completed successfully");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error('Error during logout');
      throw error;
    } finally {
      // Keep isLoggingOut true for a bit longer to prevent immediate re-auth
      setTimeout(() => {
        console.log("Re-enabling auth state changes");
        setIsLoggingOut(false);
      }, 2000); // Increased delay to 2 seconds
    }
  };

  useEffect(() => {
    let unsubscribe = null;
    
    const initFirebaseAuth = async () => {
      try {
        const auth = await getFirebaseAuth();
        const { onAuthStateChanged } = await getAuthMethods();
        
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log("Auth state changed - Firebase user:", firebaseUser ? firebaseUser.uid : "null");
          console.log("Is logging out:", isLoggingOut);

          // CRITICAL: Check if Google profile completion is in progress
          const googleProfileIncomplete = sessionStorage.getItem('googleProfileIncomplete');
          const googleProfileUid = sessionStorage.getItem('googleProfileFirebaseUid');
          
          if (googleProfileIncomplete === 'true' && firebaseUser && firebaseUser.uid === googleProfileUid) {
            console.log("Google profile completion in progress - skipping auth state update");
            setLoading(false);
            return; // Skip processing to let LoginWithSocial handle the flow
          }

          if (firebaseUser && !isLoggingOut) {
            try {
              console.log("Firebase UID:", firebaseUser.uid);
              lastProcessedUid.current = firebaseUser.uid; // Mark this UID as processed
              lastProcessedTime.current = Date.now(); // Mark the time

              // Get the auth token from Firebase
              const token = await firebaseUser.getIdToken();
              // Store token in localStorage for API calls
              localStorage.setItem("token", token);

              // Check if user data is already in localStorage (from Google login)
              const storedUser = localStorage.getItem("user");
              if (storedUser) {
                try {
                  const parsedUser = JSON.parse(storedUser);
                  console.log("Found stored user data:", parsedUser);

                  // Only use stored data if it matches the current Firebase user
                  if (parsedUser.firebase_uid === firebaseUser.uid) {
                    // SECURITY: Check if user is blocked before using cached data
                    console.log("Checking if cached user is blocked...");
                    const blockedCheck = await checkIfBlocked(firebaseUser.uid, firebaseUser.email);
                    
                    if (blockedCheck.isBlocked) {
                      console.log("Cached user is blocked, signing out...");
                      const auth = await getFirebaseAuth();
                      const { signOut } = await getAuthMethods();
                      await signOut(auth);
                      localStorage.removeItem("user");
                      localStorage.removeItem("token");
                      setUser(null);
                      setLoading(false);
                      toast.error("Your account has been blocked. Please contact support.");
                      return;
                    }

                    // Create a merged user object with Firebase and stored data
                    const mergedUser = {
                      ...firebaseUser,
                      user_type: parsedUser.user_type,
                      name: parsedUser.name,
                      email: parsedUser.email,
                      phone_number: parsedUser.phone_number,
                      is_active: parsedUser.is_active,
                      is_google_account: parsedUser.is_google_account,
                      ...parsedUser
                    };

                    console.log("Merged User from localStorage:", mergedUser);
                    setUser(mergedUser);
                    setLoading(false);
                    return; // Skip API call if we have valid stored data
                  } else {
                    console.log("Stored user UID doesn't match current Firebase UID, will fetch fresh data");
                    localStorage.removeItem("user"); // Clear stale data
                  }
                } catch (parseError) {
                  console.warn("Failed to parse stored user data:", parseError);
                  localStorage.removeItem("user"); // Clear invalid data
                }
              }

              // Add a small delay to allow Google login component to complete its API call
              await new Promise(resolve => setTimeout(resolve, 100));

              // SECURITY: Check if user is blocked (critical for persistent auth)
              console.log("Checking if user is blocked on auto-login...");
              const blockedCheck = await checkIfBlocked(firebaseUser.uid, firebaseUser.email);
              
              if (blockedCheck.isBlocked) {
                console.log("User is blocked, signing out and clearing session...");
                // User is blocked - sign out and clear everything
                const auth = await getFirebaseAuth();
                const { signOut } = await getAuthMethods();
                await signOut(auth);
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                setUser(null);
                setLoading(false);
                toast.error("Your account has been blocked. Please contact support.");
                return;
              }

              // Try to get user data from the working login API
              try {
                const LOGIN_API = "https://l4y3zup2k2.execute-api.ap-south-1.amazonaws.com/dev/login";
                const response = await axios.get(LOGIN_API, {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  timeout: 5000 // 5 second timeout
                });

                // Find the user data for this firebase_uid
                const users = response.data;
                const userData = users.find(user => user.firebase_uid === firebaseUser.uid);

                if (userData) {
                  console.log("User data found from API:", userData);

                  // SECURITY: Double-check isBlocked from API response (if available)
                  if (userData.isBlocked === 1 || userData.isBlocked === "1") {
                    console.log("User is blocked according to API, signing out...");
                    const auth = await getFirebaseAuth();
                    const { signOut } = await getAuthMethods();
                    await signOut(auth);
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                    setUser(null);
                    setLoading(false);
                    toast.error("Your account has been blocked. Please contact support.");
                    return;
                  }

                  // Create a merged user object with the correct user_type
                  const mergedUser = {
                    ...firebaseUser,
                    user_type: userData.user_type,
                    name: userData.name,
                    email: userData.email,
                    phone_number: userData.phone_number,
                    is_active: userData.is_active,
                    is_google_account: userData.is_google_account,
                    ...userData
                  };

                  console.log("Merged User from API:", mergedUser);
                  setUser(mergedUser);

                  // Store the user data for future use
                  localStorage.setItem("user", JSON.stringify(userData));
                } else {
                  console.log("User not found in API response");
                  // Check if Google profile completion is in progress
                  const googleProfileIncomplete = sessionStorage.getItem('googleProfileIncomplete');
                  if (googleProfileIncomplete === 'true') {
                    console.log("User not found but Google profile completion in progress - not setting user");
                    setUser(null); // Don't set user until profile is complete
                  } else {
                    // CRITICAL: Don't use Firebase user only as fallback - it lacks user_type
                    // This prevents redirect loops caused by incomplete user data
                    console.log("User not found in API - clearing auth state to prevent redirect loops");
                    // Clear any stale localStorage data
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                    setUser(null); // Set to null instead of incomplete Firebase user
                  }
                }

              } catch (apiError) {
                console.log("API call failed:", apiError.message);
                // Check if Google profile completion is in progress
                const googleProfileIncomplete = sessionStorage.getItem('googleProfileIncomplete');
                if (googleProfileIncomplete === 'true') {
                  console.log("API call failed but Google profile completion in progress - not setting user");
                  setUser(null); // Don't set user until profile is complete
                } else {
                  // CRITICAL: Don't use Firebase user only as fallback - it lacks user_type
                  // This prevents redirect loops caused by incomplete user data
                  console.log("API call failed - clearing auth state to prevent redirect loops");
                  // Clear any stale localStorage data
                  localStorage.removeItem("user");
                  localStorage.removeItem("token");
                  setUser(null); // Set to null instead of incomplete Firebase user
                }
              }

            } catch (error) {
              console.error("Error fetching user data:", error);
              setUser(null);
            }
          } else {
            console.log("Setting user to null - Firebase user:", firebaseUser ? "exists" : "null", "isLoggingOut:", isLoggingOut);
            setUser(null);
            lastProcessedUid.current = null;
            lastProcessedTime.current = 0;
          }
          setLoading(false);
        });
      } catch (error) {
        console.error("Error initializing Firebase Auth:", error);
        setLoading(false);
      }
    };

    initFirebaseAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isLoggingOut]);

  // Create a value object with all the context values
  const value = {
    user,
    loading,
    setUser,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};