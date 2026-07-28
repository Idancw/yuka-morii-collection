import React, {useState, useEffect} from 'react';
import {auth, db} from './firebase';
import {onAuthStateChanged, signOut, signInWithPopup} from 'firebase/auth';
import {googleProvider} from './firebase';
import {doc, getDoc, setDoc} from 'firebase/firestore';

import Header from './components/Header';
import StatsPanel from './components/StatsPanel';
import FiltersBar from './components/FiltersBar';
import CardGrid from './components/CardGrid';
import CardModal from './components/CardModal';
import ShareModal from './components/ShareModal';
import ImageModal from './components/ImageModal';
import PreferencesModal from './components/PreferencesModal';
import ExportSheetModal from './components/ExportSheetModal';
import { useThemePreferences } from './hooks/use-theme-preferences';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreferences, setShowPreferences] = useState(false);
  const [showExportSheet, setShowExportSheet] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { mode: themeMode, setMode: setThemeMode, accent: themeAccent, setAccent: setThemeAccent } = useThemePreferences();

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > 24);
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.dataset.scrollY = scrollY.toString();
    } else {
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

      const docRef = doc(db, 'collections', user.uid);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        await setDoc(docRef, {
          ownerEmail: user.email,
          lastUpdated: new Date().toISOString()
        });
      } else {
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
      "Unseen Forces": "https://static.tcgcollector.com/content/images/8b/69/08/8b690895e437bb8e05703beae93ab969d242e92fa3daf990301884ba09009fda.png",
      "Delta Species": "https://static.tcgcollector.com/content/images/5c/a6/17/5ca6176f30689b2a44406af607118616d09ecf20e522bd2a317a3cd10a6a1803.png",
      "Legend Maker": "https://www.tcgcollector.com/sets/1127/ex-legend-maker?setCardCountMode=anyCardVariant",
      "Dragon Frontiers": "https://static.tcgcollector.com/content/images/8e/2d/44/8e2d443613a9641708c2418af15304a801e6b046367f65c84ba5ec99a4656ca7.png",
      "Team Rocket Returns": "https://static.tcgcollector.com/content/images/78/8d/13/788d132009893c9127853650d194e307c22e1aa97ae05375504a06433901ff24.png",
      "Deoxys": "https://static.tcgcollector.com/content/images/0e/15/fb/0e15fbb1fc543fc4ad62aeebcf73d05727768b2f87297116751c1bb668aabdd1.png",
      "Emerald": "https://static.tcgcollector.com/content/images/f3/1e/52/f31e526e0e5972bc49611b9e96f62318c87558a70f697235b7dfe5dfd0173390.png",
      "Mysterious Treasures": "https://static.tcgcollector.com/content/images/3f/a6/4e/3fa64e1cf41c21777401645a08260412a37958e87352306123eabd6a558c8f29.png",
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

    if (variations.countdown_calendar?.count > 0 || variations.holiday_calender_2023?.count > 0) {
      badges.push({
        type: 'calendar',
        icon: 'https://cdn-icons-png.flaticon.com/512/9141/9141642.png',
        alt: 'Calendar'
      });
    }

    if (variations.burger_king_collection_2008?.count > 0) {
      badges.push({
        type: 'burger_king',
        icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Burger_King_2020.svg/1024px-Burger_King_2020.svg.png',
        alt: 'BK'
      });
    }

    if (variations.first_edition?.count > 0 || variations.first_edition_holo?.count > 0) {
      badges.push({
        type: 'first_edition',
        icon: 'https://archives.bulbagarden.net/media/upload/0/0b/1st_edition_English.png',
        alt: '1st Ed'
      });
    }

    if (variations["McDonal's_collections_2015"]?.count > 0) {
      badges.push({
        type: 'mcdonalds',
        icon: 'https://static.tcgcollector.com/content/images/cd/68/ae/cd68aeeb12917f049a96466cda6f49c05f048663cf3a20b8102675037122767d.png',
        alt: "McDonald's"
      });
    }

    if (variations.trick_or_trade_2023?.count > 0) {
      badges.push({
        type: 'trick_or_trade',
        icon: 'https://static.tcgcollector.com/content/images/56/f2/0b/56f20b33b7fdbc299dcb083234a867e7df37aa7c468e1123f41c5affdb154c27.png',
        alt: 'Trick or Trade'
      });
    }

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

    if (variations.pokemon_center?.count > 0) {
      badges.push({
        type: 'pokemon_center',
        icon: 'https://www.clipartmax.com/png/middle/30-301097_logo-pkmn-center-by-honokawa-pokemon-center.png',
        alt: 'Pokemon Center'
      });
    }

    if (variations['10th_anniversary']?.count > 0) {
      badges.push({
        type: '10th_anniversary',
        icon: 'https://www.clipartmax.com/png/middle/213-2131138_pokémon-10th-anniversary-pokemon-10th-anniversary-logo.png',
        alt: '10th Anniversary'
      });
    }

    if (variations['meiji']?.count > 0) {
      badges.push({
        type: 'meiji',
        icon: 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/meiji.webp',
        alt: 'Meiji'
      });
    }

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

    if (variations['play!_pokemon']?.count > 0) {
      badges.push({
        type: 'play_pokemon',
        icon: 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/PlayPokemonVariant.webp',
        alt: 'Play! Pokemon'
      });
    }

    if (variations.cosmos_holo?.count > 0) {
      badges.push({
        type: 'cosmos_holo',
        icon: 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/HoloVariant.webp',
        alt: 'Cosmos Holo'
      });
    }

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

    const isOwned = variations.some(v => v.count && v.count > 0);
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

    const searchMatch = searchQuery === '' ||
        card.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.set?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.number?.toString().includes(searchQuery);

    const statusMatch = currentFilter === 'all'
        ? true
        : currentFilter === 'trade'
            ? hasTradeAvailable
            : cardStats.owned === currentFilter;

    const eraMatch = currentEra === 'all' || card.era === currentEra;

    return statusMatch && eraMatch && searchMatch;
  }).sort((a, b) => {
    const dateA = a.releaseDate || '';
    const dateB = b.releaseDate || '';
    return sortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
  });

  const eras = ['all', ...new Set(cards.map(c => c.era).filter(Boolean))];

  const neededCardsForExport = cards.filter(card => {
    const searchMatch = searchQuery === '' ||
        card.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.set?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        card.number?.toString().includes(searchQuery);
    const eraMatch = currentEra === 'all' || card.era === currentEra;
    return getCardStats(card).owned === 'no' && eraMatch && searchMatch;
  }).sort((a, b) => {
    const dateA = a.releaseDate || '';
    const dateB = b.releaseDate || '';
    return sortOrder === 'asc' ? dateA.localeCompare(dateB) : dateB.localeCompare(dateA);
  });

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

  const touchStartRef = React.useRef(null);
  const touchEndRef = React.useRef(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchStartRef.current - touchEndRef.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) navigateToNextCard();
    if (isRightSwipe) navigateToPreviousCard();
  };

  // Loading screen
  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background">
          <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-primary"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl">🎴</div>
          </div>
          <div className="text-foreground text-3xl font-heading font-bold mb-4 mt-8 tracking-wider">YUKA MORII</div>
          <div className="text-muted-foreground text-lg">Loading Collection...</div>
        </div>
    );
  }

  // Auth screen
  if (showAuth && !user) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="modal-content p-10 max-w-md w-full animate-fade-in-scale">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎴</div>
              <h2 className="text-4xl font-heading font-extrabold italic text-foreground mb-2">
                Yuka Morii
              </h2>
              <p className="text-muted-foreground text-sm">Trading Card Collection</p>
            </div>
            <div className="space-y-4">
              <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full bg-card text-foreground border border-border py-4 rounded-full font-bold text-lg hover:bg-secondary transition-all flex items-center justify-center gap-3"
                  style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
              <p className="text-center text-muted-foreground text-xs">
                Sign in to save and sync your collection across devices
              </p>
            </div>
          </div>
        </div>
    );
  }

  // Main app
  return (
      <div className="min-h-screen bg-background">
        {imagePopup && (
            <ImageModal imageUrl={imagePopup} onClose={() => setImagePopup(null)} />
        )}

        {showShareModal && user && (
            <ShareModal
                userId={user.uid}
                onCopyLink={copyShareLink}
                onClose={() => setShowShareModal(false)}
            />
        )}

        {showPreferences && (
            <PreferencesModal
                mode={themeMode}
                accent={themeAccent}
                onModeChange={setThemeMode}
                onAccentChange={setThemeAccent}
                onClose={() => setShowPreferences(false)}
            />
        )}

        {showExportSheet && (
            <ExportSheetModal
                cards={neededCardsForExport}
                onClose={() => setShowExportSheet(false)}
            />
        )}

        {selectedCard && (
            <CardModal
                card={selectedCard}
                isViewOnly={isViewOnly}
                onClose={() => { setSelectedCard(null); setSelectedVariation(null); }}
                onPrev={navigateToPreviousCard}
                onNext={navigateToNextCard}
                onImageClick={(url) => setImagePopup(url)}
                onIncrement={incrementCount}
                onDecrement={decrementCount}
                onToggleLanguage={toggleLanguage}
                onToggleOrdered={toggleOrdered}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            />
        )}

        <div className="no-print relative max-w-7xl mx-auto px-4 sm:px-6 pb-4 sm:pb-6">
          <div
              className={`sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-4 sm:pt-6 pb-2 bg-background transition-shadow duration-200 ${
                isScrolled ? 'shadow-md' : ''
              }`}
          >
            <Header
                user={user}
                isViewOnly={isViewOnly}
                sharedOwnerEmail={sharedOwnerEmail}
                currentFilter={currentFilter}
                previousFilter={previousFilter}
                compact={isScrolled}
                onToggleTradeView={() => {
                  if (currentFilter === 'trade') {
                    setCurrentFilter(previousFilter);
                  } else {
                    setPreviousFilter(currentFilter);
                    setCurrentFilter('trade');
                  }
                }}
                onShare={() => setShowShareModal(true)}
                onLogout={handleLogout}
                onOpenPreferences={() => setShowPreferences(true)}
                onOpenExportSheet={() => setShowExportSheet(true)}
            />

            <StatsPanel stats={stats} onFilterChange={setCurrentFilter} />

            <FiltersBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                currentEra={currentEra}
                onEraChange={setCurrentEra}
                eras={eras}
                sortOrder={sortOrder}
                onSortChange={setSortOrder}
            />
          </div>

          <CardGrid
              filteredCards={filteredCards}
              currentFilter={currentFilter}
              isViewOnly={isViewOnly}
              hasExpansionStampOwned={hasExpansionStampOwned}
              getExpansionStampMapping={getExpansionStampMapping}
              getVariationBadges={getVariationBadges}
              onCardClick={(card) => {
                setSelectedCard(card);
                setSelectedVariation(Object.keys(card.variations)[0]);
              }}
              onImagePopup={(url) => setImagePopup(url)}
          />
        </div>
      </div>
  );
}

export default App;
