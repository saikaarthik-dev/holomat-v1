// ═══════════════════════════════════════════
//   gesture.js — MediaPipe hand tracking
//   Holo Mat — Stark Industries
// ═══════════════════════════════════════════

const HoloGesture = (() => {
  let hands = null;
  let camera = null;
  let started = false;

  let latestFrame = null;
  let stableGesture = "none";
  let stableCount = 0;
  const stableThreshold = 3;
  const minDispatchGapMs = 120;
  let lastDispatchAt = 0;

  const callbacks = [];

  function onGesture(callback) {
    if (typeof callback === "function") callbacks.push(callback);
  }

  function emitGesture(payload) {
    callbacks.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.warn("Gesture callback error:", err);
      }
    });
  }

  function dist2D(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function fingerExtended(lm, tipIdx, pipIdx) {
    return lm[tipIdx].y < lm[pipIdx].y;
  }

  function isThumbOpen(lm) {
    return Math.abs(lm[4].x - lm[3].x) > 0.03;
  }

  function classifyGesture(lm) {
    const indexOpen = fingerExtended(lm, 8, 6);
    const middleOpen = fingerExtended(lm, 12, 10);
    const ringOpen = fingerExtended(lm, 16, 14);
    const pinkyOpen = fingerExtended(lm, 20, 18);
    const thumbOpen = isThumbOpen(lm);

    const extCount = [thumbOpen, indexOpen, middleOpen, ringOpen, pinkyOpen].filter(Boolean).length;

    const pinchDistance = dist2D(lm[4], lm[8]);
    const wristToIndex = dist2D(lm[0], lm[8]);
    const pinchRatio = wristToIndex > 0.001 ? pinchDistance / wristToIndex : 1;

    if (pinchRatio < 0.28 && indexOpen) return "pinch";
    if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen && !thumbOpen) return "fist";
    if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) return "peace";
    if (thumbOpen && pinkyOpen && !indexOpen && !middleOpen && !ringOpen) return "call";
    if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen) return "point";
    if (extCount >= 4) return "open";
    return "none";
  }

  function getPalmCenter(lm) {
    return {
      x: (lm[0].x + lm[5].x + lm[17].x) / 3,
      y: (lm[0].y + lm[5].y + lm[17].y) / 3,
    };
  }

  function toFrameData(results) {
    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) return null;
    const handA = results.multiHandLandmarks[0];
    const handB = results.multiHandLandmarks[1] || null;
    const lm = handA;
    const pinchDistance = dist2D(lm[4], lm[8]);
    const handCenterA = getPalmCenter(handA);
    const handCenterB = handB ? getPalmCenter(handB) : null;
    const interHandDistance = handCenterB ? dist2D(handCenterA, handCenterB) : null;
    return {
      landmarks: handA,
      handA,
      handB,
      rawGesture: classifyGesture(lm),
      pinchDistance,
      indexTip: lm[8],
      wrist: lm[0],
      handCenterA,
      handCenterB,
      interHandDistance,
      handCount: handB ? 2 : 1,
      handAGesture: classifyGesture(handA),
      handBGesture: handB ? classifyGesture(handB) : "none",
    };
  }

  function updateStableGesture(rawGesture) {
    if (rawGesture === stableGesture) {
      stableCount += 1;
    } else {
      stableGesture = rawGesture;
      stableCount = 1;
    }
    return stableCount >= stableThreshold ? stableGesture : "none";
  }

  function drawDebug(results) {
    const canvas = document.getElementById("handCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) return;

    const lm = results.multiHandLandmarks[0];
    if (window.drawConnectors && window.HAND_CONNECTIONS) {
      drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: "#00d4ff", lineWidth: 2 });
    }
    if (window.drawLandmarks) {
      drawLandmarks(ctx, lm, { color: "#00ff88", lineWidth: 1, radius: 2 });
    }
  }

  async function onResults(results) {
    drawDebug(results);
    latestFrame = toFrameData(results);
    if (!latestFrame) return;

    const now = Date.now();
    const smoothed = updateStableGesture(latestFrame.rawGesture);
    if (smoothed === "none") return;
    if (now - lastDispatchAt < minDispatchGapMs) return;
    lastDispatchAt = now;

    const isTwoHandOpen =
      latestFrame.handCount === 2 &&
      latestFrame.handAGesture === "open" &&
      latestFrame.handBGesture === "open";

    emitGesture({
      gesture: smoothed,
      rawGesture: latestFrame.rawGesture,
      pinchDistance: latestFrame.pinchDistance,
      indexTip: latestFrame.indexTip,
      wrist: latestFrame.wrist,
      landmarks: latestFrame.landmarks,
      handCount: latestFrame.handCount,
      handCenterA: latestFrame.handCenterA,
      handCenterB: latestFrame.handCenterB,
      interHandDistance: latestFrame.interHandDistance,
      handAGesture: latestFrame.handAGesture,
      handBGesture: latestFrame.handBGesture,
      isTwoHandOpen,
      at: now,
    });
  }

  async function start() {
    if (started) return { ok: true, reason: "already-started" };

    if (!window.Hands || !window.Camera) {
      return { ok: false, reason: "mediapipe-missing" };
    }

    const video = document.getElementById("handVideo");
    if (!video) return { ok: false, reason: "video-element-missing" };

    hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6,
    });
    hands.onResults(onResults);

    camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: 640,
      height: 360,
    });

    try {
      await camera.start();
      started = true;
      return { ok: true };
    } catch (err) {
      console.warn("Unable to start hand tracker:", err);
      return { ok: false, reason: "camera-start-failed", error: err };
    }
  }

  function getLatestFrame() {
    return latestFrame;
  }

  return { start, onGesture, getLatestFrame };
})();

window.HoloGesture = HoloGesture;
