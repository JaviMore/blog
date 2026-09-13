(function () {
  "use strict";

  /* ---------- Theme toggle ---------- */
  function initTheme() {
    var toggle = document.getElementById("theme-toggle");
    if (!toggle) return;

    function current() {
      return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    }

    toggle.setAttribute("aria-pressed", current() === "dark" ? "true" : "false");

    toggle.addEventListener("click", function () {
      var next = current() === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      toggle.setAttribute("aria-pressed", next === "dark" ? "true" : "false");

      var meta = document.getElementById("theme-color-meta");
      if (meta) meta.setAttribute("content", next === "dark" ? "#0d1920" : "#faf8f4");

      try {
        localStorage.setItem("theme", next);
      } catch (e) {}
    });
  }

  /* ---------- Mobile nav ---------- */
  function initMobileNav() {
    var header = document.getElementById("site-header");
    var button = document.getElementById("menu-toggle");
    var nav = document.getElementById("mobile-nav");
    if (!header || !button || !nav) return;

    function close() {
      header.classList.remove("menu-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Abrir menú");
    }

    button.addEventListener("click", function () {
      var isOpen = header.classList.toggle("menu-open");
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
      button.setAttribute("aria-label", isOpen ? "Cerrar menú" : "Abrir menú");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) close();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });

    document.addEventListener("click", function (event) {
      if (!header.classList.contains("menu-open")) return;
      if (header.contains(event.target)) return;
      close();
    });
  }

  /* ---------- Sticky header shadow on scroll ---------- */
  function initHeaderScrollState() {
    var header = document.getElementById("site-header");
    if (!header) return;

    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 4);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
  }

  /* ---------- Scroll reveal ---------- */
  function initScrollReveal() {
    var items = document.querySelectorAll(".reveal");
    if (!items.length) return;

    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      items.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );

    items.forEach(function (el) { observer.observe(el); });
  }

  /* ---------- Copy button on code blocks ---------- */
  function initCodeCopy() {
    var blocks = document.querySelectorAll(".prose pre");
    blocks.forEach(function (pre) {
      var code = pre.querySelector("code");
      if (!code) return;

      var button = document.createElement("button");
      button.type = "button";
      button.className = "copy-btn";
      button.textContent = "Copiar";
      button.setAttribute("aria-label", "Copiar código");
      pre.appendChild(button);

      button.addEventListener("click", function () {
        var text = code.innerText;
        var done = function () {
          button.textContent = "¡Copiado!";
          setTimeout(function () {
            button.textContent = "Copiar";
          }, 1600);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {});
        } else {
          var textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.style.position = "fixed";
          textarea.style.opacity = "0";
          document.body.appendChild(textarea);
          textarea.select();
          try { document.execCommand("copy"); done(); } catch (e) {}
          document.body.removeChild(textarea);
        }
      });
    });
  }

  function init() {
    initTheme();
    initMobileNav();
    initHeaderScrollState();
    initScrollReveal();
    initCodeCopy();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
