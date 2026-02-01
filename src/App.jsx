import React, {useState, useEffect} from 'react';
import {auth, db} from './firebase';
import {onAuthStateChanged, signOut, signInWithPopup} from 'firebase/auth';
import {googleProvider} from './firebase';
import {doc, getDoc, setDoc} from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [currentFilter, setCurrentFilter] = useState('all');
  const [currentEra, setCurrentEra] = useState('all');
  const [showAuth, setShowAuth] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedVariation, setSelectedVariation] = useState(null);
  const [error, setError] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');
  const [sharedOwnerEmail, setSharedOwnerEmail] = useState(null);
  const [imagePopup, setImagePopup] = useState(null);
  const [previousFilter, setPreviousFilter] = useState('all');

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
      setUser({uid: sharedUserId, email: 'Shared Collection'});
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

useEffect(() => {
  if (selectedCard) {
    // Save current scroll position
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.dataset.scrollY = scrollY.toString();
  } else {
    // Restore scroll position
    const scrollY = parseInt(document.body.dataset.scrollY || '0');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    if (scrollY > 0) {
      window.scrollTo(0, scrollY);
    }
  }

  return () => {
    const scrollY2 = parseInt(document.body.dataset.scrollY || '0');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    delete document.body.dataset.scrollY;
    if (scrollY2 > 0) {
      window.scrollTo(0, scrollY2);
    }
  };
}, [selectedCard]);

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Save user email to Firestore
      const docRef = doc(db, 'collections', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          ownerEmail: user.email,
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Update ownerEmail if it doesn't exist
        const data = docSnap.data();
        if (!data.ownerEmail) {
          await setDoc(docRef, {
            ...data,
            ownerEmail: user.email,
            lastUpdated: new Date().toISOString()
          });
        }
      }

      setShowAuth(false);
    } catch (err) {
      console.error('❌ Google Sign-In error:', err);

      // Don't show error for user-cancelled popups
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        console.log('User cancelled sign-in');
        return;
      }

      alert('Google Sign-In failed: ' + err.message);
    }
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
          const availableLanguages = card.variations[variationType].available_languages || [];
          const defaultLanguage = card.variations[variationType].default_language || (availableLanguages.length > 0 ? availableLanguages[0] : '');
          const updatedVariations = {
            ...card.variations,
            [variationType]: {
              ...card.variations[variationType],
              count: currentCount + 1,
              ordered: false,
              languages: currentCount === 0 ? (defaultLanguage ? [defaultLanguage] : []) : (card.variations[variationType].languages || [])
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

  function getExpansionStampMapping() {
    return {
      // EX Era
      "Unseen Forces": "https://static.tcgcollector.com/content/images/8b/69/08/8b690895e437bb8e05703beae93ab969d242e92fa3daf990301884ba09009fda.png",
      "Delta Species": "https://static.tcgcollector.com/content/images/5c/a6/17/5ca6176f30689b2a44406af607118616d09ecf20e522bd2a317a3cd10a6a1803.png",
      "Legend Maker": "https://www.tcgcollector.com/sets/1127/ex-legend-maker?setCardCountMode=anyCardVariant",
      "Dragon Frontiers": "https://static.tcgcollector.com/content/images/8e/2d/44/8e2d443613a9641708c2418af15304a801e6b046367f65c84ba5ec99a4656ca7.png",
      "Team Rocket Returns": "https://static.tcgcollector.com/content/images/78/8d/13/788d132009893c9127853650d194e307c22e1aa97ae05375504a06433901ff24.png",
      "Deoxys": "https://static.tcgcollector.com/content/images/0e/15/fb/0e15fbb1fc543fc4ad62aeebcf73d05727768b2f87297116751c1bb668aabdd1.png",
      "Emerald": "https://static.tcgcollector.com/content/images/f3/1e/52/f31e526e0e5972bc49611b9e96f62318c87558a70f697235b7dfe5dfd0173390.png",

      // Diamond Pearl Era
      "Mysterious Treasures": "https://static.tcgcollector.com/content/images/3f/a6/4e/3fa64e1cf41c21777401645a08260412a37958e87352306123eabd6a558c8f29.png",

      // Scarlet & Violet Era
      "Stellar Crown": "https://static.tcgcollector.com/content/images/22/9d/b5/229db50764bfeb9e1a04db5c221fd5d2a4bc0d0e265d719bcc31667705a70de4.png"
    };
  }

  function hasExpansionStampOwned(card) {
    if (!card.variations) return false;

    const expansionStampKey = Object.keys(card.variations).find(key =>
      key.toLowerCase().includes('expansion') &&
      key.toLowerCase().includes('stamp')
    );

    if (!expansionStampKey) return false;

    const variation = card.variations[expansionStampKey];
    return variation && variation.count > 0;
  }

  const getVariationBadges = (variations) => {
    const badges = [];

    if (!variations) return badges;

    // Countdown Calendar & Holiday Calendar
    if (variations.countdown_calendar?.count > 0 || variations.holiday_calender_2023?.count > 0) {
      badges.push({
        type: 'calendar',
        icon: 'https://cdn-icons-png.flaticon.com/512/9141/9141642.png',
        alt: 'Calendar'
      });
    }

    // Burger King Collection
    if (variations.burger_king_collection_2008?.count > 0) {
      badges.push({
        type: 'burger_king',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Burger_King_2020.svg/1024px-Burger_King_2020.svg.png',
        alt: 'BK'
      });
    }

    // First Edition
    if (variations.first_edition?.count > 0 || variations.first_edition_holo?.count > 0) {
      badges.push({
        type: 'first_edition',
        icon: 'https://archives.bulbagarden.net/media/upload/0/0b/1st_edition_English.png',
        alt: '1st Ed'
      });
    }

    // McDonald's Collections
    if (variations["McDonal's_collections_2015"]?.count > 0) {
      badges.push({
        type: 'mcdonalds',
        icon: 'https://static.tcgcollector.com/content/images/cd/68/ae/cd68aeeb12917f049a96466cda6f49c05f048663cf3a20b8102675037122767d.png',
        alt: "McDonald's"
      });
    }

    // Trick or Trade
    if (variations.trick_or_trade_2023?.count > 0) {
      badges.push({
        type: 'trick_or_trade',
        icon: 'https://static.tcgcollector.com/content/images/56/f2/0b/56f20b33b7fdbc299dcb083234a867e7df37aa7c468e1123f41c5affdb154c27.png',
        alt: 'Trick or Trade'
      });
    }

    // Comic-Con
    if (variations['comic-con_san_diego_2007']?.count > 0) {
      badges.push({
        type: 'comic_con',
        icon: 'https://play-lh.googleusercontent.com/gNToWY4-nL4_uKA93aQw6qFmG8nE4Ukq6TX9RGaOZ8CxObRDKBoZOHlP2c5CyXPGXA=w600-h300-pc0xffffff-pd',
        alt: 'Comic-Con'
      });
    }

    if (variations['world_championship_deck_2004:_Blaziken_teach']?.count > 0) {
      badges.push({
        type: 'world_championship_2004_blaziken_teach',
        icon: 'https://static.tcgcollector.com/content/images/75/5f/25/755f25350a035533604832c437246b15b214a631d319a8e59ed760572b603eaf.png',
        alt: 'World Championship 2004: Blaziken Teach'
      });
    }

    if (variations['tropical_mega_battle_2001']?.count > 0) {
      badges.push({
        type: 'tropical_mega_battle_2001',
        icon: 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/tropicalMegaBattle2001.webp',
        alt: 'Tropical Mega Battle 2001'
      });
    }

    // Pokemon Center
    if (variations.pokemon_center?.count > 0) {
      badges.push({
        type: 'pokemon_center',
        icon: 'https://www.clipartmax.com/png/middle/30-301097_logo-pkmn-center-by-honokawa-pokemon-center.png',
        alt: 'Pokemon Center'
      });
    }

    // 10th Anniversary
    if (variations['10th_anniversary']?.count > 0) {
      badges.push({
        type: '10th_anniversary',
        icon: 'https://www.clipartmax.com/png/middle/213-2131138_pokémon-10th-anniversary-pokemon-10th-anniversary-logo.png',
        alt: '10th Anniversary'
      });
    }

    // 10th Anniversary
    if (variations['meiji']?.count > 0) {
      badges.push({
        type: 'meiji',
        icon: 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/meiji.webp',
        alt: 'Meiji'
      });
    }

    // Prerelease/Expansion Stamp
    const hasStamp = Object.keys(variations).some(key =>
      (key.includes('expansion_stamp') || key.includes('PRERELESE_stamp')) && variations[key]?.count > 0
    );
    if (hasStamp) {
      badges.push({
        type: 'stamp',
        icon: 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/StampVariant.webp',
        alt: 'Stamp'
      });
    }

    // Play! Pokemon
    if (variations['play!_pokemon']?.count > 0) {
      badges.push({
        type: 'play_pokemon',
        icon: 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/PlayPokemonVariant.webp',
        alt: 'Play! Pokemon'
      });
    }

    // Cosmos Holo
    if (variations.cosmos_holo?.count > 0) {
      badges.push({
        type: 'cosmos_holo',
        icon: 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/HoloVariant.webp',
        alt: 'Cosmos Holo'
      });
    }

    // Unpeeled Ditto
    if (variations.unpeeled_ditto?.count > 0) {
      badges.push({
        type: 'ditto',
        icon: 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/UnpeeledDittoVariant.webp',
        alt: 'Ditto'
      });
    }

    return badges;
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
    trade: cards.filter(c => c.variations && Object.values(c.variations).some(v => (v.count || 0) > 1)).length,
    completion: cards.length > 0 ? Math.round((cards.filter(c => getCardStats(c).owned === 'yes').length / cards.length) * 100) : 0
  };

  const filteredCards = cards.filter(card => {
    const cardStats = getCardStats(card);
    const hasTradeAvailable = card.variations && Object.values(card.variations).some(v => (v.count || 0) > 1);

    const statusMatch = currentFilter === 'all'
      ? true
      : currentFilter === 'trade'
        ? hasTradeAvailable
        : cardStats.owned === currentFilter;

    const eraMatch = currentEra === 'all' || card.era === currentEra;

    return statusMatch && eraMatch;
  }).sort((a, b) => {
    const sheetA = parseInt(a.sheet_no) || 0;
    const sheetB = parseInt(b.sheet_no) || 0;
    return sortOrder === 'asc' ? sheetA - sheetB : sheetB - sheetA;
  });

  const eras = ['all', ...new Set(cards.map(c => c.era).filter(Boolean))];

  // Navigation functions for modal
  const navigateToPreviousCard = (e) => {
    if (e) e.stopPropagation();
    const currentIndex = filteredCards.findIndex(c => c.id === selectedCard.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredCards.length - 1;
    const prevCard = filteredCards[prevIndex];
    setSelectedCard(prevCard);
    setSelectedVariation(Object.keys(prevCard.variations)[0]);
  };

  const navigateToNextCard = (e) => {
    if (e) e.stopPropagation();
    const currentIndex = filteredCards.findIndex(c => c.id === selectedCard.id);
    const nextIndex = currentIndex < filteredCards.length - 1 ? currentIndex + 1 : 0;
    const nextCard = filteredCards[nextIndex];
    setSelectedCard(nextCard);
    setSelectedVariation(Object.keys(nextCard.variations)[0]);
  };

  // Touch handling for swipe gestures
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      navigateToNextCard();
    }
    if (isRightSwipe) {
      navigateToPreviousCard();
    }
  };

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
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-lg"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>

            <p className="text-center text-purple-300 text-xs">
              Sign in to save and sync your collection across devices
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Image Popup Modal */}
      {imagePopup && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4"
          onClick={() => setImagePopup(null)}
        >
          <button
            onClick={() => setImagePopup(null)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-2xl z-10 backdrop-blur-sm"
          >
            ✕
          </button>
          <img
            src={imagePopup}
            alt="Card Detail"
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
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
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="relative flex flex-col items-center justify-center w-full max-w-4xl">
            {/* Desktop Navigation Arrows - Hidden on mobile */}
            <div className="hidden md:flex items-center justify-center w-full">
              {/* Left Arrow */}
              <button
                onClick={navigateToPreviousCard}
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
                    <div className="flex-shrink-0 cursor-pointer" onClick={(e) => {
                      e.stopPropagation();
                      setImagePopup(selectedCard.imageUrl);
                    }}>
                      <img
                        src={selectedCard.imageUrl}
                        alt={selectedCard.name}
                        className="w-48 h-auto rounded-lg shadow-xl hover:opacity-80 transition-opacity"
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

                {/* Variant Rows */}
                <div className="p-4 max-h-[40vh] overflow-y-auto">
                  <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-3">
                    <span>✨</span>
                    Variants
                  </h3>

                  <div className="space-y-1.5">
                    {selectedCard.variations && Object.entries(selectedCard.variations).map(([varType, varData]) => {
                      const count = varData.count || 0;
                      const isOrdered = varData.ordered || false;
                      const languages = varData.languages || [];
                      const availableLanguages = varData.available_languages || [];

                      // Replace ALL underscores with spaces
                      const displayName = varType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                      return (
                        <div key={varType} className="bg-slate-700/50 rounded-lg p-2">
                          {/* Single row with everything */}
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            {/* Variant name - responsive with word wrap on mobile */}
                            <div
                              className="text-white font-semibold w-full sm:w-48 leading-tight text-xs sm:text-sm mb-1 sm:mb-0"
                              title={displayName}
                            >
                              {displayName}
                            </div>

                            {/* Controls row - wraps on small screens */}
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                              {/* Count controls */}
                              {!isViewOnly ? (
                                <div className="flex items-center gap-1.5 w-20">
                                  <button
                                    onClick={(e) => decrementCount(selectedCard.id, varType, e)}
                                    className="w-6 h-6 bg-slate-600 hover:bg-slate-500 rounded text-white font-bold text-sm"
                                  >
                                    −
                                  </button>
                                  <div className="w-8 text-center">
                                    <span className="text-white font-bold text-sm">{count}</span>
                                  </div>
                                  <button
                                    onClick={(e) => incrementCount(selectedCard.id, varType, e)}
                                    className="w-6 h-6 bg-purple-600 hover:bg-purple-500 rounded text-white font-bold text-sm"
                                  >
                                    +
                                  </button>
                                </div>
                              ) : (
                                <div className="text-white font-bold text-sm">{count}</div>
                              )}

                              {/* Language buttons */}
                              {!isViewOnly && (
                                <div className="flex items-center gap-1.5 w-20">
                                  {availableLanguages.map(lang => {
                                    const isActive = languages.includes(lang);
                                    const isAvailable = availableLanguages.includes(lang);
                                    const isDisabled = count === 0 || !isAvailable;

                                    return (
                                      <button
                                        key={lang}
                                        onClick={(e) => !isDisabled && toggleLanguage(selectedCard.id, varType, lang, e)}
                                        disabled={isDisabled}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all min-w-[32px] ${
                                          isActive
                                            ? 'bg-blue-600 text-white'
                                            : isDisabled
                                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-40'
                                              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                        }`}
                                      >
                                        {lang}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Ordered toggle - inline */}
                              {!isViewOnly && (
                                <div className="flex items-center gap-1.5 w-20">
                                  <span className="text-slate-400 text-[10px]">Ordered</span>
                                  <button
                                    onClick={(e) => count === 0 && toggleOrdered(selectedCard.id, varType, e)}
                                    disabled={count > 0}
                                    className={`w-8 h-4 rounded-full transition-all relative ${
                                      isOrdered && count === 0 ? 'bg-yellow-600' : 'bg-slate-600'
                                    } ${count > 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                                  >
                                    <div
                                      className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                                        isOrdered && count === 0 ? 'right-0.5' : 'left-0.5'
                                      }`}
                                    ></div>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Arrow */}
              <button
                onClick={navigateToNextCard}
                className="w-10 h-10 bg-slate-700/80 hover:bg-slate-600 rounded-full flex items-center justify-center text-white text-xl border border-purple-500/50 hover:border-purple-400 transition-all z-10 flex-shrink-0"
              >
                ›
              </button>
            </div>

            {/* Mobile-only Modal (full width) */}
            <div className="md:hidden bg-slate-800 rounded-2xl w-full border border-purple-500/30">
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
                  <div className="flex-shrink-0 cursor-pointer" onClick={(e) => {
                    e.stopPropagation();
                    setImagePopup(selectedCard.imageUrl);
                  }}>
                    <img
                      src={selectedCard.imageUrl}
                      alt={selectedCard.name}
                      className="w-32 sm:w-48 h-auto rounded-lg shadow-xl hover:opacity-80 transition-opacity"
                    />
                  </div>
                  <div className="flex-1 text-white min-w-0">
                    <h2 className="text-lg sm:text-xl font-bold mb-1 truncate">{selectedCard.name}</h2>
                    <p
                      className="text-purple-300 text-xs sm:text-sm mb-3">#{selectedCard.number} • {selectedCard.set}</p>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-2">
                        <span>🎨</span>
                        <div>
                          <div className="text-slate-400 text-[10px]">Illustrator</div>
                          <div className="font-semibold text-xs">Yuka Morii</div>
                        </div>
                      </div>

                      {selectedCard.era && (
                        <div className="flex items-center gap-2 bg-slate-700/50 rounded-lg p-2">
                          <span>📅</span>
                          <div>
                            <div className="text-slate-400 text-[10px]">Era</div>
                            <div className="font-semibold text-xs">{selectedCard.era}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Variant Rows */}
              <div className="p-4 max-h-[35vh] overflow-y-auto">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-3">
                  <span>✨</span>
                  Variants
                </h3>

                <div className="space-y-1.5">
                  {selectedCard.variations && Object.entries(selectedCard.variations).map(([varType, varData]) => {
                    const count = varData.count || 0;
                    const isOrdered = varData.ordered || false;
                    const languages = varData.languages || [];
                    const availableLanguages = varData.available_languages || [];

                    const displayName = varType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

                    return (
                      <div key={varType} className="bg-slate-700/50 rounded-lg p-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            className="text-white font-semibold w-full leading-tight text-xs mb-1"
                            title={displayName}
                          >
                            {displayName}
                          </div>

                          <div className="flex items-center gap-2 flex-wrap w-full">
                            {!isViewOnly ? (
                              <div className="flex items-center gap-1.5 w-20">
                                <button
                                  onClick={(e) => decrementCount(selectedCard.id, varType, e)}
                                  className="w-6 h-6 bg-slate-600 hover:bg-slate-500 rounded text-white font-bold text-sm"
                                >
                                  −
                                </button>
                                <div className="w-8 text-center">
                                  <span className="text-white font-bold text-sm">{count}</span>
                                </div>
                                <button
                                  onClick={(e) => incrementCount(selectedCard.id, varType, e)}
                                  className="w-6 h-6 bg-purple-600 hover:bg-purple-500 rounded text-white font-bold text-sm"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <div className="text-white font-bold text-sm">{count}</div>
                            )}

                            {!isViewOnly && (
                              <>
                                <div className="flex items-center gap-1.5 w-20">
                                  {availableLanguages.map(lang => {
                                    const isActive = languages.includes(lang);
                                    const isAvailable = availableLanguages.includes(lang);
                                    const isDisabled = count === 0 || !isAvailable;

                                    return (
                                      <button
                                        key={lang}
                                        onClick={(e) => !isDisabled && toggleLanguage(selectedCard.id, varType, lang, e)}
                                        disabled={isDisabled}
                                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all min-w-[32px] ${
                                          isActive
                                            ? 'bg-blue-600 text-white'
                                            : isDisabled
                                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-40'
                                              : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                                        }`}
                                      >
                                        {lang}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center gap-1.5 w-20">
                                  <span className="text-slate-400 text-[10px]">Ordered</span>
                                  <button
                                    onClick={(e) => count === 0 && toggleOrdered(selectedCard.id, varType, e)}
                                    disabled={count > 0}
                                    className={`w-8 h-4 rounded-full transition-all relative ${
                                      isOrdered && count === 0 ? 'bg-yellow-600' : 'bg-slate-600'
                                    } ${count > 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                                  >
                                    <div
                                      className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${
                                        isOrdered && count === 0 ? 'right-0.5' : 'left-0.5'
                                      }`}
                                    ></div>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Navigation Arrows - Below modal */}
              <div className="flex justify-center gap-4 py-4 px-4">
                <button
                  onClick={navigateToPreviousCard}
                  className="w-12 h-12 bg-slate-700/80 hover:bg-slate-600 rounded-full flex items-center justify-center text-white text-2xl border border-purple-500/50 hover:border-purple-400 transition-all"
                >
                  ‹
                </button>
                <button
                  onClick={navigateToNextCard}
                  className="w-12 h-12 bg-slate-700/80 hover:bg-slate-600 rounded-full flex items-center justify-center text-white text-2xl border border-purple-500/50 hover:border-purple-400 transition-all"
                >
                  ›
                </button>
              </div>
            </div>
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
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => {
                  if (currentFilter === 'trade') {
                    setCurrentFilter(previousFilter);
                  } else {
                    setPreviousFilter(currentFilter);
                    setCurrentFilter('trade');
                  }
                }}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  currentFilter === 'trade'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    : 'bg-slate-700 text-purple-200 hover:bg-slate-600'
                }`}>
                🤝 Trade View
              </button>
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
              const isOrdered = Object.values(variations).some(v => v.ordered === true && v.count === 0);
              const isOwned = totalCopies > 0;
              const isTradeView = currentFilter === 'trade';

              const tradeTotal = Object.values(variations).reduce((sum, v) => {
                const count = v.count || 0;
                const languages = v.languages || [];
                const languageCount = languages.length || 1; // If no languages selected, assume 1
                const tradeCount = Math.max(0, count - languageCount);
                return sum + tradeCount;
              }, 0);

              const hasExpansionStamp = hasExpansionStampOwned(card);
              const expansionStampUrl = hasExpansionStamp ? getExpansionStampMapping()[card.set] : null;

              // Get variation badges (excluding reverse holo which is handled separately)
              const variationBadges = getVariationBadges(variations);

              return (
                <div
                  key={card.id}
                  onClick={() => {
                    // Disable modal if in trade view or if view-only
                    if (!isViewOnly && currentFilter !== 'trade') {
                      setSelectedCard(card);
                      setSelectedVariation(Object.keys(card.variations)[0]);
                    }
                  }}
                  className={`relative bg-slate-700 rounded-xl overflow-hidden transition-all duration-300 border-2 border-slate-600 
      ${currentFilter === 'trade' ? 'cursor-default' : 'hover:border-purple-500 cursor-pointer hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20'}`}
                >
                  <div className="aspect-[2/3] relative bg-slate-900">
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      onClick={(e) => {
                        if (currentFilter === 'trade') {
                          e.stopPropagation();
                          setImagePopup(card.imageUrl);
                        }
                      }}
                      className={`w-full h-full object-contain p-2 ${currentFilter === 'trade' ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
                    />

                    {/* Trade Status Overlay - Only shows when Trade filter is active */}
                    {currentFilter === 'trade' ? (
                      <>
                        {/* Bottom section with trade quantities - bright and clear */}
                        <div
                          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent p-2 pt-8">
                          <div className="flex flex-col gap-1.5">
                            {Object.entries(variations)
                              .filter(([_, v]) => {
                                const count = v.count || 0;
                                const languages = v.languages || [];
                                const languageCount = languages.length || 1;
                                return count > languageCount;
                              })
                              .map(([varType, v]) => {
                                const languages = v.languages || [];
                                const count = v.count || 0;
                                const languageCount = languages.length || 1;
                                const tradeCount = count - languageCount;

                                return (
                                  <div key={varType}
                                       className="bg-green-600 rounded-lg px-2 py-1.5 border-2 border-green-400 shadow-lg">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-white text-[10px] font-bold flex-1 leading-tight">
                                        {varType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                      </span>
                                      <div className="flex items-center gap-1.5">
                                        {/* Language flags */}
                                        {languages.includes('EN') && (
                                          <span className="text-xs">🇺🇸</span>
                                        )}
                                        {languages.includes('JP') && (
                                          <span className="text-xs">🇯🇵</span>
                                        )}
                                        {/* Quantity */}
                                        <span
                                          className="text-white font-black text-sm bg-green-800 px-1.5 py-0.5 rounded">
                                          {tradeCount}×
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Regular Collection View Overlays (Checkmarks, Stamps, Badges) */
                      <>
                        {/* Expansion Stamp - Left side */}
                        {expansionStampUrl && (
                          <div className="absolute top-1/2 -translate-y-1/2"
                               style={{left: '75%', transform: 'translate(-60%, -20%)'}}>
                            <div className="w-24 h-24 flex items-center justify-center p-1.5">
                              <img src={expansionStampUrl} alt="Expansion Stamp"
                                   className="w-full h-full object-contain"/>
                            </div>
                          </div>
                        )}

                        {/* Language badges - top left */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {Object.values(variations).some(v => v.languages?.includes('EN')) && (
                            <div
                              className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg text-xs font-bold">🇺🇸</div>
                          )}
                          {Object.values(variations).some(v => v.languages?.includes('JP')) && (
                            <div
                              className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg text-xs font-bold">🇯🇵</div>
                          )}
                        </div>

                        {/* Center Checkmark for owned cards */}
                        {isOwned && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div
                              className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl">
                              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"/>
                              </svg>
                            </div>
                          </div>
                        )}

                        {/* Center Sandclock for ordered cards */}
                        {isOrdered && !isOwned && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div
                              className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-2xl">
                              <img src="https://cdn-icons-png.flaticon.com/512/3500/3500833.png" alt="Ordered"
                                   className="w-8 h-8 object-contain"/>
                            </div>
                          </div>
                        )}

                        {/* Right side badges */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1">
                          {totalCopies > 1 && (
                            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-black text-xs font-bold">{totalCopies}</span>
                            </div>
                          )}
                          {hasReverseHolo && (
                            <div
                              className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden border border-purple-400/50"
                              title="Reverse Holo">
                              <img src="https://static.dextcg.com/resources/variants/alternate/ReverseHoloVariant.webp"
                                   alt="Reverse Holo" className="w-5 h-5 object-contain invert"/>
                            </div>
                          )}
                          {variationBadges.map((badge, index) => (
                            <div key={`${badge.type}-${index}`}
                                 className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-lg overflow-hidden border border-purple-400/50"
                                 title={badge.alt}>
                              <img src={badge.icon} alt={badge.alt} className="w-5 h-5 object-contain"/>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="p-2 bg-slate-900/50">
                    <div className="font-bold text-white text-xs truncate">{card.name}</div>
                    <div className="text-purple-300 text-[10px] truncate">#{card.number}</div>
                    <div className="text-purple-400 text-[9px] truncate mt-0.5">{card.set}</div>
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