"""Normaliza los atlas generados a celdas enteras y audita su transparencia."""

from pathlib import Path
from shutil import copyfile
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


def normalize_contain_grid(path, cols, rows, cell_size, max_content=(232, 232)):
    source = Image.open(path).convert("RGBA")
    cw, ch = cell_size
    if source.size == (cols * cw, rows * ch):
        return
    output = Image.new("RGBA", (cols * cw, rows * ch))
    for row in range(rows):
        for col in range(cols):
            raw = source.crop(split_box(source, col, row, cols, rows))
            bbox = visible_bbox(raw)
            content = raw.crop(bbox)
            ratio = min(max_content[0] / content.width, max_content[1] / content.height)
            content = content.resize((round(content.width * ratio), round(content.height * ratio)), NEAREST)
            x = col * cw + (cw - content.width) // 2
            y = row * ch + ch - content.height
            output.alpha_composite(content, (x, y))
    output.save(path, optimize=True)


def normalize_uniform_grid(path, source_cols, source_rows, selected, target_cols, target_rows,
                           cell_size=(256, 256), max_content=(238, 238)):
    """Reencuadra todos los fotogramas con una escala común para evitar pulsos de tamaño."""
    source = Image.open(path).convert("RGBA")
    if source.size == (target_cols * cell_size[0], target_rows * cell_size[1]):
        return
    contents = []
    for index in selected:
        col, row = index % source_cols, index // source_cols
        raw = source.crop(split_box(source, col, row, source_cols, source_rows))
        bbox = visible_bbox(raw)
        assert bbox, f"{path.name}: fotograma fuente vacío {index}"
        contents.append(raw.crop(bbox))
    ratio = min(
        max_content[0] / max(content.width for content in contents),
        max_content[1] / max(content.height for content in contents),
    )
    cw, ch = cell_size
    output = Image.new("RGBA", (target_cols * cw, target_rows * ch))
    for out_index, content in enumerate(contents):
        content = content.resize((round(content.width * ratio), round(content.height * ratio)), NEAREST)
        col, row = out_index % target_cols, out_index // target_cols
        x = col * cw + (cw - content.width) // 2
        y = row * ch + ch - content.height
        output.alpha_composite(content, (x, y))
    output.save(path, optimize=True)


def calibrate_attack_body(path, scale=.80):
    source = Image.open(path).convert("RGBA")
    output = Image.new("RGBA", source.size)
    for row in range(2):
        for col in range(3):
            cell = source.crop((col * 256, row * 256, (col + 1) * 256, (row + 1) * 256))
            main = keep_largest_component(cell)
            main_alpha = main.getchannel("A")
            rest = cell.copy()
            rest.putalpha(Image.frombytes(
                "L", cell.size,
                bytes(max(0, a - m) for a, m in zip(cell.getchannel("A").get_flattened_data(), main_alpha.get_flattened_data()))
            ))
            output.alpha_composite(rest, (col * 256, row * 256))
            bbox = visible_bbox(main)
            content = main.crop(bbox)
            content = content.resize((round(content.width * scale), round(content.height * scale)), NEAREST)
            center = (bbox[0] + bbox[2]) // 2
            x = col * 256 + center - content.width // 2
            y = row * 256 + bbox[3] - content.height
            output.alpha_composite(content, (x, y))
    output.save(path, optimize=True)


def normalize_grid(path, cols, rows, cell_size, anchor_rows=(), isolate=False, alpha_cutoff=0, force=False):
    source = Image.open(path).convert("RGBA")
    cw, ch = cell_size
    if source.size == (cols * cw, rows * ch) and not force:
        return
    output = Image.new("RGBA", (cols * cw, rows * ch))
    for row in range(rows):
        for col in range(cols):
            cell = source.crop(split_box(source, col, row, cols, rows)).resize(cell_size, NEAREST)
            if alpha_cutoff:
                alpha = cell.getchannel("A")
                cell.putalpha(alpha.point(lambda value: 0 if value < alpha_cutoff else value))
            alpha = cell.getchannel("A")
            cell.putalpha(alpha.point(lambda value: 255 if value >= 250 else value))
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
    attacks = SPRITES / "attack-v4-atlas.png"
    attacks_v5 = SPRITES / "attack-v5-atlas.png"
    crouch = SPRITES / "crouch-pandero-atlas.png"
    crouch_idle = SPRITES / "crouch-idle-atlas.png"
    crouch_v3 = SPRITES / "crouch-pandero-v3-atlas.png"
    crouch_idle_v3 = SPRITES / "crouch-idle-v3-atlas.png"
    guitar_special_v2 = SPRITES / "guitar-special-v2-atlas.png"
    tuna = SPRITES / "goal-tuna-atlas.png"
    tuna_animated = SPRITES / "goal-tuna-animated-atlas.png"
    thrower = SPRITES / "thrower-v4-atlas.png"
    normalize_grid(heroine, 10, 4, (200, 200), anchor_rows=(0, 1, 2, 3), force=True)
    normalize_grid(urban, 10, 3, (217, 241), anchor_rows=(0, 1, 2), isolate=True)
    normalize_grid(enemies, 10, 3, (217, 241), anchor_rows=(0, 1, 2), isolate=True)
    normalize_victory(victory)
    normalize_grid(attacks, 3, 2, (256, 256), anchor_rows=(0, 1), alpha_cutoff=72, force=True)
    copyfile(attacks, attacks_v5)
    calibrate_attack_body(attacks_v5)
    normalize_grid(crouch, 4, 2, (256, 256), anchor_rows=(0, 1), force=True)
    normalize_contain_grid(crouch_idle, 4, 1, (256, 256), max_content=(232, 220))
    normalize_uniform_grid(crouch_v3, 4, 2, list(range(8)), 4, 2, max_content=(238, 238))
    normalize_uniform_grid(crouch_idle_v3, 4, 1, list(range(4)), 4, 1, max_content=(238, 220))
    # Se descartan los dos extremos erróneos del generador (abanico sin guitarra) y
    # se mantienen diez tiempos repitiendo la aparición y la recuperación.
    normalize_uniform_grid(guitar_special_v2, 5, 2, [1, 1, 2, 3, 4, 5, 6, 7, 8, 8], 5, 2)
    normalize_grid(tuna, 2, 2, (256, 256), anchor_rows=(0, 1), force=True)
    normalize_grid(tuna_animated, 4, 4, (256, 256), anchor_rows=(0, 1, 2, 3))
    normalize_grid(thrower, 5, 2, (256, 256), anchor_rows=(0, 1), force=True)
    audit(heroine, 10, 4, (2000, 800))
    audit(urban, 10, 3, (2170, 723))
    audit(enemies, 10, 3, (2170, 723))
    audit(victory, 8, 1, (2048, 256))
    audit(guitar, 2, 1, (1774, 887))
    audit(bouquet, 6, 1, (2172, 724))
    audit(attacks, 3, 2, (768, 512))
    audit(attacks_v5, 3, 2, (768, 512))
    audit(crouch, 4, 2, (1024, 512))
    audit(crouch_idle, 4, 1, (1024, 256))
    audit(crouch_v3, 4, 2, (1024, 512))
    audit(crouch_idle_v3, 4, 1, (1024, 256))
    audit(guitar_special_v2, 5, 2, (1280, 512))
    audit(tuna, 2, 2, (512, 512))
    audit(tuna_animated, 4, 4, (1024, 1024))
    audit(thrower, 5, 2, (1280, 512))
    print("OK: 192 celdas auditadas; cuadrículas enteras, alpha RGBA y escala uniforme normalizadas.")


if __name__ == "__main__":
    main()
