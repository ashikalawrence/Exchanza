import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

import { doc, getDoc, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [loading, setLoading] = useState(true);

  // SIGNUP
  const signup = async (email, password, fullName) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (fullName) {
      await updateProfile(userCredential.user, { displayName: fullName });
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        displayName: fullName,
        email: email,
        createdAt: new Date().toISOString(),
        role: 'user',
        banned: false
      });
      setUser({ ...userCredential.user, displayName: fullName });
    }
    return userCredential;
  };

  // LOGIN
  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  // LOGOUT
  const logout = () => signOut(auth);

  // GOOGLE LOGIN
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const u = result.user;
    const userRef = doc(db, 'users', u.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, {
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        photoURL: u.photoURL,
        createdAt: new Date().toISOString(),
        role: 'user',
        banned: false
      });
    }
    return result;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const snap = await getDoc(doc(db, 'users', currentUser.uid));
          if (snap.exists()) {
            const profile = snap.data();
            setUserProfile(profile);
            setIsAdmin(profile.role === 'admin');
            setIsBanned(profile.banned === true);
          } else {
            setUserProfile(null);
            setIsAdmin(false);
            setIsBanned(false);
          }
        } catch (err) {
          console.error('Profile fetch error:', err);
          setIsAdmin(false);
          setIsBanned(false);
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        setIsBanned(false);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = {
    user,
    userProfile,
    isAdmin,
    isBanned,
    signup,
    login,
    logout,
    loginWithGoogle,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};