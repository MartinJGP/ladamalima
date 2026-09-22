from colorsys import rgb_to_hsv
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "game" / "assets" / "sprites"
SOURCES = {
    "heroine-v3-atlas.png": "heroine",
    "attack-v5-atlas.png": "attack",
    "crouch-pandero-v3-atlas.png": "crouch-pandero",
    "crouch-idle-v3-atlas.png": "crouch-idle",
    "victory-v3-atlas.png": "victory",
}


def recolor(source: Path, destination: Path, costume: str) -> None:
    image = Image.open(source).convert("RGBA")
    output = Image.new("RGBA", image.size)
    pixels = []
    for red, green, blue, alpha in image.getdata():
        if alpha == 0:
            pixels.append((0, 0, 0, 0))
            continue
        hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
        is_costume_red = saturation > 0.48 and value > 0.22 and (hue < 0.035 or hue > 0.94)
        is_shirt_white = saturation < 0.22 and value > 0.56
        if is_costume_red:
            luminance = int(value * 255)
            if costume == "aspirant":
                shade = max(17, min(66, int(luminance * 0.25)))
                pixels.append((shade, shade + 1, shade + 5, alpha))
            else:
                shade = max(24, min(88, int(luminance * 0.34)))
                pixels.append((shade, shade, shade + 4, alpha))
        elif costume == "aspirant" and is_shirt_white:
            luminance = int(value * 255)
            shade = max(31, min(92, int(luminance * 0.34)))
            pixels.append((shade - 3, shade, shade + 5, alpha))
        else:
            pixels.append((red, green, blue, alpha))
    output.putdata(pixels)
    output.save(destination, optimize=True)


for filename, stem in SOURCES.items():
    for costume in ("aspirant", "novice"):
        recolor(SPRITES / filename, SPRITES / f"{stem}-{costume}-atlas.png", costume)


def alpha_bbox(image: Image.Image):
    alpha = image.getchannel("A").point(lambda value: 255 if value > 18 else 0)
    return alpha.getbbox()


def normalize_generated(generated: str, reference: str, destination: str, columns: int, rows: int) -> None:
    source = Image.open(SPRITES / generated).convert("RGBA")
    target = Image.open(SPRITES / reference).convert("RGBA")
    cell_width, cell_height = target.width // columns, target.height // rows
    target_boxes = []
    for row in range(rows):
        for column in range(columns):
            cell = target.crop((column * cell_width, row * cell_height, (column + 1) * cell_width, (row + 1) * cell_height))
            box = alpha_bbox(cell)
            if box:
                target_boxes.append(box)
    maximum_width = max(box[2] - box[0] for box in target_boxes)
    maximum_height = max(box[3] - box[1] for box in target_boxes)
    bottom_margin = min(cell_height - box[3] for box in target_boxes)
    output = Image.new("RGBA", target.size)
    for row in range(rows):
        top = round(row * source.height / rows)
        bottom = round((row + 1) * source.height / rows)
        for column in range(columns):
            left = round(column * source.width / columns)
            right = round((column + 1) * source.width / columns)
            cell = source.crop((left, top, right, bottom))
            box = alpha_bbox(cell)
            if not box:
                continue
            sprite = cell.crop(box)
            scale = min(maximum_width / sprite.width, maximum_height / sprite.height)
            width = max(1, round(sprite.width * scale))
            height = max(1, round(sprite.height * scale))
            sprite = sprite.resize((width, height), Image.Resampling.LANCZOS)
            x = column * cell_width + (cell_width - width) // 2
            y = row * cell_height + cell_height - bottom_margin - height
            output.alpha_composite(sprite, (x, y))
    output.save(SPRITES / destination, optimize=True)


