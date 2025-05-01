import os
import subprocess

# Base directories
script_directory = os.path.dirname(os.path.abspath(__file__))
VIDEO_DIR = os.path.join(script_directory, 'video')
DOC2_DIR = os.path.join(script_directory, 'doc2')

# Ensure output dirs exist
os.makedirs(DOC2_DIR, exist_ok=True)

# Function to convert video to frames
def convert_video_to_frames(video_path, output_folder):
    # Ensure the folder for frames exists
    os.makedirs(output_folder, exist_ok=True)
    
    # ffmpeg command to extract one frame per second
    command = [
        'ffmpeg', 
        '-i', video_path,                # Input video path
        '-vf', 'fps=1',                  # Extract 1 frame per second
        os.path.join(output_folder, 'frame%d.jpg')  # Output frames as frame1.jpg, frame2.jpg, ...
    ]
    
    # Execute the command
    subprocess.run(command)

# Iterate over all video subfolders and process videos
for folder_name in os.listdir(VIDEO_DIR):
    folder_path = os.path.join(VIDEO_DIR, folder_name)
    if not os.path.isdir(folder_path):
        continue  # Skip if not a directory
    
    # Check for .mp4 files in the subfolder
    for file_name in os.listdir(folder_path):
        if file_name.lower().endswith('.mp4'):
            video_path = os.path.join(folder_path, file_name)
            
            # Create a folder in DOC2_DIR with the same name as the video folder
            output_folder = os.path.join(DOC2_DIR, folder_name)
            
            # Convert video to frames and save them
            print(f"Converting {video_path} to frames...")
            convert_video_to_frames(video_path, output_folder)
            print(f"Frames saved in {output_folder}")
