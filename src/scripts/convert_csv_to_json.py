import json
import csv


def parse_variations_string(variations_str):
    """
    Parse variations string from CSV into variation objects.
    Example: "normal, reverse_holo, burger_king_2008"
    Returns: dict with variation objects
    """
    if not variations_str or variations_str.strip().upper() == 'NONE':
        return {}

    variations = {}
    variant_list = [v.strip() for v in variations_str.split(',')]

    for variant in variant_list:
        if not variant:
            continue

        # Replace ALL underscores with spaces for display
        variant_key = variant  # Keep original for dict key

        # Determine language availability based on variant type and set
        if 'japanese' in variant.lower() or 'jp' in variant.lower():
            available_languages = ['JP']
            default_language = 'JP'
        else:
            # Most modern cards have both EN and JP
            available_languages = ['EN', 'JP']
            default_language = 'EN'

        # Special cases - check against original variant name
        if variant in ['burger_king_2008', 'countdown_calendar', 'stamped', 'mcdonald']:
            available_languages = ['EN']
            default_language = 'EN'

        variations[variant_key] = {
            'count': 0,
            'ordered': False,
            'languages': [],
            'default_language': default_language,
            'available_languages': available_languages
        }

    return variations


def update_database_from_csv(csv_file, json_file, output_file):
    """
    Read CSV with updated variations and update the cards.json database
    """
    print(f"📖 Reading CSV file: {csv_file}")

    # Read CSV
    csv_data = {}
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            card_id = row['Card ID']

            # Check if this card should be deleted
            if 'DELETE' in row.get('Notes for QA', '').upper():
                csv_data[card_id] = {'action': 'delete'}
                continue

            # Use "Updated Variations" column if it exists, otherwise use "Current Variations"
            variations_str = row.get('Updated Variations', '').strip()
            if not variations_str:
                variations_str = row.get('Current Variations', '').strip()

            csv_data[card_id] = {
                'action': 'update',
                'variations': parse_variations_string(variations_str)
            }

    print(f"✅ Loaded {len(csv_data)} cards from CSV")

    # Read existing JSON database
    print(f"📖 Reading JSON database: {json_file}")
    with open(json_file, 'r', encoding='utf-8') as f:
        cards = json.load(f)

    print(f"✅ Loaded {len(cards)} cards from database")

    # Update cards
    updated_count = 0
    deleted_count = 0
    not_found_count = 0
    preserved_data_count = 0

    # Create new cards list (excluding deleted ones)
    new_cards = []

    for card in cards:
        card_id = card.get('id')

        if card_id not in csv_data:
            # Card not in CSV, keep as is
            new_cards.append(card)
            not_found_count += 1
            continue

        csv_entry = csv_data[card_id]

        if csv_entry['action'] == 'delete':
            print(f"🗑️  Deleting: {card.get('name')} ({card_id})")
            deleted_count += 1
            continue

        # Update variations
        old_variations = card.get('variations', {})
        new_variations = csv_entry['variations']

        # Preserve user data (counts, ordered status, languages)
        merged_variations = {}
        for var_type, var_data in new_variations.items():
            if var_type in old_variations:
                # Preserve user data from old variation
                merged_variations[var_type] = {
                    **var_data,
                    'count': old_variations[var_type].get('count', 0),
                    'ordered': old_variations[var_type].get('ordered', False),
                    'languages': old_variations[var_type].get('languages', [])
                }
                if old_variations[var_type].get('count', 0) > 0 or old_variations[var_type].get('ordered', False):
                    preserved_data_count += 1
            else:
                # New variation type
                merged_variations[var_type] = var_data

        card['variations'] = merged_variations
        new_cards.append(card)
        updated_count += 1

    print(f"\n📊 Summary:")
    print(f"   Updated: {updated_count} cards")
    print(f"   Deleted: {deleted_count} cards")
    print(f"   Unchanged: {not_found_count} cards")
    print(f"   Preserved user data in: {preserved_data_count} variations")

    # Save updated database
    print(f"\n💾 Saving to: {output_file}")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(new_cards, f, indent=2, ensure_ascii=False)

    print(f"✅ Done! Database updated successfully")
    print(f"\n⚠️  IMPORTANT: Review {output_file} before replacing your original cards.json")


if __name__ == "__main__":
    # Usage
    csv_file = '../data/cards_variations_review.csv'
    json_file = '../data/cards.json'
    output_file = '../data/cards_updated_from_csv.json'

    update_database_from_csv(csv_file, json_file, output_file)
