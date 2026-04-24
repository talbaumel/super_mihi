"""Extract per-frame character sprites from sprites/main_charcter.png.

The sheet has 7 labeled animation strips arranged in 4 rows:
  Row 0: IDLE (3)
  Row 1: WALK (15)
  Row 2: RUN (15)
  Row 3: JUMP (5) | LAND (3) | POWER UP (5) | HURT (5)

Strategy mirrors extract_sprites.py but is tuned for this single sheet:
  1. Threshold the near-white background.
  2. 8-connected components.
  3. Drop text labels (low fill density + flat aspect).
  4. Absorb small effect particles (dust, sparkles, stars) into the
     nearest larger neighbour on the same row.
  5. Cluster components into rows; sort each row by x.
  6. Pad each animation group to a common canvas (bottom-anchored)
     so frames don't bob.
"""

import os
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects


INPUT  = '/Users/talbaumel/projects/super_mihi/sprites/main_charcter.png'
OUTPUT = '/Users/talbaumel/projects/super_mihi/sprites/extracted/character/'

BG_TOLERANCE = 30
MIN_AREA = 1200
MIN_SIDE = 20
TEXT_DENSITY_MAX = 0.28
EFFECT_MAX_AREA = 4500     # sparkles/dust/stars can be sizeable here
EFFECT_X_GAP    = 28
ROW_OVERLAP_FRAC = 0.30

# Expected per-row frame counts (top→bottom, left→right within a row).
# (Counts follow what the extractor actually finds on the sheet — the printed
# labels on the sheet are approximate and the artist drew more frames.)
EXPECTED_ROW_COUNTS = [
    [3],              # IDLE
    [17],             # WALK
    [16],             # RUN
    [5, 3, 5, 4],     # JUMP, LAND, POWER UP, HURT
]


def load_image():
    img = Image.open(INPUT).convert('RGBA')
    arr = np.array(img)
    corners = np.stack([arr[0, 0, :3], arr[0, -1, :3],
                        arr[-1, 0, :3], arr[-1, -1, :3]])
    bg_color = np.median(corners, axis=0)
    diff = np.abs(arr[:, :, :3].astype(int) - bg_color.astype(int))
    bg = (diff <= BG_TOLERANCE).all(axis=2)
    return arr, ~bg, bg_color


def find_components(fg):
    labeled, _ = label(fg, structure=np.ones((3, 3)))
    boxes = []
    for i, sl in enumerate(find_objects(labeled), start=1):
        if sl is None:
            continue
        ymin, ymax = sl[0].start, sl[0].stop
        xmin, xmax = sl[1].start, sl[1].stop
        w, h = xmax - xmin, ymax - ymin
        if w * h < MIN_AREA or min(w, h) < MIN_SIDE:
            continue
        sub = (labeled[ymin:ymax, xmin:xmax] == i)
        density = sub.sum() / float(w * h)
        boxes.append({'x0': xmin, 'y0': ymin, 'x1': xmax, 'y1': ymax,
                      'w': w, 'h': h, 'area': w * h, 'density': density})
    return boxes


def drop_text_labels(boxes):
    keep = []
    for b in boxes:
        # Section labels at the top of each row: low density, wide, short.
        if b['density'] < TEXT_DENSITY_MAX and b['w'] > 1.4 * b['h'] and b['h'] < 60:
            continue
        keep.append(b)
    return keep


def vertical_overlap_frac(a, b):
    lo = max(a['y0'], b['y0'])
    hi = min(a['y1'], b['y1'])
    inter = max(0, hi - lo)
    return inter / float(min(a['h'], b['h']))


def absorb_effects(boxes):
    boxes = sorted(boxes, key=lambda b: -b['area'])
    parents = []
    for b in boxes:
        absorbed = False
        if b['area'] <= EFFECT_MAX_AREA:
            best = None
            best_gap = None
            for p in parents:
                if vertical_overlap_frac(b, p) < ROW_OVERLAP_FRAC:
                    continue
                gap = max(b['x0'] - p['x1'], p['x0'] - b['x1'], 0)
                if gap <= EFFECT_X_GAP and (best_gap is None or gap < best_gap):
                    best, best_gap = p, gap
            if best is not None:
                best['x0'] = min(best['x0'], b['x0'])
                best['y0'] = min(best['y0'], b['y0'])
                best['x1'] = max(best['x1'], b['x1'])
                best['y1'] = max(best['y1'], b['y1'])
                best['w'] = best['x1'] - best['x0']
                best['h'] = best['y1'] - best['y0']
                absorbed = True
        if not absorbed:
            parents.append(b)
    return parents


