import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Header from '@/components/Header';
import StatsPanel from '@/components/StatsPanel';
import FiltersBar from '@/components/FiltersBar';
import CardGrid from '@/components/CardGrid';
import CardModal from '@/components/CardModal';
import ImageModal from '@/components/ImageModal';
import ShareModal from '@/components/ShareModal';

// ── Supabase client (replace with your actual env vars) ──────────────────────
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Auth screen ───────────────────────────────────────────────────────────────
const AuthScreen = ({ onSignIn }: { onSignIn: () => void }) => (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="surface-card max-w-md w-full p-10 text-center">
            <div className="text-6xl mb-4">🎴</div>
            <h2 className="text-4xl font-heading font-extrabold italic text-foreground mb-2">Yuka Morii</h2>
            <p className="text-muted-foreground text-sm mb-8">Trading Card Collection</p>
            <button
                onClick={onSignIn}
                className="w-full bg-card text-foreground border border-border py-4 rounded-full font-bold text-lg hover:bg-secondary transition-all flex items-center justify-center gap-3 shadow-lg"
            >
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
            </button>
            <p className="text-center text-muted-foreground text-xs mt-4">
                Sign in to save and sync your collection across devices
            </p>
        </div>
    </div>
);

// ── Loading screen ────────────────────────────────────────────────────────────
const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <div className="relative">
            <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-primary"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl">🎴</div>
        </div>
        <div className="text-foreground text-3xl font-heading font-bold mb-4 mt-8 tracking-wider">YUKA MORII</div>
        <div className="text-muted-foreground text-lg">Loading Collection...</div>
    </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function getExpansionStampMapping(): Record<string, string> {
    return {
        "Unseen Forces": "https://static.tcgcollector.com/content/images/8b/69/08/8b690895e437bb8e05703beae93ab969d242e92fa3daf990301884ba09009fda.png",
        "Delta Species": "https://static.tcgcollector.com/content/images/5c/a6/17/5ca6176f30689b2a44406af607118616d09ecf20e522bd2a317a3cd10a6a1803.png",
        "Dragon Frontiers": "https://static.tcgcollector.com/content/images/8e/2d/44/8e2d443613a9641708c2418af15304a801e6b046367f65c84ba5ec99a4656ca7.png",
        "Team Rocket Returns": "https://static.tcgcollector.com/content/images/78/8d/13/788d132009893c9127853650d194e307c22e1aa97ae05375504a06433901ff24.png",
        "Deoxys": "https://static.tcgcollector.com/content/images/0e/15/fb/0e15fbb1fc543fc4ad62aeebcf73d05727768b2f87297116751c1bb668aabdd1.png",
        "Emerald": "https://static.tcgcollector.com/content/images/f3/1e/52/f31e526e0e5972bc49611b9e96f62318c87558a70f697235b7dfe5dfd0173390.png",
        "Mysterious Treasures": "https://static.tcgcollector.com/content/images/3f/a6/4e/3fa64e1cf41c21777401645a08260412a37958e87352306123eabd6a558c8f29.png",
        "Stellar Crown": "https://static.tcgcollector.com/content/images/22/9d/b5/229db50764bfeb9e1a04db5c221fd5d2a4bc0d0e265d719bcc31667705a70de4.png",
    };
}

function hasExpansionStampOwned(card: any): boolean {
    if (!card.variations) return false;
    const key = Object.keys(card.variations).find(
        k => k.toLowerCase().includes('expansion') && k.toLowerCase().includes('stamp')
    );
    return !!key && card.variations[key]?.count > 0;
}

