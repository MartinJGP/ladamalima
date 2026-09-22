"""Build runtime atlases with one character-pixel scale and stable foot anchors.

The source art stays untouched.  Large 256 px canvases are only extra room for
wide poses, props and effects; one source pixel always maps to the same world
scale in Player.js.
"""

from colorsys import rgb_to_hsv
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SPRITES = ROOT / "game" / "assets" / "sprites"
ALPHA_CUTOFF = 18
MAIN_CELL = 200
LARGE_CELL = 256
BASE_BODY_HEIGHT = 158
RUN_POSE_HEIGHT = 157
ATTACK_BODY_CORRECTION = 1.08
DEFEAT_BODY_CORRECTION = 1.14


def visible_bbox(image: Image.Image):
    return image.getchannel("A").point(lambda value: 255 if value > ALPHA_CUTOFF else 0).getbbox()


def split_cell(image: Image.Image, column: int, row: int, columns: int, rows: int) -> Image.Image:
    return image.crop((
        round(column * image.width / columns),
        round(row * image.height / rows),
        round((column + 1) * image.width / columns),
        round((row + 1) * image.height / rows),
    ))


def content(cell: Image.Image) -> Image.Image:
    box = visible_bbox(cell)
    if not box:
        raise ValueError("Empty sprite cell")
    return cell.crop(box)


def resize(sprite: Image.Image, ratio: float) -> Image.Image:
    return sprite.resize(
        (max(1, round(sprite.width * ratio)), max(1, round(sprite.height * ratio))),
        Image.Resampling.LANCZOS,
    )


def bottom_center(output: Image.Image, sprite: Image.Image, column: int, row: int, cell: int) -> None:
    x = column * cell + (cell - sprite.width) // 2
    y = row * cell + cell - sprite.height
    output.alpha_composite(sprite, (x, y))


def darken_aspirant_red(image: Image.Image, columns: int, rows: int) -> None:
    """Turn the aspirant's flower/costume red black, but keep held props readable."""
    cell_width, cell_height = image.width // columns, image.height // rows
    pixels = list(image.getdata())
    for y in range(image.height):
        local_y = y % cell_height
        for x in range(image.width):
            local_x = x % cell_width
            # The flower and upper costume live around the upper body.  Red fan/
            # pandero details outside this area remain props, not clothing.
            if local_x > cell_width * .60 or local_y > cell_height * .70:
                continue
            index = y * image.width + x
            red, green, blue, alpha = pixels[index]
            hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
            if alpha and saturation > .55 and value > .30 and (hue < .035 or hue > .94):
                shade = max(18, min(58, int(value * 58)))
                pixels[index] = (shade, shade, shade + 4, alpha)
    image.putdata(pixels)


