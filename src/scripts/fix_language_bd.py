import json


def auto_fix_languages(cards):
    """Automatically fix obvious language availability issues"""

    fixed_count = 0

    for card in cards:
        for var_type, var_data in card['variations'].items():
            original_langs = var_data.get('available_languages', [])
            new_langs = None

            # Rule 1: World Championship cards = EN only
            if 'world_championship' in var_type.lower():
                new_langs = ['EN']

            # Rule 2: Comic-Con promos = EN only
            elif 'comic-con' in var_type.lower() or 'comic_con' in var_type.lower():
                new_langs = ['EN']

            # Rule 3: Prerelease/Expansion stamps = Usually EN only
            elif 'prerelese_stamp' in var_type.lower() or 'expansion stamp' in var_type.lower():
                new_langs = ['EN']

            # Rule 4: Burger King, McDonald's = EN only
            elif 'burger_king' in var_type.lower() or 'mcdonal' in var_type.lower():
                new_langs = ['EN']

            # Rule 5: Trick or Trade, Countdown Calendar = EN only
            elif 'trick_or_trade' in var_type.lower() or 'countdown_calendar' in var_type.lower() or 'holiday_calender' in var_type.lower():
                new_langs = ['EN']

            # Rule 6: Play! Pokemon = EN only (usually)
            elif 'play!_pokemon' in var_type.lower() or 'play_pokemon' in var_type.lower():
                new_langs = ['EN']

            # Rule 7: 10th Anniversary promos = JP only
            elif '10th_anniversary' in var_type.lower():
                new_langs = ['JP']

            # Rule 8: Pokemon Center promos = JP only (usually)
            elif 'pokemon_center' in var_type.lower():
                new_langs = ['JP']

            # Rule 9: Tropical Mega Battle = JP only
            elif 'tropical_mega_battle' in var_type.lower():
                new_langs = ['JP']

            # Rule 10: Modern sets (Sword & Shield onwards) - normal/reverse holo have both
            elif card['era'] in ['Sword & Shield', 'Scarlet & Violet', 'Sun & Moon']:
                if var_type in ['normal', 'reverse_holo', 'holo']:
                    new_langs = ['EN', 'JP']

            # Rule 11: Older sets - normal/reverse holo/first edition have both
            elif card['era'] in ['EX', 'Diamond Pearl', 'Platinum', 'Heart Gold Soul Silver',
                                 'Black and White', 'X&Y', 'e-cards', 'Neo']:
                if var_type in ['normal', 'reverse_holo', 'holo', 'first_edition', 'first_edition_holo']:
                    new_langs = ['EN', 'JP']

            # Rule 12: Unpeeled Ditto = EN only
            elif 'unpeeled_ditto' in var_type.lower():
                new_langs = ['EN', 'JP']

            # Rule 13: Cosmos Holo = Usually EN only
            elif 'cosmos_holo' in var_type.lower():
                new_langs = ['EN']

            # Rule 14: Jumbo cards = depends, but if JP set, JP only
            elif 'jumbo' in var_type.lower():
                if card['set'] in ['Unnumbered Releases'] or 'promo' in card['set'].lower():
                    new_langs = ['JP']  # Most jumbo promos are JP

            # Apply fix if we determined new languages
            if new_langs and new_langs != original_langs:
                var_data['available_languages'] = new_langs
                fixed_count += 1
                print(f"✓ Fixed {card['name']} - {var_type}: {original_langs} → {new_langs}")

    print(f"\n✅ Auto-fixed {fixed_count} variations")
    return cards


if __name__ == '__main__':
    with open('../../public/cards.json', 'r', encoding='utf-8') as f:
        cards = json.load(f)

    # Apply auto-fixes
    cards = auto_fix_languages(cards)

    # Save auto-fixed version
    with open('../data/cards_autofixed.json', 'w', encoding='utf-8') as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)




