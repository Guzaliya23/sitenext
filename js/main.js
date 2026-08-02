(() => {
  const TG = "guzaliay_g";
  const root = document.documentElement;
  const nav = document.getElementById("siteNav");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  const vine = document.getElementById("vine");
  const canopy = document.getElementById("canopy");
  const lotus = document.getElementById("lotus");
  const foliage = [...document.querySelectorAll("#vineFoliage [data-at]")];
  const leadTop = document.getElementById("leadTop");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const onNavScroll = () => nav?.classList.toggle("is-scrolled", window.scrollY > 16);
  onNavScroll();
  window.addEventListener("scroll", onNavScroll, { passive: true });

  toggle?.addEventListener("click", () => links?.classList.toggle("open"));
  links?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => links.classList.remove("open"))
  );

  if (canopy && !reduceMotion) {
    requestAnimationFrame(() => {
      setTimeout(() => canopy.classList.add("is-down"), 100);
    });
  } else {
    canopy?.classList.add("is-down");
  }

  const updateFoliage = (progress) => {
    foliage.forEach((el) => {
      const at = Number(el.getAttribute("data-at")) || 0;
      el.classList.toggle("is-on", progress >= at - 0.02);
    });
  };

  /** Vine grows only until hero form is reached */
  const vineProgressFromScroll = () => {
    if (!leadTop) {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      return Math.min(1, window.scrollY / max);
    }
    const formTop = leadTop.getBoundingClientRect().top + window.scrollY;
    const start = 0;
    const end = Math.max(180, formTop - window.innerHeight * 0.25);
    const y = window.scrollY || 0;
    return Math.min(1, Math.max(0, (y - start) / (end - start || 1)));
  };

  const setLotus = (value) => {
    const v = Math.min(1, Math.max(0.12, value));
    root.style.setProperty("--lotus", v.toFixed(3));
    if (lotus) lotus.style.setProperty("--lotus", v.toFixed(3));
  };

  if (!reduceMotion) {
    let ticking = false;

    const paint = () => {
      const y = window.scrollY || 0;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const pageProgress = Math.min(1, Math.max(0, y / max));
      const vineProgress = vineProgressFromScroll();

      root.style.setProperty("--scroll", String(Math.round(y)));
      root.style.setProperty("--vine-progress", vineProgress.toFixed(4));
      root.style.setProperty("--orb-scale", (1 + pageProgress * 0.55).toFixed(3));
      root.style.setProperty("--pull", Math.min(1, pageProgress * 1.35).toFixed(3));

      updateFoliage(vineProgress);
      ticking = false;
    };

    const requestPaint = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(paint);
      }
    };

    window.addEventListener("scroll", requestPaint, { passive: true });
    window.addEventListener("resize", requestPaint, { passive: true });
    paint();

    /* Lotus opens as cursor approaches (desktop) or touch near it (mobile) */
    const updateLotusFromPoint = (clientX, clientY) => {
      if (!lotus) return;
      const rect = lotus.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
      const open = 1 - Math.min(1, dist / 220);
      setLotus(0.15 + open * 0.85);
    };

    if (finePointer) {
      window.addEventListener(
        "pointermove",
        (e) => updateLotusFromPoint(e.clientX, e.clientY),
        { passive: true }
      );
    } else {
      window.addEventListener(
        "touchmove",
        (e) => {
          const t = e.touches[0];
          if (t) updateLotusFromPoint(t.clientX, t.clientY);
        },
        { passive: true }
      );
      lotus?.addEventListener(
        "click",
        () => {
          setLotus(1);
          setTimeout(() => setLotus(0.35), 900);
        },
        { passive: true }
      );
    }
  } else {
    root.style.setProperty("--vine-progress", "1");
    root.style.setProperty("--orb-scale", "1.3");
    root.style.setProperty("--pull", "1");
    updateFoliage(1);
    setLotus(0.85);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  const normalizeUrl = (raw) => {
    let u = (raw || "").trim();
    if (!u) return "";
    if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
    return u;
  };

  const openTelegramLead = (data) => {
    const website = normalizeUrl(data.website);
    const name = (data.name || "").trim() || "не указано";
    const contact = (data.contact || "").trim();
    const text = [
      "Заявка SiteNext — бесплатная визуализация сайта",
      `Сайт: ${website}`,
      `Контакт: ${contact}`,
      `Имя/компания: ${name}`,
    ].join("\n");
    window.open(`https://t.me/${TG}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  };

  document.querySelectorAll("[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const website = normalizeUrl(String(fd.get("website") || ""));
      const contact = String(fd.get("contact") || "").trim();
      if (!website || !contact) return;
      try {
        // eslint-disable-next-line no-new
        new URL(website);
      } catch {
        alert("Проверьте ссылку на сайт — похоже, она некорректная.");
        return;
      }
      openTelegramLead({
        website,
        name: String(fd.get("name") || ""),
        contact,
      });
    });
  });
})();
