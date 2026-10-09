(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== "undefined";
  var hasSplitText = hasGSAP && typeof window.SplitText !== "undefined";

  if (hasScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    if (hasSplitText) gsap.registerPlugin(SplitText);
  }

  /* Small rAF tween so the preloader never depends on a CDN. */
  function tween(from, to, duration, ease, onUpdate, onDone) {
    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min(1, (now - start) / (duration * 1000));
      onUpdate(from + (to - from) * ease(t));
      if (t < 1) requestAnimationFrame(frame);
      else if (onDone) onDone();
    }
    requestAnimationFrame(frame);
  }
  function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

  /* ============================================================
     Site-ready gate: things that should play right after the
     preloader (hero reveal) wait for this.
     ============================================================ */
  var siteReady = false;
  var readyQueue = [];
  function onSiteReady(fn) { if (siteReady) fn(); else readyQueue.push(fn); }
  function markSiteReady() {
    if (siteReady) return;
    siteReady = true;
    root.classList.remove("preloading");
    readyQueue.forEach(function (fn) { fn(); });
    readyQueue = [];
    if (hasScrollTrigger) ScrollTrigger.refresh();
  }

  /* ============================================================
     Preloader — MARES PALABRA goes from cream (01) to the
     navy → orange gradient (02/03) with a slanted wipe.
     ============================================================ */
  var preloader = document.querySelector("[data-preloader]");
  if (!preloader || reduceMotion) {
    if (preloader) preloader.parentNode.removeChild(preloader);
    markSiteReady();
  } else {
    var plFill = preloader.querySelector("[data-preloader-fill]");
    var plCounts = preloader.querySelectorAll("[data-preloader-count]");
    var plLogos = preloader.querySelectorAll(".preloader__logo");
    var pageLoaded = document.readyState === "complete";
    window.addEventListener("load", function () { pageLoaded = true; });

    var SLANT = 14;
    var renderPreloader = function (p) {
      var top = p * (100 + SLANT);
      var bottom = top - SLANT;
      plFill.style.setProperty("--pl-edge-top", top + "%");
      plFill.style.setProperty("--pl-edge-bot", bottom + "%");
      var label = Math.round(p * 100) + "%";
      for (var i = 0; i < plCounts.length; i++) plCounts[i].textContent = label;
      var s = 0.94 + 0.06 * p;
      for (var j = 0; j < plLogos.length; j++) plLogos[j].style.transform = "scale(" + s + ")";
    };
    renderPreloader(0);

    var exitPreloader = function () {
      preloader.classList.add("is-done");
      preloader.style.animation = "none";
      window.setTimeout(markSiteReady, 380);
      tween(0, 1, 0.95, easeInOutCubic, function (v) {
        preloader.style.transform = "translate3d(0," + (-100 * v) + "%,0)";
      }, function () {
        if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
      });
    };

    var waitForLoad = function (cb) {
      var waited = 0;
      (function check() {
        if (pageLoaded || waited >= 2500) cb();
        else { waited += 100; window.setTimeout(check, 100); }
      })();
    };

    tween(0, 0.82, 1.25, easeInOutCubic, renderPreloader, function () {
      waitForLoad(function () {
        tween(0.82, 1, 0.45, easeOutExpo, renderPreloader, function () {
          window.setTimeout(exitPreloader, 320);
        });
      });
    });
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
     Masked word reveal (each word slides up from behind its own
     clipping box — exponential ease-out, short cascade).
     ============================================================ */
  function maskedWords(el) {
    return new SplitText(el, { type: "words", mask: "words", wordsClass: "split-word" });
  }

  var heroTitle = document.querySelector("[data-hero-title]");
  if (heroTitle && !reduceMotion) {
    if (hasSplitText) {
      var heroSplit = maskedWords(heroTitle);
      gsap.set(heroSplit.words, { yPercent: 115 });
      onSiteReady(function () {
        gsap.to(heroSplit.words, {
          yPercent: 0,
          duration: 0.9,
          stagger: 0.085,
          ease: "expo.out",
          delay: 0.1
        });
      });
    } else {
      heroTitle.style.opacity = "0";
      heroTitle.style.transform = "translateY(24px)";
      heroTitle.style.transition = "opacity 0.8s cubic-bezier(0.16,1,0.3,1), transform 0.8s cubic-bezier(0.16,1,0.3,1)";
      onSiteReady(function () {
        requestAnimationFrame(function () {
          heroTitle.style.opacity = "1";
          heroTitle.style.transform = "translateY(0)";
        });
      });
    }
  }

  /* ============================================================
     Hero blobs — mouse parallax (desktop/hover only)
     ============================================================ */
  var heroSection = document.querySelector(".hero");
  var blobBlue = document.querySelector(".hero__blob--blue");
  var blobOrange = document.querySelector(".hero__blob--orange");
  var isTouchEarly = window.matchMedia("(hover: none)").matches;
  if (heroSection && blobBlue && blobOrange && hasGSAP && !isTouchEarly && !reduceMotion) {
    heroSection.addEventListener("mousemove", function (e) {
      var rect = heroSection.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      gsap.to(blobBlue, { x: px * 40, y: py * 40, duration: 0.9, ease: "power2.out" });
      gsap.to(blobOrange, { x: px * -55, y: py * -55, duration: 0.9, ease: "power2.out" });
    });
    heroSection.addEventListener("mouseleave", function () {
      gsap.to([blobBlue, blobOrange], { x: 0, y: 0, duration: 1, ease: "power2.out" });
    });
  }

  /* ============================================================
     Section headings — masked word reveal on scroll.
     ============================================================ */
  if (hasSplitText && hasScrollTrigger && !reduceMotion) {
    var sectionHeadings = Array.prototype.slice
      .call(document.querySelectorAll("main h2"))
      .filter(function (h) { return !h.closest(".hero"); });

    sectionHeadings.forEach(function (h) {
      var headingSplit = maskedWords(h);
      gsap.set(headingSplit.words, { yPercent: 115 });
      ScrollTrigger.create({
        trigger: h,
        start: "top 86%",
        once: true,
        onEnter: function () {
          gsap.to(headingSplit.words, {
            yPercent: 0,
            duration: 0.8,
            stagger: 0.075,
            ease: "expo.out"
          });
        }
      });
    });
  }

  /* ============================================================
     Statement section — big lines slide in, alternating sides
     ============================================================ */
  if (hasSplitText && hasScrollTrigger && !reduceMotion) {
    var statementLines = Array.prototype.slice.call(document.querySelectorAll("[data-split-line]"));
    statementLines.forEach(function (line, i) {
      var lineSplit = new SplitText(line, { type: "words", wordsClass: "split-word" });
      var fromX = i % 2 === 0 ? -70 : 70;
      gsap.set(lineSplit.words, { opacity: 0, x: fromX });
      ScrollTrigger.create({
        trigger: line,
        start: "top 88%",
        once: true,
        onEnter: function () {
          gsap.to(lineSplit.words, {
            opacity: 1,
            x: 0,
            duration: 0.85,
            stagger: 0.05,
            ease: "power3.out"
          });
        }
      });
    });

    var statementWave = document.querySelector("[data-statement-wave]");
    if (statementWave) {
      gsap.fromTo(statementWave, { xPercent: 14, rotate: -3 }, {
        xPercent: -10,
        rotate: 2,
        ease: "none",
        scrollTrigger: { trigger: ".statement", start: "top bottom", end: "bottom top", scrub: true }
      });
    }
  } else {
    document.querySelectorAll("[data-split-line]").forEach(function (line) {
      line.style.opacity = "1";
    });
  }

  /* ============================================================
     Scroll reveals: [data-reveal] and [data-reveal-group] > [data-reveal-item]
     Uses ScrollTrigger when available; otherwise IntersectionObserver
     drives the same .is-revealed class the CSS already understands.
     Hero elements wait for the preloader to finish.
     ============================================================ */
  var revealTargets = Array.prototype.slice.call(
    document.querySelectorAll("[data-reveal], [data-reveal-item]")
  );

  document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
    var items = group.querySelectorAll("[data-reveal-item]");
    items.forEach(function (item, i) {
      item.classList.add(i % 2 === 0 ? "reveal-item--left" : "reveal-item--right");
    });
  });

  function revealNow(el, delay) {
    if (hasGSAP) {
      gsap.to(el, {
        opacity: 1, x: 0, y: 0, rotate: 0,
        duration: 0.75, delay: delay, ease: "power3.out",
        onStart: function () { el.classList.add("is-revealed"); }
      });
    } else {
      window.setTimeout(function () { el.classList.add("is-revealed"); }, delay * 1000);
    }
  }

  var heroIndex = 0;
  revealTargets = revealTargets.filter(function (el) {
    if (!el.closest(".hero")) return true;
    var d = 0.45 + heroIndex++ * 0.12;
    onSiteReady(function () { revealNow(el, d); });
    return false;
  });

  if (hasScrollTrigger) {
    revealTargets.forEach(function (el, i) {
      var group = el.closest("[data-reveal-group]");
      var delay = group ? (i % 6) * 0.08 : 0;
      ScrollTrigger.create({
        trigger: el,
        start: "top 88%",
        once: true,
        onEnter: function () { revealNow(el, delay); }
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
     Scroll position → brand colour. Feeds both the MARES OLA
     progress indicator and the cursor tint.
     Stops follow the corporate gradient: orange → plum → navy → orange.
     ============================================================ */
  var COLOR_STOPS = [
    [0, [255, 86, 48]],
    [0.35, [107, 63, 92]],
    [0.7, [44, 48, 73]],
    [1, [255, 86, 48]]
  ];
  function colorAt(p) {
    for (var i = 1; i < COLOR_STOPS.length; i++) {
      if (p <= COLOR_STOPS[i][0]) {
        var a = COLOR_STOPS[i - 1], b = COLOR_STOPS[i];
        var t = (p - a[0]) / (b[0] - a[0]);
        var c = [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * t); });
        return "rgb(" + c.join(",") + ")";
      }
    }
    return "rgb(255,86,48)";
  }

  var waveProgress = document.querySelector("[data-wave-progress]");
  var waveClip = document.querySelector("[data-wave-clip]");
  var scrollTicking = false;
  function updateScrollProgress() {
    scrollTicking = false;
    var y = window.scrollY || window.pageYOffset;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, y / max));
    root.style.setProperty("--cursor-color", colorAt(p));
    if (waveClip) waveClip.setAttribute("width", (p * 1052).toFixed(1));
    if (waveProgress) {
      waveProgress.classList.toggle("is-visible", y > window.innerHeight * 0.4);
      waveProgress.setAttribute("aria-label", "Volver arriba (" + Math.round(p * 100) + "% recorrido)");
    }
  }
  window.addEventListener("scroll", function () {
    if (!scrollTicking) { scrollTicking = true; requestAnimationFrame(updateScrollProgress); }
  }, { passive: true });
  window.addEventListener("resize", updateScrollProgress);
  updateScrollProgress();

  /* ============================================================
     macOS-style cursor: orange arrow, 2px white outline. Scales to
     0.88 on press and emits an expanding ring. Mouse devices only.
     ============================================================ */
  var cursor = document.querySelector("[data-cursor]");
  var cursorRing = document.querySelector("[data-cursor-ring]");
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (cursor && finePointer) {
    var cx = -100, cy = -100, cursorQueued = false;
    var paintCursor = function () {
      cursorQueued = false;
      cursor.style.transform = "translate3d(" + (cx - 3) + "px," + (cy - 3) + "px,0)";
    };
    window.addEventListener("mousemove", function (e) {
      cx = e.clientX; cy = e.clientY;
      if (!root.classList.contains("has-mares-cursor")) root.classList.add("has-mares-cursor");
      cursor.classList.remove("is-hidden");
      if (!cursorQueued) { cursorQueued = true; requestAnimationFrame(paintCursor); }
    }, { passive: true });
    document.addEventListener("mouseleave", function () { cursor.classList.add("is-hidden"); });
    document.addEventListener("mouseover", function (e) {
      var interactive = e.target.closest && e.target.closest("a, button, label, input, textarea, select, [role='button']");
      cursor.classList.toggle("is-hover", !!interactive);
    });
    window.addEventListener("mousedown", function () {
      cursor.classList.add("is-pressed");
      if (cursorRing && !reduceMotion && cursorRing.animate) {
        cursorRing.animate([
          { transform: "translate3d(" + (cx - 22) + "px," + (cy - 22) + "px,0) scale(0.3)", opacity: 0.9 },
          { transform: "translate3d(" + (cx - 22) + "px," + (cy - 22) + "px,0) scale(1.7)", opacity: 0 }
        ], { duration: 520, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
      }
    });
    window.addEventListener("mouseup", function () { cursor.classList.remove("is-pressed"); });
    window.addEventListener("blur", function () { cursor.classList.remove("is-pressed"); });
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
