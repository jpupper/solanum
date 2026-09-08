/**
 * SOLANUM - Dynamic Header, Footer & Global Interactions
 */

function renderHeader() {
  const headerElement = document.querySelector(".header");
  if (!headerElement) return;

  const currentPath = window.location.pathname.toLowerCase();
  const isNosotros = currentPath.includes("nosotros.html") || document.body.dataset.page === "nosotros";
  const isSoluciones = currentPath.includes("soluciones.html") || document.body.dataset.page === "soluciones";
  const isContacto = currentPath.includes("contacto.html") || document.body.dataset.page === "contacto";

  headerElement.innerHTML = `
    <div class="container flex justify-between items-center">
      <a href="index.html" class="logo-link" aria-label="Ir al inicio de Solanum">
        <img src="assets/header/logoheader.png" alt="Solanum Logo" class="logo-header">
      </a>
      <nav class="nav-menu flex gap-sm" aria-label="Navegación principal">
        <a href="nosotros.html" class="nav-link ${isNosotros ? 'active' : ''}">Nosotros</a>
        <a href="soluciones.html" class="nav-link ${isSoluciones ? 'active' : ''}">Soluciones</a>
        <a href="contacto.html" class="nav-link ${isContacto ? 'active' : ''}">Contacto</a>
      </nav>
    </div>
  `;
}

function renderFooter() {
  const footerElement = document.querySelector(".footer");
  if (!footerElement) return;

  footerElement.innerHTML = `
    <div class="container footer-grid">
      <div class="footer-col">
        <a href="index.html">
          <img src="assets/header/logoheader.png" alt="Solanum Logo" class="logo-footer">
        </a>
        <p class="logo-tagline">Agronomía, tractores y drones</p>
      </div>

      <div class="footer-col">
        <h4>ENLACE</h4>
        <a href="index.html">Inicio</a>
        <a href="nosotros.html">Nosotros</a>
        <a href="soluciones.html">Soluciones</a>
        <a href="contacto.html">Contacto</a>
        <a href="juego.html">Juego</a>
      </div>

      <div class="footer-col">
        <h4>CONTACTO</h4>
        <p>Av. Paula Albarracín<br>
          de Sarmiento, San Juan<br>
          0264 456-5402<br>
          info@solanum.com.ar</p>
      </div>

      <div class="footer-col">
        <h4>SEGUINOS</h4>
        <div class="social-links">
          <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><img src="assets/footer/ig.png" alt="Instagram"></a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><img src="assets/footer/youtube.png" alt="YouTube"></a>
          <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><img src="assets/footer/linkedin.png" alt="LinkedIn"></a>
        </div>
      </div>
    </div>
  `;
}

function initScrollAnimations() {
  const reveals = document.querySelectorAll(".reveal");
  if (!reveals.length) return;

  const revealOptions = {
    threshold: 0.08,
    rootMargin: "0px 0px -40px 0px"
  };

  const revealOnScroll = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("active");
        observer.unobserve(entry.target);
      }
    });
  }, revealOptions);

  reveals.forEach(reveal => {
    revealOnScroll.observe(reveal);
  });
}

function renderFloatingWsp() {
  if (document.querySelector(".floating-wsp")) return;
  const wspBtn = document.createElement("a");
  wspBtn.href = "https://wa.me/5492644565402";
  wspBtn.target = "_blank";
  wspBtn.rel = "noopener noreferrer";
  wspBtn.className = "floating-wsp";
  wspBtn.setAttribute("aria-label", "Hablar con un asesor por WhatsApp");
  wspBtn.innerHTML = `
    <img src="assets/drones/whatsappicon.png" alt="WhatsApp">
    <span>Hablar con un asesor</span>
  `;
  document.body.appendChild(wspBtn);
}

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
  renderFloatingWsp();
  initScrollAnimations();
  initYouTubeBackgrounds();
  initInteractiveDrones();
});

