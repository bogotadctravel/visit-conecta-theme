(function ($, Drupal, drupalSettings) {
  Drupal.behaviors.idtTheme = {
    attach: function (context, settings) {
      const topNav = context.querySelector(".top-nav");
      const toggleButton = context.querySelector(".top-nav__toggle");
      const mobileMenu = context.querySelector("#mobile-quick-nav");
      const toggleText = context.querySelector(".top-nav__toggle-text");

      if (topNav && toggleButton && mobileMenu) {
        const labels = {
          open: "Cerrar menú principal",
          closed: "Abrir menú principal",
        };

        const setState = (isOpen) => {
          toggleButton.setAttribute("aria-expanded", String(isOpen));
          toggleButton.setAttribute(
            "aria-label",
            isOpen ? labels.open : labels.closed
          );
          if (toggleText) {
            toggleText.textContent = isOpen ? labels.open : labels.closed;
          }
          topNav.classList.toggle("top-nav--menu-open", isOpen);
          mobileMenu.setAttribute("aria-hidden", isOpen ? "false" : "true");
        };

        setState(false);

        toggleButton.addEventListener("click", () => {
          const nextState =
            toggleButton.getAttribute("aria-expanded") !== "true";
          setState(nextState);
        });

        toggleButton.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            setState(false);
            toggleButton.blur();
          }
        });
      }
      const qs = (selector, scope = context) => scope.querySelector(selector);

      const updateYear = () => {
        const yearNode = qs("#year");
        if (yearNode) {
          yearNode.textContent = new Date().getFullYear();
        }
      };

      const wireCTA = () => {
        const button = qs("#cta-primary");
        if (!button) return;

        button.addEventListener("click", () => {
          button.textContent = "Gracias por tu interes";
          button.disabled = true;
        });
      };

      const syncSelectLabel = (selectSelector, labelSelector) => {
        const select = context.querySelector(selectSelector);
        const label = context.querySelector(labelSelector);
        if (!select || !label) return;

        const update = () => {
          const option = select.selectedOptions[0];
          if (option) {
            label.textContent = option.textContent.trim();
          }
        };

        update();
        select.addEventListener("change", update);
      };

      const wireLanguageSelector = () => {
        const select = qs('select[name="language"]');
        const valueNode = qs(".pill--flag .pill__value");
        const flagNode = qs(".pill--flag .pill__flag");

        if (!select || !valueNode || !flagNode) {
          return;
        }

        const flagMap = {
          en: { className: "fi fi-gb", label: "EN" },
          es: { className: "fi fi-es", label: "ES" },
        };

        const update = () => {
          const config = flagMap[select.value] ?? flagMap.en;
          valueNode.textContent = config.label;
          flagNode.className = `pill__flag ${config.className}`;
        };

        update();
        select.addEventListener("change", update);
      };

      const initInfiniteCarousel = (carousel) => {
        if (carousel.dataset.carouselInit === "true") {
          return;
        }

        const viewport = carousel.querySelector("[data-carousel-viewport]");
        const track = carousel.querySelector("[data-carousel-track]");
        const prevBtn = carousel.querySelector("[data-carousel-prev]");
        const nextBtn = carousel.querySelector("[data-carousel-next]");

        if (!viewport || !track || !prevBtn || !nextBtn) {
          return;
        }

        const originals = [...track.querySelectorAll("[data-carousel-item]")];
        if (!originals.length) {
          return;
        }

        const indicatorsContainer = carousel.querySelector(
          "[data-carousel-indicators]"
        );
        let indicatorButtons = [];
        if (indicatorsContainer) {
          indicatorsContainer.innerHTML = "";
          indicatorButtons = originals.map((_, i) => {
            const btn = context.createElement("button");
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
          indicatorButtons.forEach((btn, idx) => {
            btn.setAttribute(
              "aria-current",
              idx === relativeIndex ? "true" : "false"
            );
          });
        };

        const jumpTo = (position) => {
          viewport.scrollLeft = position * step;
          updateIndicators();
        };

        const animateTo = (position) => {
          if (!step) return;
          isAnimating = true;
          const target = position * step;
          const onScroll = () => {
            if (Math.abs(viewport.scrollLeft - target) < 1) {
              cleanup();
              finalizePosition();
            }
          };

          const finalizePosition = () => {
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
            clearTimeout(timeoutId);
          };

          viewport.addEventListener("scroll", onScroll);
          const timeoutId = setTimeout(() => {
            cleanup();
            finalizePosition();
          }, 500);

          viewport.scrollTo({ left: target, behavior: "smooth" });
          updateIndicators();
        };

        const move = (direction) => {
          if (isAnimating) return;
          index += direction;
          animateTo(index);
        };

        prevBtn.addEventListener("click", () => move(-1));
        nextBtn.addEventListener("click", () => move(1));

        // touch interactions
        let touchStartX = 0;
        let touchDeltaX = 0;

        const onTouchStart = (event) => {
          if (event.touches.length !== 1) return;
          touchStartX = event.touches[0].clientX;
          touchDeltaX = 0;
        };

        const onTouchMove = (event) => {
          if (!touchStartX) return;
          touchDeltaX = event.touches[0].clientX - touchStartX;
        };

        const onTouchEnd = () => {
          if (Math.abs(touchDeltaX) > 40) {
            move(touchDeltaX < 0 ? 1 : -1);
          }
          touchStartX = 0;
          touchDeltaX = 0;
        };

        viewport.addEventListener("touchstart", onTouchStart, {
          passive: true,
        });
        viewport.addEventListener("touchmove", onTouchMove, { passive: true });
        viewport.addEventListener("touchend", onTouchEnd);
        viewport.addEventListener("touchcancel", onTouchEnd);

        if (indicatorButtons.length) {
          indicatorButtons.forEach((btn, idx) => {
            btn.addEventListener("click", () => {
              if (isAnimating) return;
              index = minIndex + idx;
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
        carousel.dataset.carouselInit = "true";
        updateIndicators();
      };

      const initCarousels = () => {
        context.querySelectorAll("[data-carousel]").forEach((carousel) => {
          initInfiniteCarousel(carousel);
        });
      };

      const initDetailGallery = () => {
        const gallery = context.querySelector("[data-detail-gallery]");
        if (!gallery) return;

        const mainImage = gallery.querySelector("[data-gallery-image]");
        const captionNode = gallery.querySelector("[data-gallery-caption]");
        const thumbs = Array.from(
          gallery.querySelectorAll("[data-gallery-thumb]")
        );
        if (!mainImage || !thumbs.length) return;

        const prevBtn = gallery.querySelector("[data-gallery-prev]");
        const nextBtn = gallery.querySelector("[data-gallery-next]");

        const getLabel = (thumb) => {
          const label = thumb.querySelector(".gallery-thumbs__label");
          return label
            ? label.textContent.trim()
            : thumb.getAttribute("aria-label") || "";
        };

        const applyThumb = (index) => {
          const target = thumbs[index];
          if (!target) return;
          const { image, caption, alt } = target.dataset;
          if (image) {
            mainImage.src = image;
          }
          mainImage.alt = alt || getLabel(target);
          if (captionNode) {
            captionNode.textContent = caption || getLabel(target);
          }
          thumbs.forEach((thumb) =>
            thumb.classList.toggle("is-active", thumb === target)
          );
          currentIndex = index;
        };

        let currentIndex = Math.max(
          0,
          thumbs.findIndex((thumb) => thumb.classList.contains("is-active"))
        );
        applyThumb(currentIndex);

        thumbs.forEach((thumb, index) => {
          thumb.addEventListener("click", () => {
            applyThumb(index);
          });
        });

        const move = (direction) => {
          const total = thumbs.length;
          const nextIndex = (currentIndex + direction + total) % total;
          applyThumb(nextIndex);
        };

        if (prevBtn) {
          prevBtn.addEventListener("click", () => move(-1));
        }
        if (nextBtn) {
          nextBtn.addEventListener("click", () => move(1));
        }
      };

      const initMapLivebox = () => {
        const trigger = context.querySelector("[data-map-trigger]");
        const livebox = context.querySelector("[data-map-livebox]");
        if (!trigger || !livebox) return;

        const dialog = livebox.querySelector(".map-livebox__dialog");
        const closeButtons = livebox.querySelectorAll("[data-map-close]");
        let lastFocusedElement = null;
        let hideTimeout = null;

        const showLivebox = () => {
          if (!livebox.hidden) return;
          lastFocusedElement = context.activeElement;
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
          if (hideTimeout) {
            clearTimeout(hideTimeout);
          }
          hideTimeout = setTimeout(() => {
            livebox.hidden = true;
            livebox.setAttribute("aria-hidden", "true");
            if (
              lastFocusedElement &&
              typeof lastFocusedElement.focus === "function"
            ) {
              lastFocusedElement.focus();
            }
          }, 220);
        };

        trigger.addEventListener("click", showLivebox);
        closeButtons.forEach((btn) =>
          btn.addEventListener("click", hideLivebox)
        );

        window.addEventListener("keydown", (event) => {
          if (event.key === "Escape" && !livebox.hidden) {
            hideLivebox();
          }
        });
      };

      const initDetailRooms = () => {
        const tabs = context.querySelectorAll(".detail-rooms .rooms-tab");
        const cards = context.querySelectorAll(".detail-rooms .room-card");
        console.log(cards);

        if (!tabs.length || !cards.length) return;

        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const index = tab.dataset.roomIndex;

            // Activar tab
            tabs.forEach((btn) => {
              const isActive = btn === tab;
              btn.classList.toggle("is-active", isActive);
              btn.setAttribute("aria-selected", isActive ? "true" : "false");
            });
            cards.forEach((card) => {
              card.style.display =
                card.dataset.roomIndex === index ? "block" : "none";
            });
          });
        });
      };

      context.addEventListener("DOMContentLoaded", initDetailRooms);

      const initRangeBubbles = () => {
        const controls = context.querySelectorAll("[data-range-control]");
        if (!controls.length) return;

        controls.forEach((control) => {
          const input = control.querySelector('input[type="range"]');
          const valueNode = control.querySelector("[data-range-value]");
          if (!input || !valueNode) return;

          const update = () => {
            const min = Number(input.min) || 0;
            const max = Number(input.max) || 100;
            const rawValue = Number(input.value) || 0;
            const percent =
              max === min ? 0 : ((rawValue - min) / (max - min)) * 100;
            const clampedPercent = Math.max(0, Math.min(100, percent));
            valueNode.textContent = rawValue.toLocaleString("es-CO");
            control.style.setProperty("--range-progress", `${clampedPercent}%`);
          };

          input.addEventListener("input", update);
          input.addEventListener("change", update);
          update();
        });
      };

      window.addEventListener("DOMContentLoaded", () => {
        updateYear();
        wireCTA();
        syncSelectLabel('select[name="stopover"]', ".pill--light .pill__label");
        syncSelectLabel('select[name="language"]', ".pill--flag .pill__value");
        wireLanguageSelector();
        initCarousels();
        initDetailGallery();
        initMapLivebox();
        initDetailRooms();
        initRangeBubbles();
      });
    },
  };
})(jQuery, Drupal, drupalSettings);
