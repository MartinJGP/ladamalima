"""Normaliza los atlas generados a celdas enteras y audita su transparencia."""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "dist" / "assets" / "sprites"
NEAREST = Image.Resampling.NEAREST


def visible_bbox(image):
    return image.getchannel("A").point(lambda value: 255 if value >= 32 else 0).getbbox()


def split_box(image, col, row, cols, rows):
    return (
        round(col * image.width / cols),
        round(row * image.height / rows),
        round((col + 1) * image.width / cols),
        round((row + 1) * image.height / rows),
    )


def shift_to_bottom(cell, bottom):
    bbox = visible_bbox(cell)
    if not bbox:
        return cell
    shift = bottom - bbox[3]
    moved = Image.new("RGBA", cell.size)
    moved.alpha_composite(cell, (0, shift))
    return moved


def keep_largest_component(cell):
    alpha = cell.getchannel("A")
    width, height = cell.size
    alpha_values = list(alpha.get_flattened_data())
    solid = bytearray(1 if value >= 32 else 0 for value in alpha_values)
    visited = bytearray(width * height)
    largest = []
    for start, present in enumerate(solid):
        if not present or visited[start]:
            continue
        component = []
        stack = [start]
        visited[start] = 1
        while stack:
            index = stack.pop()
            component.append(index)
            x, y = index % width, index // width
            for ny in range(max(0, y - 1), min(height, y + 2)):
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    neighbor = ny * width + nx
                    if solid[neighbor] and not visited[neighbor]:
                        visited[neighbor] = 1
                        stack.append(neighbor)
        if len(component) > len(largest):
            largest = component
    keep = bytearray(width * height)
    for index in largest:
        keep[index] = 255
    cleaned = cell.copy()
    cleaned.putalpha(Image.frombytes("L", cell.size, bytes(min(a, k) for a, k in zip(alpha_values, keep))))
    return cleaned


def normalize_grid(path, cols, rows, cell_size, anchor_rows=(), isolate=False):
    source = Image.open(path).convert("RGBA")
    cw, ch = cell_size
    if source.size == (cols * cw, rows * ch):
        return
    output = Image.new("RGBA", (cols * cw, rows * ch))
    for row in range(rows):
        for col in range(cols):
            cell = source.crop(split_box(source, col, row, cols, rows)).resize(cell_size, NEAREST)
            if isolate:
                cell = keep_largest_component(cell)
            if row in anchor_rows:
                cell = shift_to_bottom(cell, ch)
            output.alpha_composite(cell, (col * cw, row * ch))
    output.save(path, optimize=True)


def normalize_victory(path):
    source = Image.open(path).convert("RGBA")
    size = 256
    if source.size == (8 * size, size):
        return
    output = Image.new("RGBA", (8 * size, size))
    contents = []
    for col in range(8):
        cell = source.crop(split_box(source, col, 0, 8, 1))
        bbox = visible_bbox(cell)
        contents.append(cell.crop(bbox))
    ratio = min(238 / max(content.width for content in contents), 244 / max(content.height for content in contents))
    for col, content in enumerate(contents):
        content = content.resize((round(content.width * ratio), round(content.height * ratio)), NEAREST)
        content = content.crop(visible_bbox(content))
        output.alpha_composite(content, (col * size + (size - content.width) // 2, size - content.height))
    output.save(path, optimize=True)


def audit(path, cols, rows, expected):
    image = Image.open(path).convert("RGBA")
    assert image.size == expected, f"{path.name}: {image.size} != {expected}"
    assert image.getchannel("A").getextrema() == (0, 255), f"{path.name}: alpha inválido"
    boxes = []
    for row in range(rows):
        for col in range(cols):
            cell = image.crop(split_box(image, col, row, cols, rows))
            bbox = visible_bbox(cell)
            assert bbox, f"{path.name}: celda vacía {col},{row}"
            boxes.append(bbox)
    return boxes


def main():
    heroine = SPRITES / "heroine-v3-atlas.png"
    urban = SPRITES / "urban-enemy-atlas.png"
    enemies = SPRITES / "enemy-atlas.png"
    victory = SPRITES / "victory-v3-atlas.png"
    guitar = SPRITES / "guitar-equipment.png"
    bouquet = SPRITES / "bouquet-atlas.png"
    normalize_grid(heroine, 10, 4, (200, 200), anchor_rows=(0, 1, 2, 3))
    normalize_grid(urban, 10, 3, (217, 241), anchor_rows=(0, 1, 2), isolate=True)
    normalize_grid(enemies, 10, 3, (217, 241), anchor_rows=(0, 1, 2), isolate=True)
    normalize_victory(victory)
    audit(heroine, 10, 4, (2000, 800))
    audit(urban, 10, 3, (2170, 723))
    audit(enemies, 10, 3, (2170, 723))
    audit(victory, 8, 1, (2048, 256))
    audit(guitar, 2, 1, (1774, 887))
    audit(bouquet, 6, 1, (2172, 724))
    print("OK: 116 celdas auditadas; cuadrículas enteras, alpha RGBA y anclaje inferior normalizados.")


if __name__ == "__main__":
    main()
