import os
import shutil

# Ensure script directory is defined first
script_directory = os.path.dirname(os.path.abspath(__file__))

# Base directories
VIDEO_DIR = os.path.join(script_directory, 'video')
DOC2_DIR = os.path.join(script_directory, 'doc2')

# Ensure output dirs exist
os.makedirs(DOC2_DIR, exist_ok=True)

# Now transfer the frames from the 'doc2' folders to the 'video' folders
for folder_name in os.listdir(DOC2_DIR):
    folder_path = os.path.join(DOC2_DIR, folder_name)
    
    # Check if it's a directory inside 'doc2'
    if os.path.isdir(folder_path):
        # Look for the corresponding video folder
        corresponding_video_folder = os.path.join(VIDEO_DIR, folder_name)
        
        # If the corresponding folder exists in the 'video' directory, proceed to transfer images
        if os.path.isdir(corresponding_video_folder):
            # Loop through the files in the doc2 subfolder
            for img_file in os.listdir(folder_path):
                img_path = os.path.join(folder_path, img_file)
                
                # Check if it's a valid image file (e.g., .jpg or .jpeg)
                if img_file.lower().endswith(('.jpg', '.jpeg', '.png')):
                    # Define the destination path in the 'video' folder
                    destination_path = os.path.join(corresponding_video_folder, img_file)
                    
                    # Copy the image to the corresponding video folder
                    shutil.copy(img_path, destination_path)
                    print(f"Transferred: {img_path} to {destination_path}")
        else:
            print(f"No corresponding video folder for: {folder_name}")
