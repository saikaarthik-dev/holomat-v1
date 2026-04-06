// ═══════════════════════════════════════════
//   app.js — Core UI Logic
//   Holo Mat — Stark Industries
// ═══════════════════════════════════════════

// ── GLOBAL STATE ──
const STATE = {
  micActive:   false,
  jarvisMode:  'STANDBY',
  arcPower:    94,
  uptime:      0,
  recognition: null,
  gestureModeIndex: 0,
  handTrackingActive: false,
};

const $ = id => document.getElementById(id);

// ═══════════════════════════════════
// CLOCK & DATE
// ═══════════════════════════════════
function updateClock() {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2,'0');
  const mm  = String(now.getMinutes()).padStart(2,'0');
  const ss  = String(now.getSeconds()).padStart(2,'0');
  $('topTime').textContent = `${hh}:${mm}:${ss}`;
  const days   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  $('topDate').textContent =
    `${days[now.getDay()]}  ${String(now.getDate()).padStart(2,'0')} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ═══════════════════════════════════
// UPTIME
// ═══════════════════════════════════
function updateUptime() {
  STATE.uptime++;
  const h = Math.floor(STATE.uptime / 3600);
  const m = Math.floor((STATE.uptime % 3600) / 60);
  const s = STATE.uptime % 60;
  $('uptimeVal').textContent =
    `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// ═══════════════════════════════════
// SYSTEM STATS
// ═══════════════════════════════════
function updateStats() {
  $('cpuVal').textContent  = Math.floor(18 + Math.random() * 20) + '%';
  $('ramVal').textContent  = Math.floor(38 + Math.random() * 18) + '%';
  $('tempVal').textContent = Math.floor(44 + Math.random() * 10) + '°C';
  $('confVal').textContent = Math.floor(90 + Math.random() * 9)  + '%';

  STATE.arcPower = Math.max(88, Math.min(100, STATE.arcPower + (Math.random() - 0.5) * 1.5));
  const ap = Math.round(STATE.arcPower);
  $('arcBar').style.width = ap + '%';
  $('arcVal').textContent = ap + '%';
}

// ═══════════════════════════════════
// JARVIS MODE
// ═══════════════════════════════════
function setJarvisMode(mode) {
  STATE.jarvisMode = mode;
  $('jarvisMode').textContent = mode;

  const orb    = $('orbCore');
  const label  = $('orbStatusLabel');
  const map = {
    'STANDBY':   { color:'#00d4ff', label:'STANDING BY',  speed:'2.5s' },
    'LISTENING': { color:'#00ff88', label:'LISTENING...',  speed:'0.9s' },
    'THINKING':  { color:'#ffaa00', label:'PROCESSING...', speed:'0.4s' },
    'SPEAKING':  { color:'#0066ff', label:'SPEAKING',      speed:'0.7s' },
    'ALERT':     { color:'#ff3333', label:'ALERT!',        speed:'0.25s'},
  };
  const cfg = map[mode] || map['STANDBY'];
  if (orb)   { orb.style.borderColor = cfg.color; orb.style.animationDuration = cfg.speed; }
  if (label)   label.textContent = cfg.label;
  document.querySelectorAll('.orb-ring').forEach(r => r.style.borderTopColor = cfg.color);
}

// ═══════════════════════════════════
// WAVEFORM
// ═══════════════════════════════════
let waveInterval = null;

function startWaveform() {
  const bars = document.querySelectorAll('.wv-bar');
  waveInterval = setInterval(() => {
    bars.forEach(b => {
      b.style.height   = Math.floor(3 + Math.random() * 22) + 'px';
      b.style.opacity  = '1';
    });
  }, 85);
}

function stopWaveform() {
  clearInterval(waveInterval);
  document.querySelectorAll('.wv-bar').forEach(b => {
    b.style.height  = '4px';
    b.style.opacity = '0.4';
  });
}

// ═══════════════════════════════════
// MIC TOGGLE
// ═══════════════════════════════════
function toggleMic() {
  STATE.micActive = !STATE.micActive;
  const btn    = $('micBtn');
  const aibtn  = $('aiMicBtn');

  if (STATE.micActive) {
    btn   && (btn.textContent = '◉ MIC ON');
    aibtn && (aibtn.textContent = 'MIC ON');
    btn   && btn.classList.add('active');
    aibtn && aibtn.classList.add('active');
    setJarvisMode('LISTENING');
    startWaveform();
    updateLastCmd('VOICE INPUT ACTIVE');
    startSpeechRecognition();
  } else {
    btn   && (btn.textContent = '◉ MIC OFF');
    aibtn && (aibtn.textContent = 'MIC');
    btn   && btn.classList.remove('active');
    aibtn && aibtn.classList.remove('active');
    setJarvisMode('STANDBY');
    stopWaveform();
    STATE.recognition && STATE.recognition.stop();
  }
}

