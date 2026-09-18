# Rendering tiers

### Tier 1 — DOM and CSS

Use for:

- Basic hover reveals
- Opacity and blur transitions
- Small transforms
- Layout morphing
- Simple masks
- Short entrance and exit motion

Preferred language:

- CSS transitions
- keyframes
- clip-path
- mask-image
- backdrop-filter
- FLIP animation
- spring easing

### Tier 2 — SVG or Canvas 2D

Use for:

- Localized particles
- Kinetic typography
- Pointer displacement
- Cloth-like grids
- Illustrated energy currents
- Lightweight mist, ink, or water effects
- Touch-responsive card interactions

Preferred language:

- Pointer Events
- displacement field
- Verlet integration
- spring-mass grid
- velocity field
- progressive alpha mask
- curl noise
- advection
- damping
- dissipation
- requestAnimationFrame

### Tier 3 — WebGL2 and shaders

Use for:

- Localized refraction
- Fluid-like surface distortion
- High-density particles
- Procedural material shading
- GPU-accelerated effects that remain contained inside a component

Preferred language:

- fragment shader
- displacement map
- flow map
- height field
- ping-pong framebuffer
- semi-Lagrangian advection
- procedural noise
- Fresnel response
- render target

Do not select WebGL merely to make the prompt sound advanced.

### Tier 4 — WebGPU, Three.js, and TSL

Reserve for:

- Full-screen procedural environments
- Complex three-dimensional scenes
- Dense geometry displacement
- Advanced lighting
- Real-time world simulations
- Experiences involving cameras, atmosphere, and large spatial scale

Preferred language:

- WebGPURenderer
- Three.js
- TSL
- procedural shaders
- analytic normals
- Gerstner waves
- FBM
- physically based shading
- post-processing
- orbit controls

Never use Tier 4 for an isolated mobile UI effect when a lower tier can achieve the experience.
