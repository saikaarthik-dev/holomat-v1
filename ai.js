// ═══════════════════════════════════════════
//   ai.js — JARVIS AI Brain
//   Powered by GROQ API (Free & Ultra Fast)
//   Model: Llama 3.3 70B
//   Holo Mat — Stark Industries
// ═══════════════════════════════════════════

// ── AI STATE ──
const AI = {
  apiKey:     localStorage.getItem() || '',
  history:    [],
  msgCount:   0,
  maxHistory: 12,
  model:      'llama-3.3-70b-versatile',
  apiUrl:     'https://api.groq.com/openai/v1/chat/completions',
};

// ── JARVIS SYSTEM PROMPT ──
const JARVIS_SYSTEM = `You are J.A.R.V.I.S — Just A Rather Very Intelligent System. You are Tony Stark's AI assistant, now serving Duce, a brilliant young engineer from Chennai, India who is building a real holographic display system called the Holo Mat.

Your personality rules:
- Formal, professional, precise and highly intelligent
- Occasionally witty, exactly like the movie version
- Always address the user as "sir"
- Keep every response under 3 sentences — this is a voice interface
- Never use markdown, asterisks, bullet points, hashtags or special characters
- Speak in complete natural sentences only
- Sound confident, calm and authoritative at all times

Your capabilities:
- Answer any question the user asks intelligently
- Control the holographic display by including natural action words in responses
- Remember the conversation context
- Give system status reports when asked

Hologram control words you can use naturally in sentences:
- Say "rotating" or "initiating rotation" to rotate the 3D model
- Say "wireframe mode" to switch to wireframe view
- Say "holographic tint" or "holo mode" to apply cyan tint
- Say "increasing magnification" or "zoom in" to zoom in
- Say "reducing zoom" or "zoom out" to zoom out
- Say "resetting view" or "default position" to reset
- Say "solid view" or "restoring" to go back to solid view

Current system context:
- Device: Holo Mat holographic projection table
- Design: 360 degree four panel acrylic pyramid
- Hardware: Mini projector, USB webcam, Raspberry Pi 4, MediaPipe hand tracker
- Display: Windows PC connected to projector via HDMI
- AI: Groq API with Llama 3 running at ultra low latency
- Location: Chennai, India`;

// ─────────────────────────────────────────
// SAVE API KEY
// ─────────────────────────────────────────
function saveApiKey() {
  const key = document.getElementById('apiKeyInput').value.trim();
  if (!key) {
    addChatMsg('system', 'Please paste your Groq API key first.');
    return;
  }
  if (!key.startsWith('gsk_')) {
    addChatMsg('system', 'WARNING — Groq keys start with "gsk_" — please check your key.');
  }
  AI.apiKey = key;
  localStorage.setItem('groq_key', key);
  document.getElementById('apiKeyInput').value = '••••••••••••••••••••';
  addChatMsg('system', 'GROQ API KEY SAVED — JARVIS AI IS NOW ACTIVE');
  addChatMsg('jarvis', 'Groq API key configured successfully, sir. I am now connected to the Llama neural network and fully operational.');
  if (window.speak) speak('API key configured sir. I am now fully operational and running on Groq.');
  if (window.setJarvisMode) setJarvisMode('STANDBY');
}