function getVariationBadges(variations: any) {
    const badges: any[] = [];
    if (!variations) return badges;

    const checks: [string | string[], string, string, string][] = [
        [['countdown_calendar', 'holiday_calender_2023'], 'calendar', 'https://cdn-icons-png.flaticon.com/512/9141/9141642.png', 'Calendar'],
        ['burger_king_collection_2008', 'burger_king', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cc/Burger_King_2020.svg/1024px-Burger_King_2020.svg.png', 'BK'],
        [['first_edition', 'first_edition_holo'], 'first_edition', 'https://archives.bulbagarden.net/media/upload/0/0b/1st_edition_English.png', '1st Ed'],
        ["McDonal's_collections_2015", 'mcdonalds', 'https://static.tcgcollector.com/content/images/cd/68/ae/cd68aeeb12917f049a96466cda6f49c05f048663cf3a20b8102675037122767d.png', "McDonald's"],
        ['trick_or_trade_2023', 'trick_or_trade', 'https://static.tcgcollector.com/content/images/56/f2/0b/56f20b33b7fdbc299dcb083234a867e7df37aa7c468e1123f41c5affdb154c27.png', 'Trick or Trade'],
        ['comic-con_san_diego_2007', 'comic_con', 'https://play-lh.googleusercontent.com/gNToWY4-nL4_uKA93aQw6qFmG8nE4Ukq6TX9RGaOZ8CxObRDKBoZOHlP2c5CyXPGXA=w600-h300-pc0xffffff-pd', 'Comic-Con'],
        ['world_championship_deck_2004:_Blaziken_teach', 'wc2004', 'https://static.tcgcollector.com/content/images/75/5f/25/755f25350a035533604832c437246b15b214a631d319a8e59ed760572b603eaf.png', 'World Championship 2004'],
        ['tropical_mega_battle_2001', 'tropical', 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/tropicalMegaBattle2001.webp', 'Tropical Mega Battle 2001'],
        ['pokemon_center', 'pokemon_center', 'https://www.clipartmax.com/png/middle/30-301097_logo-pkmn-center-by-honokawa-pokemon-center.png', 'Pokemon Center'],
        ['10th_anniversary', '10th', 'https://www.clipartmax.com/png/middle/213-2131138_pokémon-10th-anniversary-pokemon-10th-anniversary-logo.png', '10th Anniversary'],
        ['meiji', 'meiji', 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/meiji.webp', 'Meiji'],
        ['play!_pokemon', 'play_pokemon', 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/PlayPokemonVariant.webp', 'Play! Pokemon'],
        ['cosmos_holo', 'cosmos_holo', 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/HoloVariant.webp', 'Cosmos Holo'],
        ['unpeeled_ditto', 'ditto', 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/UnpeeledDittoVariant.webp', 'Ditto'],
    ];

    for (const [keys, type, icon, alt] of checks) {
        const keyArr = Array.isArray(keys) ? keys : [keys];
        if (keyArr.some(k => variations[k]?.count > 0)) {
            badges.push({ type, icon, alt });
        }
    }

    const hasStamp = Object.keys(variations).some(
        k => (k.includes('expansion_stamp') || k.includes('PRERELESE_stamp')) && variations[k]?.count > 0
    );
    if (hasStamp) {
        badges.push({ type: 'stamp', icon: 'https://dextcg.com/cdn-cgi/image/w=2048,q=75,f=auto/https://static.dextcg.com/resources/variants/StampVariant.webp', alt: 'Stamp' });
    }

    return badges;
}

function enrichVariations(variations: any, userData: any) {
    if (!variations) return { normal: { count: 0, ordered: false, languages: [] } };
    if (!userData) return variations;
    const enriched = { ...variations };
    Object.keys(enriched).forEach(k => {
        if (userData[k]) enriched[k] = { ...enriched[k], ...userData[k] };
    });
    return enriched;
}

function getCardStats(card: any) {
    if (!card.variations) return { owned: 'no' };
    const vals = Object.values(card.variations) as any[];
    const isOwned = vals.some(v => v.count > 0);
    const isOrdered = !isOwned && vals.some(v => v.ordered === true && (!v.count || v.count === 0));
    if (isOwned) return { owned: 'yes' };
    if (isOrdered) return { owned: 'ordered' };
    return { owned: 'no' };
}

// ── Main component ────────────────────────────────────────────────────────────
const Index = () => {
    const [user, setUser] = useState<any>(null);
    const [cards, setCards] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isViewOnly, setIsViewOnly] = useState(false);
    const [sharedOwnerEmail, setSharedOwnerEmail] = useState<string | null>(null);
    const [currentFilter, setCurrentFilter] = useState('all');
    const [previousFilter, setPreviousFilter] = useState('all');
    const [currentEra, setCurrentEra] = useState('all');
    const [sortOrder, setSortOrder] = useState('asc');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCard, setSelectedCard] = useState<any>(null);
    const [imagePopup, setImagePopup] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // ── Load cards.json ─────────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch(`${import.meta.env.BASE_URL}cards.json`);
                const data = await res.json();
                setCards(data);
            } catch (err) {
                console.error('Failed to load cards.json', err);
            } finally {
                setLoading(false);
            }
        };

        const urlParams = new URLSearchParams(window.location.search);
        const sharedUserId = urlParams.get('user');

        if (sharedUserId) {
            setIsViewOnly(true);
            init().then(() => loadSharedCollection(sharedUserId));
        } else {
            // Listen for Supabase auth state
            supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) {
                    setUser(session.user);
                } else {
                    setShowAuth(true);
                }
            });
            supabase.auth.onAuthStateChange((_event, session) => {
                if (session?.user) {
                    setUser(session.user);
                    setShowAuth(false);
                } else {
                    setUser(null);
                    setShowAuth(true);
                }
            });
            init();
        }
    }, []);

    // ── Load user collection from Supabase ──────────────────────────────────────
    useEffect(() => {
        if (!user || isViewOnly || cards.length === 0) return;

        const loadUserCollection = async () => {
            const { data, error } = await supabase
                .from('collections')
                .select('card_data')
                .eq('user_id', user.id)
                .single();

            if (error || !data) return;

            const userData = data.card_data || {};
            setCards(prev => prev.map(card => ({
                ...card,
                variations: enrichVariations(card.variations, userData[card.id]),
            })));
        };

        loadUserCollection();
    }, [user, cards.length]);

    // ── Lock body scroll when modal open ───────────────────────────────────────
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
            if (scrollY > 0) window.scrollTo(0, scrollY);
        }
        return () => {
            const scrollY = parseInt(document.body.dataset.scrollY || '0');
            document.body.style.overflow = '';
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            delete document.body.dataset.scrollY;
            if (scrollY > 0) window.scrollTo(0, scrollY);
        };
    }, [selectedCard]);

    // ── Auth ────────────────────────────────────────────────────────────────────
    const handleGoogleSignIn = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: window.location.origin + window.location.pathname },
        });
        if (error) console.error('Sign-in error:', error.message);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setCards(prev => prev.map(card => ({
            ...card,
            variations: Object.keys(card.variations || {}).reduce((acc: any, key) => ({
                ...acc,
                [key]: { ...card.variations[key], count: 0, ordered: false, languages: [] },
            }), {}),
        })));
    };

    // ── Shared collection ───────────────────────────────────────────────────────
    const loadSharedCollection = async (userId: string) => {
        const { data } = await supabase
            .from('collections')
            .select('card_data, owner_email')
            .eq('user_id', userId)
            .single();

        if (!data) return;
        setSharedOwnerEmail(data.owner_email || 'A Collector');
        setUser({ id: userId, email: data.owner_email || 'A Collector' });
        const userData = data.card_data || {};
        setCards(prev => prev.map(card => ({
            ...card,
            variations: enrichVariations(card.variations, userData[card.id]),
        })));
    };

    // ── Save to Supabase ────────────────────────────────────────────────────────
    const saveCardStatus = async (cardId: string, variations: any) => {
        if (!user || isViewOnly) return;

        const { data: existing } = await supabase
            .from('collections')
            .select('card_data')
            .eq('user_id', user.id)
            .single();

        const currentData = existing?.card_data || {};
        const newData = { ...currentData, [cardId]: variations };

        await supabase.from('collections').upsert({
            user_id: user.id,
            owner_email: user.email,
            card_data: newData,
            last_updated: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    };

    // ── Card mutation helpers ───────────────────────────────────────────────────
    const mutateCard = (cardId: string, mutate: (card: any) => any) => {
        setCards(prev => {
            const next = prev.map(card => card.id === cardId ? mutate(card) : card);
            const updated = next.find(c => c.id === cardId);
            if (updated && selectedCard?.id === cardId) setSelectedCard(updated);
            return next;
        });
    };

    const incrementCount = (cardId: string, varType: string, e: any) => {
        if (e) e.stopPropagation();
        if (isViewOnly) return;
        mutateCard(cardId, card => {
            const v = card.variations[varType];
            const count = (v.count || 0) + 1;
            const defaultLang = v.default_language || v.available_languages?.[0] || '';
            const languages = v.count === 0 ? (defaultLang ? [defaultLang] : []) : (v.languages || []);
            const updated = { ...card.variations, [varType]: { ...v, count, ordered: false, languages } };
            saveCardStatus(cardId, updated);
            return { ...card, variations: updated };
        });
    };

    const decrementCount = (cardId: string, varType: string, e: any) => {
        if (e) e.stopPropagation();
        if (isViewOnly) return;
        mutateCard(cardId, card => {
            const v = card.variations[varType];
            const count = Math.max(0, (v.count || 0) - 1);
            const languages = count === 0 ? [] : (v.languages || []);
            const updated = { ...card.variations, [varType]: { ...v, count, languages } };
            saveCardStatus(cardId, updated);
            return { ...card, variations: updated };
        });
    };

    const toggleLanguage = (cardId: string, varType: string, lang: string, e: any) => {
        if (e) e.stopPropagation();
        if (isViewOnly) return;
        mutateCard(cardId, card => {
            const v = card.variations[varType];
            if (!v.count) return card;
            const langs = v.languages || [];
            const newLangs = langs.includes(lang) ? langs.filter((l: string) => l !== lang) : [...langs, lang];
            const updated = { ...card.variations, [varType]: { ...v, languages: newLangs } };
            saveCardStatus(cardId, updated);
            return { ...card, variations: updated };
        });
    };

    const toggleOrdered = (cardId: string, varType: string, e: any) => {
        if (e) e.stopPropagation();
        if (isViewOnly) return;
        mutateCard(cardId, card => {
            const v = card.variations[varType];
            if (v.count > 0) return card;
            const updated = { ...card.variations, [varType]: { ...v, ordered: !v.ordered } };
            saveCardStatus(cardId, updated);
            return { ...card, variations: updated };
        });
    };

    // ── Filtering & sorting ─────────────────────────────────────────────────────
    const filteredCards = cards.filter(card => {
        const stats = getCardStats(card);
        const hasTradeAvailable = card.variations &&
            Object.values(card.variations).some((v: any) => (v.count || 0) > 1);

        const searchMatch = searchQuery === '' ||
            card.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.set?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            card.number?.toString().includes(searchQuery);

        const statusMatch = currentFilter === 'all' ? true
            : currentFilter === 'trade' ? hasTradeAvailable
                : stats.owned === currentFilter;

        const eraMatch = currentEra === 'all' || card.era === currentEra;
        return statusMatch && eraMatch && searchMatch;
    }).sort((a, b) => {
        const sa = parseInt(a.sheet_no) || 0;
        const sb = parseInt(b.sheet_no) || 0;
        return sortOrder === 'asc' ? sa - sb : sb - sa;
    });

    const eras = ['all', ...Array.from(new Set(cards.map((c: any) => c.era).filter(Boolean)))];

    const stats = {
        total: cards.length,
        owned: cards.filter(c => getCardStats(c).owned === 'yes').length,
        ordered: cards.filter(c => getCardStats(c).owned === 'ordered').length,
        needed: cards.filter(c => getCardStats(c).owned === 'no').length,
        completion: cards.length > 0
            ? Math.round((cards.filter(c => getCardStats(c).owned === 'yes').length / cards.length) * 100)
            : 0,
    };

    // ── Modal navigation ────────────────────────────────────────────────────────
    const navigateToPreviousCard = (e?: any) => {
        if (e) e.stopPropagation();
        const idx = filteredCards.findIndex(c => c.id === selectedCard.id);
        const prev = filteredCards[idx > 0 ? idx - 1 : filteredCards.length - 1];
        setSelectedCard(prev);
    };

    const navigateToNextCard = (e?: any) => {
        if (e) e.stopPropagation();
        const idx = filteredCards.findIndex(c => c.id === selectedCard.id);
        const next = filteredCards[idx < filteredCards.length - 1 ? idx + 1 : 0];
        setSelectedCard(next);
    };

    // ── Swipe ───────────────────────────────────────────────────────────────────
    const onTouchStart = (e: any) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
    const onTouchMove = (e: any) => setTouchEnd(e.targetTouches[0].clientX);
    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const dist = touchStart - touchEnd;
        if (dist > 50) navigateToNextCard();
        if (dist < -50) navigateToPreviousCard();
    };

    // ── Trade view toggle ───────────────────────────────────────────────────────
    const handleToggleTradeView = () => {
        if (currentFilter === 'trade') {
            setCurrentFilter(previousFilter);
        } else {
            setPreviousFilter(currentFilter);
            setCurrentFilter('trade');
        }
    };

    // ── Copy share link ─────────────────────────────────────────────────────────
    const copyShareLink = () => {
        const url = `${window.location.origin}${window.location.pathname}?user=${user.id}`;
        navigator.clipboard.writeText(url);
    };

    // ── Render ──────────────────────────────────────────────────────────────────
    if (loading) return <LoadingScreen />;
    if (showAuth && !user) return <AuthScreen onSignIn={handleGoogleSignIn} />;

    return (
        <div className="min-h-screen bg-background">
            {imagePopup && (
                <ImageModal imageUrl={imagePopup} onClose={() => setImagePopup(null)} />
            )}

            {showShareModal && user && (
                <ShareModal
                    userId={user.id}
                    onCopyLink={() => { copyShareLink(); setShowShareModal(false); }}
                    onClose={() => setShowShareModal(false)}
                />
            )}

            {selectedCard && (
                <CardModal
                    card={selectedCard}
                    isViewOnly={isViewOnly}
                    onClose={() => setSelectedCard(null)}
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

            <div className="max-w-7xl mx-auto p-4 sm:p-6">
                <Header
                    user={user}
                    isViewOnly={isViewOnly}
                    sharedOwnerEmail={sharedOwnerEmail}
                    currentFilter={currentFilter}
                    previousFilter={previousFilter}
                    onToggleTradeView={handleToggleTradeView}
                    onShare={() => setShowShareModal(true)}
                    onLogout={handleLogout}
                />

                <StatsPanel stats={stats} onFilterChange={setCurrentFilter} />

                <FiltersBar
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    currentEra={currentEra}
                    onEraChange={setCurrentEra}
                    eras={eras as string[]}
                    sortOrder={sortOrder}
                    onSortChange={setSortOrder}
                />

                <CardGrid
                    filteredCards={filteredCards}
                    currentFilter={currentFilter}
                    isViewOnly={isViewOnly}
                    hasExpansionStampOwned={hasExpansionStampOwned}
                    getExpansionStampMapping={getExpansionStampMapping}
                    getVariationBadges={getVariationBadges}
                    onCardClick={(card) => setSelectedCard(card)}
                    onImagePopup={(url) => setImagePopup(url)}
                />
            </div>
        </div>
    );
};

export default Index;