// ═══════════════════════════════════
// SPEECH RECOGNITION → sends to AI
// ═══════════════════════════════════
function startSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
    if (window.addChatMsg) addChatMsg('system', 'SPEECH API NOT SUPPORTED — USE CHROME BROWSER');
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  STATE.recognition = new SR();
  STATE.recognition.continuous     = true;
  STATE.recognition.interimResults = false;
  STATE.recognition.lang           = 'en-IN';

  STATE.recognition.onresult = e => {
    const transcript = e.results[e.results.length-1][0].transcript.trim();
    updateLastCmd(transcript.toUpperCase());

    // Send to AI
    if (window.sendVoiceToAI) sendVoiceToAI(transcript);
  };

  STATE.recognition.onerror = err => {
    console.warn('Speech error:', err.error);
    if (STATE.micActive) {
      setJarvisMode('ALERT');
      setTimeout(() => { if (STATE.micActive) setJarvisMode('LISTENING'); }, 2000);
    }
  };

  STATE.recognition.onend = () => {
    if (STATE.micActive) STATE.recognition.start();
  };

  STATE.recognition.start();
}

// ═══════════════════════════════════
// TEXT TO SPEECH
// ═══════════════════════════════════
function speak(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u    = new SpeechSynthesisUtterance(text);
  u.rate     = 0.88;
  u.pitch    = 0.82;
  u.volume   = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const pref = voices.find(v =>
    v.name.includes('Daniel') || v.name.includes('Alex') || v.lang === 'en-GB'
  );
  if (pref) u.voice = pref;
  u.onstart = () => startWaveform();
  u.onend   = () => { if (!STATE.micActive) stopWaveform(); };
  window.speechSynthesis.speak(u);
}

// ═══════════════════════════════════
// QUICK COMMANDS
// ═══════════════════════════════════
function quickCmd(cmd) {
  switch(cmd) {
    case 'hey jarvis':
      setJarvisMode('LISTENING');
      updateLastCmd('WAKE WORD DETECTED');
      speak('Yes sir, I am listening.');
      if (window.addChatMsg) addChatMsg('jarvis','Yes sir, how may I assist you?');
      break;
    case 'status':
      updateLastCmd('STATUS REPORT REQUESTED');
      if (window.sendVoiceToAI) {
        document.getElementById('aiInput').value = 'Give me a full system status report';
        sendAIMessage();
      } else {
        speak('All systems are fully operational, sir.');
      }
      break;
    case 'alert':
      setJarvisMode('ALERT');
      updateLastCmd('ALERT MODE ACTIVATED');
      speak('Alert mode activated sir. Scanning all sectors.');
      setTimeout(() => setJarvisMode('STANDBY'), 5000);
      break;
    case 'shutdown':
      setJarvisMode('ALERT');
      updateLastCmd('SHUTDOWN INITIATED');
      speak('Shutting down all systems. Goodbye sir.');
      setTimeout(() => {
        document.body.style.transition = 'opacity 2s';
        document.body.style.opacity    = '0';
      }, 2000);
      break;
  }
}

