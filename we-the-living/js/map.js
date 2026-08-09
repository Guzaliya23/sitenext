(() => {
  const state = {
    locations: [],
    book: null,
    index: 0,
    map: null,
    polyline: null,
    placemarks: []
  };

  const $ = (sel) => document.querySelector(sel);

  const confLabel = {
    high: "Точная",
    medium: "Ориентир",
    atmospheric: "Атмосферная"
  };

  const confHint = {
    high: "Точно по тексту или известный ориентир",
    medium: "Вероятный исторический ориентир",
    atmospheric: "Адрес в книге не назван — точка по смыслу"
  };

  window.WTL = {
    next: () => goTo(state.index + 1),
    prev: () => goTo(state.index - 1),
    go: (i) => goTo(i)
  };

  function getApiKey() {
    const params = new URLSearchParams(location.search);
    return (
      params.get("key") ||
      window.WTL_CONFIG?.yandexApiKey ||
      localStorage.getItem("wtl_yandex_key") ||
      ""
    ).trim();
  }

  function showKeyScreen(msg) {
    const el = $("#keyScreen");
    if (msg) $("#keyError").textContent = msg;
    el.hidden = false;
    $("#app").hidden = true;
  }

  function hideKeyScreen() {
    $("#keyScreen").hidden = true;
    $("#app").hidden = false;
  }

  async function loadData() {
    const res = await fetch("data/locations.json");
    if (!res.ok) throw new Error("Не удалось загрузить locations.json");
    const data = await res.json();
    state.book = data.book;
    state.locations = [...data.locations].sort((a, b) => a.order - b.order);
  }

  function badge(loc) {
    const level = loc.confidence || "atmospheric";
    const text = loc.confidenceLabel || confLabel[level] || level;
    return `<span class="confidence" data-level="${level}" title="${confHint[level] || ""}">${text}</span>`;
  }

  function balloonHtml(loc, i) {
    const prevDis = i === 0 ? "disabled" : "";
    const nextDis = i === state.locations.length - 1 ? "disabled" : "";
    return `
      <div class="ym-balloon">
        <p style="margin:0 0 6px;font-size:12px;opacity:.75">${badge(loc)}</p>
        <p style="margin:0 0 8px;line-height:1.4">${loc.summary}</p>
        <p style="margin:0 0 10px;font-size:12px;opacity:.8"><em>${loc.today}</em></p>
        <div style="display:flex;gap:6px">
          <button type="button" ${prevDis} onclick="window.WTL.prev()"
            style="flex:1;min-height:34px;cursor:pointer;border:1px solid #ccc;background:#fff;border-radius:4px">← Назад</button>
          <button type="button" ${nextDis} onclick="window.WTL.next()"
            style="flex:1;min-height:34px;cursor:pointer;border:0;background:#2c3e6b;color:#fff;border-radius:4px;font-weight:600">Далее →</button>
        </div>
      </div>`;
  }

  function renderList() {
    const list = $("#routeList");
    list.innerHTML = state.locations
      .map(
        (loc, i) => `
      <button type="button" class="route-item ${i === state.index ? "is-active" : ""}" data-index="${i}">
        <span class="route-num">${loc.order}</span>
        <span class="route-text">
          <strong>${loc.title}</strong>
          <small>${loc.subtitle}</small>
          ${badge(loc)}
        </span>
      </button>`
      )
      .join("");

    list.querySelectorAll(".route-item").forEach((btn) => {
      btn.addEventListener("click", () => goTo(Number(btn.dataset.index)));
    });

    const active = list.querySelector(".route-item.is-active");
    active?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function renderCard() {
    const loc = state.locations[state.index];
    if (!loc) return;

    $("#cardStep").textContent = `${state.index + 1} / ${state.locations.length}`;
    $("#cardTitle").textContent = loc.title;
    $("#cardSubtitle").textContent = loc.subtitle;
    $("#cardChapter").textContent = loc.chapter;
    $("#cardToday").textContent = loc.today;
    $("#cardThen").textContent = loc.then;
    $("#cardSummary").textContent = loc.summary;
    $("#cardEvents").textContent = loc.events;
    $("#cardWhy").textContent = loc.why || "";

    const conf = $("#cardConfidence");
    conf.textContent = loc.confidenceLabel || confLabel[loc.confidence] || loc.confidence;
    conf.dataset.level = loc.confidence;
    conf.title = confHint[loc.confidence] || "";

    $("#btnPrev").disabled = state.index === 0;
    $("#btnNext").disabled = state.index === state.locations.length - 1;

    renderList();
  }

  function buildGeoObjects() {
    const coords = state.locations.map((l) => [l.lat, l.lng]);

    state.placemarks = state.locations.map((loc, i) => {
      const pm = new ymaps.Placemark(
        [loc.lat, loc.lng],
        {
          hintContent: `${loc.order}. ${loc.title} · ${confLabel[loc.confidence] || ""}`,
          balloonContentHeader: `${loc.order}. ${loc.title}`,
          balloonContentBody: balloonHtml(loc, i)
        },
        {
          preset: i === state.index ? "islands#redCircleDotIcon" : "islands#blueCircleDotIcon"
        }
      );
      pm.events.add("click", () => goTo(i, { openBalloon: true }));
      return pm;
    });

    state.polyline = new ymaps.Polyline(
      coords,
      { hintContent: "Хронология сюжета" },
      {
        strokeColor: "#2c3e6b",
        strokeWidth: 3,
        strokeOpacity: 0.55,
        strokeStyle: "dash"
      }
    );
  }

  function refreshMarks() {
    state.placemarks.forEach((pm, i) => {
      const loc = state.locations[i];
      pm.options.set(
        "preset",
        i === state.index ? "islands#redCircleDotIcon" : "islands#blueCircleDotIcon"
      );
      pm.properties.set("balloonContentBody", balloonHtml(loc, i));
    });
  }

  function goTo(index, opts = {}) {
    if (index < 0 || index >= state.locations.length) return;
    state.index = index;
    const loc = state.locations[index];
    renderCard();
    refreshMarks();

    if (!state.map) return;

    const zoom = loc.id === 12 || loc.id === 14 ? 8 : 13;
    state.map.setCenter([loc.lat, loc.lng], zoom, {
      duration: 450,
      checkZoomRange: true
    });

    const pm = state.placemarks[index];
    if (opts.openBalloon !== false && pm) {
      pm.balloon.open();
    }
  }

  function initMap() {
    const center = [state.locations[0].lat, state.locations[0].lng];
    state.map = new ymaps.Map("map", {
      center,
      zoom: 12,
      controls: ["zoomControl", "geolocationControl", "typeSelector"]
    });

    buildGeoObjects();
    state.map.geoObjects.add(state.polyline);
    state.placemarks.forEach((pm) => state.map.geoObjects.add(pm));
  }

  function bindUi() {
    $("#btnPrev").addEventListener("click", () => goTo(state.index - 1));
    $("#btnNext").addEventListener("click", () => goTo(state.index + 1));
    $("#btnPlay").addEventListener("click", () => {
      if (state.index < state.locations.length - 1) goTo(state.index + 1);
      else goTo(0);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") goTo(state.index + 1);
      if (e.key === "ArrowLeft") goTo(state.index - 1);
    });

    $("#keyForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const key = $("#apiKeyInput").value.trim();
      if (!key) {
        $("#keyError").textContent = "Вставь ключ API.";
        return;
      }
      localStorage.setItem("wtl_yandex_key", key);
      location.reload();
    });

    $("#browseWithoutMap")?.addEventListener("click", () => {
      hideKeyScreen();
      $("#map").innerHTML =
        '<div class="map-fallback">Карта скрыта. Добавь ключ в <code>js/config.js</code>.</div>';
    });
  }

  function loadYandexScript(key) {
    return new Promise((resolve, reject) => {
      if (window.ymaps) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = `https://api-maps.yandex.ru/2.1/?apikey=${encodeURIComponent(key)}&lang=ru_RU`;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Не удалось загрузить API Яндекс.Карт"));
      document.head.appendChild(s);
    });
  }

  async function boot() {
    bindUi();
    await loadData();

    $("#bookTitle").textContent = state.book.title;
    $("#bookMeta").textContent = `${state.book.author} · ${state.book.years} · ${state.book.city}`;
    $("#bookDisclaimer").textContent = state.book.disclaimer;

    const key = getApiKey();
    if (!key) {
      showKeyScreen("");
      renderList();
      renderCard();
      return;
    }

    try {
      hideKeyScreen();
      await loadYandexScript(key);
      ymaps.ready(() => {
        initMap();
        goTo(0, { openBalloon: true });
      });
    } catch (err) {
      showKeyScreen(err.message || "Ошибка загрузки карты");
      renderList();
      renderCard();
    }
  }

  boot().catch((err) => {
    console.error(err);
    showKeyScreen(err.message || "Ошибка");
  });
})();
