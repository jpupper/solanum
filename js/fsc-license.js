(function () {
    'use strict';

    // 1. Determine FSCAUTH Base URL from script tag or window config
    function getBaseUrl() {
        if (window.FSCAUTH_LICENSE_URL) {
            return window.FSCAUTH_LICENSE_URL.replace(/\/$/, '');
        }

        // Try to get base URL from currentScript src ONLY if it contains 'fscauth'
        const currentScript = document.currentScript || (function () {
            const scripts = document.getElementsByTagName('script');
            return scripts[scripts.length - 1];
        })();

        if (currentScript && currentScript.src && currentScript.src.includes('fscauth')) {
            try {
                const url = new URL(currentScript.src);
                const pathParts = url.pathname.split('/');
                const fscauthIdx = pathParts.indexOf('fscauth');
                if (fscauthIdx !== -1) {
                    return url.origin + pathParts.slice(0, fscauthIdx + 1).join('/');
                }
                if (url.origin && url.origin !== 'null' && !url.origin.startsWith('file:')) {
                    return url.origin;
                }
            } catch (e) {}
        }

        // Fallback for localhost testing
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:3027/fscauth';
        }

        // Primary Remote Production VPS URL for all satellite sites and local files
        return 'https://vps-4455523-x.dattaweb.com/fscauth';
    }

    const FSCAUTH_BASE_URL = getBaseUrl();
    const STORAGE_KEY = 'fsc_license_key';
    const CHECK_INTERVAL_MS = 5000; // Polling every 5 seconds for real-time response

    let overlayElement = null;
    let isChecking = false;
    let isLockedState = false;
    let activeObserver = null;

    // Global Guard Interface (Interlocking with main website JS)
    window.FSCLicenseGuard = {
        _isValid: false,
        _initialized: true,
        isValid: function () {
            return this._isValid;
        },
        require: function (callback) {
            if (!this._isValid) {
                // If missing license overlay is currently active, allow user to enter license code without destroying body
                if (isLockedState === 'MISSING' || isChecking) {
                    return false;
                }
                console.error('[SECURITY VIOLATION] FSC License Guard validation failed.');
                document.body.innerHTML = '<div style="background:#0b0c10;color:#f87171;height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;font-weight:bold;font-size:24px;text-align:center;padding:20px;">[SECURITY VIOLATION] Invalid or Tampered License Guard.</div>';
                throw new Error('FSC License Guard required.');
            }
            if (typeof callback === 'function') callback();
            return true;
        }
    };

    // Helper to get domain/URL path of current website
    function getCurrentDomain() {
        if (window.location.protocol === 'file:') {
            let p = window.location.pathname ? window.location.pathname.replace(/\\/g, '/') : 'file';
            if (p.endsWith('/index.html') || p.endsWith('/index.htm')) {
                p = p.substring(0, p.lastIndexOf('/'));
            } else if (p.endsWith('.html')) {
                p = p.substring(0, p.lastIndexOf('/'));
            }
            return 'file://' + p.replace(/\/$/, '');
        }

        let host = window.location.host || window.location.hostname || 'unknown-domain';
        let path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
        return (host + path).toLowerCase();
    }

    // Call API to verify license status
    async function verifyLicenseWithBackend(code) {
        try {
            const domain = getCurrentDomain();
            let verifyUrl = `${FSCAUTH_BASE_URL}/api/license/verify?domain=${encodeURIComponent(domain)}`;
            if (code) {
                verifyUrl += `&code=${encodeURIComponent(code)}`;
            }

            const response = await fetch(verifyUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            });

            if (!response.ok) {
                return { valid: false, active: false, reason: 'HTTP_ERROR' };
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[FSCAUTH LICENSE CHECK ERROR]', error);
            return { valid: false, active: false, reason: 'NETWORK_ERROR' };
        }
    }

    // Main License Verification Flow
    async function checkLicense() {
        if (isChecking) return;
        isChecking = true;

        try {
            const savedCode = localStorage.getItem(STORAGE_KEY) || '';

            // Verify with backend (will auto-match by domain/path if savedCode is empty)
            const result = await verifyLicenseWithBackend(savedCode);

            if (result.valid && result.active) {
                if (result.code) {
                    localStorage.setItem(STORAGE_KEY, result.code);
                }
                window.FSCLicenseGuard._isValid = true;
                if (overlayElement) {
                    removeOverlay();
                }
            } else {
                window.FSCLicenseGuard._isValid = false;
                if (result.reason === 'MISSING_CODE' || (!savedCode && !result.valid)) {
                    showOverlay('MISSING');
                } else {
                    showOverlay('INVALID', result.reason === 'LICENSE_DISABLED' || result.active === false
                        ? 'La licencia para esta página web ha sido DESACTIVADA en FSCAUTH.'
                        : 'La licencia especificada no existe o fue eliminada.');
                }
            }
        } finally {
            isChecking = false;
        }
    }

    // Create and inject CSS rules for modal animations
    function injectStyles() {
        if (document.getElementById('fsc-license-styles')) return;
        const style = document.createElement('style');
        style.id = 'fsc-license-styles';
        style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
            
            .fsc-lic-overlay {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background-color: rgba(11, 12, 16, 0.96) !important;
                backdrop-filter: blur(15px) !important;
                -webkit-backdrop-filter: blur(15px) !important;
                z-index: 2147483647 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                color: #ffffff !important;
                padding: 20px !important;
                box-sizing: border-box !important;
            }

            .fsc-lic-card {
                background: linear-gradient(145deg, #1f2833 0%, #0b0c10 100%) !important;
                border: 1px solid rgba(102, 252, 241, 0.25) !important;
                box-shadow: 0 0 30px rgba(102, 252, 241, 0.15), 0 20px 40px rgba(0,0,0,0.8) !important;
                border-radius: 20px !important;
                padding: 40px 30px !important;
                max-width: 440px !important;
                width: 100% !important;
                text-align: center !important;
                box-sizing: border-box !important;
                animation: fscLicPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
            }

            @keyframes fscLicPop {
                from { opacity: 0; transform: scale(0.9) translateY(20px); }
                to { opacity: 1; transform: scale(1) translateY(0); }
            }

            .fsc-lic-badge {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                width: 64px !important;
                height: 64px !important;
                border-radius: 50% !important;
                margin-bottom: 20px !important;
            }

            .fsc-lic-badge-warning {
                background: rgba(245, 158, 11, 0.15) !important;
                border: 2px solid rgba(245, 158, 11, 0.4) !important;
                color: #fbbf24 !important;
            }

            .fsc-lic-badge-danger {
                background: rgba(239, 68, 68, 0.15) !important;
                border: 2px solid rgba(239, 68, 68, 0.4) !important;
                color: #f87171 !important;
            }

            .fsc-lic-title {
                font-size: 26px !important;
                font-weight: 800 !important;
                letter-spacing: 1px !important;
                margin: 0 0 10px 0 !important;
                text-transform: uppercase !important;
            }

            .fsc-lic-title-warning {
                color: #fbbf24 !important;
                text-shadow: 0 0 15px rgba(245, 158, 11, 0.4) !important;
            }

            .fsc-lic-title-danger {
                color: #f87171 !important;
                text-shadow: 0 0 15px rgba(239, 68, 68, 0.4) !important;
            }

            .fsc-lic-desc {
                font-size: 14px !important;
                color: #94a3b8 !important;
                margin: 0 0 25px 0 !important;
                line-height: 1.5 !important;
            }

            .fsc-lic-input {
                width: 100% !important;
                background: rgba(15, 23, 42, 0.8) !important;
                border: 1px solid rgba(102, 252, 241, 0.3) !important;
                border-radius: 12px !important;
                padding: 14px 16px !important;
                font-size: 15px !important;
                font-family: monospace, sans-serif !important;
                color: #66fcf1 !important;
                text-align: center !important;
                letter-spacing: 2px !important;
                outline: none !important;
                box-sizing: border-box !important;
                transition: all 0.2s ease !important;
                text-transform: uppercase !important;
            }

            .fsc-lic-input:focus {
                border-color: #66fcf1 !important;
                box-shadow: 0 0 15px rgba(102, 252, 241, 0.3) !important;
            }

            .fsc-lic-btn {
                width: 100% !important;
                margin-top: 15px !important;
                background: linear-gradient(135deg, #45a29e 0%, #66fcf1 100%) !important;
                color: #0b0c10 !important;
                border: none !important;
                border-radius: 12px !important;
                padding: 14px 20px !important;
                font-size: 14px !important;
                font-weight: 800 !important;
                letter-spacing: 1.5px !important;
                text-transform: uppercase !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                box-shadow: 0 4px 15px rgba(102, 252, 241, 0.3) !important;
            }

            .fsc-lic-btn:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 6px 20px rgba(102, 252, 241, 0.5) !important;
            }

            .fsc-lic-error {
                margin-top: 12px !important;
                font-size: 13px !important;
                color: #f87171 !important;
                display: none;
            }
        `;
        document.head.appendChild(style);
    }

    // Anti-Bypass: Watch DOM for manual node deletion via Chrome DevTools Inspect Element
    function setupDOMProtection() {
        if (activeObserver) return;
        activeObserver = new MutationObserver((mutations) => {
            if (isLockedState && (!overlayElement || !document.getElementById('fsc-license-modal-root'))) {
                console.warn('[SECURITY GUARD] Tampering detected! Re-enforcing license lock.');
                showOverlay(isLockedState === 'MISSING' ? 'MISSING' : 'INVALID');
            }
        });
        activeObserver.observe(document.body, { childList: true, subtree: true });
    }

    // Show Overlay depending on mode: 'MISSING' or 'INVALID'
    function showOverlay(mode, customMessage) {
        injectStyles();
        isLockedState = mode;
        window.FSCLicenseGuard._isValid = false;

        if (!overlayElement) {
            overlayElement = document.createElement('div');
            overlayElement.className = 'fsc-lic-overlay';
            overlayElement.id = 'fsc-license-modal-root';
            document.body.appendChild(overlayElement);
        }

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        if (mode === 'MISSING') {
            overlayElement.innerHTML = `
                <div class="fsc-lic-card">
                    <div class="fsc-lic-badge fsc-lic-badge-warning">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                    </div>
                    <h2 class="fsc-lic-title fsc-lic-title-warning">MISSING LICENSE</h2>
                    <p class="fsc-lic-desc">Esta aplicación requiere una licencia válida registrada en FSCAUTH para funcionar.</p>
                    <form id="fsc-lic-form" onsubmit="return false;">
                        <input type="text" id="fsc-lic-input-code" class="fsc-lic-input" placeholder="INGRESAR CÓDIGO DE LICENCIA" autocomplete="off" required>
                        <button type="submit" id="fsc-lic-submit-btn" class="fsc-lic-btn">Activar Licencia</button>
                    </form>
                    <div id="fsc-lic-error-msg" class="fsc-lic-error"></div>
                </div>
            `;

            const form = document.getElementById('fsc-lic-form');
            const input = document.getElementById('fsc-lic-input-code');
            const errorMsg = document.getElementById('fsc-lic-error-msg');
            const submitBtn = document.getElementById('fsc-lic-submit-btn');

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const code = input.value.trim().toUpperCase();
                if (!code) return;

                submitBtn.disabled = true;
                submitBtn.innerText = 'VALIDANDO...';
                errorMsg.style.display = 'none';

                const result = await verifyLicenseWithBackend(code);
                submitBtn.disabled = false;
                submitBtn.innerText = 'ACTIVAR LICENCIA';

                if (result.valid && result.active) {
                    localStorage.setItem(STORAGE_KEY, code);
                    window.FSCLicenseGuard._isValid = true;
                    removeOverlay();
                } else {
                    errorMsg.innerText = result.reason === 'LICENSE_DISABLED' || result.active === false
                        ? 'Esta licencia está desactivada por el administrador.' 
                        : 'Código de licencia no válido.';
                    errorMsg.style.display = 'block';
                }
            });

        } else if (mode === 'INVALID') {
            overlayElement.innerHTML = `
                <div class="fsc-lic-card">
                    <div class="fsc-lic-badge fsc-lic-badge-danger">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                    </div>
                    <h2 class="fsc-lic-title fsc-lic-title-danger">Invalid license.</h2>
                    <p class="fsc-lic-desc">${customMessage || 'El estado de la licencia de este sitio web ha cambiado o ha sido desactivada en FSCAUTH.'}</p>
                    <form id="fsc-lic-retry-form" onsubmit="return false;">
                        <input type="text" id="fsc-lic-retry-input" class="fsc-lic-input" placeholder="INGRESAR OTRO CÓDIGO" autocomplete="off">
                        <button type="submit" id="fsc-lic-retry-btn" class="fsc-lic-btn">Re-validar Licencia</button>
                    </form>
                    <div id="fsc-lic-retry-error" class="fsc-lic-error"></div>
                </div>
            `;

            const form = document.getElementById('fsc-lic-retry-form');
            const input = document.getElementById('fsc-lic-retry-input');
            const errorMsg = document.getElementById('fsc-lic-retry-error');
            const submitBtn = document.getElementById('fsc-lic-retry-btn');

            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const code = input.value.trim().toUpperCase();
                if (!code) return;

                submitBtn.disabled = true;
                submitBtn.innerText = 'VALIDANDO...';
                errorMsg.style.display = 'none';

                const result = await verifyLicenseWithBackend(code);
                submitBtn.disabled = false;
                submitBtn.innerText = 'RE-VALIDAR LICENCIA';

                if (result.valid && result.active) {
                    localStorage.setItem(STORAGE_KEY, code);
                    window.FSCLicenseGuard._isValid = true;
                    removeOverlay();
                } else {
                    errorMsg.innerText = 'Código inválido o inactivo.';
                    errorMsg.style.display = 'block';
                }
            });
        }

        setupDOMProtection();
    }

    // Hide Overlay and restore scrolling
    function removeOverlay() {
        isLockedState = false;
        if (overlayElement && overlayElement.parentNode) {
            overlayElement.parentNode.removeChild(overlayElement);
            overlayElement = null;
        }
        document.body.style.overflow = '';
    }

    // Initialize on DOM load and setup continuous listening (polling)
    function init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                checkLicense();
                setInterval(checkLicense, CHECK_INTERVAL_MS);
            });
        } else {
            checkLicense();
            setInterval(checkLicense, CHECK_INTERVAL_MS);
        }
    }

    init();
})();
