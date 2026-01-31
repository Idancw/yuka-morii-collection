import requests
import json
import time


def update_database_from_tcgdex():
    """Update database using TCGdex API data from illustrator search"""

    print("🔍 Fetching all Yuka Morii cards from TCGdex...")

    try:
        # Fetch all Yuka Morii cards
        response = requests.get('https://api.tcgdex.net/v2/en/illustrators/Yuka Morii')
        response.raise_for_status()
        data = response.json()
        tcgdex_cards = data.get('cards', [])

        print(f"✅ Found {len(tcgdex_cards)} cards from TCGdex")

        # Create a mapping: card_name -> tcgdex_data
        tcgdex_map = {}
        for card in tcgdex_cards:
            card_id = card.get('id')
            card_name = card.get('name')
            # Use name as key since IDs don't match
            if card_name:
                if card_name not in tcgdex_map:
                    tcgdex_map[card_name] = []
                tcgdex_map[card_name].append(card_id)

        print(f"📖 Reading your existing database...")
        with open('../../public/cards.json', 'r', encoding='utf-8') as f:
            your_cards = json.load(f)

        print(f"✅ Loaded {len(your_cards)} cards from your database\n")
        print("🔄 Matching and updating variations...\n")

        updated_count = 0
        skipped_count = 0

        for idx, your_card in enumerate(your_cards, 1):
            card_name = your_card.get('name', '')
            print(f"Processing {idx}/{len(your_cards)}: {card_name}...")

            # Try to find matching TCGdex card(s)
            matching_ids = tcgdex_map.get(card_name, [])

            if not matching_ids:
                print(f"  ⚠️ No match found in TCGdex")
                skipped_count += 1
                continue

            # If multiple matches, try to pick the best one
            # (we'll just use the first for now, but could add smarter logic)
            tcgdex_id = matching_ids[0]
            if len(matching_ids) > 1:
                print(f"  ⚠️ Multiple matches found, using: {tcgdex_id}")

            # Fetch detailed card info
            try:
                detail_response = requests.get(f'https://api.tcgdex.net/v2/en/cards/{tcgdex_id}')
                detail_response.raise_for_status()
                detail = detail_response.json()

                # Get variations
                variants = detail.get('variants', {})
                set_info = detail.get('set', {})
                set_id = set_info.get('id', '').lower()
                set_name = set_info.get('name', '').lower()

                # Check special sets
                is_vs_set = 'vs' in set_id or 'vs' in set_name
                is_neo_set = set_id.startswith('neo')

                new_variations = {}

                # Normal
                if variants.get('normal'):
                    new_variations['normal'] = {
                        'count': 0,
                        'ordered': False,
                        'languages': [],
                        'default_language': 'JP' if is_vs_set else 'EN',
                        'available_languages': ['JP'] if is_vs_set else ['EN', 'JP']
                    }

                # Reverse Holo (not for Neo or VS sets)
                if (variants.get('reverse') or variants.get('reverseHolo')) and not is_neo_set and not is_vs_set:
                    new_variations['reverse_holo'] = {
                        'count': 0,
                        'ordered': False,
                        'languages': [],
                        'default_language': 'EN',
                        'available_languages': ['EN', 'JP']
                    }

                # 1st Edition
                if variants.get('firstEdition') or variants.get('1stEdition'):
                    new_variations['first_edition'] = {
                        'count': 0,
                        'ordered': False,
                        'languages': [],
                        'default_language': 'JP' if is_vs_set else 'EN',
                        'available_languages': ['JP'] if is_vs_set else ['EN']
                    }

                # Holo
                if variants.get('holo'):
                    new_variations['holo'] = {
                        'count': 0,
                        'ordered': False,
                        'languages': [],
                        'default_language': 'EN',
                        'available_languages': ['EN', 'JP']
                    }

                # Merge with existing user data
                old_variations = your_card.get('variations', {})
                merged_variations = {}

                for var_type, var_data in new_variations.items():
                    if var_type in old_variations:
                        # Preserve user data
                        merged_variations[var_type] = {
                            **var_data,
                            'count': old_variations[var_type].get('count', 0),
                            'ordered': old_variations[var_type].get('ordered', False),
                            'languages': old_variations[var_type].get('languages', [])
                        }
                    else:
                        merged_variations[var_type] = var_data

                your_card['variations'] = merged_variations
                updated_count += 1
                print(f"  ✅ Updated: {list(merged_variations.keys())}")

                time.sleep(0.15)

            except Exception as e:
                print(f"  ⚠️ Error fetching details: {e}")
                skipped_count += 1

        # Save
        with open('../data/cards_updated.json', 'w', encoding='utf-8') as f:
            json.dump(your_cards, f, indent=2, ensure_ascii=False)

        print(f"\n✅ Update complete!")
        print(f"📊 Updated: {updated_count} cards")
        print(f"⚠️  Skipped: {skipped_count} cards")
        print(f"💾 Saved to: cards_updated.json")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    #update_database_from_tcgdex()

    import json

    # Read the updated file
    with open('../data/cards_updated.json', 'r', encoding='utf-8') as f:
        cards = json.load(f)

    # Manual fixes
    manual_fixes = {
        "Bruno's Machamp": {"first_edition": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                              "available_languages": ["JP"]}},
        "Bruno's Steelix": {"first_edition": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                              "available_languages": ["JP"]}},
        "Bruno's Hitmonchan": {
            "first_edition": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                              "available_languages": ["JP"]}},
        "Bruno's Hitmonlee": {"first_edition": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                                "available_languages": ["JP"]}},
        "Bruno's Hitmontop": {"first_edition": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                                "available_languages": ["JP"]}},
        "Bruno's Ursaring": {"first_edition": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                               "available_languages": ["JP"]}},

        # Ditto variants
        "Ditto BULBASAUR": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                       "available_languages": ["EN"]},
                            "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                             "available_languages": ["EN"]}},
        "Ditto CHARMANDER 2": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                          "available_languages": ["EN"]},
                               "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                                "available_languages": ["EN"]}},
        "Ditto MR MIME": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                     "available_languages": ["EN"]},
                          "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                           "available_languages": ["EN"]}},
        "Ditto PIKACHU": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                     "available_languages": ["EN"]},
                          "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                           "available_languages": ["EN"]}},
        "Ditto SQUIRTLE 2": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                        "available_languages": ["EN"]},
                             "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                              "available_languages": ["EN"]}},
        "Ditto CHARMANDER": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                        "available_languages": ["EN"]},
                             "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                              "available_languages": ["EN"]}},
        "Ditto GEODUDE": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                     "available_languages": ["EN"]},
                          "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                           "available_languages": ["EN"]}},
        "Ditto SQUIRTLE": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                      "available_languages": ["EN"]},
                           "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                            "available_languages": ["EN"]}},

        # Japanese promos
        "Pikachu TOKYO": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                     "available_languages": ["JP"]}},
        "Pikachu FUKUOKA": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                       "available_languages": ["JP"]}},
        "Pikachu NAGOYA": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                      "available_languages": ["JP"]}},
        "Pikachu OSAKA": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                     "available_languages": ["JP"]}},
        "Pikachu YOKOHAMA": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                        "available_languages": ["JP"]}},
        "Bulbasaur": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                 "available_languages": ["JP"]}},
        "Charmander": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                                  "available_languages": ["JP"]}},
        "Treecko": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "JP",
                               "available_languages": ["JP"]}},

        # Recent cards
        "Venusaur & Snivy GX": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                           "available_languages": ["EN", "JP"]},
                                "reverse_holo": {"count": 0, "ordered": False, "languages": [],
                                                 "default_language": "EN", "available_languages": ["EN", "JP"]}},
        "Wormadam": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                "available_languages": ["EN", "JP"]},
                     "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                      "available_languages": ["EN", "JP"]}},
        "Staryu": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                              "available_languages": ["EN", "JP"]},
                   "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                    "available_languages": ["EN", "JP"]}},
        "Shieldon": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                "available_languages": ["EN", "JP"]},
                     "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                      "available_languages": ["EN", "JP"]}},
        "Litwick": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                               "available_languages": ["EN", "JP"]},
                    "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                     "available_languages": ["EN", "JP"]}},
        "Ducklett": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                "available_languages": ["EN", "JP"]},
                     "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                      "available_languages": ["EN", "JP"]}},
        "Machop": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                              "available_languages": ["EN", "JP"]},
                   "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                    "available_languages": ["EN", "JP"]}},
        "Murkrow": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                               "available_languages": ["EN", "JP"]},
                    "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                     "available_languages": ["EN", "JP"]}},
        "Pawniard": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                "available_languages": ["EN", "JP"]},
                     "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                      "available_languages": ["EN", "JP"]}},
        "Drapion V": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                 "available_languages": ["EN", "JP"]},
                      "holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                               "available_languages": ["EN", "JP"]}},
        "Nymble": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                              "available_languages": ["EN", "JP"]},
                   "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                    "available_languages": ["EN", "JP"]}},

        # Delta Species Dittos
        "Croconaw 未": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                   "available_languages": ["EN"]},
                        "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                         "available_languages": ["EN"]}},
        "Flaaffy 未": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                  "available_languages": ["EN"]},
                       "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                        "available_languages": ["EN"]}},
        "Chikorita 未": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                    "available_languages": ["EN"]},
                         "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                          "available_languages": ["EN"]}},
        "Ekans 未": {"normal": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                "available_languages": ["EN"]},
                     "reverse_holo": {"count": 0, "ordered": False, "languages": [], "default_language": "EN",
                                      "available_languages": ["EN"]}},
    }

    # Apply fixes
    for card in cards:
        name = card.get('name', '')
        if name in manual_fixes:
            # Preserve user data
            old_vars = card.get('variations', {})
            new_vars = manual_fixes[name]

            merged = {}
            for var_type, var_data in new_vars.items():
                if var_type in old_vars:
                    merged[var_type] = {
                        **var_data,
                        'count': old_vars[var_type].get('count', 0),
                        'ordered': old_vars[var_type].get('ordered', False),
                        'languages': old_vars[var_type].get('languages', [])
                    }
                else:
                    merged[var_type] = var_data

            card['variations'] = merged
            print(f"✅ Fixed: {name}")

    # Save
    with open('../data/json/cards_final.json', 'w', encoding='utf-8') as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)

    print(f"\n✅ All done! Saved to cards_final.json")
    print("Review it, then replace your cards.json")