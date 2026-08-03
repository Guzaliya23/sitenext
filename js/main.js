(() => {
  let TG = "guzaliay_g";
  const nav = document.getElementById("siteNav");
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");

  const applyContent = (data) => {
    if (!data || typeof data !== "object") return;
    if (data.telegram) TG = String(data.telegram).replace(/^@/, "");

    document.querySelectorAll("[data-content]").forEach((el) => {
      const key = el.getAttribute("data-content");
      if (key && data[key] != null) el.textContent = data[key];
    });

    document.querySelectorAll("[data-content-attr]").forEach((el) => {
      const spec = el.getAttribute("data-content-attr") || "";
      const [attr, key] = spec.split(":");
      if (attr && key && data[key] != null) el.setAttribute(attr, data[key]);
    });

    document.querySelectorAll("[data-telegram-link]").forEach((el) => {
      el.setAttribute("href", `https://t.me/${TG}`);
    });

    // brand may be "SiteNext" — style accent on Next if present
    const brand = document.querySelector(".brand[data-content='brand']");
    if (brand && data.brand) {
      const name = String(data.brand);
      if (/next$/i.test(name)) {
        const base = name.replace(/next$/i, "");
        brand.innerHTML = `${base}<span>Next</span>`;
      }
    }
  };

  fetch("content/home.json", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then(applyContent)
    .catch(() => {});

  const onNavScroll = () => nav?.classList.toggle("is-scrolled", window.scrollY > 10);
  onNavScroll();
  window.addEventListener("scroll", onNavScroll, { passive: true });

  toggle?.addEventListener("click", () => links?.classList.toggle("open"));
  links?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => links.classList.remove("open"))
  );

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
