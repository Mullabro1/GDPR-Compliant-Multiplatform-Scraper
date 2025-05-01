import os
import json
import re
from urllib.parse import urlparse

# Config paths
base_dir = os.path.dirname(os.path.abspath(__file__))
collections_dirs = ['posts', 'reels', 'files2']
scraped_posts_dir = os.path.join(base_dir, 'fol2')
scraped_reels_dir = os.path.join(base_dir, 'fol3')
output_dir = os.path.join(base_dir, 'scraped')
os.makedirs(output_dir, exist_ok=True)

def extract_shortcode(url):
    # Clean query params
    clean_url = url.split('?')[0]
    path = urlparse(clean_url).path
    parts = path.strip('/').split('/')
    if len(parts) >= 2 and parts[1]:
        if parts[0] in ['p', 'reel']:
            return parts[1]
    return None

def load_json(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(data, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

def process_collection_file(file_path, collection_name, scraped_dir):
    try:
        links = load_json(file_path)
        for entry in links:
            url = entry.get('url')
            if not url or '/tv/' in url:
                continue
            shortcode = extract_shortcode(url)
            if not shortcode:
                continue

            scraped_file = os.path.join(scraped_dir, f"{shortcode}.json")
            if os.path.exists(scraped_file):
                # Copy the scraped data to scraped/{shortcode}/
                out_dir = os.path.join(output_dir, shortcode)
                out_data_path = os.path.join(out_dir, f"{shortcode}.json")
                info_path = os.path.join(out_dir, "collection_info.json")

                scraped_data = load_json(scraped_file)
                save_json(scraped_data, out_data_path)

                if os.path.exists(info_path):
                    info = load_json(info_path)
                    if collection_name not in info["collections"]:
                        info["collections"].append(collection_name)
                else:
                    info = {"collections": [collection_name]}
                save_json(info, info_path)
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

def process_all():
    for collection_folder in collections_dirs:
        full_path = os.path.join(base_dir, collection_folder)
        print(f"\nProcessing collection: {collection_folder}")

        if not os.path.isdir(full_path):
            print(f"Folder {collection_folder} doesn't exist.")
            continue

        for filename in os.listdir(full_path):
            if not filename.lower().endswith('.json'):
                continue

            file_path = os.path.join(full_path, filename)
            collection_name = os.path.splitext(filename)[0]

            # Use fol2 for posts, fol3 for reels, files2 could be either
            if collection_folder == 'posts':
                process_collection_file(file_path, collection_name, scraped_posts_dir)
            elif collection_folder == 'reels':
                process_collection_file(file_path, collection_name, scraped_reels_dir)
            elif collection_folder == 'files2':
                # Try both scraped folders
                process_collection_file(file_path, collection_name, scraped_posts_dir)
                process_collection_file(file_path, collection_name, scraped_reels_dir)

if __name__ == "__main__":
    process_all()
