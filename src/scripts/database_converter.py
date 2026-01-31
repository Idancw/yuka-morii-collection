#!/usr/bin/env python3
"""
Pokemon Card JSON/CSV Converter
Converts JSON card data to CSV for editing variant languages, and back to JSON.
"""

import json
import csv
from typing import List, Dict, Any


def json_to_csv(json_file: str, csv_file: str) -> None:
    """
    Convert JSON pokemon card data to CSV format.
    Each variation gets its own row for easy editing.

    Args:
        json_file: Path to input JSON file
        csv_file: Path to output CSV file
    """
    # Load JSON data
    with open(json_file, 'r', encoding='utf-8') as f:
        cards = json.load(f)

    # Prepare CSV rows
    rows = []

    for card in cards:
        card_id = card.get('id', '')
        name = card.get('name', '')
        set_name = card.get('set', '')
        era = card.get('era', '')
        number = card.get('number', '')
        sheet_no = card.get('sheet_no', '')
        owned = card.get('owned', '')
        imageUrl = card.get('imageUrl', '')
        url = card.get('url', '')
        enriched = card.get('enriched', '')
        enriched_method = card.get('enriched_method', '')

        variations = card.get('variations', {})

        # Create a row for each variation
        for variation_type, variation_data in variations.items():
            count = variation_data.get('count', 0)
            ordered = variation_data.get('ordered', False)
            languages = variation_data.get('languages', [])
            default_language = variation_data.get('default_language', '')
            available_languages = variation_data.get('available_languages', [])

            # Convert lists to pipe-separated strings for CSV
            languages_str = '|'.join(languages) if languages else ''
            available_languages_str = '|'.join(available_languages) if available_languages else ''

            row = {
                'card_id': card_id,
                'name': name,
                'set': set_name,
                'era': era,
                'number': number,
                'sheet_no': sheet_no,
                'owned': owned,
                'imageUrl': imageUrl,
                'url': url,
                'enriched': enriched,
                'enriched_method': enriched_method,
                'variation_type': variation_type,
                'count': count,
                'ordered': ordered,
                'languages': languages_str,
                'default_language': default_language,
                'available_languages': available_languages_str
            }
            rows.append(row)

    # Write to CSV
    if rows:
        fieldnames = list(rows[0].keys())
        with open(csv_file, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

        print(f"✓ Converted {len(cards)} cards ({len(rows)} variations) to CSV: {csv_file}")
    else:
        print("✗ No data to convert")


def csv_to_json(csv_file: str, json_file: str) -> None:
    """
    Convert CSV pokemon card data back to JSON format.
    Combines variation rows back into card objects.

    Args:
        csv_file: Path to input CSV file
        json_file: Path to output JSON file
    """
    # Read CSV data
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    # Group rows by card_id
    cards_dict = {}

    for row in rows:
        card_id = row['card_id']

        # Initialize card if not exists
        if card_id not in cards_dict:
            cards_dict[card_id] = {
                'id': card_id,
                'name': row['name'],
                'set': row['set'],
                'era': row['era'],
                'number': row['number'],
                'sheet_no': row['sheet_no'],
                'owned': row['owned'],
                'imageUrl': row['imageUrl'],
                'url': row['url'],
                'variations': {},
                'enriched': row['enriched'] == 'True' or row['enriched'] == 'true',
                'enriched_method': row['enriched_method']
            }

        # Add variation
        variation_type = row['variation_type']

        # Convert pipe-separated strings back to lists
        languages = [lang.strip() for lang in row['languages'].split('|') if lang.strip()]
        available_languages = [lang.strip() for lang in row['available_languages'].split('|') if lang.strip()]

        # Convert count to int
        try:
            count = int(row['count'])
        except (ValueError, TypeError):
            count = 0

        # Convert ordered to boolean
        ordered = row['ordered'].lower() in ('true', '1', 'yes')

        cards_dict[card_id]['variations'][variation_type] = {
            'count': count,
            'ordered': ordered,
            'languages': languages,
            'default_language': row['default_language'],
            'available_languages': available_languages
        }

    # Convert to list
    cards = list(cards_dict.values())

    # Write to JSON
    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)

    print(f"✓ Converted CSV to {len(cards)} cards in JSON: {json_file}")


def main():
    """Main function to demonstrate usage"""
    import sys

    if len(sys.argv) < 2:
        print("Pokemon Card JSON/CSV Converter")
        print("\nUsage:")
        print("  Convert JSON to CSV - j2c")
        print("\n  Convert CSV back to JSON: - c2j")
        return

    command = sys.argv[1].lower()

    csv_file = '../data/csv/cards_variations_review.csv'

    if command == 'j2c':
        json_file = '../data/json/cards.json'
        json_to_csv(json_file, csv_file)

    elif command == 'c2j':
        json_file = '../data/cards_updated_from_csv.json'
        csv_to_json(csv_file, json_file)

    else:
        print("✗ Invalid command or arguments")


if __name__ == '__main__':
    main()
