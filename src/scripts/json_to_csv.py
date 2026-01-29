import json
import pandas as pd

if __name__ == '__main__':
    # Load your data
    with open('../../public/cards.json', 'r', encoding='utf-8') as f:
        cards = json.load(f)

    # Analyze problems
    issues = []
    for card in cards:
        for var_type, var_data in card['variations'].items():
            available_langs = var_data.get('available_languages', [])

            issue_record = {
                'card_id': card['id'],
                'card_name': card['name'],
                'set': card['set'],
                'era': card['era'],
                'number': card['number'],
                'variation_type': var_type,
                'current_languages': ', '.join(available_langs) if available_langs else 'NOT SET',
                'lang_count': len(available_langs),
                'url': card['url'],
                'needs_review': len(available_langs) != 2 or not available_langs
            }

            if issue_record['needs_review']:
                issues.append(issue_record)

    # Create DataFrame
    df = pd.DataFrame(issues)
    print(f"\nTotal problematic variations: {len(df)}")
    print(f"\nBreakdown:")
    print(df['lang_count'].value_counts())

    # Export to CSV for manual review
    df.to_csv('../data/cards_to_review.csv', index=False)
    print("\n✅ Exported to cards_to_review.csv")

