#ifdef GL_ES
    precision highp float;
#endif

uniform vec3 colorA;
uniform vec3 colorB;

varying vec2 vPosition;
varying vec2 vUV;

uniform sampler2D diceBase;

void main(void) {
    vec2 vUVm = vec2(vUV.x, 1.0-vUV.y);
    vec3 color = texture2D(diceBase, vUVm).xyz;
    vec3 final = colorB * color.g + colorA * color.r;
    gl_FragColor = vec4(final, 1.0);
}