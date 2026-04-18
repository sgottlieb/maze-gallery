import * as THREE from 'three';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <fog_vertex>
  }
  #include <fog_pars_vertex>
`;

const FRAG = /* glsl */`
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform float uAspect;    // texture width / height
  uniform vec3 uBgColor;

  #include <fog_pars_fragment>

  void main() {
    vec2 uv = vUv;
    // Face aspect is 1.0 (square). Compute contain-fit offset.
    vec2 fit;
    vec2 offset;
    if (uAspect > 1.0) {
      fit = vec2(1.0, 1.0 / uAspect);
      offset = vec2(0.0, (1.0 - fit.y) * 0.5);
    } else {
      fit = vec2(uAspect, 1.0);
      offset = vec2((1.0 - fit.x) * 0.5, 0.0);
    }

    vec2 mapped = (uv - offset) / fit;
    vec4 outCol;
    if (mapped.x < 0.0 || mapped.x > 1.0 || mapped.y < 0.0 || mapped.y > 1.0) {
      outCol = vec4(uBgColor, 1.0);
    } else {
      outCol = texture2D(uTex, mapped);
    }

    gl_FragColor = outCol;
    #include <fog_fragment>
  }
`;

export function createLetterboxMaterial(texture, aspect, bgColor = new THREE.Color(0x1a1028)) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTex: { value: texture },
      uAspect: { value: aspect },
      uBgColor: { value: bgColor },
      ...THREE.UniformsLib.fog,
    },
    fog: true,
    side: THREE.DoubleSide,
  });
  return mat;
}
