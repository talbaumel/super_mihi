import os
import re
from PIL import Image, ImageDraw, ImageFont

def create_montage():
    sprite_dir = '/Users/talbaumel/projects/super_mihi/sprites/extracted/'
    output_path = os.path.join(sprite_dir, '_index.png')
    
    # Find all sprite_NNN.png files
    files = [f for f in os.listdir(sprite_dir) if re.match(r'sprite_\d+\.png', f)]
    # Sort them by number
    files.sort(key=lambda x: int(re.search(r'\d+', x).group()))
    
    if not files:
        print("No sprite files found.")
        return

    cols = 8
    rows = (len(files) + cols - 1) // cols
    cell_size = 160
    
    montage_width = cols * cell_size
    montage_height = rows * cell_size
    
    montage = Image.new('RGB', (montage_width, montage_height), color='white')
    draw = ImageDraw.Draw(montage)
    
    # Try to get a default font, otherwise use default
    try:
        font = ImageFont.load_default()
    except:
        font = None

    for i, filename in enumerate(files):
        row = i // cols
        col = i % cols
        
        # Load sprite
        sprite_path = os.path.join(sprite_dir, filename)
        sprite = Image.open(sprite_path)
        
        # Convert to RGBA if needed to handle transparency when pasting onto RGB
        if sprite.mode != 'RGBA':
            sprite = sprite.convert('RGBA')
        
        # Calculate cell position
        cell_x = col * cell_size
        cell_y = row * cell_size
        
        # Draw label (sprite number)
        sprite_num = re.search(r'\d+', filename).group()
        # Use a simple text draw at the top of the cell
        draw.text((cell_x + 5, cell_y + 5), sprite_num, fill='black', font=font)
        
        # Center sprite in the remaining space of the cell
        # Sprite is usually small, but let's be safe. 
        # We'll place it starting below the text.
        # Let's say text takes about 20px.
        available_height = cell_size - 20
        s_w, s_h = sprite.size
        
        # Center horizontally
        offset_x = cell_x + (cell_size - s_w) // 2
        # Center vertically in the space below the text
        offset_y = cell_y + 20 + (available_height - s_h) // 2
        
        # Create a white background for the sprite if it has transparency
        # since the montage is RGB white.
        bg = Image.new('RGBA', sprite.size, (255, 255, 255, 255))
        composite = Image.alpha_composite(bg, sprite)
        
        montage.paste(composite.convert('RGB'), (offset_x, offset_y))

    montage.save(output_path)
    print("done")

if __name__ == "__main__":
    create_montage()
