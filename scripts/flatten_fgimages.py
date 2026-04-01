import os
import re
import shutil

root_dir = r"f:/repo/exia/public/images/fgimage"
root_dir = os.path.abspath(root_dir)

# Pattern: character/costume/expression_folder/sprite_expression__index.png
# images/fgimage/([^/\\]+)[\/\\]([^/\\]+)[\/\\](.+)[\/\\]sprite_([^/\\]+)__(\d+).*\.png$
pattern = re.compile(r"([^/\\]+)[\/\\]([^/\\]+)[\/\\](.+)[\/\\]sprite_([^/\\]+)__(\d+).*\.png$", re.IGNORECASE)

moves = []

print(f"Scanning: {root_dir}")

for root, dirs, files in os.walk(root_dir):
    for filename in files:
        full_path = os.path.join(root, filename)
        rel_path = os.path.relpath(full_path, root_dir)
        
        match = pattern.match(rel_path)
        if match:
            char_name = match.group(1)
            costume = match.group(2)
            expr = match.group(4)
            index = match.group(5)
            
            # The user wants character_costume_expression_index.png
            new_filename = f"{char_name}_{costume}_{expr}_{index}.png"
            new_path = os.path.join(root_dir, new_filename)
            
            moves.append((full_path, new_path))
        # else:
        #    print(f"DEBUG: No match for {rel_path}")

if not moves:
    print("No matching files found. Please check the regex or directory structure.")
else:
    print(f"Found {len(moves)} files to rename.")
    for src, dst in moves:
        try:
            if not os.path.exists(src):
                print(f"ERROR: Source not found: {src}")
                continue
            
            if os.path.exists(dst):
                # If target exists (e.g. from a previous partial run), we might overwrite
                # but with the index it should be unique.
                print(f"Warning: Destination exists, overwriting: {dst}")
            
            print(f"Moving: {os.path.relpath(src, root_dir)} -> {os.path.basename(dst)}")
            shutil.move(src, dst)
        except Exception as e:
            print(f"FAILED to move {src} to {dst}: {e}")

    # Cleanup empty directories
    print("Cleaning up empty directories...")
    for root, dirs, files in os.walk(root_dir, topdown=False):
        for name in dirs:
            dir_path = os.path.join(root, name)
            try:
                if not os.listdir(dir_path):
                    print(f"Removing empty directory: {dir_path}")
                    os.rmdir(dir_path)
            except Exception as e:
                pass
