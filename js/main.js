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
        <a href="index.html#soluciones" class="nav-link ${isSoluciones ? 'active' : ''}">Soluciones</a>
        <a href="index.html#contacto" class="nav-link ${isContacto ? 'active' : ''}">Contacto</a>
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
        <a href="index.html#soluciones">Soluciones</a>
        <a href="index.html#contacto">Contacto</a>
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

document.addEventListener("DOMContentLoaded", () => {
  renderHeader();
  renderFooter();
  initScrollAnimations();
});