def match_reference_cells(generated: str, reference: str, destination: str, columns: int, rows: int) -> None:
    """Match every generated pose to the corresponding reference body's height and foot anchor."""
    source = Image.open(SPRITES / generated).convert("RGBA")
    target = Image.open(SPRITES / reference).convert("RGBA")
    cell_width, cell_height = target.width // columns, target.height // rows
    output = Image.new("RGBA", target.size)
    for row in range(rows):
        source_top = round(row * source.height / rows)
        source_bottom = round((row + 1) * source.height / rows)
        for column in range(columns):
            source_left = round(column * source.width / columns)
            source_right = round((column + 1) * source.width / columns)
            source_cell = source.crop((source_left, source_top, source_right, source_bottom))
            source_box = alpha_bbox(source_cell)
            target_cell = target.crop((column * cell_width, row * cell_height, (column + 1) * cell_width, (row + 1) * cell_height))
            target_box = alpha_bbox(target_cell)
            if not source_box or not target_box:
                continue
            sprite = source_cell.crop(source_box)
            target_height = target_box[3] - target_box[1]
            scale = target_height / sprite.height
            width = max(1, round(sprite.width * scale))
            height = target_height
            if width > cell_width:
                scale = cell_width / width
                width = cell_width
                height = max(1, round(height * scale))
            sprite = sprite.resize((width, height), Image.Resampling.LANCZOS)
            target_center = (target_box[0] + target_box[2]) / 2
            x = round(column * cell_width + target_center - width / 2)
            y = row * cell_height + target_box[3] - height
            output.alpha_composite(sprite, (x, y))
    output.save(SPRITES / destination, optimize=True)


def install_aspirant_kick() -> None:
    generated = Image.open(SPRITES / "aspirant-kick-generated.png").convert("RGBA")
    destination_path = SPRITES / "attack-aspirant-atlas.png"
    destination = Image.open(destination_path).convert("RGBA")
    reference = Image.open(SPRITES / "attack-v5-atlas.png").convert("RGBA")
    cell_width = destination.width // 3
    cell_height = destination.height // 2
    for column in range(3):
        destination.paste((0, 0, 0, 0), (column * cell_width, 0, (column + 1) * cell_width, cell_height))
        left = round(column * generated.width / 3)
        right = round((column + 1) * generated.width / 3)
        generated_cell = generated.crop((left, 0, right, generated.height))
        generated_box = alpha_bbox(generated_cell)
        reference_cell = reference.crop((column * cell_width, 0, (column + 1) * cell_width, cell_height))
        reference_box = alpha_bbox(reference_cell)
        if not generated_box or not reference_box:
            continue
        sprite = generated_cell.crop(generated_box)
        target_height = reference_box[3] - reference_box[1]
        scale = target_height / sprite.height
        width = max(1, round(sprite.width * scale))
        height = target_height
        if width > cell_width:
            scale = cell_width / width
            width = cell_width
            height = max(1, round(height * scale))
        sprite = sprite.resize((width, height), Image.Resampling.LANCZOS)
        x = column * cell_width + (cell_width - width) // 2
        y = reference_box[3] - height
        destination.alpha_composite(sprite, (x, y))
    destination.save(destination_path, optimize=True)


def darken_hair_ornament(filename: str, columns: int, rows: int) -> None:
    path = SPRITES / filename
    image = Image.open(path).convert("RGBA")
    cell_width, cell_height = image.width // columns, image.height // rows
    data = list(image.getdata())
    for y in range(image.height):
        local_y = y % cell_height
        for x in range(image.width):
            local_x = x % cell_width
            if local_x > cell_width * 0.56 or local_y > cell_height * 0.58:
                continue
            index = y * image.width + x
            red, green, blue, alpha = data[index]
            hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
            if alpha and saturation > 0.55 and value > 0.3 and (hue < 0.035 or hue > 0.94):
                shade = max(18, min(58, int(value * 58)))
                data[index] = (shade, shade, shade + 4, alpha)
    image.putdata(data)
    image.save(path, optimize=True)


GENERATED = [
    ("heroine-aspirant-clean-generated.png", "heroine-v3-atlas.png", "heroine-aspirant-atlas.png", 10, 4),
    ("attack-aspirant-generated.png", "attack-v5-atlas.png", "attack-aspirant-atlas.png", 3, 2),
    ("crouch-pandero-aspirant-generated.png", "crouch-pandero-v3-atlas.png", "crouch-pandero-aspirant-atlas.png", 4, 2),
    ("crouch-idle-aspirant-generated.png", "crouch-idle-v3-atlas.png", "crouch-idle-aspirant-atlas.png", 4, 1),
    ("victory-aspirant-generated.png", "victory-v3-atlas.png", "victory-aspirant-atlas.png", 8, 1),
]
for generated, reference, destination, columns, rows in GENERATED:
    if generated == "heroine-aspirant-clean-generated.png":
        match_reference_cells(generated, reference, destination, columns, rows)
    else:
        normalize_generated(generated, reference, destination, columns, rows)
    darken_hair_ornament(destination, columns, rows)

install_aspirant_kick()

print("Costume atlases created with identical dimensions and alpha anchors.")
