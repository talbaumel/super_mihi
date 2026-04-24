import os
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects

def extract_sprites():
    input_path = '/Users/talbaumel/projects/super_mihi/sprites/sprites.png'
    output_dir = '/Users/talbaumel/projects/super_mihi/sprites/extracted/'
    os.makedirs(output_dir, exist_ok=True)

    img = Image.open(input_path).convert('RGBA')
    arr = np.array(img)

    # Threshold for "near-white" (250-255 in all RGB channels)
    # Background mask: where RGB values are all high
    bg_mask = (arr[:, :, 0] >= 250) & (arr[:, :, 1] >= 250) & (arr[:, :, 2] >= 250)
    
    # Binary image: True for non-background pixels
    binary = ~bg_mask
    
    # Label connected components (8-connectivity)
    labeled_array, num_features = label(binary, structure=np.ones((3,3)))
    
    # Get bounding boxes
    objs = find_objects(labeled_array)
    
    bboxes = []
    for i, obj in enumerate(objs):
        if obj is None: continue
        ymin, ymax = obj[0].start, obj[0].stop
        xmin, xmax = obj[1].start, obj[1].stop
        w, h = xmax - xmin, ymax - ymin
        
        # Filter: bbox area >= 1500 and min(width,height) >= 25
        if (w * h >= 1500) and (min(w, h) >= 25):
            bboxes.append([xmin, ymin, xmax, ymax])

    # Merge overlapping/adjacent bounding boxes (within 4 pixels)
    def merge_bboxes(boxes, gap=4):
        changed = True
        while changed:
            changed = False
            new_boxes = []
            used = set()
            for i in range(len(boxes)):
                if i in used: continue
                curr = boxes[i]
                for j in range(i + 1, len(boxes)):
                    if j in used: continue
                    other = boxes[j]
                    
                    # Check if boxes are within 'gap' pixels
                    # Expand curr box by gap to check intersection
                    if not (curr[2] + gap < other[0] or 
                            other[2] + gap < curr[0] or 
                            curr[3] + gap < other[1] or 
                            other[3] + gap < curr[1]):
                        # Merge
                        curr = [min(curr[0], other[0]), min(curr[1], other[1]),
                                max(curr[2], other[2]), max(curr[3], other[3])]
                        used.add(j)
                        changed = True
                new_boxes.append(curr)
                used.add(i)
            boxes = new_boxes
        return boxes

    merged_bboxes = merge_bboxes(bboxes)

    # Sort: row-major (sort by y/50 then x)
    merged_bboxes.sort(key=lambda b: (int(b[1] / 50), b[0]))

    for i, box in enumerate(merged_bboxes):
        xmin, ymin, xmax, ymax = box
        w, h = xmax - xmin, ymax - ymin
        
        # Crop
        sprite_arr = arr[ymin:ymax, xmin:xmax].copy()
        
        # Make background transparent in the crop
        sprite_bg_mask = (sprite_arr[:, :, 0] >= 250) & (sprite_arr[:, :, 1] >= 250) & (sprite_arr[:, :, 2] >= 250)
        sprite_arr[sprite_bg_mask, 3] = 0
        
        sprite_img = Image.fromarray(sprite_arr)
        filename = f"sprite_{i:03d}.png"
        sprite_img.save(os.path.join(output_dir, filename))
        
        print(f"{filename}, {xmin}, {ymin}, {w}, {h}")

if __name__ == "__main__":
    extract_sprites()
