import json
import os


def migrate_cards_json():
    print('🚀 Starting cards.json migration...')

    try:
        # Get the path to cards.json
        current_dir = os.path.dirname(os.path.abspath(__file__))
        cards_path = os.path.join(current_dir, '..', '..', 'public', 'cards.json')

        # Read the current cards.json
        with open(cards_path, 'r', encoding='utf-8') as f:
            cards_data = json.load(f)

        print(f'📦 Found {len(cards_data)} cards to migrate')

        # Migrate each card's variations
        migrated_cards = []

        for card in cards_data:
            if 'variations' not in card:
                migrated_cards.append(card)
                continue

            migrated_variations = {}

            for var_type, old_var in card['variations'].items():
                # Convert old structure to new structure
                count = 0
                ordered = False

                if old_var.get('owned') == 'yes':
                    count = 1
                elif old_var.get('owned') == 'ordered':
                    count = 0
                    ordered = True
                else:
                    count = 0
                    ordered = False

                migrated_variations[var_type] = {
                    'count': count,
                    'ordered': ordered,
                    'languages': old_var.get('languages', [])
                }

                print(
                    f"  ✓ {card['id']} - {var_type}: owned=\"{old_var.get('owned')}\" → count={count}, ordered={ordered}")

            # Create updated card
            updated_card = card.copy()
            updated_card['variations'] = migrated_variations
            migrated_cards.append(updated_card)

        # Write back to cards.json
        with open(cards_path, 'w', encoding='utf-8') as f:
            json.dump(migrated_cards, f, indent=2, ensure_ascii=False)

        print(f'\n✅ Successfully migrated {len(migrated_cards)} cards!')
        print(f'📝 Updated file: {cards_path}')

    except Exception as error:
        print(f'❌ Migration failed: {error}')


if __name__ == '__main__':
    migrate_cards_json()
