from cairosvg import svg2png

with open("textures/tmp/blue2.svg", "r") as f:
    svg_code = f.read()

svg2png(bytestring=svg_code, write_to="textures/tmp/blue2.png", output_width=500)