/* YT Loop Fix */
function initYouTubeBackgrounds() {
  const iframes = document.querySelectorAll('iframe[src*="youtube.com"]');
  if (iframes.length === 0) return;

  iframes.forEach(iframe => {
    if (!iframe.src.includes('enablejsapi=1')) {
      iframe.src += '&enablejsapi=1';
    }
  });

  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  if (firstScriptTag) {
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  } else {
    document.head.appendChild(tag);
  }

  window.onYouTubeIframeAPIReady = function() {
    iframes.forEach(iframe => {
      let interval;
      new YT.Player(iframe, {
        events: {
          'onStateChange': function(event) {
            if (event.data === YT.PlayerState.PLAYING) {
              if (interval) clearInterval(interval);
              interval = setInterval(() => {
                const duration = event.target.getDuration();
                const currentTime = event.target.getCurrentTime();
                if (duration > 0 && duration - currentTime < 0.3) {
                  event.target.seekTo(0);
                }
              }, 100);
            } else {
              if (interval) clearInterval(interval);
            }
          }
        }
      });
    });
  }
}

/* ==========================================================================
   INTERACTIVE FLYING DRONE
   - Pequeño dron blanco que vuela hacia la posición donde haces click
   - Sigue el cursor mientras mantienes presionado
   - Hélices ("alas") giratorias activas con efecto de sustentación
   - Flotación sutil con viento (arriba y abajo) al quedarse quieto
   - Al soltar el click, el dron acelera y sale de la pantalla
   - Cero efectos de shader sobre el fondo
   ========================================================================== */
function initInteractiveDrones() {
  const targets = document.querySelectorAll(
    ".como-trabajamos, .significa-section, .beneficios-section, .compromiso, .contacto-info"
  );
  if (!targets.length) return;

  targets.forEach(section => {
    // Evitar inicialización duplicada
    if (section.querySelector(".section-drone-canvas")) return;

    const canvas = document.createElement("canvas");
    canvas.className = "section-drone-canvas";
    canvas.setAttribute("aria-hidden", "true");
    section.insertBefore(canvas, section.firstChild);

    setupDroneOnCanvas(canvas, section);
  });
}