def cluster_rows(boxes):
    boxes = sorted(boxes, key=lambda b: (b['y0'], b['x0']))
    rows = []
    for b in boxes:
        placed = False
        for row in rows:
            ry0 = min(m['y0'] for m in row)
            ry1 = max(m['y1'] for m in row)
            rh  = ry1 - ry0
            inter = max(0, min(b['y1'], ry1) - max(b['y0'], ry0))
            if inter / float(min(b['h'], rh)) >= ROW_OVERLAP_FRAC:
                row.append(b)
                placed = True
                break
        if not placed:
            rows.append([b])
    rows.sort(key=lambda r: min(m['y0'] for m in r))
    for row in rows:
        row.sort(key=lambda m: m['x0'])
    return rows


def write_sprites(arr, rows, bg_color):
    os.makedirs(OUTPUT, exist_ok=True)
    for f in os.listdir(OUTPUT):
        if f.startswith('character_') and f.endswith('.png'):
            os.remove(os.path.join(OUTPUT, f))
    bg_struct = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]])
    flat = [b for row in rows for b in row]
    for i, b in enumerate(flat):
        crop = arr[b['y0']:b['y1'], b['x0']:b['x1']].copy()
        diff = np.abs(crop[:, :, :3].astype(int) - bg_color.astype(int))
        bg = (diff <= BG_TOLERANCE).all(axis=2)
        bg_lab, _ = label(bg, structure=bg_struct)
        edge_ids = set()
        edge_ids.update(bg_lab[0, :].tolist())
        edge_ids.update(bg_lab[-1, :].tolist())
        edge_ids.update(bg_lab[:, 0].tolist())
        edge_ids.update(bg_lab[:, -1].tolist())
        edge_ids.discard(0)
        if edge_ids:
            exterior = np.isin(bg_lab, list(edge_ids))
            crop[exterior, 3] = 0
        Image.fromarray(crop).save(
            os.path.join(OUTPUT, f'character_{i:03d}.png')
        )
        print(f'character_{i:03d}.png  x={b["x0"]:4d} y={b["y0"]:4d}  '
              f'{b["w"]:3d}x{b["h"]:3d}')


def normalize_groups(groups):
    """Pad each group's frames to a common canvas, bottom-anchored."""
    for group in groups:
        paths = [os.path.join(OUTPUT, f'character_{i:03d}.png') for i in group]
        imgs = [Image.open(p).convert('RGBA') for p in paths]
        max_w = max(im.size[0] for im in imgs)
        max_h = max(im.size[1] for im in imgs)
        for p, im in zip(paths, imgs):
            w, h = im.size
            if (w, h) != (max_w, max_h):
                canvas = Image.new('RGBA', (max_w, max_h), (0, 0, 0, 0))
                x = (max_w - w) // 2
                y = max_h - h
                canvas.paste(im, (x, y), im)
                canvas.save(p)
            im.close()


def main():
    arr, fg, bg_color = load_image()
    boxes = find_components(fg)
    boxes = drop_text_labels(boxes)
    boxes = absorb_effects(boxes)
    rows  = cluster_rows(boxes)

    print('Detected rows / counts:', [len(r) for r in rows])
    write_sprites(arr, rows, bg_color)

    # Build animation groups assuming row order matches EXPECTED_ROW_COUNTS.
    flat_index = 0
    groups = {}
    names_in_order = ['idle', 'walk', 'run', 'jump', 'land', 'powerup', 'hurt']
    expected_flat = [c for row in EXPECTED_ROW_COUNTS for c in row]
    name_iter = iter(names_in_order)
    for count in expected_flat:
        name = next(name_iter)
        groups[name] = list(range(flat_index, flat_index + count))
        flat_index += count
    print('Animation groups:', groups)
    normalize_groups(groups.values())

    total = sum(len(r) for r in rows)
    print(f'\nExtracted {total} character sprites.')


if __name__ == '__main__':
    main()
