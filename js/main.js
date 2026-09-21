(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== "undefined";
  var hasSplitText = hasGSAP && typeof window.SplitText !== "undefined";

  if (hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (hasSplitText) gsap.registerPlugin(SplitText);
  }

  /* ============================================================
     Header scroll state
     ============================================================ */
  var header = document.querySelector("[data-header]");
  function updateHeader() {
    if (!header) return;
    header.classList.toggle("is-scrolled", (window.scrollY || window.pageYOffset) > 24);
  }
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();

  /* ============================================================
     Fullscreen menu
     ============================================================ */
  var menuToggle = document.querySelector("[data-menu-toggle]");
  var menu = document.querySelector("[data-menu]");

  function setMenu(open) {
    if (!menuToggle || !menu) return;
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("menu-is-open", open);
    if (open) {
      menu.hidden = false;
      requestAnimationFrame(function () {
        menu.setAttribute("data-open", "");
      });
    } else {
      menu.removeAttribute("data-open");
      window.setTimeout(function () {
        if (!menu.hasAttribute("data-open")) menu.hidden = true;
      }, reduceMotion ? 0 : 400);
    }
  }

  if (menuToggle && menu) {
    menuToggle.addEventListener("click", function () {
      var isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      setMenu(!isOpen);
    });
    menu.querySelectorAll("[data-menu-link]").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        menuToggle.focus();
      }
    });
  }

  /* ============================================================
     Footer year
     ============================================================ */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============================================================
     Hero title reveal (SplitText if available, CSS fade fallback)
     ============================================================ */
  var heroTitle = document.querySelector("[data-hero-title]");
  if (heroTitle && !reduceMotion) {
    if (hasSplitText) {
      var split = new SplitText(heroTitle, { type: "words" });
      gsap.from(split.words, {
        yPercent: 130,
        opacity: 0,
        duration: 0.9,
        stagger: 0.06,
        ease: "power3.out",
        delay: 0.15
      });
    } else {
      heroTitle.style.opacity = "0";
      heroTitle.style.transform = "translateY(24px)";
      heroTitle.style.transition = "opacity 0.8s cubic-bezier(0.16,0.84,0.24,1), transform 0.8s cubic-bezier(0.16,0.84,0.24,1)";
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          heroTitle.style.opacity = "1";
          heroTitle.style.transform = "translateY(0)";
        });
      });
    }
  }

  /* ============================================================
     Scroll reveals: [data-reveal] and [data-reveal-group] > [data-reveal-item]
     Uses ScrollTrigger when available; otherwise IntersectionObserver
     drives the same .is-revealed class the CSS already understands.
     ============================================================ */
  var revealTargets = Array.prototype.slice.call(
    document.querySelectorAll("[data-reveal], [data-reveal-item]")
  );

  if (hasScrollTrigger) {
    revealTargets.forEach(function (el, i) {
      var group = el.closest("[data-reveal-group]");
      var delay = group ? (i % 6) * 0.08 : 0;
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: function () {
          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            delay: delay,
            ease: "power3.out",
            onStart: function () { el.classList.add("is-revealed"); }
          });
        }
      });
    });
  } else if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealTargets.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealTargets.forEach(function (el) { el.classList.add("is-revealed"); });
  }

  /* ============================================================
     Magnetic buttons
     ============================================================ */
  var isTouch = window.matchMedia("(hover: none)").matches;
  if (!isTouch && !reduceMotion) {
    document.querySelectorAll("[data-magnetic]").forEach(function (btn) {
      var strength = 18;
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        var tx = (x / rect.width) * strength;
        var ty = (y / rect.height) * strength;
        if (hasGSAP) {
          gsap.to(btn, { x: tx, y: ty, duration: 0.35, ease: "power2.out" });
        } else {
          btn.style.transform = "translate(" + tx + "px, " + ty + "px)";
        }
      });
      btn.addEventListener("mouseleave", function () {
        if (hasGSAP) {
          gsap.to(btn, { x: 0, y: 0, duration: 0.45, ease: "elastic.out(1, 0.4)" });
        } else {
          btn.style.transform = "translate(0, 0)";
        }
      });
    });
  }

  /* ============================================================
     Red de creadoras — filters
     ============================================================ */
  var filtersRoot = document.querySelector("[data-filters]");
  var creatorsGrid = document.querySelector("[data-creators-grid]");
  var filterStatus = document.querySelector("[data-filter-status]");

  if (filtersRoot && creatorsGrid) {
    var activeFilters = {};

    function applyFilters() {
      var cards = creatorsGrid.querySelectorAll(".creator-card");
      var visibleCount = 0;
      cards.forEach(function (card) {
        var matches = Object.keys(activeFilters).every(function (group) {
          return card.getAttribute("data-" + group) === activeFilters[group];
        });
        card.hidden = !matches;
        if (matches) visibleCount++;
      });
      if (filterStatus) {
        filterStatus.textContent = visibleCount + " creadora" + (visibleCount === 1 ? "" : "s") + " encontrada" + (visibleCount === 1 ? "" : "s") + ".";
      }
    }

    filtersRoot.querySelectorAll(".filter-pill").forEach(function (pill) {
      pill.addEventListener("click", function () {
        if (pill.hasAttribute("data-filter-reset")) {
          activeFilters = {};
          filtersRoot.querySelectorAll(".filter-pill").forEach(function (p) {
            p.setAttribute("aria-pressed", p === pill ? "true" : "false");
          });
        } else {
          var group = pill.getAttribute("data-filter-group");
          var value = pill.getAttribute("data-filter-value");
          var isActive = pill.getAttribute("aria-pressed") === "true";

          if (isActive) {
            delete activeFilters[group];
            pill.setAttribute("aria-pressed", "false");
          } else {
            activeFilters[group] = value;
            filtersRoot.querySelectorAll('.filter-pill[data-filter-group="' + group + '"]').forEach(function (p) {
              p.setAttribute("aria-pressed", p === pill ? "true" : "false");
            });
          }

          var resetBtn = filtersRoot.querySelector("[data-filter-reset]");
          var anyActive = Object.keys(activeFilters).length > 0;
          if (resetBtn) resetBtn.setAttribute("aria-pressed", anyActive ? "false" : "true");
        }
        applyFilters();
      });
    });

    applyFilters();
  }

  /* ============================================================
     Clientes — pinned horizontal scroll carousel
     ============================================================ */
  var clientsSection = document.querySelector("[data-clients]");
  var clientsViewport = document.querySelector("[data-clients-viewport]");
  var clientsTrack = document.querySelector("[data-clients-track]");

  if (clientsSection && clientsViewport && clientsTrack && hasScrollTrigger && !reduceMotion) {
    var setPin = function () {
      var scrollDistance = clientsTrack.scrollWidth - clientsViewport.clientWidth;
      if (scrollDistance <= 0) return null;

      clientsSection.setAttribute("data-pinned", "");

      return ScrollTrigger.create({
        trigger: clientsSection,
        start: "top top",
        end: "+=" + (scrollDistance + window.innerHeight * 0.3),
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        animation: gsap.to(clientsTrack, {
          x: -scrollDistance,
          ease: "none"
        })
      });
    };

    var pinInstance = setPin();
    window.addEventListener("resize", function () {
      if (pinInstance) pinInstance.kill();
      gsap.set(clientsTrack, { x: 0 });
      pinInstance = setPin();
      ScrollTrigger.refresh();
    });
  }
  /* If GSAP/ScrollTrigger is unavailable, clients__viewport falls back to
     native horizontal scrolling via the CSS :not([data-pinned]) rule. */

  /* ============================================================
     Cotizador — validation + PDF export
     ============================================================ */
  var quoteForm = document.querySelector("[data-quote-form]");
  if (quoteForm) {
    var statusEl = quoteForm.querySelector("[data-quote-status]");
    var checkboxesWrap = quoteForm.querySelector("[data-service-checkboxes]");
    var submitBtn = quoteForm.querySelector('button[type="submit"]');

    function setStatus(text, state) {
      if (!statusEl) return;
      statusEl.textContent = text;
      if (state) statusEl.setAttribute("data-state", state);
      else statusEl.removeAttribute("data-state");
    }

    quoteForm.addEventListener("submit", function (e) {
      e.preventDefault();

      var name = quoteForm.querySelector("#q-name");
      var brand = quoteForm.querySelector("#q-brand");
      var email = quoteForm.querySelector("#q-email");
      var phone = quoteForm.querySelector("#q-phone");
      var notes = quoteForm.querySelector("#q-notes");
      var services = Array.prototype.slice
        .call(quoteForm.querySelectorAll('input[name="services"]:checked'))
        .map(function (input) { return input.value; });

      if (!quoteForm.reportValidity()) {
        setStatus("Revisa los campos obligatorios marcados en rojo.", "error");
        return;
      }
      if (services.length === 0) {
        setStatus("Selecciona al menos un servicio para continuar.", "error");
        if (checkboxesWrap) checkboxesWrap.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
        return;
      }
      if (typeof window.jspdf === "undefined") {
        setStatus("No se pudo generar el PDF. Revisa tu conexión e inténtalo de nuevo.", "error");
        return;
      }

      var originalLabel = submitBtn ? submitBtn.innerHTML : "";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Generando PDF...";
      }
      setStatus("Generando tu resumen en PDF...");

      window.setTimeout(function () {
        try {
          var jsPDF = window.jspdf.jsPDF;
          var doc = new jsPDF();
          var marginX = 20;
          var y = 30;

          doc.setFont("helvetica", "bold");
          doc.setFontSize(22);
          doc.text("RESUMEN DE COTIZACIÓN", marginX, y);

          y += 10;
          doc.setFontSize(12);
          doc.setFont("helvetica", "normal");
          doc.text("Agencia Mares", marginX, y);
          y += 7;
          doc.text("Fecha: " + new Date().toLocaleDateString(), marginX, y);

          y += 8;
          doc.setDrawColor(200, 200, 200);
          doc.line(marginX, y, 190, y);

          y += 15;
          doc.setFont("helvetica", "bold");
          doc.text("Datos de contacto", marginX, y);
          doc.setFont("helvetica", "normal");
          y += 10;
          doc.text("Nombre: " + (name ? name.value : "-"), marginX, y);
          y += 8;
          doc.text("Marca / Empresa: " + (brand && brand.value ? brand.value : "-"), marginX, y);
          y += 8;
          doc.text("Correo: " + (email ? email.value : "-"), marginX, y);
          y += 8;
          doc.text("WhatsApp: " + (phone ? phone.value : "-"), marginX, y);

          y += 14;
          doc.setFont("helvetica", "bold");
          doc.text("Servicios de interés", marginX, y);
          doc.setFont("helvetica", "normal");
          y += 10;
          services.forEach(function (service) {
            doc.text("• " + service, marginX, y);
            y += 8;
          });

          if (notes && notes.value.trim()) {
            y += 6;
            doc.setFont("helvetica", "bold");
            doc.text("Notas adicionales", marginX, y);
            doc.setFont("helvetica", "normal");
            y += 10;
            var splitNotes = doc.splitTextToSize(notes.value.trim(), 170);
            doc.text(splitNotes, marginX, y);
            y += splitNotes.length * 7;
          }

          doc.setFontSize(10);
          doc.setFont("helvetica", "italic");
          doc.text(
            "Este es un resumen de tu solicitud, no una cotización final. Te contactaremos para afinar el presupuesto.",
            marginX,
            270
          );

          var fileName = "Cotizacion_" + (brand && brand.value ? brand.value : name ? name.value : "AgenciaMares");
          doc.save(fileName.replace(/\s+/g, "_") + ".pdf");

          setStatus("¡Listo! Descargamos tu resumen en PDF. Te contactaremos pronto.", "success");
          if (submitBtn) {
            submitBtn.textContent = "PDF descargado ✓";
          }
        } catch (err) {
          setStatus("Ocurrió un error generando el PDF. Inténtalo de nuevo.", "error");
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalLabel;
          }
        }
      }, 400);
    });
  }
})();
