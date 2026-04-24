"""Extract individual sprites from sprites.png.

Strategy:
  1. Threshold out the near-white background.
  2. Find 8-connected components.
  3. Drop tiny noise; drop text labels (low fill density + flat aspect).
  4. Merge nearby small effect particles (dust kicks, sparkles) into the
     large character sprite on the same row.
  5. Cluster components into rows by vertical-center proximity; sort
     each row by x-coordinate; emit row-major.

This produces a stable, deterministic ordering that does not depend on
arbitrary y-bucket sizes and keeps multi-piece sprites (character + dust)
together while keeping distinct frames separate.
"""

import os
import numpy as np
from PIL import Image
from scipy.ndimage import label, find_objects


INPUT  = '/Users/talbaumel/projects/super_mihi/sprites/image.png'
OUTPUT = '/Users/talbaumel/projects/super_mihi/sprites/extracted/'

# Background = pixels close to the dominant corner color (sampled at load time)
BG_TOLERANCE = 25

# Minimum area for a real sprite candidate
MIN_AREA = 1500
MIN_SIDE = 25

# A component is treated as a "text label" if its filled fraction is below
# this threshold AND it is wider than tall.
TEXT_DENSITY_MAX = 0.25

# When merging small effect particles into a parent character, the particle
# must be vertically overlapping the parent and within this many px
# horizontally of the parent bbox.
EFFECT_MAX_AREA = 1200      # particles smaller than this can be absorbed
EFFECT_X_GAP    = 12        # horizontal proximity to parent bbox

# Row clustering: two components are on the same row if the vertical
# overlap of their bboxes is at least this fraction of the smaller height.
ROW_OVERLAP_FRAC = 0.30


def load_image():
    img = Image.open(INPUT).convert('RGBA')
    arr = np.array(img)
    # Sample background color from the four corners (median per channel).
    corners = np.stack([arr[0, 0, :3], arr[0, -1, :3],
                        arr[-1, 0, :3], arr[-1, -1, :3]])
    bg_color = np.median(corners, axis=0)
    diff = np.abs(arr[:, :, :3].astype(int) - bg_color.astype(int))
    bg = (diff <= BG_TOLERANCE).all(axis=2)
    return arr, ~bg, bg_color  # arr, foreground_mask, bg_color


def find_components(fg):
    labeled, n = label(fg, structure=np.ones((3, 3)))
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
        # If this component is much wider than tall, it's almost certainly
        # several adjacent character frames whose ground-level effects
        # (dust kicks, slide trails) merged them into one blob.  Split at
        # vertical gaps found in the UPPER band of the bbox, where the
        # heads/torsos sit clear of the connecting effect pixels.
        for sb in maybe_split_wide(sub, xmin, ymin):
            sw, sh = sb['x1'] - sb['x0'], sb['y1'] - sb['y0']
            if sw * sh < MIN_AREA or min(sw, sh) < MIN_SIDE:
                continue
            sub2 = sub[sb['y0'] - ymin:sb['y1'] - ymin,
                       sb['x0'] - xmin:sb['x1'] - xmin]
            density = sub2.sum() / float(sw * sh)
            boxes.append({
                'x0': sb['x0'], 'y0': sb['y0'],
                'x1': sb['x1'], 'y1': sb['y1'],
                'w': sw, 'h': sh, 'area': sw * sh, 'density': density,
            })
    return boxes


def maybe_split_wide(sub, x_off, y_off):
    """Yield bbox dicts for a component, splitting at vertical gaps in
    the upper band when the component is unusually wide for its height."""
    h, w = sub.shape
    if w <= int(1.3 * h):
        yield {'x0': x_off, 'y0': y_off, 'x1': x_off + w, 'y1': y_off + h}
        return
    # Use the top 40% of rows: above ground-level dust/slide trails AND
    # above outstretched arms in the run cycle, so figures separate cleanly.
    band = sub[: max(1, int(0.40 * h))]
    col_has_fg = band.any(axis=0)
    # A gap is a run of >=2 consecutive empty columns in the upper band.
    splits = []
    in_gap = False
    gap_start = 0
    for x in range(w):
        if not col_has_fg[x]:
            if not in_gap:
                in_gap = True
                gap_start = x
        else:
            if in_gap and (x - gap_start) >= 1:
                splits.append((gap_start, x))
            in_gap = False
    if in_gap and (w - gap_start) >= 1:
        splits.append((gap_start, w))
    if not splits:
        yield {'x0': x_off, 'y0': y_off, 'x1': x_off + w, 'y1': y_off + h}
        return
    # Build piece x-ranges from the gaps.
    x_starts = [0] + [g[1] for g in splits]
    x_ends   = [g[0] for g in splits] + [w]
    for xs, xe in zip(x_starts, x_ends):
        if xe - xs < MIN_SIDE:
            continue
        piece = sub[:, xs:xe]
        if not piece.any():
            continue
        rows = np.where(piece.any(axis=1))[0]
        cols = np.where(piece.any(axis=0))[0]
        py0, py1 = int(rows[0]), int(rows[-1]) + 1
        pxs0, pxs1 = int(cols[0]) + xs, int(cols[-1]) + 1 + xs
        yield {
            'x0': x_off + pxs0, 'y0': y_off + py0,
            'x1': x_off + pxs1, 'y1': y_off + py1,
        }


