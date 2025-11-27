(function ($, Drupal, drupalSettings) {
  Drupal.behaviors.idtTheme = {
    attach: function (context) {
      const qs = (selector, scope = context) => scope.querySelector(selector);

      /* ------------------------------
       * TOP NAV
       * ------------------------------ */
      once("idt-top-nav", ".top-nav", context).forEach((topNav) => {
        const toggleButton = qs(".top-nav__toggle", topNav);
        const mobileMenu = qs("#mobile-quick-nav");
        const toggleText = qs(".top-nav__toggle-text");

        if (!toggleButton || !mobileMenu) return;

        const labels = {
          open: "Cerrar menú principal",
          closed: "Abrir menú principal",
        };

        const setState = (open) => {
          toggleButton.setAttribute("aria-expanded", String(open));
          toggleButton.setAttribute(
            "aria-label",
            open ? labels.open : labels.closed
          );

          if (toggleText)
            toggleText.textContent = open ? labels.open : labels.closed;

          topNav.classList.toggle("top-nav--menu-open", open);
          mobileMenu.setAttribute("aria-hidden", open ? "false" : "true");
        };

        setState(false);

        toggleButton.addEventListener("click", () => {
          const nextState =
            toggleButton.getAttribute("aria-expanded") !== "true";
          setState(nextState);
        });

        toggleButton.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            setState(false);
            toggleButton.blur();
          }
        });
      });

      /* ------------------------------
       * UPDATE YEAR
       * ------------------------------ */
      once("idt-year", "#year", context).forEach((yearNode) => {
        yearNode.textContent = new Date().getFullYear();
      });

      /* ------------------------------
       * CTA BUTTON
       * ------------------------------ */
      once("idt-cta", "#cta-primary", context).forEach((button) => {
        button.addEventListener("click", () => {
          button.textContent = "Gracias por tu interes";
          button.disabled = true;
        });
      });

      /* ------------------------------
       * SYNC SELECT LABEL
       * ------------------------------ */
      const syncSelectLabel = (key, selectSelector, labelSelector) => {
        once(key, selectSelector, context).forEach((select) => {
          const label = qs(labelSelector);
          if (!label) return;

          const update = () => {
            const option = select.selectedOptions[0];
            if (option) label.textContent = option.textContent.trim();
          };

          update();
          select.addEventListener("change", update);
        });
      };

      syncSelectLabel("sync-stopover", 'select[name="stopover"]', ".pill--light .pill__label");
      syncSelectLabel("sync-language", 'select[name="language"]', ".pill--flag .pill__value");


      /* ------------------------------
       * LANGUAGE SELECTOR
       * ------------------------------ */
      once("idt-language-selector", 'select[name="language"]', context).forEach(
        (select) => {
          const valueNode = qs(".pill--flag .pill__value");
          const flagNode = qs(".pill--flag .pill__flag");

          if (!valueNode || !flagNode) return;

          const flagMap = {
            en: { className: "fi fi-gb", label: "EN" },
            es: { className: "fi fi-es", label: "ES" },
          };

          const update = () => {
            const config = flagMap[select.value] || flagMap.en;
            valueNode.textContent = config.label;
            flagNode.className = `pill__flag ${config.className}`;
          };

          update();
          select.addEventListener("change", update);
        }
      );

      /* ------------------------------
       * INFINITE CAROUSELS
       * ------------------------------ */
      once("idt-carousel", "[data-carousel]", context).forEach((carousel) => {
        const viewport = carousel.querySelector("[data-carousel-viewport]");
        const track = carousel.querySelector("[data-carousel-track]");
        const prevBtn = carousel.querySelector("[data-carousel-prev]");
        const nextBtn = carousel.querySelector("[data-carousel-next]");

        if (!viewport || !track || !prevBtn || !nextBtn) return;

        const originals = [...track.querySelectorAll("[data-carousel-item]")];
        if (!originals.length) return;

        const indicatorsContainer = carousel.querySelector(
          "[data-carousel-indicators]"
        );
        // Identificar a qué carrusel pertenece
        const carouselId = carousel.getAttribute("data-carousel-id");

        // Obtener únicamente las tabs que apunten a este carrusel
        let indicatorButtons = [
          ...document.querySelectorAll(`[data-carousel-indicator][data-carousel-target="${carouselId}"]`)
        ];

        if (indicatorsContainer) {
          indicatorsContainer.innerHTML = "";
          indicatorButtons = originals.map((_, i) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.setAttribute("aria-label", `Ir al elemento ${i + 1}`);
            indicatorsContainer.appendChild(btn);
            return btn;
          });
        }

        const cloneItem = (item) => {
          const clone = item.cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          return clone;
        };

        originals.forEach((item) => track.appendChild(cloneItem(item)));
        [...originals].reverse().forEach((item) => {
          track.insertBefore(cloneItem(item), track.firstChild);
        });

        let step = 0;
        const calcStep = () => {
          const first = track.querySelector("[data-carousel-item]");
          if (!first) return;
          const gap =
            parseFloat(
              getComputedStyle(track).columnGap ||
              getComputedStyle(track).gap ||
              "0"
            ) || 0;

          step = first.getBoundingClientRect().width + gap;
        };

        const totalItems = track.querySelectorAll(
          "[data-carousel-item]"
        ).length;
        const baseCount = originals.length;
        const minIndex = baseCount;
        const maxIndex = totalItems - baseCount;

        let index = minIndex;
        let isAnimating = false;

        const updateIndicators = () => {
          if (!indicatorButtons.length) return;

          const relativeIndex =
            (((index - minIndex) % baseCount) + baseCount) % baseCount;

          indicatorButtons.forEach((btn, i) => {
            const active = i === relativeIndex;
            btn.setAttribute("aria-selected", active ? "true" : "false");
            btn.classList.toggle("is-active", active);
          });
        };

        const jumpTo = (n) => {
          viewport.scrollLeft = n * step;
          updateIndicators();
        };

        const animateTo = (n) => {
          if (!step) return;
          isAnimating = true;

          const target = n * step;

          const onScroll = () => {
            if (Math.abs(viewport.scrollLeft - target) < 1) {
              cleanup();
              finalize();
            }
          };

          const finalize = () => {
            isAnimating = false;

            if (index >= maxIndex) {
              index = minIndex;
              jumpTo(index);
            } else if (index < minIndex) {
              index = maxIndex - 1;
              jumpTo(index);
            }
          };

          const cleanup = () => {
            viewport.removeEventListener("scroll", onScroll);
            clearTimeout(timeout);
          };

          viewport.addEventListener("scroll", onScroll);
          const timeout = setTimeout(() => {
            cleanup();
            finalize();
          }, 500);

          viewport.scrollTo({ left: target, behavior: "smooth" });
          updateIndicators();
        };

        const move = (dir) => {
          if (isAnimating) return;
          index += dir;
          animateTo(index);
        };

        prevBtn.addEventListener("click", () => move(-1));
        nextBtn.addEventListener("click", () => move(1));

        // Swipe
        let startX = 0;
        let deltaX = 0;

        viewport.addEventListener(
          "touchstart",
          (e) => {
            if (e.touches.length !== 1) return;
            startX = e.touches[0].clientX;
            deltaX = 0;
          },
          { passive: true }
        );

        viewport.addEventListener(
          "touchmove",
          (e) => {
            deltaX = e.touches[0].clientX - startX;
          },
          { passive: true }
        );

        viewport.addEventListener("touchend", () => {
          if (Math.abs(deltaX) > 40) {
            move(deltaX < 0 ? 1 : -1);
          }
        });

        if (indicatorButtons.length) {
          indicatorButtons.forEach((btn, i) => {
            btn.addEventListener("click", () => {
              if (isAnimating) return;
              index = minIndex + i;
              animateTo(index);
            });
          });
        }

        const handleResize = () => {
          calcStep();
          jumpTo(index);
        };

        window.addEventListener("resize", handleResize);

        calcStep();
        jumpTo(index);
        updateIndicators();
      });

      /* ------------------------------
       * DETAIL GALLERY
       * ------------------------------ */
      once("idt-detail-gallery", "[data-detail-gallery]", context).forEach(
        (gallery) => {
          const mainImage = gallery.querySelector("[data-gallery-image]");
          const captionNode = gallery.querySelector("[data-gallery-caption]");
          const thumbs = [...gallery.querySelectorAll("[data-gallery-thumb]")];

          // NUEVO: obtener imágenes cuando no hay thumbs
          let items = thumbs;

          if (thumbs.length === 0) {
            items = [...gallery.querySelectorAll("[data-gallery-item]")];
          }

          if (!mainImage || items.length === 0) return;

          const prevBtn = gallery.querySelector("[data-gallery-prev]");
          const nextBtn = gallery.querySelector("[data-gallery-next]");

          let currentIndex = 0;

          const apply = (i) => {
            const target = items[i];
            const { image, caption, alt } = target.dataset;

            if (image) mainImage.src = image;
            if (alt) mainImage.alt = alt;
            if (captionNode) captionNode.textContent = caption || "";
            currentIndex = i;
          };

          apply(0);

          const move = (dir) => {
            const total = items.length;
            const next = (currentIndex + dir + total) % total;
            apply(next);
          };

          if (prevBtn) prevBtn.addEventListener("click", () => move(-1));
          if (nextBtn) nextBtn.addEventListener("click", () => move(1));
        }
      );


      /* ------------------------------
       * LIVEBOX MAP
       * ------------------------------ */
      once("idt-map-livebox", "[data-map-trigger]", context).forEach(() => {
        const trigger = qs("[data-map-trigger]");
        const livebox = qs("[data-map-livebox]");
        if (!trigger || !livebox) return;

        const dialog = livebox.querySelector(".map-livebox__dialog");
        const closeButtons = livebox.querySelectorAll("[data-map-close]");
        let lastFocus = null;
        let timeout = null;

        const showLivebox = () => {
          if (!livebox.hidden) return;
          lastFocus = document.activeElement;
          livebox.hidden = false;
          livebox.setAttribute("aria-hidden", "false");

          requestAnimationFrame(() => {
            livebox.classList.add("is-open");
            dialog?.focus();
          });
        };

        const hideLivebox = () => {
          if (livebox.hidden) return;

          livebox.classList.remove("is-open");

          if (timeout) clearTimeout(timeout);

          timeout = setTimeout(() => {
            livebox.hidden = true;
            livebox.setAttribute("aria-hidden", "true");
            if (lastFocus?.focus) lastFocus.focus();
          }, 220);
        };

        trigger.addEventListener("click", showLivebox);
        closeButtons.forEach((b) => b.addEventListener("click", hideLivebox));

        window.addEventListener("keydown", (e) => {
          if (e.key === "Escape" && !livebox.hidden) hideLivebox();
        });
      });

      /* ------------------------------
       * DETAIL ROOMS TABS
       * ------------------------------ */
      once("idt-detail-rooms", ".detail-rooms", context).forEach((section) => {
        const tabs = section.querySelectorAll(".rooms-tab");
        const cards = section.querySelectorAll(".room-card");

        if (!tabs.length || !cards.length) return;

        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const index = tab.dataset.roomIndex;

            tabs.forEach((btn) => {
              const active = btn === tab;
              btn.classList.toggle("is-active", active);
              btn.setAttribute("aria-selected", active ? "true" : "false");
            });

            cards.forEach((card) => {
              card.style.display =
                card.dataset.roomIndex === index ? "block" : "none";
            });
          });
        });
      });

      /* ------------------------------
       * RANGE BUBBLES
       * ------------------------------ */
      once("idt-range-bubbles", "[data-range-control]", context).forEach(
        (control) => {
          const input = control.querySelector('input[type="range"]');
          const valueNode = control.querySelector("[data-range-value]");
          if (!input || !valueNode) return;

          const update = () => {
            const min = Number(input.min) || 0;
            const max = Number(input.max) || 100;
            const val = Number(input.value) || 0;

            const percent = max === min ? 0 : ((val - min) / (max - min)) * 100;
            const clamped = Math.max(0, Math.min(100, percent));

            valueNode.textContent = val.toLocaleString("es-CO");
            control.style.setProperty("--range-progress", `${clamped}%`);
          };

          input.addEventListener("input", update);
          input.addEventListener("change", update);

          update();
        }
      );
      /* ------------------------------
 * PLACES FILTER (Drupal behavior)
 * ------------------------------ */
      once("idt-places-filter", "#places", context).forEach((wrapper) => {
        // Si prefieres usar la clase: once("idt-places-filter", ".places", context)

        if (!wrapper) {
          console.warn("Places filter: no se encontró el contenedor #places en el contexto.");
          return;
        }

        const chips = wrapper.querySelectorAll(".places-chip");
        const range = wrapper.querySelector("[data-range-control] input[type='range']");
        const rangeValue = wrapper.querySelector("[data-range-value]");
        const locationSelect = wrapper.querySelector("select[name='location']");
        const cards = wrapper.querySelectorAll(".place-card");

        // Debug (opcional) — coméntalo si no quieres logs
        // console.log('places filter init', { chips, range, rangeValue, locationSelect, cards });

        // Estado actual de filtros
        let filters = {
          types: [],
          capacity: 0,
          location: null,
        };

        /** RANGO **/
        if (range && rangeValue) {
          range.addEventListener("input", (e) => {
            rangeValue.textContent = e.target.value;
            filters.capacity = parseInt(e.target.value, 10) || 0;
            applyFilters();
          });
        }

        /** SELECT UBICACIÓN **/
        if (locationSelect) {
          locationSelect.addEventListener("change", (e) => {
            filters.location = e.target.value || null;
            applyFilters();
          });
        }

        /** CHIPS **/
        if (chips && chips.length) {
          chips.forEach((chip) => {
            chip.addEventListener("click", () => {
              const labelNode = chip.querySelector(".places-chip__label");
              const label = labelNode ? labelNode.textContent.trim() : null;
              if (!label) return;

              chip.classList.toggle("places-chip--muted");

              if (filters.types.includes(label)) {
                filters.types = filters.types.filter((t) => t !== label);
              } else {
                filters.types.push(label);
              }

              applyFilters();
            });
          });
        }

        /** FUNCIÓN DE FILTRO **/
        function applyFilters() {
          if (!cards) return;

          cards.forEach((card) => {
            let visible = true;

            // Tipo (chips)
            if (filters.types.length > 0) {
              const titleNode = card.querySelector(".place-card__title");
              const title = titleNode ? titleNode.textContent.toLowerCase() : "";
              visible = filters.types.some((t) => title.includes(t.toLowerCase()));
            }

            // Capacidad
            const cardCapacity = parseInt(card.dataset.capacity || 0, 10) || 0;
            if (filters.capacity > 0 && cardCapacity < filters.capacity) {
              visible = false;
            }

            // Ubicación
            const cardLocation = card.dataset.location || null;
            if (filters.location && cardLocation != filters.location) {
              visible = false;
            }

            card.style.display = visible ? "" : "none";
            // si usas layout grid/flex, "" restablece al default, "none" oculta.
          });
        }

        // Si quieres que aplique filtros al inicio (por ej. hay un valor por defecto)
        applyFilters();
      });



      /* ------------------------------
       * EVENTS FILTER (NUEVO)
       * ------------------------------ */
      once("idt-events-filter", ".events__filters", context).forEach((filtersWrapper) => {

        const buttons = filtersWrapper.querySelectorAll("button");
        const cards = context.querySelectorAll(".event-card");

        if (!buttons.length || !cards.length) {
          console.warn("Events filter: No encontró botones o cards");
          return;
        }

        buttons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const buttonActive = filtersWrapper.querySelector("button.active");
            console.log(buttonActive);
            if (buttonActive) {
              buttonActive.classList.remove('active');
            }
            btn.classList.add('active')
            const tid = btn.dataset.tid;

            cards.forEach((card) => {
              const types = (card.dataset.type || "")
                .split(",")
                .map((v) => v.trim());

              if (tid === "all") {
                // Botón TODOS
                card.style.display = "";
              } else if (types.includes(tid)) {
                card.style.display = "";
              } else {
                card.style.display = "none";
              }
            });
          });
        });
      });

      once("gallery-open", ".open-gallery", context).forEach(function (button) {

        const modal = document.getElementById("gallery-modal");
        const track = document.getElementById("carousel-track");

        let images = [];
        let index = 0;

        // Abrir modal
        button.addEventListener("click", function () {
          images = JSON.parse(button.dataset.gallery);
          index = 0;

          track.innerHTML = images
            .map(img => `
              <div class="carousel__item">
                <img src="${img.url}" alt="${img.alt}">
              </div>
            `)
            .join("");

          modal.removeAttribute("hidden");
          updateCarousel();
        });

        once("gallery-prev", "[data-prev]", context).forEach(function (prevBtn) {
          prevBtn.addEventListener("click", function () {
            index = (index - 1 + images.length) % images.length;
            updateCarousel();
          });
        });

        once("gallery-next", "[data-next]", context).forEach(function (nextBtn) {
          nextBtn.addEventListener("click", function () {
            index = (index + 1) % images.length;
            updateCarousel();
          });
        });

        once("gallery-close", "[data-close-modal]", context).forEach(function (closeBtn) {
          closeBtn.addEventListener("click", function () {
            modal.setAttribute("hidden", true);
          });
        });

        function updateCarousel() {
          track.style.transform = "translateX(-" + (index * 100) + "%)";
        }
      });

    }, // end attach
  };
})(jQuery, Drupal, drupalSettings);