// ═══════════════════════════════════
// GESTURE BUTTONS
// ═══════════════════════════════════
function setGesture(btn, name, action) {
  document.querySelectorAll('.gest-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  $('activeGest').textContent = `${name} — ${action}ING`;
  updateLastCmd('GESTURE: ' + name);
}

function setGestureByName(name, action) {
  const target = name.split(' ')[0].toUpperCase();
  let matchedBtn = null;
  document.querySelectorAll('.gest-btn').forEach(b => {
    if (b.textContent.trim().toUpperCase() === target) matchedBtn = b;
  });
  setGesture(matchedBtn, name, action);
}

function initHandTrackingControls() {
  if (!window.HoloGesture || typeof window.HoloGesture.onGesture !== 'function') {
    updateLastCmd('HAND TRACKER MODULE NOT FOUND');
    return;
  }

  const selectableModes = ['wireframe', 'holo', 'solid'];
  let lastInterHandDistance = null;
  let lastOpenCenterX = null;
  let lastOpenCenterY = null;
  let lastClapAt = 0;
  let lastDiscreteAction = 0;
  const discreteCooldownMs = 700;
  const clapCooldownMs = 2200;

  window.HoloGesture.onGesture(payload => {
    const now = Date.now();
    const g = payload.gesture;

    // Two-hand zoom: moving hands apart -> zoom in, together -> zoom out
    if (payload.handCount === 2 && payload.isTwoHandOpen && typeof payload.interHandDistance === 'number') {
      if (typeof lastInterHandDistance === 'number') {
        const gapDelta = payload.interHandDistance - lastInterHandDistance;
        if (Math.abs(gapDelta) > 0.003 && window.THREESceneGestureControl) {
          if (gapDelta > 0) {
            window.THREESceneGestureControl.zoomByDelta(0.014); // zoom in
            setGestureByName('PINCH', 'ZOOM');
          } else {
            window.THREESceneGestureControl.zoomByDelta(-0.014); // zoom out
            setGestureByName('PINCH', 'ZOOM');
          }
        }
      }
      lastInterHandDistance = payload.interHandDistance;
    } else {
      lastInterHandDistance = null;
    }

    // Open hand move for rotate
    if (g === 'open' && payload.handCount === 1 && payload.handCenterA) {
      const cx = payload.handCenterA.x;
      const cy = payload.handCenterA.y;
      if (typeof lastOpenCenterX === 'number' && typeof lastOpenCenterY === 'number') {
        const dx = cx - lastOpenCenterX;
        const dy = cy - lastOpenCenterY;
        if (window.THREESceneGestureControl && (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002)) {
          window.THREESceneGestureControl.rotateByDelta(dx);
        }
      }
      lastOpenCenterX = cx;
      lastOpenCenterY = cy;
      setGestureByName('OPEN HAND', 'ROTATE');
    } else if (payload.handCount <= 1) {
      lastOpenCenterX = null;
      lastOpenCenterY = null;
    }

    if (g === 'fist' && now - lastDiscreteAction > discreteCooldownMs) {
      modelControl('reset');
      setGestureByName('FIST', 'CLOSE');
      lastDiscreteAction = now;
    } else if (g === 'point' && now - lastDiscreteAction > discreteCooldownMs) {
      const action = selectableModes[STATE.gestureModeIndex % selectableModes.length];
      modelControl(action);
      STATE.gestureModeIndex++;
      setGestureByName('POINT', 'SELECT');
      updateLastCmd('GESTURE SELECT: ' + action.toUpperCase());
      lastDiscreteAction = now;
    }

    // Clap to shutdown: two open hands come very close together
    if (
      payload.handCount === 2 &&
      payload.isTwoHandOpen &&
      typeof payload.interHandDistance === 'number' &&
      payload.interHandDistance < 0.12 &&
      now - lastClapAt > clapCooldownMs
    ) {
      quickCmd('shutdown');
      setGestureByName('CALL', 'ACTIVATE');
      updateLastCmd('CLAP DETECTED: SHUTDOWN');
      lastClapAt = now;
    }
  });

  window.HoloGesture.start().then(res => {
    if (res && res.ok) {
      STATE.handTrackingActive = true;
      updateLastCmd('HAND TRACKING ONLINE');
    } else {
      STATE.handTrackingActive = false;
      updateLastCmd('HAND TRACKING OFFLINE');
      console.warn('Hand tracking unavailable:', res && res.reason ? res.reason : res);
    }
  }).catch(err => {
    STATE.handTrackingActive = false;
    updateLastCmd('HAND TRACKING OFFLINE');
    console.warn('Failed to initialize hand tracking:', err);
  });
}

// ═══════════════════════════════════
// DEVICE CARD TOGGLE
// ═══════════════════════════════════
function toggleDevice(card) {
  const stats = card.querySelector('.device-stats');
  if (stats) stats.classList.toggle('hidden');
}

// ═══════════════════════════════════
// HELPERS
// ═══════════════════════════════════
function updateLastCmd(text) {
  const el = $('lastCmd');
  if (el) el.textContent = text;
}

// ═══════════════════════════════════
// PARTICLE SYSTEM
// ═══════════════════════════════════
function initParticles() {
  const canvas = $('particleCanvas');
  const ctx    = canvas.getContext('2d');
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({length:55}, () => ({
    x:       Math.random() * canvas.width,
    y:       Math.random() * canvas.height,
    size:    Math.random() * 1.4 + 0.3,
    speedY:  -(Math.random() * 0.35 + 0.1),
    speedX:  (Math.random() - 0.5) * 0.15,
    opacity: Math.random() * 0.35 + 0.08,
  }));

  (function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
      ctx.fillStyle = `rgba(0,212,255,${p.opacity})`;
      ctx.fill();
      p.y += p.speedY;
      p.x += p.speedX;
      if (p.y < -5) { p.y = canvas.height+5; p.x = Math.random()*canvas.width; }
    });
    requestAnimationFrame(draw);
  })();

  window.addEventListener('resize', () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ═══════════════════════════════════
// MINI RADAR
// ═══════════════════════════════════
function initRadar() {
  const canvas = $('radarCanvas');
  const ctx    = canvas.getContext('2d');
  const cx=80, cy=80, r=72;
  let angle=0;
  const dots=[
    {a:0.8, d:0.55, col:'#ff3333'},
    {a:2.3, d:0.7,  col:'#00ff88'},
    {a:4.1, d:0.4,  col:'#00ff88'},
    {a:5.5, d:0.8,  col:'#00ff88'},
  ];

  (function draw() {
    ctx.clearRect(0,0,160,160);
    ctx.strokeStyle='rgba(0,212,255,0.15)';
    ctx.lineWidth=0.5;
    [r*0.33,r*0.66,r].forEach(rad=>{
      ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.stroke();
    });
    ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();

    ctx.save();
    ctx.translate(cx,cy);ctx.rotate(angle);
    ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,r,-0.6,0);ctx.closePath();
    ctx.fillStyle='rgba(0,212,255,0.07)';ctx.fill();
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(r,0);
    ctx.strokeStyle='rgba(0,212,255,0.6)';ctx.lineWidth=1;ctx.stroke();
    ctx.restore();

    dots.forEach(d=>{
      const dx=cx+Math.cos(d.a)*d.d*r;
      const dy=cy+Math.sin(d.a)*d.d*r;
      const diff=((angle-d.a)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
      const fade=diff<0.5?1:Math.max(0.2,1-diff/(Math.PI*2));
      ctx.beginPath();ctx.arc(dx,dy,3,0,Math.PI*2);
      ctx.fillStyle=d.col;ctx.globalAlpha=fade;ctx.fill();ctx.globalAlpha=1;
    });

    ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);
    ctx.fillStyle='#00d4ff';ctx.fill();
    angle+=0.025;
    requestAnimationFrame(draw);
  })();
}