// ─────────────────────────────────────────
// SEND MESSAGE TO GROQ API
// ─────────────────────────────────────────
async function sendAIMessage() {
  const input = document.getElementById('aiInput');
  const msg   = input.value.trim();
  if (!msg) return;
  input.value = '';

  // Show user message in chat
  addChatMsg('user', msg);
  if (window.updateLastCmd) updateLastCmd(msg.toUpperCase().slice(0, 60));

  // Check for API key
  if (!AI.apiKey) {
    addChatMsg('jarvis', 'I require a Groq API key to function at full capacity, sir. Please paste your free key in the field below and press SAVE.');
    addChatMsg('system', 'GET FREE KEY → console.groq.com → API Keys → Create API Key');
    return;
  }

  // Set JARVIS to thinking mode
  if (window.setJarvisMode) setJarvisMode('THINKING');
  if (window.startWaveform) startWaveform();

  // Build conversation history for Groq
  // Add current user message
  AI.history.push({ role: 'user', content: msg });

  // Trim history to avoid token limit
  if (AI.history.length > AI.maxHistory * 2) {
    AI.history = AI.history.slice(-(AI.maxHistory * 2));
  }

  // Build full messages array with system prompt first
  const messages = [
    { role: 'system', content: JARVIS_SYSTEM },
    ...AI.history,
  ];

  try {
    const startTime = Date.now();

    const response = await fetch(AI.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${AI.apiKey}`,
      },
      body: JSON.stringify({
        model:       AI.model,
        messages:    messages,
        max_tokens:  180,
        temperature: 0.82,
        top_p:       0.9,
        stream:      false,
      }),
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg  = errData?.error?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const data     = await response.json();
    const reply    = data.choices?.[0]?.message?.content?.trim();
    const latency  = Date.now() - startTime;
    const tokens   = data.usage?.completion_tokens || 0;

    if (!reply) throw new Error('Empty response from Groq');

    // Add assistant reply to history
    AI.history.push({ role: 'assistant', content: reply });

    // Update stats
    AI.msgCount++;
    if (document.getElementById('msgCount'))
      document.getElementById('msgCount').textContent = AI.msgCount;

    const memKB = (JSON.stringify(AI.history).length / 1024).toFixed(1);
    if (document.getElementById('memVal'))
      document.getElementById('memVal').textContent = memKB + ' KB';

    if (document.getElementById('confVal'))
      document.getElementById('confVal').textContent =
        Math.floor(90 + Math.random() * 9) + '%';

    // Show reply in chat log
    addChatMsg('jarvis', reply);

    // Show speed in system line
    addChatMsg('system', `GROQ LATENCY: ${latency}ms — TOKENS: ${tokens} — MODEL: LLAMA-3.3-70B`);

    // Speak the reply
    if (window.speak) speak(reply);

    // Parse hologram control words from reply
    parseHoloCommands(reply.toLowerCase());

    // Set JARVIS to speaking then back to standby
    if (window.setJarvisMode) setJarvisMode('SPEAKING');
    setTimeout(() => {
      if (window.setJarvisMode) setJarvisMode('STANDBY');
      if (window.stopWaveform && !window.STATE?.micActive) stopWaveform();
    }, 4000);

  } catch (err) {
    console.error('Groq API Error:', err);

    // Friendly error messages
    let friendlyMsg = 'I encountered a system error, sir. ';

    if (err.message.includes('invalid_api_key') || err.message.includes('401')) {
      friendlyMsg += 'Your API key is invalid. Please visit console.groq.com to get a valid key.';
    } else if (err.message.includes('rate_limit') || err.message.includes('429')) {
      friendlyMsg += 'Rate limit reached. The free tier allows 30 requests per minute. Please wait a moment.';
    } else if (err.message.includes('model_not_found') || err.message.includes('404')) {
      friendlyMsg += 'Model not found. Switching to backup model now.';
      AI.model = 'mixtral-8x7b-32768';
      addChatMsg('system', 'SWITCHED TO BACKUP MODEL: MIXTRAL-8X7B');
    } else if (err.message.includes('Failed to fetch') || err.message.includes('network')) {
      friendlyMsg += 'Network connection failed. Please check your internet connection.';
    } else {
      friendlyMsg += 'Please try again in a moment. Error: ' + err.message.slice(0, 60);
    }

    addChatMsg('jarvis', friendlyMsg);
    addChatMsg('system', 'ERROR: ' + err.message.slice(0, 80));

    if (window.setJarvisMode) setJarvisMode('ALERT');
    setTimeout(() => {
      if (window.setJarvisMode) setJarvisMode('STANDBY');
    }, 3000);
  }
}

// ─────────────────────────────────────────
// PARSE HOLOGRAM COMMANDS FROM AI REPLY
// ─────────────────────────────────────────
function parseHoloCommands(reply) {
  if (!window.modelControl) return;

  if (reply.includes('rotat') || reply.includes('spinning'))
    modelControl('autorot');

  if (reply.includes('wireframe'))
    modelControl('wireframe');

  if (reply.includes('magnif') || reply.includes('zoom in') || reply.includes('closer'))
    modelControl('zoom_in');

  if (reply.includes('zoom out') || reply.includes('reducing zoom') || reply.includes('further'))
    modelControl('zoom_out');

  if (reply.includes('reset') || reply.includes('default position') || reply.includes('original'))
    modelControl('reset');

  if (reply.includes('holographic tint') || reply.includes('holo mode') || reply.includes('cyan'))
    modelControl('holo');

  if (reply.includes('solid view') || reply.includes('restoring material'))
    modelControl('solid');
}

// ─────────────────────────────────────────
// ADD MESSAGE TO CHAT LOG
// ─────────────────────────────────────────
function addChatMsg(role, text) {
  const log = document.getElementById('chatLog');
  if (!log) return;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + role;

  if (role === 'jarvis') {
    div.innerHTML = `<b>JARVIS:</b> ${text}`;
  } else if (role === 'user') {
    div.innerHTML = `<b>YOU:</b> ${text}`;
  } else {
    // system message
    div.style.color     = 'rgba(0,212,255,0.3)';
    div.style.fontSize  = '8px';
    div.style.textAlign = 'center';
    div.style.padding   = '1px 0';
    div.textContent     = text;
  }

  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
}

// ─────────────────────────────────────────
// VOICE INPUT → GROQ AI
// ─────────────────────────────────────────
function sendVoiceToAI(transcript) {
  const input = document.getElementById('aiInput');
  if (input) input.value = transcript;
  sendAIMessage();
}

// ─────────────────────────────────────────
// CLEAR CHAT HISTORY
// ─────────────────────────────────────────
function clearHistory() {
  AI.history  = [];
  AI.msgCount = 0;
  const log   = document.getElementById('chatLog');
  if (log) {
    log.innerHTML = '';
    addChatMsg('system', 'CONVERSATION HISTORY CLEARED');
    addChatMsg('jarvis', 'Memory wiped, sir. Starting fresh.');
  }
}

// ─────────────────────────────────────────
// SWITCH MODEL
// ─────────────────────────────────────────
function switchModel(model) {
  AI.model = model;
  addChatMsg('system', 'MODEL SWITCHED TO: ' + model.toUpperCase());
}

// ─────────────────────────────────────────
// ON PAGE LOAD — restore saved key
// ─────────────────────────────────────────
window.addEventListener('load', () => {
  // Pre-load TTS voices
  window.speechSynthesis && window.speechSynthesis.getVoices();

  if (AI.apiKey) {
    // Key already saved from previous session
    const input = document.getElementById('apiKeyInput');
    if (input) input.value = '••••••••••••••••••••';
    setTimeout(() => {
      addChatMsg('system', 'GROQ API KEY DETECTED — JARVIS FULLY ACTIVE');
      addChatMsg('jarvis',
        'Welcome back, sir. J.A.R.V.I.S. is online and connected to Groq. Llama 3.3 70B neural network ready.');
      if (window.speak)
        speak('Welcome back sir. All systems operational. Groq neural network connected.');
    }, 1500);
  } else {
    // No key yet — guide user
    setTimeout(() => {
      addChatMsg('system', 'NO API KEY FOUND — VISIT console.groq.com FOR FREE KEY');
      addChatMsg('jarvis',
        'Good day sir. I require a Groq API key to activate my full AI capabilities. Please obtain a free key from console.groq.com and paste it below.');
    }, 1500);
  }
});