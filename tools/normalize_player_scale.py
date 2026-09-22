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
    install_run("heroine-novice-atlas.png", "novice-run-generated.png", "heroine-novice-normalized-atlas.png")
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
