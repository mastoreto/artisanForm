// Forge background shader, tuned to cost as little as possible:
// reduced resolution, 30 fps cap, adaptive quality, paused when hidden/off screen,
// a single static frame under prefers-reduced-motion, CSS poster on any failure.
const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FS = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform float u_time;uniform vec2 u_res;uniform vec2 u_mouse;
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*u_res)/min(u_res.x,u_res.y);
  vec3 col=vec3(.055,.065,.09);
  float t=mod(u_time,3.2);
  vec2 c=vec2(0.,.08);
  if(u_mouse.x>0.&&u_mouse.y>0.){c=mix(c,(u_mouse-.5*u_res)/min(u_res.x,u_res.y),.25);}
  float d=length(uv-c);
  float flash=t<.6?exp(-t/.6*5.):0.;
  float wave=smoothstep(.12,0.,abs(d-t*1.4))*exp(-t*2.2);
  float core=(.07/(d+.18))*(.8+.4*sin(u_time*2.));
  float sparks=0.;
  for(float i=1.;i<=6.;i++){
    vec2 sp=c+vec2(sin(i*78.23+u_time*(.4+i*.15))*(.15+i*.08),mod(u_time*(.3+i*.1)+i*1.6,2.)-.4);
    float ds=length(uv-sp);
    sparks+=.003/(ds*ds+.0008)*exp(-abs(uv.y-c.y)*1.5);
  }
  vec3 ember=vec3(.98,.45,.09),fire=vec3(.92,.22,.05),white=vec3(1.,.95,.85);
  col+=mix(fire,ember,clamp(d*1.8,0.,1.))*core*.55;
  col+=mix(ember,white,flash*.7)*(flash*.75/(d+.22));
  col+=ember*wave*.6;
  col+=mix(fire,white,.5)*sparks*.35;
  col*=smoothstep(1.3,.35,length(uv));
  gl_FragColor=vec4(col,1.);
}`;

const FRAME_MS = 1000 / 30;

export function startForgeShader(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return;

  const compile = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  };
  const vs = compile(gl.VERTEX_SHADER, VS);
  const fs = compile(gl.FRAGMENT_SHADER, FS);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uTime = gl.getUniformLocation(prog, 'u_time');
  const uRes = gl.getUniformLocation(prog, 'u_res');
  const uMouse = gl.getUniformLocation(prog, 'u_mouse');

  // The glow is low-frequency: render small, let CSS upscale it.
  let scale = innerWidth < 768 ? 0.3 : 0.5;
  const MIN_SCALE = 0.2;
  const mouse = { x: 0, y: 0 };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');

  const resize = () => {
    canvas.width = Math.max(2, Math.floor(innerWidth * scale));
    canvas.height = Math.max(2, Math.floor(innerHeight * scale));
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();

  const draw = (ms: number) => {
    gl.uniform1f(uTime, ms / 1000);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mouse.x * scale, mouse.y * scale);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  let raf = 0;
  let last = 0;
  let slow = 0;
  let running = false;

  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = now - last;
    if (dt < FRAME_MS - 2) return;
    // Adaptive quality: a sustained stall (well below 30 fps) lowers the resolution.
    slow = dt > FRAME_MS * 1.8 && last ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 20 && scale > MIN_SCALE) {
      scale = Math.max(MIN_SCALE, scale * 0.75);
      slow = 0;
      resize();
    }
    last = now;
    draw(now);
  };

  const start = () => {
    if (running || reduced.matches || document.hidden) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  // Poster frame (static under reduced motion, first frame otherwise).
  draw(reduced.matches ? 1200 : performance.now());
  canvas.dataset.ready = '';

  document.addEventListener('visibilitychange', () =>
    document.hidden ? stop() : start(),
  );
  reduced.addEventListener('change', () =>
    reduced.matches ? stop() : start(),
  );
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    delete canvas.dataset.ready;
  });

  let pending = false;
  addEventListener(
    'pointermove',
    (e) => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        mouse.x = e.clientX;
        mouse.y = innerHeight - e.clientY;
        pending = false;
      });
    },
    { passive: true },
  );
  let rz = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => {
      resize();
      if (!running) draw(reduced.matches ? 1200 : performance.now());
    });
  });

  start();
}
