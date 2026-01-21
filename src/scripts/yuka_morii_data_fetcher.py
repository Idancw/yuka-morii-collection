import json
import requests
from bs4 import BeautifulSoup
import time
import os
from typing import Dict, List, Optional
from urllib.parse import urlparse
import re


class CardEnricher:
    """Enrich card data by scraping existing URLs"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })

    def scrape_serebii_card(self, url: str) -> Dict:
        """Scrape card info from Serebii"""
        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')

            variations = {
                'normal': {
                    'owned': 'no',
                    'languages': ['English']
                }
            }

            # Check page content for variation hints
            page_text = soup.get_text().lower()

            # Check for holofoil mentions
            if 'holofoil' in page_text or 'holo rare' in page_text or 'holographic' in page_text:
                variations['holo'] = {
                    'owned': 'no',
                    'languages': ['English']
                }

            # Check for reverse holo
            if 'reverse' in page_text and 'holo' in page_text:
                variations['reverse_holo'] = {
                    'owned': 'no',
                    'languages': ['English']
                }

            # Check rarity from table
            tables = soup.find_all('table')
            for table in tables:
                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all('td')
                    if len(cells) >= 2:
                        cell_text = cells[0].get_text().strip().lower()
                        if 'rarity' in cell_text:
                            rarity_text = cells[1].get_text().strip().lower()
                            if 'holo' in rarity_text and 'reverse' not in rarity_text:
                                variations['holo'] = {
                                    'owned': 'no',
                                    'languages': ['English']
                                }

            return variations

        except Exception as e:
            print(f"    Error scraping Serebii: {e}")
            return None

    def scrape_pkmncards(self, url: str) -> Dict:
        """Scrape card info from PkmnCards"""
        try:
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            soup = BeautifulSoup(response.content, 'html.parser')

            variations = {
                'normal': {
                    'owned': 'no',
                    'languages': ['English']
                }
            }

            # Look for variation info in the page
            page_text = soup.get_text().lower()

            # Check for holofoil
            if 'holofoil' in page_text or 'holo rare' in page_text:
                variations['holo'] = {
                    'owned': 'no',
                    'languages': ['English']
                }

            # Check for reverse holo
            if 'reverse holofoil' in page_text or 'reverse holo' in page_text:
                variations['reverse_holo'] = {
                    'owned': 'no',
                    'languages': ['English']
                }

            return variations

        except Exception as e:
            print(f"    Error scraping PkmnCards: {e}")
            return None

    def get_variations_from_era(self, era: str) -> Dict:
        """Get default variations based on era"""
        variations = {
            'normal': {
                'owned': 'no',
                'languages': ['English']
            }
        }

        # Different eras have different common variations
        if era in ['Neo', 'e-cards']:
            # Older sets often have 1st edition
            variations['reverse_holo'] = {'owned': 'no', 'languages': ['English']}
            variations['first_edition'] = {'owned': 'no', 'languages': ['English']}

        elif era in ['EX', 'Diamond Pearl', 'Platinum', 'Heart Gold Soul Silver']:
            # These eras commonly have reverse holos
            variations['reverse_holo'] = {'owned': 'no', 'languages': ['English']}

        elif era in ['Black and White', 'X&Y', 'Sun & Moon', 'Sword & Shield', 'Scarlet & Violet']:
            # Modern sets typically have reverse holo
            variations['reverse_holo'] = {'owned': 'no', 'languages': ['English']}

        return variations

    def enrich_card(self, card: Dict) -> Dict:
        """Enrich a single card with variation data"""
        print(f"Processing: {card['name']} ({card.get('set', 'Unknown')} #{card.get('number', '?')})")

        # Start with era-based defaults
        variations = self.get_variations_from_era(card.get('era', ''))

        # Try to scrape from existing URL if available
        if card.get('url'):
            domain = urlparse(card['url']).netloc

            if 'serebii' in domain:
                scraped = self.scrape_serebii_card(card['url'])
                if scraped:
                    variations.update(scraped)
                    print(f"  ✓ Scraped from Serebii")
            elif 'pkmncards' in domain:
                scraped = self.scrape_pkmncards(card['url'])
                if scraped:
                    variations.update(scraped)
                    print(f"  ✓ Scraped from PkmnCards")

        # Check card name for special indicators
        card_name_lower = card['name'].lower()
        if 'holo' in card_name_lower:
            if 'holo' not in variations:
                variations['holo'] = {'owned': 'no', 'languages': ['English']}
            # This is specifically a holo version
            variations['normal']['owned'] = 'no'  # Don't assume normal exists

        # Preserve existing ownership status for normal variation
        current_owned = card.get('owned', 'no')
        if 'normal' in variations:
            variations['normal']['owned'] = current_owned

        # Add variations to card
        card['variations'] = variations

        # Add metadata
        card['enriched'] = True
        card['enriched_method'] = 'web_scraping'

        return card

    def process_collection(self, input_file: str, output_file: str, delay: float = 1.0, start_from: int = 0):
        """Process entire collection and save enriched data"""
        print(f"Loading cards from {input_file}...")

        with open(input_file, 'r', encoding='utf-8') as f:
            cards = json.load(f)

        # Load existing progress if output file exists
        enriched_cards = []
        if os.path.exists(output_file) and start_from > 0:
            print(f"Loading existing progress from {output_file}...")
            with open(output_file, 'r', encoding='utf-8') as f:
                enriched_cards = json.load(f)
            print(f"Resuming from card {start_from + 1}")

        print(f"\nProcessing {len(cards)} cards (starting from #{start_from + 1})...\n")
        print("=" * 80)

        success_count = len([c for c in enriched_cards if c.get('enriched')])

        for i in range(start_from, len(cards)):
            card = cards[i]
            print(f"\n[{i + 1}/{len(cards)}]", end=" ")

            try:
                enriched_card = self.enrich_card(card)

                if len(enriched_cards) > i:
                    enriched_cards[i] = enriched_card
                else:
                    enriched_cards.append(enriched_card)

                if enriched_card.get('enriched'):
                    success_count += 1

                # Save progress every 20 cards
                if (i + 1) % 20 == 0:
                    print(f"\n    💾 Saving progress...")
                    with open(output_file, 'w', encoding='utf-8') as f:
                        json.dump(enriched_cards, f, indent=2, ensure_ascii=False)

            except KeyboardInterrupt:
                print(f"\n\n⚠️  Interrupted by user. Saving progress...")
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(enriched_cards, f, indent=2, ensure_ascii=False)
                print(f"Progress saved. Resume with start_from={i}")
                return
            except Exception as e:
                print(f"  ❌ Error processing card: {e}")
                if len(enriched_cards) > i:
                    enriched_cards[i] = card
                else:
                    enriched_cards.append(card)

            # Rate limiting - be nice to the servers
            time.sleep(delay)

        print("\n" + "=" * 80)
        print(f"\nSaving final data to {output_file}...")

        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(enriched_cards, f, indent=2, ensure_ascii=False)

        print("✅ Done!")

        # Print summary
        total_variations = sum(
            len(card.get('variations', {}))
            for card in enriched_cards
        )

        print(f"\n{'=' * 80}")
        print(f"SUMMARY:")
        print(f"{'=' * 80}")
        print(f"  Total cards processed: {len(enriched_cards)}")
        print(f"  Successfully enriched: {success_count}")
        print(f"  Total variations found: {total_variations}")
        print(f"  Average variations per card: {total_variations / len(enriched_cards):.2f}")


def main():
    """Main function"""
    print("=" * 80)
    print("POKEMON CARD WEB SCRAPER ENRICHER")
    print("=" * 80)
    print("\nThis script will enrich your card collection with variation data")
    print("by scraping information from Serebii and PkmnCards.\n")
    print("No API key needed! 🎉\n")

    enricher = CardEnricher()

    # Check if user wants to resume
    start_from = 0
    if os.path.exists('cards_enriched.json'):
        resume = input("Found existing cards_enriched.json. Resume from last position? (y/n): ")
        if resume.lower() == 'y':
            with open('cards_enriched.json', 'r') as f:
                existing = json.load(f)
                start_from = len(existing)
                print(f"Will resume from card #{start_from + 1}\n")

    # Process the collection
    enricher.process_collection(
        input_file='../../public/cards.json',
        output_file='cards_enriched.json',
        delay=1.0,  # Be respectful - 1 second between requests
        start_from=start_from
    )

    print("\n" + "=" * 80)
    print("NEXT STEPS:")
    print("=" * 80)
    print("1. Review cards_enriched.json")
    print("2. If satisfied, backup your original cards.json:")
    print("   cp cards.json cards_backup.json")
    print("3. Replace cards.json with cards_enriched.json:")
    print("   cp cards_enriched.json cards.json")
    print("4. Update your website with the new App.jsx code")
    print("5. Test the new variation features!")
    print("=" * 80)


if __name__ == "__main__":
    main()





