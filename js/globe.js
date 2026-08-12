/* ==============================================================
   BEE MOORE ADVISORY — globe.js
   Rotating wireframe globe with gold trade arcs from Lagos.
   Requires three.js r128 (CDN, loaded on the homepage only).

   Degrades gracefully:
     no WebGL              -> canvas hidden, CSS gradient shows
     prefers-reduced-motion-> one static frame, no spin, no drag
     tab hidden            -> loop paused
   ============================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('globe-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  try {
    var probe = document.createElement('canvas');
    if (!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) return;
  } catch (e) { return; }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var R = 1;
  var COL_DOT  = 0x3E6FA8;   // navy-blue surface dots
  var COL_GRID = 0x1B3A5C;   // wireframe
  var COL_ARC  = 0xD4A94E;   // gold trade arcs
  var COL_NODE = 0x8FB4F0;

  var LAGOS = { lat: 6.5244, lng: 3.3792 };
  var DEST = [
    { lat: 40.7128, lng: -74.0060 },  // New York
    { lat: 51.5074, lng: -0.1278  },  // London
    { lat: 41.3874, lng: 2.1686   },  // Barcelona
    { lat: 25.2048, lng: 55.2708  }   // Dubai
  ];

  var scene    = new THREE.Scene();
  var camera   = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 3.1);

  var renderer = new THREE.WebGLRenderer({
    canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power'
  });
  renderer.setClearColor(0x000000, 0);

  var globe = new THREE.Group();
  scene.add(globe);

  function toVec(lat, lng, r) {
    var phi = (90 - lat) * Math.PI / 180;
    var th  = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(th),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(th)
    );
  }

  /* solid core so the far side is occluded */
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.985, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x05111F })
  ));

  /* surface dots — fibonacci sphere */
  var N = window.innerWidth < 700 ? 1300 : 2500;
  var pos = new Float32Array(N * 3);
  var golden = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2;
    var rad = Math.sqrt(Math.max(0, 1 - y * y));
    var t = golden * i;
    pos[i*3] = Math.cos(t) * rad * R;
    pos[i*3+1] = y * R;
    pos[i*3+2] = Math.sin(t) * rad * R;
  }
  var dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  globe.add(new THREE.Points(dg, new THREE.PointsMaterial({
    color: COL_DOT, size: 0.013, sizeAttenuation: true, transparent: true, opacity: 0.7
  })));

  /* lat/long wireframe */
  var gm = new THREE.LineBasicMaterial({ color: COL_GRID, transparent: true, opacity: 0.55 });
  for (var lat = -60; lat <= 60; lat += 30) {
    var p1 = [];
    for (var lg = 0; lg <= 360; lg += 4) p1.push(toVec(lat, lg - 180, R * 1.001));
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p1), gm));
  }
  for (var lg2 = 0; lg2 < 360; lg2 += 30) {
    var p2 = [];
    for (var la = -90; la <= 90; la += 4) p2.push(toVec(la, lg2 - 180, R * 1.001));
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p2), gm));
  }

  /* atmosphere */
  globe.add(new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.13, 40, 40),
    new THREE.ShaderMaterial({
      transparent: true, side: THREE.BackSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
      uniforms: { uColor: { value: new THREE.Color(0x1F5FA8) } },
      vertexShader:
        'varying float vI;' +
        'void main(){' +
        ' vec3 n = normalize(normalMatrix * normal);' +
        ' vec4 mv = modelViewMatrix * vec4(position,1.0);' +
        ' vI = pow(0.72 - dot(n, normalize(-mv.xyz)), 2.6);' +
        ' gl_Position = projectionMatrix * mv;}',
      fragmentShader:
        'uniform vec3 uColor; varying float vI;' +
        'void main(){ gl_FragColor = vec4(uColor,1.0) * clamp(vI,0.0,1.0) * 0.8; }'
    })
  ));

  /* markers */
  function marker(lat, lng, color, size) {
    var m = new THREE.Mesh(
      new THREE.SphereGeometry(size, 14, 14),
      new THREE.MeshBasicMaterial({ color: color })
    );
    m.position.copy(toVec(lat, lng, R * 1.012));
    globe.add(m);
    var ring = new THREE.Mesh(
      new THREE.RingGeometry(size * 1.9, size * 2.7, 22),
      new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
    );
    ring.position.copy(m.position);
    ring.lookAt(0, 0, 0);
    globe.add(ring);
    return { mesh: m, ring: ring };
  }

  var hub = marker(LAGOS.lat, LAGOS.lng, COL_ARC, 0.021);
  DEST.forEach(function (d) { marker(d.lat, d.lng, COL_NODE, 0.014); });

  /* trade arcs */
  var SEG = 64, arcs = [];
  DEST.forEach(function (d, idx) {
    var a = toVec(LAGOS.lat, LAGOS.lng, R);
    var b = toVec(d.lat, d.lng, R);
    var mid = a.clone().add(b).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(R * (1 + a.distanceTo(b) * 0.4));

    var curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    var geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(SEG));
    geo.setDrawRange(0, reduce ? SEG + 1 : 0);
    globe.add(new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: COL_ARC, transparent: true, opacity: 0.6
    })));

    var pulse = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 1 })
    );
    pulse.visible = false;
    globe.add(pulse);

    arcs.push({ geo: geo, curve: curve, pulse: pulse, progress: reduce ? 1 : 0, t: -idx * 0.85 });
  });

  globe.rotation.y = -Math.PI * 0.52;
  globe.rotation.z = 0.16;

  function layout() {
    var w = canvas.clientWidth  || canvas.parentElement.clientWidth;
    var h = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (w >= 900) { globe.position.set(0.62, 0.02, 0); camera.position.z = 3.0; }
    else          { globe.position.set(0, 0.05, 0);    camera.position.z = 4.0; }
    camera.updateProjectionMatrix();
  }

  /* drag to spin */
  var dragging = false, lastX = 0, lastY = 0, velY = 0;
  var AUTO = reduce ? 0 : 0.0011;

  if (!reduce) {
    canvas.style.cursor = 'grab';
    canvas.style.touchAction = 'pan-y';
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; lastY = e.clientY;
      canvas.style.cursor = 'grabbing';
      if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
    });
    window.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      velY = (e.clientX - lastX) * 0.005;
      globe.rotation.y += velY;
      globe.rotation.x = Math.max(-0.7, Math.min(0.7, globe.rotation.x + (e.clientY - lastY) * 0.004));
      lastX = e.clientX; lastY = e.clientY;
    });
    window.addEventListener('pointerup', function () { dragging = false; canvas.style.cursor = 'grab'; });
  }

  var clock = new THREE.Clock(), running = true;
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) { clock.getDelta(); frame(); }
  });

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05);

    if (!dragging) {
      globe.rotation.y += AUTO + velY;
      velY *= 0.94;
      if (Math.abs(velY) < 0.00002) velY = 0;
    }

    if (!reduce && hub) {
      var s = 1 + Math.sin(clock.elapsedTime * 2.1) * 0.28;
      hub.ring.scale.set(s, s, s);
      hub.ring.material.opacity = 0.4 - (s - 1) * 0.5;
    }

    for (var a = 0; a < arcs.length; a++) {
      var arc = arcs[a];
      if (reduce) continue;
      arc.t += dt;
      if (arc.t > 0 && arc.progress < 1) {
        arc.progress = Math.min(1, arc.progress + dt * 0.55);
        arc.geo.setDrawRange(0, Math.floor(arc.progress * (SEG + 1)));
      }
      if (arc.progress >= 1) {
        var p = ((clock.elapsedTime * 0.26) + a * 0.27) % 1;
        arc.pulse.visible = true;
        arc.pulse.position.copy(arc.curve.getPoint(p));
        arc.pulse.material.opacity = Math.sin(p * Math.PI);
      }
    }

    renderer.render(scene, camera);
  }

  layout();
  window.addEventListener('resize', layout, { passive: true });
  renderer.render(scene, camera);
  canvas.classList.add('ready');
  if (!reduce) frame();
})();
