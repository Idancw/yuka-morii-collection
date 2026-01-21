import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [sharedOwnerEmail, setSharedOwnerEmail] = useState(null);

  useEffect(() => {
    const loadCards = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}cards.json`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log('✅ Loaded cards:', data.length);
        setCards(data);
        setError(null);
      } catch (err) {
        console.error('❌ Error loading cards:', err);
        setError(`Failed to load cards.json: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    const urlParams = new URLSearchParams(window.location.search);
    const sharedUserId = urlParams.get('user');

    if (sharedUserId) {
      setIsViewOnly(true);
      setUser({ uid: sharedUserId, email: 'Shared Collection' });
      loadCards();
      setTimeout(() => loadSharedCollection(sharedUserId), 500);
    } else {
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


  const loadSharedCollection = async (userId) => {
    setLoadingCollection(true);
    try {
      const docRef = doc(db, 'collections', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();
        const ownerEmail = userData.ownerEmail || 'A Collector';
        setSharedOwnerEmail(ownerEmail);
        setUser({uid: userId, email: ownerEmail});
        setCards(prevCards => prevCards.map(card => ({
          ...card,
          variations: enrichVariationsWithUserData(card.variations, userData[card.id])
        })));
      }
    } catch (err) {
      console.error('Error loading shared collection:', err);
    } finally {
      setLoadingCollection(false);
    }
  };

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
          setCards(prevCards => prevCards.map(card => ({
            ...card,
            variations: enrichVariationsWithUserData(card.variations, userData[card.id])
          })));
        }
      } catch (err) {
        console.error('Error loading user collection:', err);
      } finally {
        setLoadingCollection(false);
      }
    };

    loadUserCollection();
  }, [user, cards.length]);

  const enrichVariationsWithUserData = (variations, userData) => {
    if (!variations) return {normal: {count: 0, ordered: false, languages: []}};
    if (!userData) return variations;

    const enriched = {...variations};
    Object.keys(enriched).forEach(varType => {
      if (userData[varType]) {
        enriched[varType] = {...enriched[varType], ...userData[varType]};
      }
    });
    return enriched;
  };

  const toggleOrdered = (cardId, variationType, e) => {
    if (e) e.stopPropagation();
    if (isViewOnly) return;

    setCards(prevCards => {
      const newCards = prevCards.map(card => {
        if (card.id === cardId && card.variations[variationType]) {
          const currentOrdered = card.variations[variationType].ordered || false;
          const currentCount = card.variations[variationType].count || 0;

          // Only allow toggling ordered if count is 0
          if (currentCount > 0) return card;

          const updatedVariations = {
            ...card.variations,
            [variationType]: {
              ...card.variations[variationType],
              ordered: !currentOrdered
            }
          };
          saveCardStatus(cardId, updatedVariations);
          return {...card, variations: updatedVariations};
        }
        return card;
      });

      // Update selected card if it's open
      const updatedCard = newCards.find(c => c.id === cardId);
      if (updatedCard && selectedCard?.id === cardId) {
        setSelectedCard(updatedCard);
      }

      return newCards;
    });
  };

  const incrementCount = (cardId, variationType, e) => {
    if (e) e.stopPropagation();
    if (isViewOnly) return;

    setCards(prevCards => {
      const newCards = prevCards.map(card => {
        if (card.id === cardId && card.variations[variationType]) {
          const currentCount = card.variations[variationType].count || 0;
          const defaultLanguage = card.variations[variationType].default_language || 'EN';
          const updatedVariations = {
            ...card.variations,
            [variationType]: {
              ...card.variations[variationType],
              count: currentCount + 1,
              ordered: false,
              languages: currentCount === 0 ? [defaultLanguage] : (card.variations[variationType].languages || [])

            }
          };
          saveCardStatus(cardId, updatedVariations);
          return {...card, variations: updatedVariations};
        }
        return card;
      });

      // Update selected card if it's open
      const updatedCard = newCards.find(c => c.id === cardId);
      if (updatedCard && selectedCard?.id === cardId) {
        setSelectedCard(updatedCard);
      }

      return newCards;
    });
  };

  const decrementCount = (cardId, variationType, e) => {
    if (e) e.stopPropagation();
    if (isViewOnly) return;

    setCards(prevCards => {
      const newCards = prevCards.map(card => {
        if (card.id === cardId && card.variations[variationType]) {
          const currentCount = card.variations[variationType].count || 0;
          const newCount = Math.max(0, currentCount - 1);
          const updatedVariations = {
            ...card.variations,
            [variationType]: {
              ...card.variations[variationType],
              count: newCount,
              languages: newCount === 0 ? [] : (card.variations[variationType].languages || [])
            }
          };
          saveCardStatus(cardId, updatedVariations);
          return {...card, variations: updatedVariations};
        }
        return card;
      });

      // Update selected card if it's open
      const updatedCard = newCards.find(c => c.id === cardId);
      if (updatedCard && selectedCard?.id === cardId) {
        setSelectedCard(updatedCard);
      }

      return newCards;
    });
  };

  const saveCardStatus = async (cardId, variations) => {
    if (!user || isViewOnly) return;

    try {
      const docRef = doc(db, 'collections', user.uid);
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};

      const newData = {
        ...currentData,
        [cardId]: variations,
        lastUpdated: new Date().toISOString()
      };

      await setDoc(docRef, newData);
      console.log(`✅ Successfully saved ${cardId}`);
    } catch (err) {
      console.error('❌ Error saving to Firebase:', err);
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
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      setShowAuth(false);
    } catch (err) {
      console.error('❌ Auth error:', err);
      let errorMessage = 'Authentication failed';
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use. Try signing in instead.';
      } else if (err.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (err.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Try signing up first.';
      } else if (err.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      }
      alert(errorMessage);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setCards(prevCards => prevCards.map(card => ({
        ...card,
        variations: Object.keys(card.variations || {}).reduce((acc, key) => ({
          ...acc,
          [key]: {...card.variations[key], count: 0, ordered: false, languages: []}
        }), {})
      })));
      setShowAuth(true);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const copyShareLink = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?user=${user.uid}`;
    navigator.clipboard.writeText(shareUrl);
    alert('Share link copied to clipboard!');
  };

  const toggleLanguage = (cardId, variationType, language, e) => {
    if (e) e.stopPropagation();
    if (isViewOnly) return;

    setCards(prevCards => {
      const newCards = prevCards.map(card => {
        if (card.id === cardId && card.variations[variationType]) {
          const currentCount = card.variations[variationType].count || 0;

          // Don't allow language changes if count is 0
          if (currentCount === 0) return card;

          const currentLangs = card.variations[variationType].languages || [];
          const newLangs = currentLangs.includes(language)
            ? currentLangs.filter(l => l !== language)
            : [...currentLangs, language];

          const updatedVariations = {
            ...card.variations,
            [variationType]: {
              ...card.variations[variationType],
              languages: newLangs
            }
          };
          saveCardStatus(cardId, updatedVariations);
          return {...card, variations: updatedVariations};
        }
        return card;
      });

      const updatedCard = newCards.find(c => c.id === cardId);
      if (updatedCard && selectedCard?.id === cardId) {
        setSelectedCard(updatedCard);
      }

      return newCards;
    });
  };

  const hasAnyOwnership = (card) => {
    if (!card.variations) return false;
    return Object.values(card.variations).some(v =>
      (v.count && v.count > 0)
    );
  };

  const getCardStats = (card) => {
    if (!card.variations) return {owned: 'no', total: 1};

    const variations = Object.values(card.variations);

    // Check if at least ONE variation is owned (count > 0)
    const isOwned = variations.some(v => v.count && v.count > 0);

    // Only consider it "ordered" if NO variations are owned AND at least one is ordered
    const isOrdered = !isOwned && variations.some(v => v.ordered === true && (!v.count || v.count === 0));

    if (isOwned) return {owned: 'yes', total: variations.length};
    if (isOrdered) return {owned: 'ordered', total: variations.length};
    return {owned: 'no', total: variations.length};
  };

  const stats = {
    total: cards.length,
    owned: cards.filter(c => getCardStats(c).owned === 'yes').length,
    ordered: cards.filter(c => getCardStats(c).owned === 'ordered').length,
    needed: cards.filter(c => getCardStats(c).owned === 'no').length,
    completion: cards.length > 0 ? Math.round((cards.filter(c => getCardStats(c).owned === 'yes').length / cards.length) * 100) : 0
  };

  const filteredCards = cards.filter(card => {
    const cardStats = getCardStats(card);
    const statusMatch = currentFilter === 'all' || cardStats.owned === currentFilter;
    const eraMatch = currentEra === 'all' || card.era === currentEra;

    return statusMatch && eraMatch;
  }).sort((a, b) => {
    const sheetA = parseInt(a.sheet_no) || 0;
    const sheetB = parseInt(b.sheet_no) || 0;
    return sortOrder === 'asc' ? sheetA - sheetB : sheetB - sheetA;
  });

  const eras = ['all', ...new Set(cards.map(c => c.era).filter(Boolean))];

  if (loading) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-purple-500"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl">🎴</div>
        </div>
        <div className="text-white text-3xl font-bold mb-4 mt-8 tracking-wider">YUKA MORII</div>
        <div className="text-purple-300 text-lg">Loading Collection...</div>
      </div>
    );
  }

  if (showAuth && !user) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div
          className="relative bg-slate-800 bg-opacity-90 backdrop-blur-xl rounded-2xl shadow-2xl p-10 max-w-md w-full border border-purple-500/20">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎴</div>
            <h2
              className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
              Yuka Morii
            </h2>
            <p className="text-purple-300 text-sm">Trading Card Collection</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-purple-200 mb-2 font-medium text-sm">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-purple-200 mb-2 font-medium text-sm">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 rounded-xl focus:border-purple-500 focus:outline-none text-white"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              {isSignUp ? 'Create Account' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full text-purple-300 hover:text-purple-200 text-sm transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-purple-500/30">
            <h3
              className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">Share
              Collection</h3>
            <p className="text-purple-200 mb-4">Anyone with this link can view your collection:</p>
            <div
              className="bg-slate-700 p-4 rounded-xl mb-6 break-all text-sm font-mono text-purple-300 border border-slate-600">
              {`${window.location.origin}${window.location.pathname}?user=${user.uid}`}
            </div>
            <div className="flex gap-3">
              <button onClick={copyShareLink}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-semibold">
                📋 Copy Link
              </button>
              <button onClick={() => setShowShareModal(false)}
                      className="flex-1 bg-slate-700 text-purple-200 py-3 rounded-xl font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Details Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedCard(null);
              setSelectedVariation(null);
            }
          }}
        >
          <div className="relative flex items-center justify-center w-full max-w-4xl">
            {/* Left Arrow - Outside modal */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = filteredCards.findIndex(c => c.id === selectedCard.id);
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredCards.length - 1;
                const prevCard = filteredCards[prevIndex];
                setSelectedCard(prevCard);
                setSelectedVariation(Object.keys(prevCard.variations)[0]);
              }}
              className="w-10 h-10 bg-slate-700/80 hover:bg-slate-600 rounded-full flex items-center justify-center text-white text-xl border border-purple-500/50 hover:border-purple-400 transition-all z-10 flex-shrink-0"
            >
              ‹
            </button>

            {/* Modal */}
            <div className="bg-slate-800 rounded-2xl max-w-lg w-full border border-purple-500/30 mx-4">
              {/* Card Image Header */}
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-4">
                <button
                  onClick={() => {
                    setSelectedCard(null);
                    setSelectedVariation(null);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-white text-lg z-10"
                >
                  ✕
                </button>

                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={selectedCard.imageUrl}
                      alt={selectedCard.name}
                      className="w-32 h-auto rounded-lg shadow-xl"
                    />
                  </div>
                  <div className="flex-1 text-white min-w-0">
                    <h2 className="text-xl font-bold mb-1 truncate">{selectedCard.name}</h2>
                    <p className="text-purple-300 text-sm mb-3">#{selectedCard.number} • {selectedCard.set}</p>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-2">
                        <span>🎨</span>
                        <div>
                          <div className="text-slate-400 text-[10px]">Illustrator</div>
                          <div className="font-semibold">Yuka Morii</div>
                        </div>
                      </div>

                      {selectedCard.era && (
                        <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-2">
                          <span>📅</span>
                          <div>
                            <div className="text-slate-400 text-[10px]">Era</div>
                            <div className="font-semibold">{selectedCard.era}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Variant Selection */}
              <div className="p-4">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                  <span>✨</span>
                  Variant
                </h3>

                <select
                  value={selectedVariation || Object.keys(selectedCard.variations)[0]}
                  onChange={(e) => setSelectedVariation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm mb-4 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Select a variant...</option>
                  {selectedCard.variations && Object.keys(selectedCard.variations).map(varType => (
                    <option key={varType} value={varType}>
                      {varType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>

                {/* Variant Details */}
                {selectedVariation && selectedCard.variations[selectedVariation] && (
                  <div className="space-y-3">
                    {(() => {
                      const varData = selectedCard.variations[selectedVariation];
                      const count = varData.count || 0;
                      const isOrdered = varData.ordered || false;

                      return (
                        <>
                          {/* Count Controls */}
                          {!isViewOnly && (
                            <div
                              className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
                              <span className="text-white text-sm font-semibold">Quantity</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => decrementCount(selectedCard.id, selectedVariation, e)}
                                  className="w-10 h-10 bg-slate-600 hover:bg-slate-500 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                                >
                                  −
                                </button>
                                <div className="w-16 text-center">
                                  <div className="text-white font-bold text-2xl">{count}</div>
                                </div>
                                <button
                                  onClick={(e) => incrementCount(selectedCard.id, selectedVariation, e)}
                                  className="w-10 h-10 bg-purple-600 hover:bg-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Ordered Status - Only available when count is 0 */}
                          {!isViewOnly && (
                            <div
                              className={`flex items-center justify-between bg-slate-700/50 rounded-lg px-3 py-2 ${
                                count > 0 ? 'opacity-50' : ''
                              }`}>
                              <span className="text-white text-sm font-semibold">Ordered</span>
                              <button
                                onClick={(e) => count === 0 && toggleOrdered(selectedCard.id, selectedVariation, e)}
                                disabled={count > 0}
                                className={`w-12 h-6 rounded-full transition-all relative ${
                                  isOrdered && count === 0 ? 'bg-yellow-600' : 'bg-slate-600'
                                } ${count > 0 ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                <div
                                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${
                                    isOrdered && count === 0 ? 'right-0.5' : 'left-0.5'
                                  }`}></div>
                              </button>
                            </div>
                          )}

                          {/* Language */}
                          {!isViewOnly && (
                            <div>
                              <div className="text-white text-sm font-semibold mb-2">Language</div>
                              <div className="grid grid-cols-2 gap-2">
                                {['EN', 'JP'].map(lang => {
                                  const isActive = (varData.languages || []).includes(lang);
                                  const availableLanguages = selectedCard.variations[selectedVariation].available_languages || ['EN', 'JP'];
                                  const isAvailable = availableLanguages.includes(lang);
                                  const isDisabled = count === 0 || !isAvailable;

                                  return (
                                    <button
                                      key={lang}
                                      onClick={(e) => !isDisabled && toggleLanguage(selectedCard.id, selectedVariation, lang, e)}
                                      disabled={isDisabled}
                                      className={`px-3 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                                        isActive
                                          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                          : isDisabled
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                      }`}
                                    >
                                      {lang === 'EN' ? '🇺🇸' : '🇯🇵'} {lang}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Right Arrow - Outside modal */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const currentIndex = filteredCards.findIndex(c => c.id === selectedCard.id);
                const nextIndex = currentIndex < filteredCards.length - 1 ? currentIndex + 1 : 0;
                const nextCard = filteredCards[nextIndex];
                setSelectedCard(nextCard);
                setSelectedVariation(Object.keys(nextCard.variations)[0]);
              }}
              className="w-10 h-10 bg-slate-700/80 hover:bg-slate-600 rounded-full flex items-center justify-center text-white text-xl border border-purple-500/50 hover:border-purple-400 transition-all z-10 flex-shrink-0"
            >
              ›
            </button>
          </div>
        </div>
      )}

      <div className="relative max-w-7xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div
          className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 sm:p-8 mb-6 border border-purple-500/20">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="text-5xl">🎴</div>
                <div>
                  <h1
                    className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    Yuka Morii Collection
                  </h1>
                  <p className="text-purple-300 mt-1 text-sm">
                    {isViewOnly
                      ? `👁️ Viewing ${sharedOwnerEmail}'s Collection`
                      : `👤 ${user?.email}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {!isViewOnly && (
                <button onClick={() => setShowShareModal(true)}
                        className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-xl font-semibold hover:from-yellow-600 hover:to-orange-600 transition-all">
                  🔗 Share
                </button>
              )}
              {!isViewOnly && (
                <button onClick={handleLogout}
                        className="px-6 py-3 bg-slate-700 text-purple-200 rounded-xl font-semibold hover:bg-slate-600 transition-all">
                  Sign Out
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 mb-6 border border-purple-500/20">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div
              className="text-center p-4 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl border border-purple-500/20">
              <div className="text-4xl font-bold text-purple-400">{stats.total}</div>
              <div className="text-purple-200 text-sm font-medium mt-2">Total Cards</div>
            </div>

            {/* Change: Label updated to "Owned" */}
            <div
              className="text-center p-4 bg-gradient-to-br from-green-900/40 to-green-800/40 rounded-xl border border-green-500/30">
              <div className="text-4xl font-bold text-green-400">{stats.owned}</div>
              <div className="text-green-200 text-sm font-medium mt-2">✓ Owned</div>
            </div>

            <div
              className="text-center p-4 bg-gradient-to-br from-blue-900/40 to-blue-800/40 rounded-xl border border-blue-500/30">
              <div className="text-4xl font-bold text-blue-400">{stats.ordered}</div>
              <div className="text-blue-200 text-sm font-medium mt-2">📊 Ordered</div>
            </div>

            <div
              className="text-center p-4 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl border border-slate-600">
              <div className="text-4xl font-bold text-slate-400">{stats.needed}</div>
              <div className="text-slate-300 text-sm font-medium mt-2">Needed</div>
            </div>

            {/* Change: Label updated to "Owned %" */}
            <div
              className="text-center p-4 bg-gradient-to-br from-blue-900/40 to-purple-900/40 rounded-xl border border-blue-500/30">
              <div className="text-4xl font-bold text-blue-400">{stats.completion}%</div>
              <div className="text-blue-200 text-sm font-medium mt-2">Owned %</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-4 mb-6 border border-purple-500/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-semibold text-purple-300 mb-2 block text-sm">🔍 Status</label>
              <div className="flex flex-wrap gap-2">
                {['all', 'yes', 'ordered', 'no'].map(status => (
                  <button
                    key={status}
                    onClick={() => setCurrentFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      currentFilter === status ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' : 'bg-slate-700 text-purple-200'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'yes' ? '✓ Owned' : status === 'ordered' ? '📊 Ordered' : '○ Need'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-semibold text-purple-300 mb-2 block text-sm">🎨 Era</label>
              <select value={currentEra} onChange={(e) => setCurrentEra(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-purple-200 text-sm">
                {eras.map(era => (
                  <option key={era} value={era}>{era === 'all' ? 'All Eras' : era}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-purple-300 mb-2 block text-sm">🔢 Sort</label>
              <div className="flex gap-2">
                <button onClick={() => setSortOrder('asc')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${sortOrder === 'asc' ? 'bg-gradient-to-r from-green-600 to-teal-600 text-white' : 'bg-slate-700 text-purple-200'}`}>
                  ⬆️ 1→223
                </button>
                <button onClick={() => setSortOrder('desc')}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${sortOrder === 'desc' ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white' : 'bg-slate-700 text-purple-200'}`}>
                  ⬇️ 223→1
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card Grid */}
        <div className="bg-slate-800/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 border border-purple-500/20">
          <h2
            className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-6">
            📚 Collection — {filteredCards.length} Cards
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredCards.map(card => {
              // Calculate card status
              const variations = card.variations || {};
              const totalCopies = Object.values(variations).reduce((sum, v) => sum + (v.count || 0), 0);
              const hasReverseHolo = variations.reverse_holo && (variations.reverse_holo.count > 0);
              const hasSpecialVariant = Object.keys(variations).some(key =>
                key !== 'normal' && key !== 'reverse_holo' && (variations[key].count > 0)
              );
              const isOrdered = Object.values(variations).some(v => v.ordered === true && v.count === 0);
              const isOwned = totalCopies > 0;

              // Get special variant icon
              const getSpecialIcon = () => {
                // Burger King Icon
                if (variations.burger_king_collection_2008?.count > 0) {
                  return (
                    <img
                      src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Burger_King_2020.svg/1024px-Burger_King_2020.svg.png"
                      alt="BK"
                      className="w-5 h-5 object-contain"
                    />
                  );
                }

                // Countdown Calendar
                if (variations.countdown_calendar?.count > 0) {
                  return (
                    <img
                      src="https://cdn-icons-png.flaticon.com/512/9141/9141642.png"
                      alt="BK"
                      className="w-5 h-5 object-contain"
                    />
                  );
                }

                // 1st Edition Stamp
                if (variations.first_edition?.count > 0) {
                  return (
                    <img
                      src="https://archives.bulbagarden.net/media/upload/0/0b/1st_edition_English.png"
                      alt="1st Ed"
                      className="w-5 h-5 object-contain"
                    />
                  );
                }

                return '⭐';
              };

              return (
                <div
                  key={card.id}
                  onClick={() => {
                    // Only allow opening the modal if NOT in view-only mode
                    if (!isViewOnly) {
                      setSelectedCard(card);
                      setSelectedVariation(Object.keys(card.variations)[0]);
                    }
                  }}
                  className="relative bg-slate-700 rounded-xl overflow-hidden transition-all duration-300 border-2 border-slate-600 hover:border-purple-500 cursor-pointer hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
                >
                  <div className="aspect-[2/3] relative bg-slate-900">
                    <img src={card.imageUrl} alt={card.name}
                         className="w-full h-full object-contain p-2"/>

                    {/* Language badges - top left */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {Object.values(variations).some(v => v.languages?.includes('EN')) && (
                        <div
                          className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg text-xs font-bold">
                          🇺🇸
                        </div>
                      )}
                      {Object.values(variations).some(v => v.languages?.includes('JP')) && (
                        <div
                          className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg text-xs font-bold">
                          🇯🇵
                        </div>
                      )}
                    </div>

                    {/* Center Checkmark for owned cards */}
                    {isOwned && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl">
                          <svg className="w-8 h-8 text-green-600" fill="currentColor"
                               viewBox="0 0 20 20">
                            <path fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"/>
                          </svg>
                        </div>
                      </div>
                    )}

                    {/* Center Sandclock for ordered cards */}
                    {isOrdered && !isOwned && (
                      <div
                        className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                          className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl">
                          <img
                            src="https://cdn-icons-png.flaticon.com/512/3500/3500833.png"
                            alt="Ordered"
                            className="w-8 h-8 object-contain"
                          />
                        </div>
                      </div>
                    )}

                    {/* Right side badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1">
                      {/* Quantity badge (if more than 1) */}
                      {totalCopies > 1 && (
                        <div
                          className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg">
                          <span className="text-black text-xs font-bold">{totalCopies}</span>
                        </div>
                      )}

                      {/* Reverse Holo badge */}
                      {hasReverseHolo && (
                        <div
                          className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden border border-purple-400/50">
                          <img
                            src="https://static.dextcg.com/resources/variants/alternate/ReverseHoloVariant.webp"
                            alt="Reverse Holo"
                            className="w-5 h-5 object-contain invert"
                          />
                        </div>
                      )}

                      {/* Special variant badge */}
                      {hasSpecialVariant && (
                        <div
                          className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg">
                          {getSpecialIcon()}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-2 bg-slate-900/50">
                    <div className="font-bold text-white text-xs truncate">{card.name}</div>
                    <div className="text-purple-300 text-[10px] truncate">#{card.number}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredCards.length === 0 && (
            <div className="text-center text-purple-300 py-20">
              <div className="text-7xl mb-6 opacity-50">🔍</div>
              <div className="text-2xl font-semibold">No cards match your filters</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;