function setupDroneOnCanvas(canvas, section) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let animId = null;
  let isSectionVisible = false;
  let idleTimer = null;
  let autoHoverTimer = null;
  let charItems = [];

  // Estado del Dron
  const drone = {
    x: -150,
    y: -150,
    targetX: -150,
    targetY: -150,
    vx: 0,
    vy: 0,
    tilt: 0,
    propAngle: 0,
    state: "IDLE", // 'IDLE' | 'FLYING' | 'HOVERING' | 'EXITING' | 'AUTO_FLYING' | 'AUTO_HOVERING' | 'AUTO_EXITING'
    isPressed: false,
    exitVx: 0,
    exitVy: 0,
    scale: 0.95
  };

  // Preparar todas las letras de los textos en la sección para el efecto de viento
  function prepareWindLetters() {
    const textContainers = section.querySelectorAll("h1, h2, h3, h4, p, li, .trabajamos-eyebrow, .significa-eyebrow");
    textContainers.forEach(container => {
      if (container.dataset.windPrepared === "true" || container.closest("a, button, .btn-main, .btn-secondary")) return;
      container.dataset.windPrepared = "true";

      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      const textNodes = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue && node.nodeValue.trim().length > 0) {
          textNodes.push(node);
        }
      }

      textNodes.forEach(textNode => {
        const text = textNode.nodeValue;
        const frag = document.createDocumentFragment();
        for (let i = 0; i < text.length; i++) {
          const ch = text[i];
          if (ch === " " || ch === "\n" || ch === "\t") {
            frag.appendChild(document.createTextNode(ch));
          } else {
            const span = document.createElement("span");
            span.className = "drone-wind-char";
            span.textContent = ch;
            frag.appendChild(span);
          }
        }
        textNode.parentNode.replaceChild(frag, textNode);
      });
    });
  }

  function cacheCharPositions() {
    const sRect = section.getBoundingClientRect();
    const spans = section.querySelectorAll(".drone-wind-char");
    charItems = [];
    spans.forEach(span => {
      const r = span.getBoundingClientRect();
      charItems.push({
        span: span,
        x: (r.left + r.right) / 2 - sRect.left,
        y: (r.top + r.bottom) / 2 - sRect.top,
        isBlown: false
      });
    });
  }

  function resetBlownLetters() {
    for (let i = 0; i < charItems.length; i++) {
      if (charItems[i].isBlown) {
        charItems[i].span.style.transform = "";
        charItems[i].isBlown = false;
      }
    }
  }

  prepareWindLetters();

  function resize() {
    const rect = section.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cacheCharPositions();
  }

  resize();

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => resize());
    ro.observe(section);
  } else {
    window.addEventListener("resize", resize);
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      cacheCharPositions();
    });
  }

  // Obtener posición JUSTO A LA IZQUIERDA del elemento de título (pegado al texto, no al borde de la página)
  function getTitleTarget() {
    const titleEl = section.querySelector(
      ".significa-title.reveal.active, .significa-title.reveal, .significa-title, .trabajamos-titulo, .beneficios-title, .section-title, h2, h1, [class*='titulo'], [class*='title']"
    ) || section.querySelector("p");

    if (!titleEl) {
      return { x: 70, y: height * 0.35 };
    }

    const sRect = section.getBoundingClientRect();
    const tRect = titleEl.getBoundingClientRect();

    // Posicionarse JUSTO A LA IZQUIERDA pegado al texto del título, NO a la izquierda de la página
    const titleLeftInCanvas = tRect.left - sRect.left;
    
    // Dron situado ~44px a la izquierda del inicio exacto del texto del título
    let tx = titleLeftInCanvas - 44;

    // Si la pantalla es muy estrecha o el margen es pequeño, mantenerlo visible en el canvas
    if (tx < 35) {
      tx = Math.max(28, titleLeftInCanvas - 34);
    }

    // Centrado verticalmente con la primera línea del texto del título
    const firstLineOffset = Math.min(36, tRect.height * 0.38);
    let ty = (tRect.top - sRect.top) + firstLineOffset;

    tx = Math.max(25, Math.min(width - 35, tx));
    ty = Math.max(30, Math.min(height - 30, ty));

    return { x: tx, y: ty };
  }

  function startAnimation() {
    if (!animId) {
      animId = requestAnimationFrame(loop);
    }
  }

  function stopAnimation() {
    if (animId) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    resetBlownLetters();
    ctx.clearRect(0, 0, width, height);
  }

  function clearAutoTimers() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    if (autoHoverTimer) {
      clearTimeout(autoHoverTimer);
      autoHoverTimer = null;
    }
  }

  // Programa el patrullaje automático (por defecto cada 5 segundos, o delay inicial)
  function scheduleNextPatrol(delay = 5000) {
    clearAutoTimers();
    if (!isSectionVisible || drone.isPressed) return;
    idleTimer = setTimeout(() => {
      startAutoPatrol();
    }, delay);
  }

  function startAutoPatrol() {
    if (!isSectionVisible || drone.isPressed || drone.state !== "IDLE") return;

    // Se posiciona SIEMPRE al lado del título principal
    const titlePos = getTitleTarget();
    drone.targetX = titlePos.x;
    drone.targetY = titlePos.y;

    // Entrada exterior veloz desde arriba
    drone.x = titlePos.x + (Math.random() > 0.5 ? 90 : -90);
    drone.y = -70;

    drone.vx = (titlePos.x - drone.x) * 0.04;
    drone.vy = (titlePos.y - drone.y) * 0.04;
    drone.tilt = drone.vx * 0.04;
    drone.state = "AUTO_FLYING";
    startAnimation();
  }

  // Interacción manual (click del usuario - máxima prioridad)
  function onPointerDown(clientX, clientY, isLinkOrBtn) {
    clearAutoTimers();
    if (!isLinkOrBtn) {
      window.getSelection()?.removeAllRanges();
    }
    if (charItems.length === 0) {
      cacheCharPositions();
    }

    const rect = section.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    drone.targetX = px;
    drone.targetY = py;
    drone.isPressed = true;

    // Si estaba inactivo o saliendo, aparece velozmente hacia el click
    if (drone.state === "IDLE" || drone.state === "EXITING" || drone.state === "AUTO_EXITING") {
      drone.x = px + (Math.random() > 0.5 ? 80 : -80);
      drone.y = -60;
      drone.vx = (px - drone.x) * 0.05;
      drone.vy = 8;
      drone.tilt = drone.vx * 0.04;
    }

    drone.state = "FLYING";
    startAnimation();
  }

  function onPointerMove(clientX, clientY) {
    if (drone.isPressed) {
      const rect = section.getBoundingClientRect();
      drone.targetX = clientX - rect.left;
      drone.targetY = clientY - rect.top;
      drone.state = "FLYING";
    }
  }

  function onPointerUp() {
    if (drone.isPressed) {
      drone.isPressed = false;
      drone.state = "EXITING";
      // Impulso de aceleración para salir de la pantalla
      drone.exitVx = (drone.vx >= 0 ? 1 : -1) * (5 + Math.random() * 3);
      drone.exitVy = -11 - Math.random() * 4;
      resetBlownLetters();
    }
  }

  section.addEventListener("mousedown", (e) => {
    const isLinkOrBtn = Boolean(e.target.closest("a, button"));
    if (!isLinkOrBtn) {
      e.preventDefault();
    }
    onPointerDown(e.clientX, e.clientY, isLinkOrBtn);
  });

  section.addEventListener("mousemove", (e) => {
    onPointerMove(e.clientX, e.clientY);
  });

  section.addEventListener("mouseleave", () => {
    onPointerUp();
  });

  window.addEventListener("mouseup", () => {
    onPointerUp();
  });

  section.addEventListener("touchstart", (e) => {
    if (e.touches.length > 0) {
      const isLinkOrBtn = Boolean(e.target.closest("a, button"));
      onPointerDown(e.touches[0].clientX, e.touches[0].clientY, isLinkOrBtn);
    }
  }, { passive: true });

  section.addEventListener("touchmove", (e) => {
    if (e.touches.length > 0) {
      onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  window.addEventListener("touchend", () => {
    onPointerUp();
  });

  // Bucle principal de animación
  function loop(timestamp) {
    if (!isSectionVisible) {
      animId = null;
      return;
    }

    const t = timestamp * 0.001;
    ctx.clearRect(0, 0, width, height);

    // Rotación continua de las hélices ("alas")
    drone.propAngle += 0.65;

    // FÍSICA Y MOVIMIENTO
    if (drone.state === "FLYING" || drone.state === "AUTO_FLYING") {
      const dx = drone.targetX - drone.x;
      const dy = drone.targetY - drone.y;
      const dist = Math.hypot(dx, dy);

      // Aceleración hacia el objetivo
      drone.vx += dx * 0.075;
      drone.vy += dy * 0.075;

      // Fricción / amortiguación
      drone.vx *= 0.82;
      drone.vy *= 0.82;

      drone.x += drone.vx;
      drone.y += drone.vy;

      // Inclinación dinámica en la dirección del desplazamiento
      const targetTilt = Math.max(-0.4, Math.min(0.4, drone.vx * 0.035));
      drone.tilt += (targetTilt - drone.tilt) * 0.15;

      // Al alcanzar el objetivo
      if (dist < 4 && Math.hypot(drone.vx, drone.vy) < 0.6) {
        if (drone.state === "AUTO_FLYING") {
          drone.state = "AUTO_HOVERING";
          // Flota e inspecciona por 4.5 segundos al lado del título y luego se va
          clearTimeout(autoHoverTimer);
          autoHoverTimer = setTimeout(() => {
            if (drone.state === "AUTO_HOVERING") {
              drone.state = "AUTO_EXITING";
              drone.exitVx = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 3);
              drone.exitVy = -10 - Math.random() * 4;
            }
          }, 4500);
        } else {
          drone.state = "HOVERING";
        }
      }
    } else if (drone.state === "HOVERING" || drone.state === "AUTO_HOVERING") {
      if (drone.state === "AUTO_HOVERING") {
        const liveTarget = getTitleTarget();
        drone.targetX = liveTarget.x;
        drone.targetY = liveTarget.y;
      }
      // Ajuste suave en reposo
      drone.x += (drone.targetX - drone.x) * 0.08;
      drone.y += (drone.targetY - drone.y) * 0.08;
      drone.tilt += (0 - drone.tilt) * 0.1;
    } else if (drone.state === "EXITING" || drone.state === "AUTO_EXITING") {
      // Salida acelerada volando fuera de la pantalla
      drone.vx += drone.exitVx * 0.08;
      drone.vy += drone.exitVy * 0.08;
      drone.x += drone.vx;
      drone.y += drone.vy;

      // Inclinación hacia arriba mientras escapa
      const exitTilt = (drone.exitVx > 0 ? 0.35 : -0.35);
      drone.tilt += (exitTilt - drone.tilt) * 0.1;

      // Si salió completamente de los límites del contenedor
      if (drone.y < -100 || drone.x < -120 || drone.x > width + 120 || drone.y > height + 100) {
        drone.state = "IDLE";
        stopAnimation();
        // Programar el siguiente patrullaje en 5 segundos
        scheduleNextPatrol();
        return;
      }
    }

    // Efecto de viento (oscilación sutil de sustentación arriba y abajo)
    let windBobY = 0;
    let windBobX = 0;
    let windTilt = 0;

    if (
      drone.state === "HOVERING" ||
      drone.state === "AUTO_HOVERING" ||
      drone.state === "FLYING" ||
      drone.state === "AUTO_FLYING"
    ) {
      windBobY = Math.sin(t * 3.8) * 4.2 + Math.sin(t * 7.5) * 1.3;
      windBobX = Math.cos(t * 2.1) * 1.2;
      windTilt = Math.sin(t * 2.9) * 0.035;
    }

    // VIENTO DEL DRON SOBRE LAS LETRAS:
    // Si el dron se acerca a un texto con el mouse apretado o volando, las letras "vuelan"
    // y al salir el dron se acomodan automáticamente de nuevo.
    const WIND_RADIUS = 95;
    const MAX_PUSH = 52;
    const isBlowing = (drone.state === "FLYING" || drone.state === "HOVERING" || drone.isPressed);

    if (isBlowing && charItems.length > 0) {
      const curX = drone.x + windBobX;
      const curY = drone.y + windBobY;

      for (let i = 0; i < charItems.length; i++) {
        const item = charItems[i];
        const dx = item.x - curX;
        const dy = item.y - curY;
        const dist = Math.hypot(dx, dy);

        if (dist < WIND_RADIUS) {
          const factor = Math.pow(1 - dist / WIND_RADIUS, 1.4);
          const angle = Math.atan2(dy, dx);
          const push = factor * MAX_PUSH;
          const pushX = Math.cos(angle) * push + Math.sin(t * 10 + item.x) * (5 * factor);
          const pushY = Math.sin(angle) * push + (factor * 20) + Math.cos(t * 10 + item.y) * (5 * factor);
          const rot = (Math.cos(angle) * 35 + Math.sin(t * 8) * 16) * factor;

          item.span.style.transform = `translate(${pushX.toFixed(1)}px, ${pushY.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${1 + factor * 0.12})`;
          item.isBlown = true;
        } else if (item.isBlown) {
          // El dron se alejó de esta letra: se acomoda automáticamente en su lugar
          item.span.style.transform = "";
          item.isBlown = false;
        }
      }
    } else {
      resetBlownLetters();
    }

    // Dibujar dron si está en pantalla
    if (drone.state !== "IDLE") {
      drawDrone(
        ctx,
        drone.x + windBobX,
        drone.y + windBobY,
        drone.tilt + windTilt,
        drone.propAngle,
        windBobY,
        drone.scale
      );
    }

    animId = requestAnimationFrame(loop);
  }

  // IntersectionObserver para activar/desactivar y pausar fuera del viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isSectionVisible = entry.isIntersecting;
      if (isSectionVisible) {
        if (drone.state === "IDLE") {
          scheduleNextPatrol(400);
        } else if (!animId) {
          animId = requestAnimationFrame(loop);
        }
      } else {
        clearAutoTimers();
      }
    });
  }, { threshold: 0, rootMargin: "200px 0px" });

  observer.observe(section);
}

