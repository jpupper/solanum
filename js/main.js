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