def restore_novice_props(target_name: str, reference_name: str, columns: int, rows: int) -> None:
    """Restore only the red flower and fan on the black novice costume.

    The novice is intentionally black-and-white; copying every red pixel from
    the tuna would incorrectly recolor her vest and skirt trim.  Position masks
    isolate the two props across the shared atlas layouts.
    """
    target = Image.open(SPRITES / target_name).convert("RGBA")
    reference = Image.open(SPRITES / reference_name).convert("RGBA")
    assert target.size == reference.size
    cell_width, cell_height = target.width // columns, target.height // rows
    target_pixels = list(target.getdata())
    reference_pixels = list(reference.getdata())
    for y in range(target.height):
        local_y = y % cell_height
        for x in range(target.width):
            local_x = x % cell_width
            ref_red, ref_green, ref_blue, ref_alpha = reference_pixels[y * target.width + x]
            target_red, target_green, target_blue, target_alpha = target_pixels[y * target.width + x]
            if not ref_alpha or not target_alpha:
                continue
            hue, saturation, value = rgb_to_hsv(ref_red / 255, ref_green / 255, ref_blue / 255)
            if saturation < .45 or value < .20 or not (hue < .04 or hue > .94):
                continue
            flower_limit = .55 if columns == 10 and (y // cell_height) == 0 else .82
            flower = local_x < cell_width * .48 and local_y < cell_height * flower_limit
            has_fan = not (columns == 10 and (x // cell_width) >= 6)
            fan = has_fan and local_x > cell_width * .62 and local_y < cell_height * .75
            raised_fan = has_fan and local_x > cell_width * .38 and local_y < cell_height * .36
            if flower or fan or raised_fan:
                target_pixels[y * target.width + x] = (ref_red, ref_green, ref_blue, target_alpha)
    target.putdata(target_pixels)
    target.save(SPRITES / target_name, optimize=True)


def restore_novice_run_flower() -> None:
    """The generated run strip has a gray flower, so paint that prop red too."""
    target = Image.open(SPRITES / "heroine-novice-normalized-atlas.png").convert("RGBA")
    reference = Image.open(SPRITES / "heroine-tuna-normalized-atlas.png").convert("RGBA")
    for column in range(6, 10):
        target_cell = target.crop((column * MAIN_CELL, 0, (column + 1) * MAIN_CELL, MAIN_CELL))
        reference_cell = reference.crop((column * MAIN_CELL, 0, (column + 1) * MAIN_CELL, MAIN_CELL))
        points = []
        for y in range(110):
            for x in range(105):
                red, green, blue, alpha = reference_cell.getpixel((x, y))
                if not alpha:
                    continue
                hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
                if saturation > .50 and value > .20 and (hue < .04 or hue > .94):
                    points.append((x, y))
        if not points:
            continue
        left, right = min(x for x, _ in points), max(x for x, _ in points)
        top, bottom = min(y for _, y in points), max(y for _, y in points)
        for y in range(top, bottom + 1):
            for x in range(left, right + 1):
                red, green, blue, alpha = target_cell.getpixel((x, y))
                if not alpha:
                    continue
                hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
                # Leave face/skin pixels alone if the two generated silhouettes
                # differ by a few pixels.
                if .03 < hue < .16 and saturation > .32 and value > .35:
                    continue
                if saturation > .28 or value < .16:
                    continue
                shade = max(55, min(255, int(value * 255)))
                target_cell.putpixel((x, y), (shade, max(18, shade // 5), max(26, shade // 6), alpha))
        target.paste(target_cell, (column * MAIN_CELL, 0))
    target.save(SPRITES / "heroine-novice-normalized-atlas.png", optimize=True)


def install_run(base_name: str, generated_name: str, output_name: str) -> None:
    base = Image.open(SPRITES / base_name).convert("RGBA")
    generated = Image.open(SPRITES / generated_name).convert("RGBA")
    sprites = [content(split_cell(generated, column, 0, 4, 1)) for column in range(4)]
    ratio = RUN_POSE_HEIGHT / max(sprite.height for sprite in sprites)
    output = base.copy()
    for column, sprite in enumerate(sprites, start=6):
        output.paste((0, 0, 0, 0), (column * MAIN_CELL, 0, (column + 1) * MAIN_CELL, MAIN_CELL))
        fitted = resize(sprite, ratio)
        if fitted.width > MAIN_CELL:
            fitted = resize(fitted, MAIN_CELL / fitted.width)
        bottom_center(output, fitted, column, 0, MAIN_CELL)
    output.save(SPRITES / output_name, optimize=True)


def derive_novice_run_from_tuna() -> str:
    """Reuse the polished tuna gait while changing only the costume colors."""
    source = Image.open(SPRITES / "tuna-run-generated.png").convert("RGBA")
    pixels = list(source.getdata())
    cell_width, cell_height = source.width // 4, source.height
    for index, (red, green, blue, alpha) in enumerate(pixels):
        if not alpha:
            continue
        x, y = index % source.width, index // source.width
        hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
        is_red = saturation > .45 and value > .20 and (hue < .04 or hue > .94)
        if not is_red:
            continue
        local_x = x % cell_width
        # Keep the flower red; remove red vest/skirt trim from the pardilla.
        if local_x < cell_width * .48 and y < cell_height * .55:
            continue
        shade = max(24, min(88, int(value * 255 * .34)))
        pixels[index] = (shade, shade, shade + 4, alpha)
    source.putdata(pixels)
    derived = "novice-run-derived-generated.png"
    source.save(SPRITES / derived, optimize=True)
    return derived


def uniform_atlas(source_name: str, output_name: str, columns: int, rows: int,
                  ratio: float, darken_aspirant: bool = False) -> None:
    source = Image.open(SPRITES / source_name).convert("RGBA")
    output = Image.new("RGBA", (columns * LARGE_CELL, rows * LARGE_CELL))
    for row in range(rows):
        for column in range(columns):
            sprite = resize(content(split_cell(source, column, row, columns, rows)), ratio)
            if sprite.width > LARGE_CELL or sprite.height > LARGE_CELL:
                sprite = resize(sprite, min(LARGE_CELL / sprite.width, LARGE_CELL / sprite.height))
            bottom_center(output, sprite, column, row, LARGE_CELL)
    if darken_aspirant:
        darken_aspirant_red(output, columns, rows)
    output.save(SPRITES / output_name, optimize=True)


def largest_component_mask(cell: Image.Image) -> Image.Image:
    alpha = list(cell.getchannel("A").getdata())
    width, height = cell.size
    solid = bytearray(1 if value > ALPHA_CUTOFF else 0 for value in alpha)
    visited = bytearray(width * height)
    largest: list[int] = []
    for start, present in enumerate(solid):
        if not present or visited[start]:
            continue
        component: list[int] = []
        stack = [start]
        visited[start] = 1
        while stack:
            index = stack.pop()
            component.append(index)
            x, y = index % width, index // width
            for next_y in range(max(0, y - 1), min(height, y + 2)):
                for next_x in range(max(0, x - 1), min(width, x + 2)):
                    neighbor = next_y * width + next_x
                    if solid[neighbor] and not visited[neighbor]:
                        visited[neighbor] = 1
                        stack.append(neighbor)
        if len(component) > len(largest):
            largest = component
    mask = bytearray(width * height)
    for index in largest:
        mask[index] = 255
    return Image.frombytes("L", cell.size, bytes(mask))


def correct_attack_body(source_name: str, output_name: str, columns: int) -> None:
    source = Image.open(SPRITES / source_name).convert("RGBA")
    rows = source.height // LARGE_CELL
    output = Image.new("RGBA", source.size)
    for row in range(rows):
        for column in range(columns):
            origin = (column * LARGE_CELL, row * LARGE_CELL)
            cell = source.crop((origin[0], origin[1], origin[0] + LARGE_CELL, origin[1] + LARGE_CELL))
            mask = largest_component_mask(cell)
            main = cell.copy()
            main.putalpha(Image.composite(cell.getchannel("A"), Image.new("L", cell.size), mask))
            main_box = visible_bbox(main)
            if not main_box:
                output.alpha_composite(cell, origin)
                continue
            # Preserve all detached effect pixels exactly where they were.
            rest = cell.copy()
            rest_alpha = [max(0, a - m) for a, m in zip(cell.getchannel("A").getdata(), main.getchannel("A").getdata())]
            rest.putalpha(Image.frombytes("L", cell.size, bytes(rest_alpha)))
            output.alpha_composite(rest, origin)
            sprite = resize(main.crop(main_box), ATTACK_BODY_CORRECTION)
            if sprite.width > LARGE_CELL or sprite.height > LARGE_CELL:
                sprite = resize(sprite, min(LARGE_CELL / sprite.width, LARGE_CELL / sprite.height))
            center_x = (main_box[0] + main_box[2]) // 2
            x = origin[0] + center_x - sprite.width // 2
            y = origin[1] + main_box[3] - sprite.height
            output.alpha_composite(sprite, (x, y))
    output.save(SPRITES / output_name, optimize=True)


def recolor_aspirant(sprite: Image.Image) -> Image.Image:
    output = Image.new("RGBA", sprite.size)
    pixels = []
    for red, green, blue, alpha in sprite.getdata():
        if not alpha:
            pixels.append((0, 0, 0, 0))
            continue
        hue, saturation, value = rgb_to_hsv(red / 255, green / 255, blue / 255)
        red_costume = saturation > .45 and value > .20 and (hue < .04 or hue > .94)
        white_shirt = saturation < .24 and value > .50
        if red_costume or white_shirt:
            shade = max(18, min(72, int(value * 70)))
            pixels.append((shade, shade + 1, shade + 5, alpha))
        else:
            pixels.append((red, green, blue, alpha))
    output.putdata(pixels)
    return output


def defeat_atlas(source_name: str, output_name: str, aspirant: bool = False) -> None:
    source = Image.open(SPRITES / source_name).convert("RGBA")
    output = Image.new("RGBA", (2 * LARGE_CELL, LARGE_CELL))
    for out_column, source_column in enumerate((6, 7)):
        sprite = content(source.crop((source_column * MAIN_CELL, 3 * MAIN_CELL,
                                      (source_column + 1) * MAIN_CELL, 4 * MAIN_CELL)))
        if aspirant:
            sprite = recolor_aspirant(sprite)
        sprite = resize(sprite, DEFEAT_BODY_CORRECTION)
        if sprite.width > LARGE_CELL or sprite.height > LARGE_CELL:
            sprite = resize(sprite, min(LARGE_CELL / sprite.width, LARGE_CELL / sprite.height))
        bottom_center(output, sprite, out_column, 0, LARGE_CELL)
    output.save(SPRITES / output_name, optimize=True)


def assert_atlas(path: str, columns: int, rows: int, cell: int) -> None:
    image = Image.open(SPRITES / path).convert("RGBA")
    assert image.size == (columns * cell, rows * cell), (path, image.size)
    for row in range(rows):
        for column in range(columns):
            assert visible_bbox(split_cell(image, column, row, columns, rows)), (path, column, row)


def main() -> None:
    # Main atlases: only the four run cells are replaced.  Jump cells remain byte-for-byte untouched.
    install_run("heroine-aspirant-atlas.png", "aspirant-run-generated.png", "heroine-aspirant-normalized-atlas.png")
    install_run("heroine-novice-atlas.png", derive_novice_run_from_tuna(), "heroine-novice-normalized-atlas.png")
    install_run("heroine-v3-atlas.png", "tuna-run-generated.png", "heroine-tuna-normalized-atlas.png")

    # Crouch uses the same body pixel scale from first standing pose through the final recline.
    crouch_ratio = BASE_BODY_HEIGHT / 210
    uniform_atlas("crouch-pandero-v3-atlas.png", "crouch-pandero-tuna-normalized-atlas.png", 4, 2, crouch_ratio)
    uniform_atlas("crouch-pandero-novice-atlas.png", "crouch-pandero-novice-normalized-atlas.png", 4, 2, crouch_ratio)
    aspirant_crouch = Image.open(SPRITES / "crouch-pandero-aspirant-generated.png").convert("RGBA")
    aspirant_max = max(content(split_cell(aspirant_crouch, column, row, 4, 2)).height for row in range(2) for column in range(4))
    uniform_atlas("crouch-pandero-aspirant-generated.png", "crouch-pandero-aspirant-normalized-atlas.png", 4, 2,
                  BASE_BODY_HEIGHT / aspirant_max, darken_aspirant=True)

    crouch_idle_ratio = 179 / 238
    uniform_atlas("crouch-idle-v3-atlas.png", "crouch-idle-tuna-normalized-atlas.png", 4, 1, crouch_idle_ratio)
    uniform_atlas("crouch-idle-novice-atlas.png", "crouch-idle-novice-normalized-atlas.png", 4, 1, crouch_idle_ratio)
    aspirant_idle = Image.open(SPRITES / "crouch-idle-aspirant-generated.png").convert("RGBA")
    aspirant_idle_max_width = max(content(split_cell(aspirant_idle, column, 0, 4, 1)).width for column in range(4))
    uniform_atlas("crouch-idle-aspirant-generated.png", "crouch-idle-aspirant-normalized-atlas.png", 4, 1,
                  179 / aspirant_idle_max_width, darken_aspirant=True)

    # Neutral dance poses equal the standing body height; raised arms remain movement, not scaling.
    victory_ratio = BASE_BODY_HEIGHT / 186
    uniform_atlas("victory-v3-atlas.png", "victory-tuna-normalized-atlas.png", 8, 1, victory_ratio)
    uniform_atlas("victory-novice-atlas.png", "victory-novice-normalized-atlas.png", 8, 1, victory_ratio)
    aspirant_victory = Image.open(SPRITES / "victory-aspirant-generated.png").convert("RGBA")
    first_height = content(split_cell(aspirant_victory, 0, 0, 8, 1)).height
    uniform_atlas("victory-aspirant-generated.png", "victory-aspirant-normalized-atlas.png", 8, 1,
                  BASE_BODY_HEIGHT / first_height, darken_aspirant=True)

    correct_attack_body("attack-v5-atlas.png", "attack-tuna-normalized-atlas.png", 3)
    correct_attack_body("attack-novice-atlas.png", "attack-novice-normalized-atlas.png", 3)
    correct_attack_body("attack-aspirant-atlas.png", "attack-aspirant-normalized-atlas.png", 3)
    correct_attack_body("guitar-special-v2-atlas.png", "guitar-special-normalized-atlas.png", 5)

    defeat_atlas("heroine-v3-atlas.png", "defeat-tuna-normalized-atlas.png")
    defeat_atlas("heroine-novice-atlas.png", "defeat-novice-normalized-atlas.png")
    defeat_atlas("heroine-v3-atlas.png", "defeat-aspirant-normalized-atlas.png", aspirant=True)

    # Pardilla stays black/white, but her moño and abanico are always red.
    restore_novice_props("heroine-novice-normalized-atlas.png", "heroine-tuna-normalized-atlas.png", 10, 4)
    restore_novice_props("attack-novice-normalized-atlas.png", "attack-tuna-normalized-atlas.png", 3, 2)
    restore_novice_props("crouch-pandero-novice-normalized-atlas.png", "crouch-pandero-tuna-normalized-atlas.png", 4, 2)
    restore_novice_props("crouch-idle-novice-normalized-atlas.png", "crouch-idle-tuna-normalized-atlas.png", 4, 1)
    restore_novice_props("victory-novice-normalized-atlas.png", "victory-tuna-normalized-atlas.png", 8, 1)
    restore_novice_run_flower()

    expected = [
        ("heroine-aspirant-normalized-atlas.png", 10, 4, MAIN_CELL),
        ("heroine-novice-normalized-atlas.png", 10, 4, MAIN_CELL),
        ("heroine-tuna-normalized-atlas.png", 10, 4, MAIN_CELL),
        ("crouch-pandero-aspirant-normalized-atlas.png", 4, 2, LARGE_CELL),
        ("crouch-pandero-novice-normalized-atlas.png", 4, 2, LARGE_CELL),
        ("crouch-pandero-tuna-normalized-atlas.png", 4, 2, LARGE_CELL),
        ("crouch-idle-aspirant-normalized-atlas.png", 4, 1, LARGE_CELL),
        ("crouch-idle-novice-normalized-atlas.png", 4, 1, LARGE_CELL),
        ("crouch-idle-tuna-normalized-atlas.png", 4, 1, LARGE_CELL),
        ("victory-aspirant-normalized-atlas.png", 8, 1, LARGE_CELL),
        ("victory-novice-normalized-atlas.png", 8, 1, LARGE_CELL),
        ("victory-tuna-normalized-atlas.png", 8, 1, LARGE_CELL),
        ("attack-aspirant-normalized-atlas.png", 3, 2, LARGE_CELL),
        ("attack-novice-normalized-atlas.png", 3, 2, LARGE_CELL),
        ("attack-tuna-normalized-atlas.png", 3, 2, LARGE_CELL),
        ("guitar-special-normalized-atlas.png", 5, 2, LARGE_CELL),
        ("defeat-aspirant-normalized-atlas.png", 2, 1, LARGE_CELL),
        ("defeat-novice-normalized-atlas.png", 2, 1, LARGE_CELL),
        ("defeat-tuna-normalized-atlas.png", 2, 1, LARGE_CELL),
    ]
    for item in expected:
        assert_atlas(*item)
    print(f"OK: {len(expected)} atlases use one body scale; jump source frames were not modified.")


if __name__ == "__main__":
    main()