def drop_text_labels(boxes):
    """Heuristic: text labels have very low fill density compared to
    pixel-art sprites of similar size, and they are typically wide
    relative to their height."""
    keep = []
    for b in boxes:
        if b['density'] < TEXT_DENSITY_MAX and b['w'] > 1.5 * b['h'] and b['h'] < 50:
            continue
        keep.append(b)
    return keep


def vertical_overlap_frac(a, b):
    lo = max(a['y0'], b['y0'])
    hi = min(a['y1'], b['y1'])
    inter = max(0, hi - lo)
    return inter / float(min(a['h'], b['h']))


def absorb_effects(boxes):
    """Merge small effect particles (dust, sparkles) into the nearest
    larger neighbour on the same row."""
    boxes = sorted(boxes, key=lambda b: -b['area'])
    parents = []
    for b in boxes:
        absorbed = False
        if b['area'] <= EFFECT_MAX_AREA:
            for p in parents:
                if vertical_overlap_frac(b, p) < ROW_OVERLAP_FRAC:
                    continue
                gap = max(b['x0'] - p['x1'], p['x0'] - b['x1'], 0)
                if gap <= EFFECT_X_GAP:
                    p['x0'] = min(p['x0'], b['x0'])
                    p['y0'] = min(p['y0'], b['y0'])
                    p['x1'] = max(p['x1'], b['x1'])
                    p['y1'] = max(p['y1'], b['y1'])
                    p['w'] = p['x1'] - p['x0']
                    p['h'] = p['y1'] - p['y0']
                    absorbed = True
                    break
        if not absorbed:
            parents.append(b)
    return parents


def cluster_rows(boxes):
    """Group components into rows using vertical-overlap clustering, then
    sort each row by x. Returns a flat list in row-major order."""
    boxes = sorted(boxes, key=lambda b: (b['y0'], b['x0']))
    rows = []  # each row: list of box dicts
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
    out = []
    for row in rows:
        row.sort(key=lambda m: m['x0'])
        out.extend(row)
    return out


def write_sprites(arr, ordered, bg_color):
    os.makedirs(OUTPUT, exist_ok=True)
    # Clear any old extractions so the count matches exactly.
    for f in os.listdir(OUTPUT):
        if f.startswith('sprite_') and f.endswith('.png'):
            os.remove(os.path.join(OUTPUT, f))
    # 4-connectivity for the background flood-fill so it cannot leak
    # diagonally through 1-pixel gaps in the foreground (e.g. into the
    # white "?" inside a question block).
    bg_struct = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]])
    for i, b in enumerate(ordered):
        crop = arr[b['y0']:b['y1'], b['x0']:b['x1']].copy()
        diff = np.abs(crop[:, :, :3].astype(int) - bg_color.astype(int))
        bg = (diff <= BG_TOLERANCE).all(axis=2)
        # Only clear background regions that touch the crop edge; this
        # keeps interior near-white pixels (sprite detail) opaque.
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
            os.path.join(OUTPUT, f'sprite_{i:03d}.png')
        )
        print(f'sprite_{i:03d}.png  x={b["x0"]:4d} y={b["y0"]:4d}  '
              f'{b["w"]:3d}x{b["h"]:3d}')


def normalize_groups(out_dir, groups):
    """Pad sprites in each group to a common (max_w, max_h) canvas so
    character animations don't pulse/bob between frames. Content is
    bottom-centered (feet stay aligned)."""
    for group in groups:
        paths = [os.path.join(out_dir, f'sprite_{i:03d}.png') for i in group]
        imgs = [Image.open(p).convert('RGBA') for p in paths]
        max_w = max(im.size[0] for im in imgs)
        max_h = max(im.size[1] for im in imgs)
        for p, im in zip(paths, imgs):
            w, h = im.size
            if (w, h) == (max_w, max_h):
                im.close()
                continue
            canvas = Image.new('RGBA', (max_w, max_h), (0, 0, 0, 0))
            x = (max_w - w) // 2          # horizontally center
            y = max_h - h                 # bottom-anchor (feet)
            canvas.paste(im, (x, y), im)
            im.close()
            canvas.save(p)


# Groups of sprite indices that belong to the same character animation.
# Within each group, frames are padded to a common canvas size so the
# character renders at a stable position frame-to-frame.
PLAYER_ANIM_GROUPS = [
    [0, 1, 2, 3],           # idle
    [4, 5, 6, 7, 8, 9],     # walk
    [10, 11, 12, 13, 14],   # run
    [20, 21],               # jump
    [23, 25],               # fall
    [34, 35, 36],           # duck
]


def extract_sprites():
    arr, fg, bg_color = load_image()
    boxes   = find_components(fg)
    boxes   = drop_text_labels(boxes)
    boxes   = absorb_effects(boxes)
    ordered = cluster_rows(boxes)
    write_sprites(arr, ordered, bg_color)
    normalize_groups(OUTPUT, PLAYER_ANIM_GROUPS)
    print(f'\nExtracted {len(ordered)} sprites.')


if __name__ == '__main__':
    extract_sprites()
