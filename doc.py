import os
import re
import json
from docx import Document

# Set up paths
script_directory = os.path.dirname(os.path.abspath(__file__))
input_folder = os.path.join(script_directory, 'files')
output_folder = os.path.join(script_directory, 'files2')

# Create output folder if it doesn't exist
os.makedirs(output_folder, exist_ok=True)

# Regex to match Instagram URLs
INSTAGRAM_PATTERN = re.compile(r'https?://(?:www\.)?instagram\.com/[^\s)\'"]+', re.IGNORECASE)

def extract_instagram_links(docx_path):
    doc = Document(docx_path)
    text = "\n".join([para.text for para in doc.paragraphs])
    raw_links = re.findall(INSTAGRAM_PATTERN, text)

    cleaned_links = []
    for link in raw_links:
        link = link.split('?')[0]  # Remove query parameters
        if not link.endswith('/'):
            link += '/'  # Ensure trailing slash
        cleaned_links.append({"url": link})
    
    return cleaned_links

def process_all_files(input_dir, output_dir):
    for filename in os.listdir(input_dir):
        if filename.lower().endswith('.docx'):
            docx_path = os.path.join(input_dir, filename)
            base_name = os.path.splitext(filename)[0]
            json_path = os.path.join(output_dir, f"{base_name}.json")

            links = extract_instagram_links(docx_path)
            print(f"[+] {filename} → {len(links)} link(s) extracted")

            with open(json_path, 'w') as f:
                json.dump(links, f, indent=2)

if __name__ == "__main__":
    process_all_files(input_folder, output_folder)
