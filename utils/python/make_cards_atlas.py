# Takes all images inside a directory containing all cards images and creates an atlas texture
import os

from PIL import Image

TEXTURE_WIDTH = 2048
COLS = 8

src_path = "textures/tmp2"
dst_img = "atlas.png"

dst = None  # Image.new('RGB', (60, 30), color='white')

# recomputed
card_w = 256
card_h = 312
NB_ROWS = 8


def create_dst_img(nb_img, ratio):
    card_w = TEXTURE_WIDTH / COLS
    card_h = card_w * ratio
    NB_ROWS = nb_img // COLS
    print(nb_img % COLS)
    if nb_img % COLS > 0:
        NB_ROWS += 1
    TEXTURE_HEIGHT = int(card_h * NB_ROWS)
    dst = Image.new("RGB", (TEXTURE_WIDTH, TEXTURE_HEIGHT), color="white")

    return dst, card_w, card_h, NB_ROWS


# list files in img directory
files = os.listdir(src_path)


def card_num(n):
    tokens = n.split("_")
    if len(tokens) < 3:
        return 1000

    n = n.split(".")[0]
    n = n.replace("jack", "11").replace("queen", "12").replace("king", "12").replace("ace", "13")
    n = (
        n.replace("of_spades", "100")
        .replace("of_hearts", "200")
        .replace("of_clubs", "300")
        .replace("of_diamonds", "400")
    )

    tokens = n.split("_")
    v = int(tokens[0]) + int(tokens[1])
    return v


# files = sorted(files, key=card_num)
def val(n):
    n = n.split(".")[0]
    try:
        return int(n)
    except Exception:
        pass
    return 1000


files = sorted(files, key=val)
print(files)
files = [f for f in files if f.endswith((".jpg", ".png", "jpeg"))]

print("\n", len(files))
x = 0
y = 0
for file in files:
    img_path = os.path.join(src_path, file)
    im = Image.open(img_path)

    if dst is None:
        [dst, card_w, card_h, NB_ROWS] = create_dst_img(len(files), im.size[1] / im.size[0])
        print(dst, card_w, card_h, NB_ROWS)

    im = im.resize((int(card_w), int(card_h)), Image.Resampling.LANCZOS)

    offset = (int(x), int(y))
    dst.paste(im, offset)
    x += card_w
    if x >= TEXTURE_WIDTH:
        x = 0
        y += card_h

dst.save(dst_img)
