import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Debug Firebase connection
console.log('🔥 Firebase initialized:', {
  authExists: !!auth,
  dbExists: !!db,
  projectId: auth?.app?.options?.projectId
});

function App() {
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [currentEra, setCurrentEra] = useState('all');
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  useEffect(() => {
    const loadCards = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}cards.json`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Loaded cards:', data.length);

        setCards(data);
        setError(null);
      } catch (err) {
        console.error('❌ Error loading cards:', err);
        setError(`Failed to load cards.json. Make sure it's in the public folder! Error: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    // Check for shared collection
    const urlParams = new URLSearchParams(window.location.search);
    const sharedUserId = urlParams.get('user');

    if (sharedUserId) {
      setIsViewOnly(true);
      setUser({ uid: sharedUserId, email: 'Shared Collection' });
      loadCards();
      setTimeout(() => loadSharedCollection(sharedUserId), 500);
    } else {
      // Check auth state
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          console.log('👤 User logged in:', currentUser.email);
        } else {
          setShowAuth(true);
        }
      });

      loadCards();

      return unsubscribe;
    }
  }, []);

  // Load shared collection
  const loadSharedCollection = async (userId) => {
    setLoadingCollection(true);
    try {
      const docRef = doc(db, 'collections', userId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        console.log('📦 Loaded shared collection');

        setCards(prevCards =>
            prevCards.map(card => ({
              ...card,
              owned: userData[card.id] || 'no'
            }))
        );
      }
    } catch (err) {
      console.error('Error loading shared collection:', err);
    } finally {
      setLoadingCollection(false);
    }
  };

  // Load user's collection from Firebase when user changes
  useEffect(() => {
    if (!user || isViewOnly || cards.length === 0) return;

    const loadUserCollection = async () => {
      setLoadingCollection(true);
      try {
        const docRef = doc(db, 'collections', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const userData = docSnap.data();
          console.log('📦 Loaded user collection from Firebase');

          // Merge user's ownership data with card data
          setCards(prevCards =>
              prevCards.map(card => ({
                ...card,
                owned: userData[card.id] || 'no'
              }))
          );
        } else {
          console.log('📝 New user - will create collection on first save');
        }
      } catch (err) {
        console.error('Error loading user collection:', err);
      } finally {
        setLoadingCollection(false);
      }
    };

    loadUserCollection();
  }, [user, cards.length]);

  const toggleCardStatus = (cardId) => {
    if (isViewOnly) return;

    setCards(prevCards =>
        prevCards.map(card => {
          if (card.id === cardId) {
            let newStatus;
            if (card.owned === 'no') newStatus = 'ordered';
            else if (card.owned === 'ordered') newStatus = 'yes';
            else newStatus = 'no';

            // Save to Firebase
            saveCardStatus(cardId, newStatus);

            return { ...card, owned: newStatus };
        }
        return card;
      })
    );
  };

  const saveCardStatus = async (cardId, status) => {
    if (!user || isViewOnly) {
      console.log('⚠️ Cannot save - no user or view only mode');
      return;
    }

    try {
      console.log('💾 Attempting to save...', { cardId, status, userId: user.uid });

      const docRef = doc(db, 'collections', user.uid);

      // Get current data
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};

      console.log('📖 Current data exists:', docSnap.exists());

      // Update with new status
      const newData = {
        ...currentData,
        [cardId]: status,
        lastUpdated: new Date().toISOString()
      };

      await setDoc(docRef, newData);

      console.log(`✅ Successfully saved ${cardId}: ${status}`);
    } catch (err) {
      console.error('❌ Error saving to Firebase:', err);
      console.error('Error code:', err.code);
      console.error('Error message:', err.message);
      alert(`Failed to save changes: ${err.message}`);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log('✅ User created successfully');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ User signed in successfully');
      }

      setShowAuth(false);
    } catch (err) {
      console.error('❌ Auth error:', err);
      console.error('Error code:', err.code);

      let errorMessage = 'Authentication failed';

      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use. Try signing in instead.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Try signing up first.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak (minimum 6 characters)';
      } else if (err.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email/Password authentication is not enabled in Firebase Console. Please enable it first.';
      } else {
        errorMessage = `Authentication failed: ${err.message}`;
      }

      alert(errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setCards(prevCards => prevCards.map(card => ({ ...card, owned: 'no' })));
      setShowAuth(true);
      console.log('👋 User logged out');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?user=${user.uid}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  };

  const stats = {
    total: cards.length,
    owned: cards.filter(c => c.owned === 'yes').length,
    ordered: cards.filter(c => c.owned === 'ordered').length,
    needed: cards.filter(c => c.owned === 'no').length,
    completion: cards.length > 0 ? Math.round((cards.filter(c => c.owned === 'yes').length / cards.length) * 100) : 0
  };

  const filteredCards = cards.filter(card => {
    const statusMatch = currentFilter === 'all' || card.owned === currentFilter;
    const eraMatch = currentEra === 'all' || card.era === currentEra;
    return statusMatch && eraMatch;
  }).sort((a, b) => {
    // Sort by sheet_no (convert to number for proper sorting)
    const sheetA = parseInt(a.sheet_no) || 0;
    const sheetB = parseInt(b.sheet_no) || 0;

    if (sortOrder === 'asc') {
      return sheetA - sheetB;
    } else {
      return sheetB - sheetA;
    }
  });

  const eras = ['all', ...new Set(cards.map(c => c.era).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-purple-500"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl">🎴</div>
        </div>
        <div className="text-white text-3xl font-bold mb-4 mt-8 tracking-wider">YUKA MORII</div>
        <div className="text-purple-300 text-lg">Loading Collection...</div>
        {error && (
          <div className="bg-red-500 text-white px-6 py-3 rounded-lg max-w-md text-center mt-6">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (showAuth && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6TTI0IDZjMy4zMSAwIDYgMi42OSA2IDZzLTIuNjkgNi02IDYtNi0yLjY5LTYtNiAyLjY5LTYgNi02eiIgZmlsbD0iIzlkNGVkZCIgZmlsbC1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-20"></div>
        <div className="relative bg-slate-800 bg-opacity-90 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-purple-500/20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎴</div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Yuka Morii
            </h2>
            <p className="text-purple-300 text-sm">Trading Card Collection</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-purple-200 mb-2 font-medium text-sm">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl focus:border-purple-500 focus:outline-none text-white placeholder-slate-400 transition-all"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-purple-200 mb-2 font-medium text-sm">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl focus:border-purple-500 focus:outline-none text-white placeholder-slate-400 transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              onClick={handleAuth}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-[1.02] shadow-lg"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-purple-300 hover:text-purple-200 text-sm transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxIDAgNiAyLjY5IDYgNnMtMi42OSA2LTYgNi02LTIuNjktNi02IDIuNjktNiA2LTZ6TTI0IDZjMy4zMSAwIDYgMi42OSA2IDZzLTIuNjkgNi02IDYtNi0yLjY5LTYtNiAyLjY5LTYgNi02eiIgZmlsbD0iIzlkNGVkZCIgZmlsbC1vcGFjaXR5PSIuMDUiLz48L2c+PC9zdmc+')] opacity-20"></div>

      {/* Loading Collection Overlay */}
      {loadingCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-10 shadow-2xl border border-purple-500/30">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-purple-500"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl">🎴</div>
              </div>
              <div className="text-2xl font-bold text-white mt-6">Loading Collection</div>
              <div className="text-purple-300 mt-2">Syncing your cards...</div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-purple-500/30">
            <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">Share Collection</h3>
            <p className="text-purple-200 mb-4">Anyone with this link can view your collection:</p>
            <div className="bg-slate-700 p-4 rounded-xl mb-6 break-all text-sm font-mono text-purple-300 border border-slate-600">
              {`${window.location.origin}${window.location.pathname}?user=${user.uid}`}
            </div>
            <div className="flex gap-3">
              <button
                onClick={copyShareLink}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-[1.02]"
              >
                📋 Copy Link
              </button>
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 bg-slate-700 text-purple-200 py-3 rounded-xl font-semibold hover:bg-slate-600 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 mb-6 border border-purple-500/20">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="text-5xl">🎴</div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    Yuka Morii Collection
                  </h1>
                  <p className="text-purple-300 mt-1 text-sm">{isViewOnly ? '👁️ Viewing Shared Collection' : `👤 ${user?.email}`}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {!isViewOnly && (
                <button
                  onClick={handleShare}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all transform hover:scale-105 shadow-lg"
                >
                  🔗 Share
                </button>
              )}
              {!isViewOnly && (
                <button
                  onClick={handleLogout}
                  className="px-6 py-3 bg-slate-700 text-purple-200 rounded-xl font-semibold hover:bg-slate-600 transition-all border border-purple-500/30"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 mb-6 border border-purple-500/20">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl border border-purple-500/20">
              <div className="text-4xl font-bold text-purple-400">{stats.total}</div>
              <div className="text-purple-200 text-sm font-medium mt-2">Total Cards</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-900/40 to-green-800/40 rounded-xl border border-green-500/30">
              <div className="text-4xl font-bold text-green-400">{stats.owned}</div>
              <div className="text-green-200 text-sm font-medium mt-2">✓ Owned</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-yellow-900/40 to-yellow-800/40 rounded-xl border border-yellow-500/30">
              <div className="text-4xl font-bold text-yellow-400">{stats.ordered}</div>
              <div className="text-yellow-200 text-sm font-medium mt-2">⏳ Ordered</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl border border-slate-600">
              <div className="text-4xl font-bold text-slate-400">{stats.needed}</div>
              <div className="text-slate-300 text-sm font-medium mt-2">Needed</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-xl border border-blue-500/30">
              <div className="text-4xl font-bold text-blue-400">{stats.completion}%</div>
              <div className="text-blue-200 text-sm font-medium mt-2">Complete</div>
            </div>
          </div>
        </div>

        {/* Filters - Compact */}
        <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-4 mb-6 border border-purple-500/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="font-semibold text-purple-300 mb-2 block text-sm">🔍 Status</label>
              <div className="flex flex-wrap gap-2">
                {['all', 'yes', 'ordered', 'no'].map(status => (
                  <button
                    key={status}
                    onClick={() => setCurrentFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      currentFilter === status
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                        : 'bg-slate-700 text-purple-200 hover:bg-slate-600'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'yes' ? '✓ Owned' : status === 'ordered' ? '⏳ Ordered' : '○ Need'}
                  </button>
                ))}
              </div>
            </div>

            {/* Era Filter */}
            <div>
              <label className="font-semibold text-purple-300 mb-2 block text-sm">🎨 Era</label>
              <select
                value={currentEra}
                onChange={(e) => setCurrentEra(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-purple-200 text-sm focus:border-purple-500 focus:outline-none"
              >
                {eras.map(era => (
                  <option key={era} value={era}>
                    {era === 'all' ? 'All Eras' : era}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="font-semibold text-purple-300 mb-2 block text-sm">🔢 Sort</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sortOrder === 'asc'
                      ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white shadow-md'
                      : 'bg-slate-700 text-purple-200 hover:bg-slate-600'
                  }`}
                >
                  ⬆️ 1→223
                </button>
                <button
                  onClick={() => setSortOrder('desc')}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    sortOrder === 'desc'
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-md'
                      : 'bg-slate-700 text-purple-200 hover:bg-slate-600'
                  }`}
                >
                  ⬇️ 223→1
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card Grid */}
        <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-purple-500/20">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
            📚 Collection — {filteredCards.length} Cards
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-4">
            {filteredCards.map(card => (
              <div
                key={card.id}
                onClick={() => toggleCardStatus(card.id)}
                className={`group relative bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl overflow-hidden transition-all duration-300 border-2 ${
                  isViewOnly ? 'cursor-default' : 'cursor-pointer hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-2'
                } ${
                  card.owned === 'no' 
                    ? 'opacity-40 grayscale border-slate-600' 
                    : card.owned === 'yes'
                    ? 'border-green-500/50 shadow-lg shadow-green-500/20'
                    : 'border-yellow-500/50 shadow-lg shadow-yellow-500/20'
                }`}
              >
                <div className="aspect-[2/3] relative bg-slate-900">
                  <img
                    src={card.imageUrl || 'https://via.placeholder.com/200x280?text=No+Image'}
                    alt={card.name}
                    className="w-full h-full object-contain p-2"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/200x280/1e293b/9333ea?text=No+Image';
                    }}
                  />
                </div>
                {card.owned === 'yes' && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-lg animate-pulse">
                    ✓ OWNED
                  </div>
                )}
                {card.owned === 'ordered' && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-slate-900 px-2 py-1 rounded-lg text-xs font-bold shadow-lg">
                    ⏳ ORDERED
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2">
                  <div className="font-bold text-white text-[10px] truncate">{card.name}</div>
                  <div className="text-purple-300 text-[9px] truncate">#{card.number} • {card.set}</div>
                </div>
                {!isViewOnly && (
                  <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/10 transition-all duration-300 pointer-events-none"></div>
                )}
              </div>
            ))}
          </div>
          {filteredCards.length === 0 && (
            <div className="text-center text-purple-300 py-20">
              <div className="text-7xl mb-6 opacity-50">🔍</div>
              <div className="text-2xl font-semibold">No cards match your filters</div>
              <div className="text-sm mt-2 opacity-70">Try adjusting your filter selection</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;