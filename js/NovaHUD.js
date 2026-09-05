'use client';

import { useEffect, useRef, useState } from 'react';

export default function NovaHUD() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const recognitionRef = useRef(null);
  const particlesRef = useRef([]);
  const startTimeRef = useRef(Date.now());

  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState(
    'NOVA Online. Bereit für Ihre Befehle.'
  );
  const [error, setError] = useState('');

  const isListening = status === 'listening';

  /*
   * ============================================================
   * NOVA CORE
   * ============================================================
   */

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext('2d', {
      alpha: true,
      desynchronized: true
    });

    if (!ctx) return;

    let width = 0;
    let height = 0;
    let destroyed = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();

      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    /*
     * ------------------------------------------------------------
     * PARTICLES
     * ------------------------------------------------------------
     */

    const particleCount = window.innerWidth < 600 ? 260 : 420;

    if (particlesRef.current.length === 0) {
      particlesRef.current = Array.from(
        { length: particleCount },
        () => {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);

          return {
            theta,
            phi,

            radius:
              72 +
              Math.random() * 70,

            speed:
              0.00025 +
              Math.random() * 0.0007,

            size:
              0.5 +
              Math.random() * 1.8,

            brightness:
              0.25 +
              Math.random() * 0.75,

            offset:
              Math.random() * Math.PI * 2,

            layer:
              Math.random()
            };
        }
      );
    }

    /*
     * ------------------------------------------------------------
     * HELPERS
     * ------------------------------------------------------------
     */

    const project = (
      x,
      y,
      z,
      cx,
      cy,
      perspective
    ) => {
      const scale =
        perspective /
        (perspective + z);

      return {
        x: cx + x * scale,
        y: cy + y * scale,
        scale
      };
    };

    const drawGlowDot = (
      x,
      y,
      radius,
      alpha
    ) => {
      ctx.beginPath();

      ctx.fillStyle =
        `rgba(255, ${130 + Math.floor(alpha * 80)}, 35, ${alpha})`;

      ctx.shadowBlur = 18;

      ctx.shadowColor =
        `rgba(255, 150, 40, ${alpha})`;

      ctx.arc(
        x,
        y,
        radius,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.shadowBlur = 0;
    };

    const drawRing = (
      cx,
      cy,
      radius,
      rotation,
      opacity,
      widthValue,
      segments
    ) => {
      ctx.save();

      ctx.translate(cx, cy);
      ctx.rotate(rotation);

      ctx.beginPath();

      for (
        let i = 0;
        i < segments;
        i++
      ) {
        const angle =
          (Math.PI * 2 * i) /
          segments;

        const x =
          Math.cos(angle) *
          radius;

        const y =
          Math.sin(angle) *
          radius *
          0.42;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.strokeStyle =
        `rgba(255, 145, 45, ${opacity})`;

      ctx.lineWidth = widthValue;

      ctx.shadowBlur = 12;

      ctx.shadowColor =
        `rgba(255, 120, 30, ${opacity})`;

      ctx.stroke();

      ctx.restore();

      ctx.shadowBlur = 0;
    };

    /*
     * ------------------------------------------------------------
     * MAIN RENDER LOOP
     * ------------------------------------------------------------
     */

    const render = () => {
      if (destroyed) return;

      const now = Date.now();

      const elapsed =
        now - startTimeRef.current;

      const t =
        elapsed * 0.001;

      ctx.clearRect(
        0,
        0,
        width,
        height
      );

      const cx = width / 2;
      const cy = height / 2;

      const baseSize =
        Math.min(width, height) * 0.34;

      /*
       * --------------------------------------------------------
       * STATE INTENSITY
       * --------------------------------------------------------
       */

      let intensity = 0.65;

      if (status === 'listening') {
        intensity = 1.2;
      }

      if (status === 'thinking') {
        intensity = 1.35;
      }

      if (status === 'speaking') {
        intensity =
          0.95 +
          Math.sin(t * 9) * 0.25;
      }

      if (status === 'success') {
        intensity =
          1 +
          Math.sin(t * 14) * 0.5;
      }

      if (status === 'error') {
        intensity = 0.4;
      }

      /*
       * --------------------------------------------------------
       * BACKGROUND RADIAL GLOW
       * --------------------------------------------------------
       */

      const gradient =
        ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          baseSize * 2
        );

      gradient.addColorStop(
        0,
        `rgba(255, 150, 45, ${
          0.17 * intensity
        })`
      );

      gradient.addColorStop(
        0.35,
        `rgba(255, 100, 25, ${
          0.08 * intensity
        })`
      );

      gradient.addColorStop(
        1,
        'rgba(0,0,0,0)'
      );

      ctx.fillStyle = gradient;

      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      /*
       * --------------------------------------------------------
       * OUTER TECHNICAL RINGS
       * --------------------------------------------------------
       */

      drawRing(
        cx,
        cy,
        baseSize * 1.45,
        t * 0.11,
        0.34 * intensity,
        1,
        160
      );

      drawRing(
        cx,
        cy,
        baseSize * 1.25,
        -t * 0.17,
        0.46 * intensity,
        1.2,
        120
      );

      drawRing(
        cx,
        cy,
        baseSize * 1.05,
        t * 0.26,
        0.6 * intensity,
        1.5,
        100
      );

      /*
       * --------------------------------------------------------
       * SEGMENTED HUD ARCS
       * --------------------------------------------------------
       */

      ctx.save();

      ctx.translate(cx, cy);

      ctx.rotate(t * 0.2);

      for (
        let i = 0;
        i < 12;
        i++
      ) {
        const angle =
          (Math.PI * 2 * i) / 12;

        const length =
          i % 3 === 0
            ? baseSize * 0.18
            : baseSize * 0.07;

        const radius =
          baseSize * 1.42;

        ctx.beginPath();

        ctx.moveTo(
          Math.cos(angle) *
            radius,
          Math.sin(angle) *
            radius
        );

        ctx.lineTo(
          Math.cos(angle) *
            (radius + length),
          Math.sin(angle) *
            (radius + length)
        );

        ctx.strokeStyle =
          `rgba(255, 160, 60, ${
            i % 3 === 0
              ? 0.55
              : 0.25
          })`;

        ctx.lineWidth =
          i % 3 === 0 ? 2 : 1;

        ctx.stroke();
      }

      ctx.restore();

      /*
       * --------------------------------------------------------
       * 3D PARTICLE SPHERE
       * --------------------------------------------------------
       */

      const rotationY =
        t *
        (status === 'thinking'
          ? 0.8
          : 0.35);

      const rotationX =
        Math.sin(t * 0.23) *
        0.15;

      particlesRef.current.forEach(
        particle => {
          let theta =
            particle.theta +
            t *
            particle.speed *
            1200;

          let phi =
            particle.phi;

          const r =
            particle.radius;

          let x =
            r *
            Math.sin(phi) *
            Math.cos(theta);

          let y =
            r *
            Math.cos(phi);

          let z =
            r *
            Math.sin(phi) *
            Math.sin(theta);

          /*
           * Rotate around Y
           */

          const cosY =
            Math.cos(rotationY);

          const sinY =
            Math.sin(rotationY);

          const rotatedX =
            x * cosY -
            z * sinY;

          const rotatedZ =
            x * sinY +
            z * cosY;

          x = rotatedX;
          z = rotatedZ;

          /*
           * Rotate around X
           */

          const cosX =
            Math.cos(rotationX);

          const sinX =
            Math.sin(rotationX);

          const rotatedY =
            y * cosX -
            z * sinX;

          const rotatedZ2 =
            y * sinX +
            z * cosX;

          y = rotatedY;
          z = rotatedZ2;

          /*
           * Listening reaction
           */

          if (
            status === 'listening'
          ) {
            const wave =
              Math.sin(
                t * 5 +
                particle.offset
              ) * 5;

            x +=
              (x / r) *
              wave;

            y +=
              (y / r) *
              wave;

            z +=
              (z / r) *
              wave;
          }

          const point =
            project(
              x,
              y,
              z,
              cx,
              cy,
              430
            );

          if (
            point.scale <= 0
          ) {
            return;
          }

          const depth =
            Math.max(
              0.15,
              Math.min(
                1,
                (z + r) /
                  (2 * r)
              )
            );

          const alpha =
            particle.brightness *
            depth *
            intensity;

          const size =
            particle.size *
            point.scale;

          drawGlowDot(
            point.x,
            point.y,
            size,
            Math.min(
              alpha,
              1
            )
          );
        }
      );

      /*
       * --------------------------------------------------------
       * INTERNAL ENERGY RINGS
       * --------------------------------------------------------
       */

      drawRing(
        cx,
        cy,
        baseSize * 0.68,
        -t * 0.8,
        0.7 * intensity,
        1.4,
        90
      );

      drawRing(
        cx,
        cy,
        baseSize * 0.48,
        t * 1.1,
        0.85 * intensity,
        2,
        70
      );

      /*
       * --------------------------------------------------------
       * CORE ENERGY
       * --------------------------------------------------------
       */

      const pulse =
        1 +
        Math.sin(
          t *
          (
            status === 'thinking'
              ? 10
              : 4
          )
        ) *
        0.08 *
        intensity;

      const coreRadius =
        baseSize *
        0.18 *
        pulse;

      const coreGradient =
        ctx.createRadialGradient(
          cx,
          cy,
          0,
          cx,
          cy,
          coreRadius * 2.4
        );

      coreGradient.addColorStop(
        0,
        'rgba(255,245,190,1)'
      );

      coreGradient.addColorStop(
        0.12,
        'rgba(255,205,100,0.98)'
      );

      coreGradient.addColorStop(
        0.35,
        'rgba(255,125,25,0.75)'
      );

      coreGradient.addColorStop(
        0.7,
        'rgba(255,70,10,0.18)'
      );

      coreGradient.addColorStop(
        1,
        'rgba(255,50,0,0)'
      );

      ctx.beginPath();

      ctx.fillStyle =
        coreGradient;

      ctx.shadowBlur = 35;

      ctx.shadowColor =
        'rgba(255,125,25,0.8)';

      ctx.arc(
        cx,
        cy,
        coreRadius * 1.7,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.shadowBlur = 0;

      /*
       * --------------------------------------------------------
       * ENERGY BEAMS
       * --------------------------------------------------------
       */

      if (
        status === 'thinking' ||
        status === 'listening'
      ) {
        for (
          let i = 0;
          i < 8;
          i++
        ) {
          const angle =
            t *
            (0.4 + i * 0.05) +
            i;

          const inner =
            coreRadius * 1.2;

          const outer =
            baseSize *
            (0.8 + Math.sin(t + i) * 0.15);

          ctx.beginPath();

          ctx.moveTo(
            cx +
              Math.cos(angle) *
                inner,
            cy +
              Math.sin(angle) *
                inner
          );

          ctx.lineTo(
            cx +
              Math.cos(angle) *
                outer,
            cy +
              Math.sin(angle) *
                outer
          );

          ctx.strokeStyle =
            `rgba(255,145,40,${
              0.12 +
              Math.random() *
                0.18
            })`;

          ctx.lineWidth = 1;

          ctx.stroke();
        }
      }

      /*
       * --------------------------------------------------------
       * FRAME CORNERS
       * --------------------------------------------------------
       */

      const frame =
        baseSize * 1.65;

      ctx.strokeStyle =
        'rgba(255,145,45,0.28)';

      ctx.lineWidth = 1;

      const corner =
        25;

      // top left

      ctx.beginPath();

      ctx.moveTo(
        cx - frame,
        cy - frame + corner
      );

      ctx.lineTo(
        cx - frame,
        cy - frame
      );

      ctx.lineTo(
        cx - frame + corner,
        cy - frame
      );

      ctx.stroke();

      // top right

      ctx.beginPath();

      ctx.moveTo(
        cx + frame - corner,
        cy - frame
      );

      ctx.lineTo(
        cx + frame,
        cy - frame
      );

      ctx.lineTo(
        cx + frame,
        cy - frame + corner
      );

      ctx.stroke();

      // bottom left

      ctx.beginPath();

      ctx.moveTo(
        cx - frame,
        cy + frame - corner
      );

      ctx.lineTo(
        cx - frame,
        cy + frame
      );

      ctx.lineTo(
        cx - frame + corner,
        cy + frame
      );

      ctx.stroke();

      // bottom right

      ctx.beginPath();

      ctx.moveTo(
        cx + frame - corner,
        cy + frame
      );

      ctx.lineTo(
        cx + frame,
        cy + frame
      );

      ctx.lineTo(
        cx + frame,
        cy + frame - corner
      );

      ctx.stroke();

      /*
       * --------------------------------------------------------
       * CLEANUP
       * --------------------------------------------------------
       */

      animationRef.current =
        requestAnimationFrame(
          render
        );
    };

    animationRef.current =
      requestAnimationFrame(
        render
      );

    return () => {
      destroyed = true;

      if (
        animationRef.current
      ) {
        cancelAnimationFrame(
          animationRef.current
        );
      }

      resizeObserver.disconnect();
    };
  }, [status]);

  /*
   * ============================================================
   * VOICE
   * ============================================================
   */

  const startListening = () => {
    if (
      typeof window === 'undefined'
    ) {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        'Die Spracherkennung wird von diesem Browser nicht unterstützt.'
      );

      setStatus('error');

      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = 'de-DE';

    recognition.continuous = false;

    recognition.interimResults = true;

    recognition.maxAlternatives = 1;

    recognitionRef.current =
      recognition;

    setTranscript('');

    setError('');

    setStatus('listening');

    recognition.onresult = event => {
      let finalText = '';
      let interimText = '';

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        const text =
          event.results[i][0].transcript;

        if (
          event.results[i].isFinal
        ) {
          finalText += text;
        } else {
          interimText += text;
        }
      }

      setTranscript(
        finalText ||
        interimText
      );

      if (finalText.trim()) {
        askNova(
          finalText.trim()
        );
      }
    };

    recognition.onerror = event => {
      setStatus('error');

      setError(
        event.error ===
          'not-allowed'
          ? 'Der Mikrofonzugriff wurde nicht erlaubt.'
          : 'Die Spracherkennung konnte nicht gestartet werden.'
      );
    };

    recognition.onend = () => {
      if (
        status === 'listening'
      ) {
        setStatus('idle');
      }
    };

    try {
      recognition.start();
    } catch {
      setStatus('error');

      setError(
        'Das Mikrofon konnte nicht gestartet werden.'
      );
    }
  };

  const stopListening = () => {
    if (
      recognitionRef.current
    ) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    setStatus('idle');
  };

  /*
   * ============================================================
   * API
   * ============================================================
   */

  const askNova = async userText => {
    if (!userText?.trim()) {
      return;
    }

    setStatus('thinking');

    setError('');

    setResponse(
      'NOVA analysiert Ihre Anfrage...'
    );

    try {
      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () => controller.abort(),
          60000
        );

      const res =
        await fetch(
          '/api/chat',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body: JSON.stringify({
              messages: [
                {
                  role: 'user',
                  content:
                    userText.trim()
                }
              ]
            }),

            signal:
              controller.signal
          }
        );

      clearTimeout(timeout);

      if (!res.ok) {
        throw new Error(
          `API ${res.status}`
        );
      }

      const data =
        await res.json();

      /*
       * Unterstützt mehrere verbreitete
       * Response-Strukturen.
       */

      const reply =
        data?.choices?.[0]?.message
          ?.content ||
        data?.message?.content ||
        data?.reply ||
        data?.response ||
        data?.content;

      if (
        !reply ||
        typeof reply !==
          'string'
      ) {
        throw new Error(
          'Ungültige Antwort vom KI-Backend.'
        );
      }

      setResponse(reply);

      setStatus('speaking');

      speak(reply);

      setTimeout(() => {
        setStatus(
          current =>
            current ===
            'speaking'
              ? 'idle'
              : current
        );
      }, 1500);
    } catch (err) {
      console.error(
        'NOVA API ERROR:',
        err
      );

      setStatus('error');

      setError(
        err?.name ===
          'AbortError'
          ? 'Die Verbindung zu NOVA hat zu lange gedauert.'
          : 'Ich konnte gerade keine Verbindung zu meinem KI-Backend herstellen.'
      );

      setResponse(
        'Die Verbindung zum NOVA-Backend konnte nicht hergestellt werden.'
      );
    }
  };

  /*
   * ============================================================
   * TEXT TO SPEECH
   * ============================================================
   */

  const speak = text => {
    if (
      typeof window ===
      'undefined'
    ) {
      return;
    }

    if (
      !('speechSynthesis' in window)
    ) {
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        text
      );

    utterance.lang = 'de-DE';

    utterance.rate = 1;

    utterance.pitch = 0.9;

    utterance.volume = 1;

    utterance.onstart = () => {
      setStatus('speaking');
    };

    utterance.onend = () => {
      setStatus('idle');
    };

    utterance.onerror = () => {
      setStatus('idle');
    };

    window.speechSynthesis.speak(
      utterance
    );
  };

  /*
   * ============================================================
   * CLICK
   * ============================================================
   */

  const handleCoreClick = () => {
    if (
      status === 'listening'
    ) {
      stopListening();

      return;
    }

    if (
      status === 'thinking' ||
      status === 'speaking'
    ) {
      return;
    }

    startListening();
  };

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  return (
    <main className="nova-page">
      <div className="nova-grid" />

      <div className="nova-vignette" />

      <header className="nova-header">
        <div>
          <div className="nova-brand">
            N.O.V.A.
          </div>

          <div className="nova-subtitle">
            NEURAL OPERATING
            VIRTUAL ASSISTANT
          </div>
        </div>

        <div className="nova-status">
          <span
            className={
              `status-dot ${status}`
            }
          />

          {status === 'idle' &&
            'ONLINE'}

          {status === 'listening' &&
            'LISTENING'}

          {status === 'thinking' &&
            'PROCESSING'}

          {status === 'speaking' &&
            'SPEAKING'}

          {status === 'success' &&
            'SUCCESS'}

          {status === 'error' &&
            'ERROR'}
        </div>
      </header>

      <section className="nova-stage">
        <div
          className={
            `nova-core ${
              status
            }`
          }
          onClick={
            handleCoreClick
          }
          role="button"
          tabIndex={0}
          onKeyDown={event => {
            if (
              event.key ===
              'Enter'
            ) {
              handleCoreClick();
            }
          }}
        >
          <canvas
            ref={canvasRef}
          />

          <div className="core-label">
            <span>NOVA</span>

            <small>
              {status ===
                'idle' &&
                'SYSTEM READY'}

              {status ===
                'listening' &&
                'LISTENING'}

              {status ===
                'thinking' &&
                'PROCESSING'}

              {status ===
                'speaking' &&
                'RESPONDING'}

              {status ===
                'error' &&
                'SYSTEM ERROR'}
            </small>
          </div>
        </div>

        <div className="voice-hint">
          {status ===
          'listening'
            ? 'NOVA hört zu …'
            : status ===
                'thinking'
              ? 'NOVA denkt …'
              : status ===
                  'speaking'
                ? 'NOVA spricht …'
                : 'Core berühren, um zu sprechen'}
        </div>
      </section>

      <section className="nova-console">
        <div className="console-line">
          <span>INPUT</span>

          <strong>
            {transcript ||
              '—'}
          </strong>
        </div>

        <div className="console-divider" />

        <div className="console-response">
          {response}
        </div>

        {error && (
          <div className="console-error">
            {error}
          </div>
        )}
      </section>

      <div className="nova-footer">
        <span>
          CORE ACTIVE
        </span>

        <span>
          SECURE CHANNEL
        </span>

        <span>
          {typeof navigator !==
            'undefined' &&
          navigator.onLine
            ? 'NETWORK ONLINE'
            : 'OFFLINE'}
        </span>
      </div>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .nova-page {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          background:
            radial-gradient(
              circle at center,
              #1a0c04 0%,
              #090604 35%,
              #020202 72%,
              #000 100%
            );
          color: #f5c27a;
          font-family:
            Inter,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            sans-serif;
          display: flex;
          flex-direction: column;
          isolation: isolate;
        }

        .nova-grid {
          position: absolute;
          inset: 0;
          opacity: 0.12;
          background-image:
            linear-gradient(
              rgba(255, 130, 30, 0.16)
              1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255, 130, 30, 0.16)
              1px,
              transparent 1px
            );
          background-size:
            45px 45px;
          mask-image:
            radial-gradient(
              circle,
              black 10%,
              transparent 80%
            );
          pointer-events: none;
          z-index: -2;
        }

        .nova-vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              circle,
              transparent 35%,
              rgba(0, 0, 0, 0.75) 100%
            );
          pointer-events: none;
          z-index: -1;
        }

        .nova-header {
          position: relative;
          z-index: 5;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding:
            max(24px, env(safe-area-inset-top))
            24px
            10px;
        }

        .nova-brand {
          letter-spacing: 0.32em;
          font-size: 20px;
          font-weight: 700;
          color: #ffd28e;
          text-shadow:
            0 0 14px
              rgba(255, 125, 25, 0.55);
        }

        .nova-subtitle {
          margin-top: 6px;
          font-size: 8px;
          letter-spacing: 0.24em;
          color: rgba(
            255,
            177,
            83,
            0.55
          );
        }

        .nova-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 9px;
          letter-spacing: 0.18em;
          color: rgba(
            255,
            190,
            105,
            0.7
          );
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff9b35;
          box-shadow:
            0 0 12px
              rgba(255, 140, 40, 0.9);
          animation:
            statusPulse
            1.8s
            ease-in-out
            infinite;
        }

        .status-dot.listening {
          background: #ffe2a8;
        }

        .status-dot.thinking {
          animation-duration: 0.45s;
        }

        .status-dot.error {
          background: #ff4a32;
          box-shadow:
            0 0 14px
              rgba(255, 50, 30, 0.9);
        }

        .nova-stage {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 0;
        }

        .nova-core {
          position: relative;
          width: min(
            92vw,
            680px
          );
          aspect-ratio: 1;
          cursor: pointer;
          touch-action: manipulation;
          user-select: none;
          transition:
            transform 0.3s ease,
            filter 0.3s ease;
        }

        .nova-core:hover {
          transform: scale(1.015);
        }

        .nova-core:active {
          transform: scale(0.985);
        }

        .nova-core canvas {
          width: 100%;
          height: 100%;
          display: block;
        }

        .core-label {
          position: absolute;
          left: 50%;
          top: 50%;
          transform:
            translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
          text-align: center;
        }

        .core-label span {
          font-size: clamp(
            17px,
            4vw,
            28px
          );
          font-weight: 300;
          letter-spacing: 0.45em;
          margin-left: 0.45em;
          color: #fff1d1;
          text-shadow:
            0 0 20px
              rgba(255, 166, 68, 0.9);
        }

        .core-label small {
          margin-top: 8px;
          font-size: 7px;
          letter-spacing: 0.3em;
          color: rgba(
            255,
            198,
            120,
            0.7
          );
        }

        .voice-hint {
          margin-top: -4px;
          min-height: 18px;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(
            255,
            190,
            110,
            0.6
          );
          text-align: center;
        }

        .nova-console {
          position: relative;
          z-index: 5;
          width: min(
            calc(100% - 32px),
            700px
          );
          margin:
            0 auto
            max(18px, env(safe-area-inset-bottom));
          padding: 16px 18px;
          border: 1px solid
            rgba(
              255,
              139,
              46,
              0.2
            );
          background:
            rgba(
              15,
              7,
              2,
              0.72
            );
          backdrop-filter:
            blur(18px);
          box-shadow:
            0 0 40px
              rgba(
                255,
                100,
                20,
                0.06
              );
        }

        .console-line {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          font-size: 11px;
        }

        .console-line span {
          color: #b87332;
          letter-spacing: 0.16em;
          flex-shrink: 0;
        }

        .console-line strong {
          color: #f2d4aa;
          font-weight: 400;
          overflow-wrap: anywhere;
        }

        .console-divider {
          height: 1px;
          margin: 12px 0;
          background:
            linear-gradient(
              90deg,
              transparent,
              rgba(
                255,
                145,
                45,
                0.28
              ),
              transparent
            );
        }

        .console-response {
          min-height: 22px;
          font-size: 13px;
          line-height: 1.55;
          color: #fff4e2;
        }

        .console-error {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid
            rgba(
              255,
              70,
              40,
              0.2
            );
          font-size: 11px;
          line-height: 1.5;
          color: #ff967c;
        }

        .nova-footer {
          display: flex;
          justify-content: center;
          gap: 24px;
          padding:
            0
            20px
            max(18px, env(safe-area-inset-bottom));
          font-size: 7px;
          letter-spacing: 0.22em;
          color: rgba(
            255,
            165,
            85,
            0.35
          );
        }

        @keyframes statusPulse {
          0%,
          100% {
            opacity: 0.45;
            transform: scale(0.85);
          }

          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        @media (max-width: 600px) {
          .nova-header {
            padding-left: 16px;
            padding-right: 16px;
          }

          .nova-subtitle {
            display: none;
          }

          .nova-brand {
            font-size: 16px;
          }

          .nova-status {
            font-size: 8px;
          }

          .nova-core {
            width: 105vw;
            max-width: 620px;
          }

          .nova-console {
            width: calc(100% - 24px);
            padding: 13px 14px;
          }

          .nova-footer {
            gap: 12px;
            font-size: 6px;
          }
        }

        @media (
          prefers-reduced-motion: reduce
        ) {
          .status-dot {
            animation: none;
          }

          .nova-core {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}