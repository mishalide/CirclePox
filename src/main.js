(() => {
  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');

  // holy wall of variables if you desecrate this the entire project explodes
  const elPopulation = document.getElementById('populationSize');
  const elInitialInfected = document.getElementById('initialInfected');
  const elInfectionRadius = document.getElementById('infectionRadius');
  const elInfectionRadiusValue = document.getElementById('infectionRadiusValue');
  const elInfectionChance = document.getElementById('infectionChance');
  const elInfectionChanceValue = document.getElementById('infectionChanceValue');
  const elMortalityChance = document.getElementById('mortalityChance');
  const elMortalityChanceValue = document.getElementById('mortalityChanceValue');
  const elDecayRate = document.getElementById('decayRate');
  const elDecayRateValue = document.getElementById('decayRateValue');
  const elSpeed = document.getElementById('speed');
  const elSpeedValue = document.getElementById('speedValue');
  const elDecayInterval = document.getElementById('decayInterval');
  const elShowRadius = document.getElementById('showRadius');
  const elRandomSpreadEnabled = document.getElementById('randomSpreadEnabled');
  const elRandomSpreadChance = document.getElementById('randomSpreadChance');
  const elRandomSpreadChanceValue = document.getElementById('randomSpreadChanceValue');
  const elRandomSpreadRange = document.getElementById('randomSpreadRange');
  const elRandomSpreadRangeValue = document.getElementById('randomSpreadRangeValue');
  const elRandomSpreadAngle = document.getElementById('randomSpreadAngle');
  const elRandomSpreadAngleValue = document.getElementById('randomSpreadAngleValue');
  const elShowSpreadDebug = document.getElementById('showSpreadDebug');
  const elAvoidanceEnabled = document.getElementById('avoidanceEnabled');
  const elShowAvoidancePaths = document.getElementById('showAvoidancePaths');
  const elModeSimple = document.querySelector('input[name="mode"][value="simple"]');
  const elModeAdvanced = document.querySelector('input[name="mode"][value="advanced"]');
  const elDiseasePreset = document.getElementById('diseasePreset');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnReset = document.getElementById('btnReset');
  const menuToggle = document.getElementById('menuToggle');
  const controlsNav = document.getElementById('controlsNav');

  // stats
  const statS = document.getElementById('statS');
  const statI = document.getElementById('statI');
  const statR = document.getElementById('statR');
  const statD = document.getElementById('statD');
  const statTick = document.getElementById('statTick');

  const randomBetween = (min, max) => Math.random() * (max - min) + min;

  const STATE = {
    SUSCEPTIBLE: 'S',
    INFECTED: 'I',
    RECOVERED: 'R',
    DECEASED: 'D'
  };

  const COLOR = {
    S: '#facc15', 
    I: '#ef4444', 
    R: '#22c55e', 
    D: '#000000'  
  };

  let baseRadius = 3.5; 

  let people = [];
  let requestId = null;
  let tick = 0;

  const DISEASE_PRESETS = {
    covid: {
      infectionChance: 35,
      mortalityChance: 0.005,
      decayRate: 0.8,
      decayInterval: 60,
      infectionRadius: 20,
      speed: 1.2
    },
    flu: {
      infectionChance: 45,
      mortalityChance: 0.002,
      decayRate: 1.2,
      decayInterval: 40,
      infectionRadius: 15,
      speed: 1.8
    },
    ebola: {
      infectionChance: 15,
      mortalityChance: 0.1,
      decayRate: 0.3,
      decayInterval: 100,
      infectionRadius: 25,
      speed: 0.8
    },
    plague: {
      infectionChance: 25,
      mortalityChance: 0.05,
      decayRate: 0.4,
      decayInterval: 80,
      infectionRadius: 18,
      speed: 1.0
    }
  };
  //adding more is self explanatory

  function createPopulation(populationSize, initialInfectedCount) {
    people = [];
    const width = canvas.width;
    const height = canvas.height;

    const area = width * height;
    const targetCoverage = Math.min(0.03, Math.max(0.015, 800 / (populationSize + 20000)));
    const perParticleArea = (area * targetCoverage) / Math.max(1, populationSize);
    baseRadius = Math.max(2, Math.min(12, Math.sqrt(perParticleArea / Math.PI)));

    for (let i = 0; i < populationSize; i++) {
      const speed = parseFloat(elSpeed.value);
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed === 0 ? { x: 0, y: 0 } : { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };

      people.push({
        x: randomBetween(baseRadius, width - baseRadius),
        y: randomBetween(baseRadius, height - baseRadius),
        vx: velocity.x,
        vy: velocity.y,
        state: STATE.SUSCEPTIBLE,
        infectionProgress: 0 // 0 when S or R; 100..0 when I
      });
    }

    const idxs = [...Array(populationSize).keys()];
    for (let k = 0; k < Math.min(initialInfectedCount, populationSize); k++) {
      const pickIndex = Math.floor(Math.random() * idxs.length);
      const idx = idxs.splice(pickIndex, 1)[0];
      people[idx].state = STATE.INFECTED;
      people[idx].infectionProgress = 100;
    }
  }

  function bounceWithinBounds(p) {
    const width = canvas.width;
    const height = canvas.height;
    // Reflect off walls
    if (p.x <= baseRadius && p.vx < 0) p.vx *= -1;
    if (p.x >= width - baseRadius && p.vx > 0) p.vx *= -1;
    if (p.y <= baseRadius && p.vy < 0) p.vy *= -1;
    if (p.y >= height - baseRadius && p.vy > 0) p.vy *= -1;
    // Clamp inside bounds to prevent drifting out
    if (p.x < baseRadius) p.x = baseRadius;
    if (p.x > width - baseRadius) p.x = width - baseRadius;
    if (p.y < baseRadius) p.y = baseRadius;
    if (p.y > height - baseRadius) p.y = height - baseRadius;
  }

  function resolveCollision(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let dist = Math.hypot(dx, dy);
    if (dist === 0) {
      dist = 1e-6;
    }
    const minDist = baseRadius * 2;
    if (dist >= minDist) return;
    const overlap = (minDist - dist) / 2;
    const nx = dx / dist;
    const ny = dy / dist;
    a.x -= nx * overlap;
    a.y -= ny * overlap;
    b.x += nx * overlap;
    b.y += ny * overlap;

    const avn = a.vx * nx + a.vy * ny;
    const bvn = b.vx * nx + b.vy * ny;
    const avt = a.vx * (-ny) + a.vy * nx; //ty mr lindquist
    const bvt = b.vx * (-ny) + b.vy * nx;

    const avnNew = bvn;
    const bvnNew = avn;

    a.vx = avnNew * nx + avt * (-ny);
    a.vy = avnNew * ny + avt * nx;
    b.vx = bvnNew * nx + bvt * (-ny);
    b.vy = bvnNew * ny + bvt * nx;
  }

  function step() {
    tick += 1;
    const width = canvas.width;
    const height = canvas.height;

    const infectionRadius = parseFloat(elInfectionRadius.value);
    const infectionChance = parseFloat(elInfectionChance.value) / 100;
    const mortalityChance = parseFloat(elMortalityChance.value) / 100;
    const decayRate = parseFloat(elDecayRate.value); // percent per tick i stole this idea from a pz mod
    const decayInterval = Math.max(1, parseInt(elDecayInterval.value || '50', 10));
    const randomSpreadEnabled = !!elRandomSpreadEnabled?.checked;
    const randomSpreadChance = (parseFloat(elRandomSpreadChance?.value || '0') / 100);
    const randomSpreadRange = parseFloat(elRandomSpreadRange?.value || '0');
    const randomSpreadAngleDeg = parseFloat(elRandomSpreadAngle?.value || '0');
    const randomSpreadAngle = (randomSpreadAngleDeg * Math.PI) / 180;

    for (const p of people) {
      if (p.state === STATE.DECEASED) continue;
      
      // yeah this just does not work like at all
      if (elAvoidanceEnabled?.checked && (p.state === STATE.SUSCEPTIBLE || p.state === STATE.RECOVERED)) {
        const avoidanceForce = 0.5;
        const avoidanceRadius = 60;
        let avoidX = 0, avoidY = 0;
        let nearestInfected = null;
        let nearestDist = Infinity;
        
        for (const other of people) {
          if (other.state !== STATE.INFECTED) continue;
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const dist = Math.hypot(dx, dy);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestInfected = other;
          }
          if (dist > 0 && dist < avoidanceRadius) {
            const strength = Math.pow((avoidanceRadius - dist) / avoidanceRadius, 2);
            avoidX += (dx / dist) * strength;
            avoidY += (dy / dist) * strength;
          }
        }
        
        // Store avoidance target for path visualization
        p.avoidanceTarget = nearestInfected;
        p.avoidanceDistance = nearestDist;
        
        const smoothing = 0.1;
        p.vx += avoidX * avoidanceForce * smoothing;
        p.vy += avoidY * avoidanceForce * smoothing;
        
        const maxSpeed = parseFloat(elSpeed.value) * 2.0;
        const currentSpeed = Math.hypot(p.vx, p.vy);
        if (currentSpeed > maxSpeed) {
          p.vx = (p.vx / currentSpeed) * maxSpeed;
          p.vy = (p.vy / currentSpeed) * maxSpeed;
        }
      } else {
        p.avoidanceTarget = null;
        p.avoidanceDistance = Infinity;
      }
      
      p.x += p.vx;
      p.y += p.vy;
      bounceWithinBounds(p);
    }

    // Pairwise collisions (naive O(n^2))
    for (let i = 0; i < people.length; i++) {
      for (let j = i + 1; j < people.length; j++) {
        const a = people[i];
        const b = people[j];
        if (a.state === STATE.DECEASED && b.state === STATE.DECEASED) continue;
        resolveCollision(a, b);
      }
    }

    const toInfect = new Set();
    const cones = [];
    for (let i = 0; i < people.length; i++) {
      const a = people[i];
      if (a.state !== STATE.INFECTED) continue;

      if (Math.random() < mortalityChance) {
        a.state = STATE.DECEASED; //todo: nerf
        a.vx = 0; a.vy = 0;
        a.infectionProgress = 0;
        continue;
      }

      if (randomSpreadEnabled && Math.random() < randomSpreadChance) {
        const dir = Math.atan2(a.vy, a.vx);
        const half = randomSpreadAngle / 2;
        const angle = dir + (Math.random() * randomSpreadAngle - half);
        cones.push({ x: a.x, y: a.y, angle, halfAngle: half, range: randomSpreadRange });
      }

      for (let j = 0; j < people.length; j++) {
        if (j === i) continue;
        const b = people[j];
        if (b.state !== STATE.SUSCEPTIBLE) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 <= infectionRadius * infectionRadius) {
          if (Math.random() < infectionChance) {
            toInfect.add(j);
          }
        }
      }

      if (tick % decayInterval === 0) {
        a.infectionProgress = Math.max(0, a.infectionProgress - decayRate);
      }
      if (a.infectionProgress === 0) {
        a.state = STATE.RECOVERED;
      }
    }

    // ACHOOOOO
    if (cones.length > 0) {
      for (let j = 0; j < people.length; j++) {
        const b = people[j];
        if (b.state !== STATE.SUSCEPTIBLE) continue;
        for (const c of cones) {
          const dx = b.x - c.x;
          const dy = b.y - c.y;
          const dist = Math.hypot(dx, dy);
          if (dist > c.range || dist === 0) continue;
          const angleToB = Math.atan2(dy, dx);
          let da = Math.abs(((angleToB - c.angle + Math.PI) % (2 * Math.PI)) - Math.PI);
          if (da <= c.halfAngle) {
            toInfect.add(j);
            break;
          }
        }
      }
    }

    for (const idx of toInfect) {
      const s = people[idx];
      if (s.state === STATE.SUSCEPTIBLE) {
        s.state = STATE.INFECTED;
        s.infectionProgress = 100;
      }
    }

    ctx.clearRect(0, 0, width, height);

    const showRadius = elShowRadius.checked;
    if (showRadius) {
      ctx.save();
      ctx.fillStyle = 'rgba(96,165,250,0.08)';
      ctx.strokeStyle = 'rgba(96,165,250,0.35)';
      ctx.lineWidth = 1;
      for (const p of people) {
        if (p.state !== STATE.INFECTED) continue;
        ctx.beginPath();
        ctx.arc(p.x, p.y, infectionRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const p of people) {
      ctx.fillStyle = COLOR[p.state];
      ctx.beginPath();
      ctx.arc(p.x, p.y, baseRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = document.documentElement.classList.contains('light') ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (p.state === STATE.INFECTED) { //im 100% recycling this idea in the future
        const progress = p.infectionProgress / 100; 
        const ringRadius = Math.max(1, baseRadius * progress);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (elShowSpreadDebug?.checked) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,215,0,0.6)';
      ctx.lineWidth = 1;
      for (const c of cones) {
        ctx.beginPath();
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + Math.cos(c.angle - c.halfAngle) * c.range, c.y + Math.sin(c.angle - c.halfAngle) * c.range);
        ctx.moveTo(c.x, c.y);
        ctx.lineTo(c.x + Math.cos(c.angle + c.halfAngle) * c.range, c.y + Math.sin(c.angle + c.halfAngle) * c.range);
        ctx.stroke();
      }
      ctx.restore();
    }

    // debugging
    if (elShowAvoidancePaths?.checked) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,0,0,0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      for (const p of people) {
        if (p.avoidanceTarget && p.avoidanceDistance < 100) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.avoidanceTarget.x, p.avoidanceTarget.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    let sCount = 0, iCount = 0, rCount = 0, dCount = 0;
    for (const p of people) {
      if (p.state === STATE.SUSCEPTIBLE) sCount++;
      else if (p.state === STATE.INFECTED) iCount++;
      else if (p.state === STATE.RECOVERED) rCount++;
      else if (p.state === STATE.DECEASED) dCount++;
    }
    statS.textContent = String(sCount);
    statI.textContent = String(iCount);
    statR.textContent = String(rCount);
    statD.textContent = String(dCount);
    statTick.textContent = String(tick);
  }

  function loop() {
    step();
    requestId = requestAnimationFrame(loop);
  }

  function start() {
    if (requestId != null) return;
    requestId = requestAnimationFrame(loop);
  }

  function pause() {
    if (requestId != null) {
      cancelAnimationFrame(requestId);
      requestId = null;
    }
  }

  function reset() {
    tick = 0;
    createPopulation(parseInt(elPopulation.value, 10), parseInt(elInitialInfected.value, 10));
  }

  function syncLabels() {
    elInfectionRadiusValue.textContent = String(parseFloat(elInfectionRadius.value));
    elInfectionChanceValue.textContent = `${parseFloat(elInfectionChance.value)}%`;
    elMortalityChanceValue.textContent = `${parseFloat(elMortalityChance.value)}%`;
    elDecayRateValue.textContent = `${parseFloat(elDecayRate.value)}%`;
    elSpeedValue.textContent = String(parseFloat(elSpeed.value));
    if (elRandomSpreadChanceValue) elRandomSpreadChanceValue.textContent = `${parseFloat(elRandomSpreadChance.value)}%`;
    if (elRandomSpreadRangeValue) elRandomSpreadRangeValue.textContent = `${parseFloat(elRandomSpreadRange.value)}`;
    if (elRandomSpreadAngleValue) elRandomSpreadAngleValue.textContent = `${parseFloat(elRandomSpreadAngle.value)}°`;
  }

  [elInfectionRadius, elInfectionChance, elMortalityChance, elDecayRate, elSpeed, elRandomSpreadChance, elRandomSpreadRange, elRandomSpreadAngle].forEach(el => {
    el.addEventListener('input', syncLabels);
  });

  btnStart.addEventListener('click', () => {
    start();
  });
  btnPause.addEventListener('click', () => {
    pause();
  });
  btnReset.addEventListener('click', () => {
    pause();
    reset();
    step(); 
  });

  function resizeCanvasForDPI() {
    const ratio = window.devicePixelRatio || 1;
    const displayWidth = Math.floor(canvas.clientWidth);
    const displayHeight = Math.floor(canvas.clientHeight);
    if (displayWidth === 0 || displayHeight === 0) return;
    canvas.width = Math.floor(displayWidth * ratio);
    canvas.height = Math.floor(displayHeight * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  const ro = new ResizeObserver(() => {
    const wasRunning = requestId != null;
    pause();
    resizeCanvasForDPI();
    step();
    if (wasRunning) start();
  });
  ro.observe(canvas);

  let menuCollapsed = false;
  menuToggle.addEventListener('click', () => {
    menuCollapsed = !menuCollapsed;
    controlsNav.classList.toggle('collapsed', menuCollapsed);
    menuToggle.textContent = menuCollapsed ? '☰' : '✕';
  });

  function updateMode() {
    const isAdvanced = elModeAdvanced.checked;
    document.body.classList.toggle('mode-advanced', isAdvanced);
  }
  
  elModeSimple.addEventListener('change', updateMode);
  elModeAdvanced.addEventListener('change', updateMode);

  function applyDiseasePreset(presetName) {
    if (presetName === 'custom') return;
    
    const preset = DISEASE_PRESETS[presetName];
    if (!preset) return;
    
    elInfectionChance.value = preset.infectionChance;
    elMortalityChance.value = preset.mortalityChance;
    elDecayRate.value = preset.decayRate;
    elDecayInterval.value = preset.decayInterval;
    elInfectionRadius.value = preset.infectionRadius;
    elSpeed.value = preset.speed;
    
    syncLabels();
    
    if (requestId) {
      pause();
      reset();
      step();
    }
  }
  
  elDiseasePreset.addEventListener('change', (e) => {
    applyDiseasePreset(e.target.value);
  });

  // i love searing my retinas
  const themeToggle = document.getElementById('themeToggle');
  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      themeToggle.textContent = '🌙';
      localStorage.setItem('theme', 'light');
    } else {
      root.classList.remove('light');
      themeToggle.textContent = '☀️';
      localStorage.setItem('theme', 'dark');
    }
  }
  const savedTheme = localStorage.getItem('theme');
  applyTheme(savedTheme === 'light' ? 'light' : 'dark');
  themeToggle.addEventListener('click', () => {
    const isLight = document.documentElement.classList.contains('light');
    applyTheme(isLight ? 'dark' : 'light');
  });

  syncLabels();
  resizeCanvasForDPI();
  createPopulation(parseInt(elPopulation.value, 10), parseInt(elInitialInfected.value, 10));
  step();
})();


