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

  // Detección si la sección corresponde a Tractores
  const isTractor = (
    document.body.getAttribute("data-page") === "tractores" ||
    window.location.href.includes("tractores") ||
    Boolean(section.closest("[data-page='tractores']"))
  );

  // Detección si la sección tiene fondo claro (o es aplicaciones.html) para pintar el dron negro
  const isDarkSection = (
    document.body.getAttribute("data-page") === "aplicaciones" ||
    window.location.href.includes("aplicaciones") ||
    section.classList.contains("beneficios-section") ||
    (() => {
      const bg = window.getComputedStyle(section).backgroundColor;
      const m = bg.match(/\d+/g);
      if (m && m.length >= 3) {
        const lum = 0.299 * (+m[0]) + 0.587 * (+m[1]) + 0.114 * (+m[2]);
        return lum > 180;
      }
      return false;
    })()
  );

  // Estado del Vehículo (Dron o Tractor)
  const vehicle = {
    x: -150,
    y: -150,
    targetX: -150,
    targetY: -150,
    vx: 0,
    vy: 0,
    tilt: 0,
    propAngle: 0,
    wheelAngle: 0,
    facing: 1, // 1: derecha, -1: izquierda
    state: "IDLE", // 'IDLE' | 'FLYING' | 'HOVERING' | 'EXITING' | 'AUTO_FLYING' | 'AUTO_HOVERING' | 'AUTO_EXITING'
    isPressed: false,
    exitVx: 0,
    exitVy: 0,
    scale: isTractor ? 1.05 : 0.95,
    isDark: isDarkSection,
    isTractor: isTractor
  };

  function resize() {
    const rect = section.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.floor(width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();

  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => resize());
    ro.observe(section);
  } else {
    window.addEventListener("resize", resize);
  }

  // Obtener posición junto al título principal
  function getTitleTarget() {
    const titleEl = section.querySelector(
      ".significa-title.reveal.active, .significa-title.reveal, .significa-title, .trabajamos-titulo, .beneficios-title, .section-title, h2, h1, [class*='titulo'], [class*='title']"
    ) || section.querySelector("p");

    if (!titleEl) {
      return { x: width * 0.45, y: height * 0.35 };
    }

    const sRect = section.getBoundingClientRect();
    let textRight = 0;
    let firstLineTop = 0;
    let firstLineHeight = 36;

    try {
      const range = document.createRange();
      range.selectNodeContents(titleEl);
      const rects = range.getClientRects();
      if (rects && rects.length > 0) {
        // Primera línea exacta de texto renderizado
        const r0 = rects[0];
        firstLineTop = r0.top;
        firstLineHeight = r0.height || 36;
        textRight = r0.right;
      }
    } catch (e) {}

    if (!textRight) {
      const tRect = titleEl.getBoundingClientRect();
      firstLineTop = tRect.top;
      firstLineHeight = Math.min(48, tRect.height * 0.45);
      const firstLineText = (titleEl.innerText || titleEl.textContent || "").split("\n")[0].trim();
      const tempSpan = document.createElement("span");
      tempSpan.style.font = window.getComputedStyle(titleEl).font;
      tempSpan.style.visibility = "hidden";
      tempSpan.style.position = "absolute";
      tempSpan.style.whiteSpace = "nowrap";
      tempSpan.textContent = firstLineText;
      document.body.appendChild(tempSpan);
      const measuredWidth = tempSpan.offsetWidth;
      document.body.removeChild(tempSpan);

      textRight = tRect.left + (measuredWidth > 0 ? measuredWidth : Math.min(360, tRect.width * 0.5));
    }

    const textRightInCanvas = textRight - sRect.left;
    let tx = textRightInCanvas + (vehicle.isTractor ? 118 : 44);

    if (tx > width - 42) {
      tx = Math.max(width - 42, textRightInCanvas + 35);
    }
    tx = Math.max(35, Math.min(width - 40, tx));

    let ty = (firstLineTop - sRect.top) + (firstLineHeight * 0.5);
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

  function scheduleNextPatrol(delay = 5000) {
    clearAutoTimers();
    if (!isSectionVisible || vehicle.isPressed) return;
    idleTimer = setTimeout(() => {
      startAutoPatrol();
    }, delay);
  }

  function startAutoPatrol() {
    if (!isSectionVisible || vehicle.isPressed || vehicle.state !== "IDLE") return;

    const titlePos = getTitleTarget();
    vehicle.targetX = titlePos.x;
    vehicle.targetY = titlePos.y;

    if (vehicle.isTractor) {
      // El tractor entra rodando desde la izquierda hacia su posición junto al título
      vehicle.x = Math.max(-90, titlePos.x - 220);
      vehicle.y = titlePos.y;
      vehicle.vx = 4;
      vehicle.vy = 0;
      vehicle.facing = 1; // Mirando hacia la derecha
    } else {
      vehicle.x = titlePos.x + 30;
      vehicle.y = -70;
      vehicle.vx = (titlePos.x - vehicle.x) * 0.04;
      vehicle.vy = (titlePos.y - vehicle.y) * 0.04;
      vehicle.tilt = vehicle.vx * 0.04;
    }

    vehicle.state = "AUTO_FLYING";
    startAnimation();
  }

  function onPointerDown(clientX, clientY, isLinkOrBtn) {
    clearAutoTimers();
    if (!isLinkOrBtn) {
      window.getSelection()?.removeAllRanges();
    }

    const rect = section.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    vehicle.targetX = px;
    vehicle.targetY = py;
    vehicle.isPressed = true;

    if (vehicle.state === "IDLE" || vehicle.state === "EXITING" || vehicle.state === "AUTO_EXITING") {
      if (vehicle.isTractor) {
        const fromLeft = px < width * 0.5;
        vehicle.x = fromLeft ? -80 : width + 80;
        vehicle.y = py;
        vehicle.vx = (px - vehicle.x) * 0.07;
        vehicle.vy = 0;
        vehicle.facing = vehicle.vx >= 0 ? 1 : -1;
      } else {
        vehicle.x = px + (Math.random() > 0.5 ? 80 : -80);
        vehicle.y = -60;
        vehicle.vx = (px - vehicle.x) * 0.05;
        vehicle.vy = 8;
        vehicle.tilt = vehicle.vx * 0.04;
      }
    }

    vehicle.state = "FLYING";
    startAnimation();
  }

  function onPointerMove(clientX, clientY) {
    if (vehicle.isPressed) {
      const rect = section.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;
      if (vehicle.isTractor) {
        const mouseDeltaX = px - vehicle.targetX;
        // Solo cambia de orientación cuando el usuario mueve activamente el mouse
        if (mouseDeltaX < -1.5) {
          vehicle.facing = -1; // Moviendo hacia la izquierda
        } else if (mouseDeltaX > 1.5) {
          vehicle.facing = 1;  // Moviendo hacia la derecha
        }
      }
      vehicle.targetX = px;
      vehicle.targetY = py;
      vehicle.state = "FLYING";
    }
  }

  function onPointerUp() {
    if (vehicle.isPressed) {
      vehicle.isPressed = false;
      vehicle.state = "EXITING";
      if (vehicle.isTractor) {
        // Sale andando hacia la derecha
        vehicle.facing = 1;
        vehicle.exitVx = 7.5 + Math.random() * 2.5;
        vehicle.exitVy = 0;
      } else {
        vehicle.exitVx = (vehicle.vx >= 0 ? 1 : -1) * (5 + Math.random() * 3);
        vehicle.exitVy = -11 - Math.random() * 4;
      }
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

    // Giro de hélices para el dron y ruedas para el tractor
    vehicle.propAngle += 0.65;
    if (vehicle.isTractor) {
      // Giro de ruedas del tractor según el avance
      vehicle.wheelAngle += vehicle.vx * 0.09;
      // Cuando no se arrastra con el mouse, siempre mira a la derecha
      if (!vehicle.isPressed) {
        vehicle.facing = 1;
      }
    }

    // FÍSICA Y MOVIMIENTO
    if (vehicle.state === "FLYING" || vehicle.state === "AUTO_FLYING") {
      const dx = vehicle.targetX - vehicle.x;
      const dy = vehicle.targetY - vehicle.y;
      const dist = Math.hypot(dx, dy);

      vehicle.vx += dx * (vehicle.isTractor ? 0.08 : 0.075);
      vehicle.vy += dy * (vehicle.isTractor ? 0.08 : 0.075);

      vehicle.vx *= 0.82;
      vehicle.vy *= 0.82;

      // Amortiguación crítica del tractor: se detiene suavemente bajo el cursor sin rebotar ni oscilar
      if (vehicle.isTractor && vehicle.isPressed && dist < 5) {
        vehicle.vx *= 0.45;
        vehicle.vy *= 0.45;
        if (dist < 0.6) {
          vehicle.x = vehicle.targetX;
          vehicle.y = vehicle.targetY;
          vehicle.vx = 0;
          vehicle.vy = 0;
        }
      }

      vehicle.x += vehicle.vx;
      vehicle.y += vehicle.vy;

      const targetTilt = vehicle.isTractor
        ? Math.max(-0.12, Math.min(0.12, vehicle.vx * 0.012))
        : Math.max(-0.4, Math.min(0.4, vehicle.vx * 0.035));
      vehicle.tilt += (targetTilt - vehicle.tilt) * 0.15;

      if (dist < 4 && Math.hypot(vehicle.vx, vehicle.vy) < 0.6) {
        if (vehicle.state === "AUTO_FLYING") {
          vehicle.state = "AUTO_HOVERING";
          if (vehicle.isTractor) {
            vehicle.facing = 1; // Mirando a la derecha
          }
          clearTimeout(autoHoverTimer);
          autoHoverTimer = setTimeout(() => {
            if (vehicle.state === "AUTO_HOVERING") {
              vehicle.state = "AUTO_EXITING";
              if (vehicle.isTractor) {
                // Sale andando hacia la derecha
                vehicle.facing = 1;
                vehicle.exitVx = 7.5 + Math.random() * 2;
                vehicle.exitVy = 0;
              } else {
                vehicle.exitVx = (Math.random() > 0.5 ? 1 : -1) * (5 + Math.random() * 3);
                vehicle.exitVy = -10 - Math.random() * 4;
              }
            }
          }, 4500);
        } else {
          vehicle.state = "HOVERING";
          if (vehicle.isTractor && !vehicle.isPressed) {
            vehicle.facing = 1;
          }
        }
      }
    } else if (vehicle.state === "HOVERING" || vehicle.state === "AUTO_HOVERING") {
      if (vehicle.state === "AUTO_HOVERING") {
        const liveTarget = getTitleTarget();
        vehicle.targetX = liveTarget.x;
        vehicle.targetY = liveTarget.y;
      }
      vehicle.x += (vehicle.targetX - vehicle.x) * 0.08;
      vehicle.y += (vehicle.targetY - vehicle.y) * 0.08;
      vehicle.tilt += (0 - vehicle.tilt) * 0.1;
      if (vehicle.isTractor && !vehicle.isPressed) {
        vehicle.facing = 1; // Siempre mirando a la derecha junto al título cuando no se está arrastrando
      }
    } else if (vehicle.state === "EXITING" || vehicle.state === "AUTO_EXITING") {
      if (vehicle.isTractor) {
        vehicle.facing = 1; // Sale andando hacia la derecha
      }
      vehicle.vx += vehicle.exitVx * 0.08;
      vehicle.vy += vehicle.exitVy * 0.08;
      vehicle.x += vehicle.vx;
      vehicle.y += vehicle.vy;

      if (!vehicle.isTractor) {
        const exitTilt = (vehicle.exitVx > 0 ? 0.35 : -0.35);
        vehicle.tilt += (exitTilt - vehicle.tilt) * 0.1;
      }

      if (
        vehicle.y < -120 ||
        vehicle.x < -160 ||
        vehicle.x > width + 160 ||
        vehicle.y > height + 120
      ) {
        vehicle.state = "IDLE";
        stopAnimation();
        scheduleNextPatrol();
        return;
      }
    }

    // Efecto de oscilación de suspensión / viento
    let bobY = 0;
    let bobX = 0;
    let tiltEffect = 0;

    if (
      vehicle.state === "HOVERING" ||
      vehicle.state === "AUTO_HOVERING" ||
      vehicle.state === "FLYING" ||
      vehicle.state === "AUTO_FLYING"
    ) {
      if (vehicle.isTractor) {
        const isMoving = Math.hypot(vehicle.vx, vehicle.vy) > 0.3;
        bobY = isMoving ? Math.sin(t * 16) * 1.2 : Math.sin(t * 6) * 0.5;
        bobX = 0;
        tiltEffect = isMoving ? Math.sin(t * 8) * 0.015 : 0;
      } else {
        bobY = Math.sin(t * 3.8) * 4.2 + Math.sin(t * 7.5) * 1.3;
        bobX = Math.cos(t * 2.1) * 1.2;
        tiltEffect = Math.sin(t * 2.9) * 0.035;
      }
    }

    // NOTA: Se eliminó el efecto de dispersión / viento sobre las letras por requerimiento de usuario.
    // El texto permanece estático, nítido y accesible al aproximarse el vehículo.

    // Dibujar vehículo
    if (vehicle.state !== "IDLE") {
      if (vehicle.isTractor) {
        drawTractor(
          ctx,
          vehicle.x + bobX,
          vehicle.y + bobY,
          vehicle.tilt + tiltEffect,
          vehicle.wheelAngle,
          bobY,
          vehicle.scale,
          vehicle.facing,
          vehicle.isDark
        );
      } else {
        drawDrone(
          ctx,
          vehicle.x + bobX,
          vehicle.y + bobY,
          vehicle.tilt + tiltEffect,
          vehicle.propAngle,
          bobY,
          vehicle.scale,
          vehicle.isDark
        );
      }
    }

    animId = requestAnimationFrame(loop);
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isSectionVisible = entry.isIntersecting;
      if (isSectionVisible) {
        if (vehicle.state === "IDLE") {
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
 * Renderizado vectorial de Tractor Agrícola Moderno
 * Basado en la silueta y componentes del modelo de referencia:
 * - Gran rueda trasera con tacos de tracción en V (chevron) y cubo reductor
 * - Rueda delantera robusta con guardabarros curvo
 * - Cabina panorámica moderna con 4 pilares oscuros y lunas tintadas
 * - Techo envolvente con visera, faros de trabajo LED frontales y baliza ámbar parpadeante
 * - Capó estilizado aerodinámico con parrilla frontal y faros principales
 * - Chimenea de escape vertical alta y toma de aire
 * - Bloque de contrapeso frontal y enganche hidráulico trasero
 * - Escalerilla lateral de acceso
 */
function drawTractor(ctx, x, y, tilt, wheelAngle, bobY, scale, facing = 1, isDark = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);
  ctx.rotate(tilt * facing);

  // Paleta de diseño: Estilo Agrochery moderno
  const bodyRed = "#c81e1e";
  const bodyRedDark = "#991b1b";
  const bodyRedLight = "#ef4444";
  const chassisDark = "#18181b";
  const steelGray = "#4b5563";
  const rimColor = "#d1d5db";
  const rimHub = "#374151";
  const tireColor = "#171717";
  const glassReflection = "rgba(255, 255, 255, 0.45)";

  // 1. Sombra suave proyectada en el suelo
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(-26, 26, 30, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(26, 26, 22, 5.5, 0, 0, Math.PI * 2);
  ctx.ellipse(0, 26, 45, 6, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
  ctx.fill();
  ctx.restore();

  // 2. Enganche trasero hidráulico (3-point hitch)
  ctx.strokeStyle = steelGray;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-36, 12);
  ctx.lineTo(-48, 16);
  ctx.lineTo(-44, 22);
  ctx.moveTo(-38, 6);
  ctx.lineTo(-49, 10);
  ctx.stroke();

  // Pasador de acople
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(-48, 16, 2, 0, Math.PI * 2);
  ctx.fill();

  // 4. Chasis inferior, bloque de motor y depósito
  ctx.fillStyle = chassisDark;
  ctx.beginPath();
  ctx.roundRect(-24, 6, 50, 14, [2, 2, 4, 4]);
  ctx.fill();

  // Escalera de acceso lateral
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, 10);
  ctx.lineTo(-4, 22);
  ctx.moveTo(4, 10);
  ctx.lineTo(6, 22);
  ctx.moveTo(-5, 14);
  ctx.lineTo(5, 14);
  ctx.moveTo(-4.5, 18);
  ctx.lineTo(5.5, 18);
  ctx.stroke();

  // 5. Contrapeso delantero (bloque de pesas frontal)
  ctx.fillStyle = "#27272a";
  ctx.beginPath();
  ctx.roundRect(40, 6, 16, 15, [2, 4, 4, 2]);
  ctx.fill();
  ctx.strokeStyle = "#3f3f46";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Ranuras de pesas individuales
  ctx.fillStyle = "#18181b";
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(44 + i * 3.5, 8, 1.2, 11);
  }

  // 6. Capó del motor aerodinámico
  ctx.beginPath();
  ctx.moveTo(2, -10);
  ctx.lineTo(44, 0);
  ctx.quadraticCurveTo(48, 1, 48, 6);
  ctx.lineTo(44, 14);
  ctx.lineTo(2, 10);
  ctx.closePath();

  const hoodGrad = ctx.createLinearGradient(0, -10, 0, 14);
  hoodGrad.addColorStop(0, bodyRedLight);
  hoodGrad.addColorStop(0.35, bodyRed);
  hoodGrad.addColorStop(1, bodyRedDark);
  ctx.fillStyle = hoodGrad;
  ctx.fill();

  ctx.strokeStyle = bodyRedDark;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Relieves laterales del capó
  ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(12, 1);
  ctx.lineTo(36, 6);
  ctx.moveTo(14, 4);
  ctx.lineTo(34, 8);
  ctx.stroke();

  // Parrilla frontal
  ctx.fillStyle = "#09090b";
  ctx.beginPath();
  ctx.roundRect(42, 2, 5, 10, [1, 2, 2, 1]);
  ctx.fill();

  // Faros frontales (apagados)
  ctx.fillStyle = "#64748b";
  ctx.beginPath();
  ctx.rect(44, 3.5, 2.5, 3);
  ctx.rect(44, 7.5, 2.5, 2.5);
  ctx.fill();
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // 7. Guardabarros trasero arqueado
  ctx.beginPath();
  ctx.arc(-26, -1, 30, Math.PI * 1.05, Math.PI * 1.88);
  ctx.lineWidth = 5;
  ctx.strokeStyle = bodyRedDark;
  ctx.stroke();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = bodyRed;
  ctx.stroke();

  // 8. Cabina panorámica moderna
  // Silueta interior (asiento y volante)
  ctx.fillStyle = "#27272a";
  ctx.beginPath();
  ctx.roundRect(-22, -26, 9, 17, 3);
  ctx.fill();
  ctx.strokeStyle = "#52525b";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-4, -14);
  ctx.lineTo(-7, -20);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-8, -21, 3.5, 0, Math.PI * 2);
  ctx.stroke();

  // Luna panorámica tintada
  ctx.beginPath();
  ctx.moveTo(-24, -8);
  ctx.lineTo(-24, -30);
  ctx.quadraticCurveTo(-12, -34, 4, -32);
  ctx.lineTo(4, -10);
  ctx.closePath();

  const glassGrad = ctx.createLinearGradient(-24, -32, 4, -8);
  glassGrad.addColorStop(0, "rgba(224, 242, 254, 0.85)");
  glassGrad.addColorStop(0.4, "rgba(186, 230, 253, 0.45)");
  glassGrad.addColorStop(1, "rgba(56, 189, 248, 0.2)");
  ctx.fillStyle = glassGrad;
  ctx.fill();

  // Reflejos del cristal
  ctx.strokeStyle = glassReflection;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-16, -30);
  ctx.lineTo(-6, -11);
  ctx.moveTo(-11, -31);
  ctx.lineTo(-2, -12);
  ctx.stroke();

  // Pilares estructurales ROPS
  ctx.strokeStyle = "#09090b";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-24, -8);
  ctx.lineTo(-24, -31);
  ctx.moveTo(-9, -8);
  ctx.lineTo(-9, -32);
  ctx.moveTo(3, -9);
  ctx.lineTo(2, -32);
  ctx.stroke();

  // Techo envolvente con visera
  ctx.beginPath();
  ctx.moveTo(-29, -31);
  ctx.lineTo(8, -32);
  ctx.quadraticCurveTo(11, -34, 8, -38);
  ctx.lineTo(-27, -37);
  ctx.quadraticCurveTo(-30, -35, -29, -31);
  ctx.closePath();

  const roofGrad = ctx.createLinearGradient(0, -38, 0, -31);
  roofGrad.addColorStop(0, "#f8fafc");
  roofGrad.addColorStop(0.6, "#e2e8f0");
  roofGrad.addColorStop(1, bodyRed);
  ctx.fillStyle = roofGrad;
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4 Faros de trabajo frontales en la visera (apagados)
  ctx.fillStyle = "#475569";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(0 + i * 2.2, -33.5, 1.6, 1.8);
  }

  // Baliza en la esquina del techo (apagada)
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(-22, -41, 2, 4);
  ctx.fillStyle = "#b45309";
  ctx.beginPath();
  ctx.roundRect(-23.5, -45, 5, 4.5, 1.5);
  ctx.fill();

  // Retrovisor exterior
  ctx.strokeStyle = "#18181b";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(4, -28);
  ctx.lineTo(9, -26);
  ctx.stroke();
  ctx.fillStyle = "#09090b";
  ctx.fillRect(9, -29, 2.5, 6);

  // Chimenea vertical de escape alta
  ctx.fillStyle = "#18181b";
  ctx.beginPath();
  ctx.roundRect(5, -42, 3, 32, 1);
  ctx.fill();
  ctx.strokeStyle = "#52525b";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(4, -42);
  ctx.lineTo(9, -44);
  ctx.stroke();

  // Toma de aire (Snorkel)
  ctx.fillStyle = "#27272a";
  ctx.fillRect(-1, -38, 2, 28);
  ctx.beginPath();
  ctx.arc(0, -39, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // 9. Guardabarros delantero
  ctx.beginPath();
  ctx.arc(26, 4, 18, Math.PI * 1.15, Math.PI * 1.85);
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#18181b";
  ctx.stroke();

  // 10. RUEDAS CON TACOS AGRÍCOLAS (ROTATORIAS)
  function drawAgriWheel(cx, cy, outerR, innerR, rimR, lugsCount, angle) {
    ctx.save();
    ctx.translate(cx, cy);

    // Neumático de goma
    ctx.beginPath();
    ctx.arc(0, 0, outerR, 0, Math.PI * 2);
    ctx.fillStyle = tireColor;
    ctx.fill();

    // Tacos de tracción en V (Chevron lugs)
    ctx.save();
    ctx.rotate(angle);
    for (let i = 0; i < lugsCount; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / lugsCount);

      ctx.beginPath();
      ctx.moveTo(outerR - 1, -2.5);
      ctx.lineTo(outerR + 3, -1);
      ctx.lineTo(outerR + 3, 1.5);
      ctx.lineTo(outerR - innerR * 0.3, 3);
      ctx.closePath();
      ctx.fillStyle = "#262626";
      ctx.fill();

      ctx.strokeStyle = "#0a0a0a";
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.restore();
    }
    ctx.restore();

    // Llanta metálica
    ctx.beginPath();
    ctx.arc(0, 0, rimR, 0, Math.PI * 2);
    ctx.fillStyle = rimColor;
    ctx.fill();
    ctx.strokeStyle = "#9ca3af";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Plato central
    ctx.beginPath();
    ctx.arc(0, 0, rimR * 0.65, 0, Math.PI * 2);
    ctx.fillStyle = "#e5e7eb";
    ctx.fill();
    ctx.strokeStyle = "#6b7280";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Bulones
    const bolts = 6;
    for (let b = 0; b < bolts; b++) {
      const ba = (b * Math.PI * 2) / bolts;
      const bx = Math.cos(ba) * (rimR * 0.44);
      const by = Math.sin(ba) * (rimR * 0.44);
      ctx.beginPath();
      ctx.arc(bx, by, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = "#374151";
      ctx.fill();
    }

    // Cubo planetario central
    ctx.beginPath();
    ctx.arc(0, 0, rimR * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = rimHub;
    ctx.fill();
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // Rueda Trasera (Grande)
  drawAgriWheel(-26, 4, 24, 16, 14, 14, wheelAngle);

  // Rueda Delantera (Mediana)
  drawAgriWheel(26, 12, 16, 11, 9.5, 11, wheelAngle * 1.5);

  ctx.restore();
}

/**
 * Renderizado vectorial realista del Dron Agrícola Blanco
 * - Chasis geométrico aerodinámico facetado (adiós al óvalo)
 * - Módulo de batería inteligente con indicadores LED verdes
 * - Cúpula de antena RTK/GNSS de precisión
 * - Sensores frontales anticolisión y cámara gimbal 4K
 * - 4 hélices con rotación de alta velocidad, discos de sustentación y sombra
 */
function drawDrone(ctx, x, y, tilt, propAngle, bobY, scale, isDark = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 1. Sombra suave proyectada en el suelo
  const groundY = 42 + bobY * 0.4;
  const shadowScale = Math.max(0.65, 1.0 - (bobY / 35));
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, groundY, 28 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fillStyle = isDark ? "rgba(0, 0, 0, 0.28)" : "rgba(0, 0, 0, 0.23)";
  ctx.fill();
  ctx.restore();

  // 2. Inclinación del dron según el desplazamiento y viento
  ctx.rotate(tilt);

  const armX = 23;
  const armY = 16;

  // Sombra del chasis para gran contraste tanto en fondos claros como oscuros
  ctx.shadowColor = isDark ? "rgba(0, 0, 0, 0.35)" : "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  // 3. Brazos estructurales tubulares (negro en fondos claros / blanco en fondos oscuros)
  ctx.lineWidth = 4;
  ctx.strokeStyle = isDark ? "#111111" : "#ffffff";
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-armX, -armY);
  ctx.lineTo(armX, armY);
  ctx.moveTo(armX, -armY);
  ctx.lineTo(-armX, armY);
  ctx.stroke();

  // Refuerzo interno
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = isDark ? "#27272a" : "#94a3b8";
  ctx.beginPath();
  ctx.moveTo(-armX * 0.85, -armY * 0.85);
  ctx.lineTo(armX * 0.85, armY * 0.85);
  ctx.moveTo(armX * 0.85, -armY * 0.85);
  ctx.lineTo(-armX * 0.85, armY * 0.85);
  ctx.stroke();

  // 4. Patas de aterrizaje inferiores (skids)
  ctx.lineWidth = 2;
  ctx.strokeStyle = isDark ? "#27272a" : "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(-13, -15);
  ctx.lineTo(-13, 15);
  ctx.moveTo(13, -15);
  ctx.lineTo(13, 15);
  ctx.stroke();

  // 5. CHASIS CENTRAL REALISTA (Fuselaje angular multicapa estilo DJI Enterprise)
  ctx.fillStyle = isDark ? "#111111" : "#ffffff";
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
  ctx.strokeStyle = isDark ? "#27272a" : "#e2e8f0";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Módulo de batería inteligente trasero con ranura
  ctx.fillStyle = isDark ? "#18181b" : "#f1f5f9";
  ctx.beginPath();
  ctx.rect(-6, 4, 12, 11);
  ctx.fill();
  ctx.strokeStyle = isDark ? "#27272a" : "#cbd5e1";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // 4 LEDs verdes de carga de batería DJI
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = isDark ? "#4ade80" : "#22c55e";
    ctx.beginPath();
    ctx.arc(-3.6 + i * 2.4, 12.5, 0.75, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cúpula superior de antena RTK/GNSS de alta precisión
  ctx.fillStyle = isDark ? "#18181b" : "#ffffff";
  ctx.beginPath();
  ctx.arc(0, -1, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = isDark ? "#27272a" : "#cbd5e1";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Indicador de estado central con pulso verde Solanum
  const pulse = (Math.sin(performance.now() * 0.006) + 1) * 0.5;
  ctx.fillStyle = `rgba(34, 197, 94, ${0.7 + pulse * 0.3})`;
  ctx.beginPath();
  ctx.arc(0, -1, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Sensores frontales anticolisión estereoscópicos
  ctx.fillStyle = "#09090b";
  ctx.beginPath();
  ctx.arc(-4.5, -16.5, 1.2, 0, Math.PI * 2);
  ctx.arc(4.5, -16.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Cámara / Gimbal frontal 4K
  ctx.fillStyle = "#09090b";
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
    ctx.fillStyle = isDark ? "#18181b" : "#ffffff";
    ctx.beginPath();
    ctx.arc(m.x, m.y, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isDark ? "#27272a" : "#cbd5e1";
    ctx.lineWidth = 1;
    ctx.stroke();

    // LED de navegación (delanteros verdes, traseros rojos)
    ctx.fillStyle = idx < 2 ? "#22c55e" : "#ef4444";
    ctx.beginPath();
    ctx.arc(m.x, m.y, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Disco de sustentación por giro rápido del rotor (blur)
    ctx.fillStyle = isDark ? "rgba(0, 0, 0, 0.16)" : "rgba(255, 255, 255, 0.28)";
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, rotorRadius, rotorRadius * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = isDark ? "rgba(0, 0, 0, 0.25)" : "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Aspas girando a gran velocidad
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(propAngle * m.dir + (idx * Math.PI / 4));

    // Palas en negro (en fondos claros) o blanco (en fondos oscuros)
    ctx.fillStyle = isDark ? "#111111" : "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-rotorRadius * 0.5, 0, rotorRadius * 0.52, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(rotorRadius * 0.5, 0, rotorRadius * 0.52, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Puntas aerodinámicas
    ctx.fillStyle = isDark ? "#3f3f46" : "rgba(30, 41, 59, 0.8)";
    ctx.beginPath();
    ctx.arc(-rotorRadius * 0.9, 0, 1.4, 0, Math.PI * 2);
    ctx.arc(rotorRadius * 0.9, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  ctx.restore();
}