/**
 * Renderizado vectorial realista del Dron Agrícola Blanco
 * - Chasis geométrico aerodinámico facetado (adiós al óvalo)
 * - Módulo de batería inteligente con indicadores LED verdes
 * - Cúpula de antena RTK/GNSS de precisión
 * - Sensores frontales anticolisión y cámara gimbal 4K
 * - 4 hélices con rotación de alta velocidad, discos de sustentación y sombra
 */
function drawDrone(ctx, x, y, tilt, propAngle, bobY, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 1. Sombra suave proyectada en el suelo
  const groundY = 42 + bobY * 0.4;
  const shadowScale = Math.max(0.65, 1.0 - (bobY / 35));
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, groundY, 28 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.23)";
  ctx.fill();
  ctx.restore();

  // 2. Inclinación del dron según el desplazamiento y viento
  ctx.rotate(tilt);

  const armX = 23;
  const armY = 16;

  // Sombra del chasis para gran contraste tanto en fondos claros como oscuros
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  // 3. Brazos estructurales tubulares blancos
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-armX, -armY);
  ctx.lineTo(armX, armY);
  ctx.moveTo(armX, -armY);
  ctx.lineTo(-armX, armY);
  ctx.stroke();

  // Refuerzo interno gris de fibra de carbono
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "#94a3b8";
  ctx.beginPath();
  ctx.moveTo(-armX * 0.85, -armY * 0.85);
  ctx.lineTo(armX * 0.85, armY * 0.85);
  ctx.moveTo(armX * 0.85, -armY * 0.85);
  ctx.lineTo(-armX * 0.85, armY * 0.85);
  ctx.stroke();

  // 4. Patas de aterrizaje inferiores (skids)
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(-13, -15);
  ctx.lineTo(-13, 15);
  ctx.moveTo(13, -15);
  ctx.lineTo(13, 15);
  ctx.stroke();

  // 5. CHASIS CENTRAL REALISTA (Esculpido geométrico / aerodinámico - sin óvalo simple)
  // Fuselaje angular multicapa estilo DJI Enterprise
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(-7, -17);  // Morro frontal izquierdo
  ctx.lineTo(7, -17);   // Morro frontal derecho
  ctx.lineTo(13, -7);   // Hombro delantero derecho
  ctx.lineTo(13, 8);    // Lateral derecho
  ctx.lineTo(8, 17);    // Cola trasera derecha
  ctx.lineTo(-8, 17);   // Cola trasera izquierda
  ctx.lineTo(-13, 8);   // Lateral izquierdo
  ctx.lineTo(-13, -7);  // Hombro delantero izquierdo
  ctx.closePath();
  ctx.fill();

  // Bisel perimetral y relieve de carcasa
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Módulo de batería inteligente trasero con ranura
  ctx.fillStyle = "#f1f5f9";
  ctx.beginPath();
  ctx.rect(-6, 4, 12, 11);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 4 LEDs verdes de carga de batería DJI
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(-3.6 + i * 2.4, 12.5, 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cúpula superior de antena RTK/GNSS de alta precisión
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0, -1, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Indicador de estado central con pulso verde Solanum
  const pulse = (Math.sin(performance.now() * 0.006) + 1) * 0.5;
  ctx.fillStyle = `rgba(34, 197, 94, ${0.7 + pulse * 0.3})`;
  ctx.beginPath();
  ctx.arc(0, -1, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Sensores frontales anticolisión estereoscópicos
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(-4.5, -16.5, 1.2, 0, Math.PI * 2);
  ctx.arc(4.5, -16.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Cámara / Gimbal frontal 4K
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.rect(-3.5, -19.5, 7, 3.5);
  ctx.fill();

  // Lente con reflejo óptico azul cielo
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.arc(0, -18.5, 1.4, 0, Math.PI * 2);
  ctx.fill();

  // 6. MOTORES Y HÉLICES ("ALAS" EN MOVIMIENTO)
  const motors = [
    { x: -armX, y: -armY, dir: 1 },
    { x: armX, y: -armY, dir: -1 },
    { x: -armX, y: armY, dir: -1 },
    { x: armX, y: armY, dir: 1 }
  ];

  ctx.shadowColor = "transparent"; // Sin sombra en las aspas para máxima nitidez

  const rotorRadius = 18;

  motors.forEach((m, idx) => {
    // Cabezal del motor
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.stroke();

    // LED de navegación (delanteros verdes, traseros rojos)
    ctx.fillStyle = idx < 2 ? "#22c55e" : "#ef4444";
    ctx.beginPath();
    ctx.arc(m.x, m.y, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Disco de sustentación por giro rápido del rotor (blur)
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, rotorRadius, rotorRadius * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Aspas girando a gran velocidad
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(propAngle * m.dir + (idx * Math.PI / 4));

    // Palas en blanco puro
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-rotorRadius * 0.5, 0, rotorRadius * 0.52, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(rotorRadius * 0.5, 0, rotorRadius * 0.52, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Puntas oscuras aerodinámicas
    ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
    ctx.beginPath();
    ctx.arc(-rotorRadius * 0.9, 0, 1.4, 0, Math.PI * 2);
    ctx.arc(rotorRadius * 0.9, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  ctx.restore();
}



