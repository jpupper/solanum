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
    state: "IDLE", // 'IDLE' | 'FLYING' | 'HOVERING' | 'EXITING'
    isPressed: false,
    exitVx: 0,
    exitVy: 0,
    scale: 0.95
  };

  let animId = null;
  let isSectionVisible = true;

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

  function onPointerDown(clientX, clientY, isLinkOrBtn) {
    if (!isLinkOrBtn) {
      window.getSelection()?.removeAllRanges();
    }
    const rect = section.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    drone.targetX = px;
    drone.targetY = py;
    drone.isPressed = true;

    // Si estaba inactivo o saliendo, aparece velozmente desde el borde superior
    if (drone.state === "IDLE" || drone.state === "EXITING") {
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
      // Impulso de aceleración para salir de la pantalla volando hacia arriba/lado
      drone.exitVx = (drone.vx >= 0 ? 1 : -1) * (5 + Math.random() * 3);
      drone.exitVy = -11 - Math.random() * 4;
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

  // Bucle de animación
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
    if (drone.state === "FLYING") {
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

      // Al acercarse mucho al objetivo, pasa a modo flotación
      if (dist < 4 && Math.hypot(drone.vx, drone.vy) < 0.6) {
        drone.state = "HOVERING";
      }
    } else if (drone.state === "HOVERING") {
      // Pequeño ajuste continuo si el mouse se mueve levemente
      drone.x += (drone.targetX - drone.x) * 0.08;
      drone.y += (drone.targetY - drone.y) * 0.08;
      drone.tilt += (0 - drone.tilt) * 0.1;
    } else if (drone.state === "EXITING") {
      // Salida acelerada volando fuera de la pantalla
      drone.vx += drone.exitVx * 0.08;
      drone.vy += drone.exitVy * 0.08;
      drone.x += drone.vx;
      drone.y += drone.vy;

      // Inclinación hacia adelante/arriba mientras escapa
      const exitTilt = (drone.exitVx > 0 ? 0.35 : -0.35);
      drone.tilt += (exitTilt - drone.tilt) * 0.1;

      // Si salió completamente de los límites del contenedor
      if (drone.y < -100 || drone.x < -120 || drone.x > width + 120 || drone.y > height + 100) {
        drone.state = "IDLE";
        stopAnimation();
        return;
      }
    }

    // Efecto de viento (oscilación sutil de sustentación arriba y abajo)
    let windBobY = 0;
    let windBobX = 0;
    let windTilt = 0;

    if (drone.state === "HOVERING" || drone.state === "FLYING") {
      windBobY = Math.sin(t * 3.8) * 4.2 + Math.sin(t * 7.5) * 1.3;
      windBobX = Math.cos(t * 2.1) * 1.2;
      windTilt = Math.sin(t * 2.9) * 0.035;
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

  // IntersectionObserver para no gastar batería fuera del viewport
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      isSectionVisible = entry.isIntersecting;
      if (isSectionVisible && drone.state !== "IDLE" && !animId) {
        animId = requestAnimationFrame(loop);
      }
    });
  }, { threshold: 0, rootMargin: "200px 0px" });

  observer.observe(section);
}

/**
 * Renderizado vectorial del Dron Blanco con hélices animadas y sombra
 */
function drawDrone(ctx, x, y, tilt, propAngle, bobY, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // 1. Sombra suave en el suelo
  const groundY = 42 + bobY * 0.4;
  const shadowScale = Math.max(0.65, 1.0 - (bobY / 35));
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, groundY, 26 * shadowScale, 9 * shadowScale, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fill();
  ctx.restore();

  // 2. Inclinación del dron según el viento y desplazamiento
  ctx.rotate(tilt);

  const armX = 22;
  const armY = 16;

  // Sombra de relieve del chasis para visibilidad perfecta en fondos claros
  ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;

  // 3. Brazos estructurales (blancos con refuerzo)
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";

  ctx.beginPath();
  ctx.moveTo(-armX, -armY);
  ctx.lineTo(armX, armY);
  ctx.moveTo(armX, -armY);
  ctx.lineTo(-armX, armY);
  ctx.stroke();

  // Línea de detalle gris interna en los brazos
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();
  ctx.moveTo(-armX * 0.8, -armY * 0.8);
  ctx.lineTo(armX * 0.8, armY * 0.8);
  ctx.moveTo(armX * 0.8, -armY * 0.8);
  ctx.lineTo(-armX * 0.8, armY * 0.8);
  ctx.stroke();

  // 4. Patas de aterrizaje inferiores
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(225, 230, 235, 0.95)";
  ctx.beginPath();
  ctx.moveTo(-12, -14);
  ctx.lineTo(-12, 14);
  ctx.moveTo(12, -14);
  ctx.lineTo(12, 14);
  ctx.stroke();

  // 5. Chasis central blanco aerodinámico
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Borde fino del chasis
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Cámara / Sensor frontal (gimbal negro con reflejo azul)
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.ellipse(0, -16, 5, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#38bdf8";
  ctx.beginPath();
  ctx.arc(0, -16, 1.6, 0, Math.PI * 2);
  ctx.fill();

  // LED de estado en el lomo (pulso verde agrícola de Solanum)
  const pulse = (Math.sin(performance.now() * 0.006) + 1) * 0.5;
  ctx.fillStyle = `rgba(34, 197, 94, ${0.7 + pulse * 0.3})`;
  ctx.beginPath();
  ctx.arc(0, 2, 2.8, 0, Math.PI * 2);
  ctx.fill();

  // 6. Motores y Hélices ("alas" en movimiento)
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

    // Disco de sustentación por movimiento rápido del rotor (viento/blur)
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, rotorRadius, rotorRadius * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Aspas / hélices girando a gran velocidad
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(propAngle * m.dir + (idx * Math.PI / 4));

    // Pala 1 y Pala 2 en blanco puro
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(-rotorRadius * 0.5, 0, rotorRadius * 0.52, 2, 0, 0, Math.PI * 2);
    ctx.ellipse(rotorRadius * 0.5, 0, rotorRadius * 0.52, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Puntas oscuras de las aspas para realismo de giro
    ctx.fillStyle = "rgba(30, 41, 59, 0.8)";
    ctx.beginPath();
    ctx.arc(-rotorRadius * 0.9, 0, 1.4, 0, Math.PI * 2);
    ctx.arc(rotorRadius * 0.9, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  });

  ctx.restore();
}