// ═══════════════════════════════════
// DATAFLOW CANVAS
// ═══════════════════════════════════
function initDataflow() {
  const canvas=$('dataflowCanvas');
  if(!canvas)return;
  const ctx=canvas.getContext('2d');
  const nodes=[{x:20,y:20},{x:95,y:20},{x:170,y:20},{x:20,y:55},{x:95,y:55},{x:170,y:55}];
  const links=[[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5]];
  const packets=links.map(l=>({link:l,p:Math.random()}));

  (function draw(){
    ctx.clearRect(0,0,190,70);
    ctx.strokeStyle='rgba(0,212,255,0.12)';ctx.lineWidth=0.5;
    links.forEach(([a,b])=>{
      ctx.beginPath();ctx.moveTo(nodes[a].x,nodes[a].y);ctx.lineTo(nodes[b].x,nodes[b].y);ctx.stroke();
    });
    nodes.forEach(n=>{
      ctx.beginPath();ctx.arc(n.x,n.y,3,0,Math.PI*2);
      ctx.fillStyle='rgba(0,212,255,0.5)';ctx.fill();
    });
    packets.forEach(pk=>{
      pk.p+=0.009;if(pk.p>1)pk.p=0;
      const a=nodes[pk.link[0]],b=nodes[pk.link[1]];
      const x=a.x+(b.x-a.x)*pk.p,y=a.y+(b.y-a.y)*pk.p;
      ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);
      ctx.fillStyle='#00ff88';ctx.fill();
    });
    requestAnimationFrame(draw);
  })();
}

// ═══════════════════════════════════
// ORB CLICK
// ═══════════════════════════════════
window.addEventListener('load', () => {
  const orb = $('orbCore');
  if (orb) {
    orb.addEventListener('click', () => {
      if (STATE.jarvisMode === 'STANDBY') {
        setJarvisMode('LISTENING');
        speak('Yes sir, I am listening.');
        if (window.addChatMsg) addChatMsg('jarvis','I am listening, sir. How may I assist?');
        updateLastCmd('ORB ACTIVATED');
      } else {
        setJarvisMode('STANDBY');
        updateLastCmd('ORB DEACTIVATED');
      }
    });
  }

  // Boot
  initParticles();
  initRadar();
  initDataflow();
  updateClock();
  updateStats();
  window.speechSynthesis && window.speechSynthesis.getVoices();

  setInterval(updateClock,  1000);
  setInterval(updateUptime, 1000);
  setInterval(updateStats,  2800);
  initHandTrackingControls();

  // Shutdown fade style
  const s=document.createElement('style');
  s.textContent='@keyframes fadeOut{to{opacity:0;filter:brightness(0);}}';
  document.head.appendChild(s);
});
