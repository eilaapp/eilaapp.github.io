/*
  Global initializer: window.initUIBehaviors(options)

  Purpose:
    - Theme handling (system listener, localStorage, toggle button)
    - Go-to-top button behavior
    - Mobile sidebar open / close / toggle behavior

  Usage (basic):
    <script>
      initUIBehaviors({
        theme: { toggleSelector: '#theme-toggle' },
        sidebar: { toggleSelector: '#bs-mobile-sidebar-toggle' },
        goToTop: { selector: '#go-to-top-button' }
      });
    </script>
*/
(function (window, document) {
    'use strict';

    function mergeDeep(target, src) {
        const out = Object.assign({}, target);
        if (!src) return out;
        Object.keys(src).forEach(key => {
            if (src[key] && typeof src[key] === 'object' && !Array.isArray(src[key])) {
                out[key] = mergeDeep(target[key] || {}, src[key]);
            } else {
                out[key] = src[key];
            }
        });
        return out;
    }

    function safeQuery(selector) {
        try {
            return selector ? document.querySelector(selector) : null;
        } catch (e) {
            return null;
        }
    }

    function safeQueryAll(selector) {
        try {
            return selector ? Array.from(document.querySelectorAll(selector)) : [];
        } catch (e) {
            return [];
        }
    }

    function initUIBehaviors(userOptions) {
        const defaults = {
            theme: {
                toggleSelector: '#theme-toggle',
                rootSelector: 'body',   // element to receive dark-mode class
                darkClass: 'dark-mode',
                storageKey: 'theme',
                followSystem: true,
                iconOnDark: 'fas fa-sun',
                iconOnLight: 'fas fa-moon'
            },
            goToTop: {
                selector: '#go-to-top-button',
                visibleClass: 'visible',
                threshold: 300
            },
            sidebar: {
                toggleSelector: '#bs-mobile-sidebar-toggle',
                sidebarSelector: '#bs-sidebar',
                overlaySelector: '#bs-sidebar-overlay',
                linkSelector: '.bs-sidebar-nav a',
                activeClass: 'active',
                lockScroll: true,
                desktopBreakpoint: 1024
            }
        };

        const cfg = mergeDeep(defaults, userOptions || {});

        /* ----------------------- Theme handling ----------------------- */
        (function themeModule() {
            const themeCfg = cfg.theme || {};
            const rootEl = safeQuery(themeCfg.rootSelector) || document.body;
            const toggleBtn = safeQuery(themeCfg.toggleSelector);
            const themeIcon = toggleBtn ? toggleBtn.querySelector('i') : null;
            const prefersDarkMql = window.matchMedia('(prefers-color-scheme: dark)');
            const storageKey = themeCfg.storageKey;
            let userChosen = localStorage.getItem(storageKey) !== null;

            function setDarkMode(enabled, persist) {
                if (enabled) rootEl.classList.add(themeCfg.darkClass);
                else rootEl.classList.remove(themeCfg.darkClass);

                if (themeIcon) {
                    themeIcon.className = enabled ? themeCfg.iconOnDark : themeCfg.iconOnLight;
                }

                if (persist) {
                    localStorage.setItem(storageKey, enabled ? 'dark' : 'light');
                    userChosen = true;
                }
            }

            // Initialize theme from saved preference or system preference
            (function initTheme() {
                const saved = localStorage.getItem(storageKey);
                if (saved === 'dark') {
                    setDarkMode(true, false);
                } else if (saved === 'light') {
                    setDarkMode(false, false);
                } else if (themeCfg.followSystem && prefersDarkMql.matches) {
                    setDarkMode(true, false);
                } else {
                    setDarkMode(false, false);
                }
            }());

            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    const isDark = rootEl.classList.contains(themeCfg.darkClass);
                    setDarkMode(!isDark, true);
                });
            }

            // Listen to system changes only if followSystem is true and user hasn't chosen explicitly
            if (themeCfg.followSystem) {
                prefersDarkMql.addEventListener('change', (e) => {
                    if (!userChosen) {
                        setDarkMode(e.matches, false);
                    }
                });
            }

        }());

        /* ----------------------- Sidebar handling ----------------------- */
        const sidebarInstance = (function sidebarModule() {
            const sCfg = cfg.sidebar || {};
            const toggleBtn = safeQuery(sCfg.toggleSelector);
            const sidebarEl = safeQuery(sCfg.sidebarSelector);
            const overlayEl = safeQuery(sCfg.overlaySelector);
            const linkEls = safeQueryAll(sCfg.linkSelector);
            const activeClass = sCfg.activeClass || 'active';
            let resizeTimer = null;

            function lockBodyScroll() {
                if (sCfg.lockScroll) document.body.style.overflow = 'hidden';
            }
            function unlockBodyScroll() {
                if (sCfg.lockScroll) document.body.style.overflow = '';
            }

            function openSidebar() {
                if (!sidebarEl) return;
                sidebarEl.classList.add(activeClass);
                if (overlayEl) overlayEl.classList.add(activeClass);
                lockBodyScroll();
            }

            function closeSidebar() {
                if (!sidebarEl) return;
                sidebarEl.classList.remove(activeClass);
                if (overlayEl) overlayEl.classList.remove(activeClass);
                unlockBodyScroll();
            }

            function toggleSidebar() {
                if (!sidebarEl) return;
                if (sidebarEl.classList.contains(activeClass)) closeSidebar();
                else openSidebar();
            }

            // Attach events if elements exist
            if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
            if (overlayEl) overlayEl.addEventListener('click', closeSidebar);

            // Close on Escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && sidebarEl && sidebarEl.classList.contains(activeClass)) {
                    closeSidebar();
                }
            });

            // Resize behavior: close on desktop width
            window.addEventListener('resize', () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => {
                    if (window.innerWidth >= (sCfg.desktopBreakpoint || 1024)) {
                        closeSidebar();
                    }
                }, 100);
            });

            // Link click behavior (close on mobile, smooth scroll if target exists)
            if (linkEls.length) {
                linkEls.forEach(link => {
                    link.addEventListener('click', (e) => {
                        // Preserve default if link is external or not an anchor to an id
                        const href = link.getAttribute('href');
                        if (href && href.indexOf('#') === 0) {
                            e.preventDefault();

                            if (window.innerWidth < (sCfg.desktopBreakpoint || 1024)) {
                                closeSidebar();
                            }

                            const target = document.querySelector(href);
                            if (target) {
                                window.scrollTo({ top: target.offsetTop, behavior: 'smooth' });
                            }
                        }
                        // DO NOT mark active link here - keep IntersectionObserver for that
                    });
                });
            }

            return {
                open: openSidebar,
                close: closeSidebar,
                toggle: toggleSidebar
            };
        }());

        /* ----------------------- Go-to-top handling ----------------------- */
        const goToTopInstance = (function goToTopModule() {
            const gCfg = cfg.goToTop || {};
            const btn = safeQuery(gCfg.selector);
            const visibleClass = gCfg.visibleClass || 'visible';
            const threshold = typeof gCfg.threshold === 'number' ? gCfg.threshold : 300;

            if (!btn) return { scrollToTop: () => { } };

            // Show/hide on scroll
            function onScroll() {
                if (window.scrollY > threshold) btn.classList.add(visibleClass);
                else btn.classList.remove(visibleClass);
            }

            window.addEventListener('scroll', onScroll, { passive: true });

            btn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });

            // Initialize visibility
            onScroll();

            return {
                scrollToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' })
            };
        }());

        // Return handles so consumers can programmatically control things if needed
        return {
            theme: {
                setDark: (v) => {
                    const root = safeQuery(cfg.theme.rootSelector) || document.body;
                    if (v) root.classList.add(cfg.theme.darkClass);
                    else root.classList.remove(cfg.theme.darkClass);
                }
            },
            sidebar: sidebarInstance,
            goToTop: goToTopInstance
        };
    }

    // Expose globally
    if (!window.initUIBehaviors) window.initUIBehaviors = initUIBehaviors;

}(window, document));