import json
import requests
from bs4 import BeautifulSoup
import time
from urllib.parse import urljoin


def find_image_url(page_url):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }

    try:
        # Scrape the page to find the card image
        response = requests.get(page_url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        # Method 1: Look for image in table with specific attributes
        # Find img tag with width="265" or border="0" (common pattern for card images)
        img_tag = soup.find("img", {"width": "265"})
        if img_tag and img_tag.get("src"):
            # Convert relative URL to absolute URL
            img_url = urljoin(page_url, img_tag["src"])
            return img_url

        # Method 2: Look for images in table cells
        table = soup.find("table", {"cellpadding": "5"})
        if table:
            img_tag = table.find("img")
            if img_tag and img_tag.get("src"):
                img_url = urljoin(page_url, img_tag["src"])
                return img_url

        # Method 3: Look for Open Graph image
        og_image = soup.find("meta", property="og:image")
        if og_image and og_image.get("content"):
            return og_image["content"]

        # Method 4: Look for any image with /card/ in the path
        for img in soup.find_all("img"):
            src = img.get("src", "")
            if "/card/" in src:
                return urljoin(page_url, src)

    except Exception as e:
        print(f"Error fetching {page_url}: {e}")

    return ""


def update_cards():
    # Load your existing json
    with open('../../public/cards.json', 'r', encoding='utf-8') as f:
        cards = json.load(f)

    total = len(cards)
    print(f"Starting update for {total} cards...")

    for i, card in enumerate(cards):
        # Update if imageUrl is empty or missing
        if not card.get("imageUrl"):
            print(f"[{i + 1}/{total}] Finding image for: {card['name']} ({card['id']})...")
            new_url = find_image_url(card['url'])
            if new_url:
                card["imageUrl"] = new_url
                print(f"  ✓ Found: {new_url}")
            else:
                print(f"  ✗ Not found")

            # Be nice to the servers! Wait 1 second between requests
            time.sleep(0.1)
        else:
            print(f"[{i + 1}/{total}] Skipping {card['name']} (already has imageUrl)")

    # Save the updated file
    with open('../../public/cards.json', 'w', encoding='utf-8') as f:
        json.dump(cards, f, indent=2, ensure_ascii=False)

    print("\nUpdate complete! cards.json has been saved.")


if __name__ == "__main__":
    update_cards()