/* ==========================================================================
   SPORTS FRIENDS — site behaviour (no dependencies)
   ========================================================================== */

(function () {
  "use strict";

  var SHOP = window.SHOP;
  var I18N = window.I18N;
  var CATEGORIES = window.CATEGORIES;
  var PRODUCTS = window.PRODUCTS;
  var ICONS = window.ICONS;

  var DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // localStorage can be missing or throw (private mode, blocked storage) — never let that break the page.
  var storage = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }
  };

  var productById = {};
  PRODUCTS.forEach(function (p) { productById[p.id] = p; });
  var catById = {};
  CATEGORIES.forEach(function (c) { catById[c.id] = c; });

  /* ---- State ------------------------------------------------------------ */
  var params = new URLSearchParams(location.search);
  var savedLang = storage.get("sf.lang", null);

  var state = {
    lang: savedLang === "en" || savedLang === "hi" ? savedLang : (/^hi\b/i.test(navigator.language || "") ? "hi" : "en"),
    cat: catById[params.get("cat")] ? params.get("cat") : "all",
    query: params.get("q") || "",
    list: cleanList(storage.get("sf.list", {})),
    showAll: false
  };

  function cleanList(raw) {
    var out = {};
    if (raw && typeof raw === "object") {
      Object.keys(raw).forEach(function (id) {
        var qty = parseInt(raw[id], 10);
        if (productById[id] && qty > 0) out[id] = Math.min(qty, 99);
      });
    }
    return out;
  }

  /* ---- Text helpers ----------------------------------------------------- */
  function t(key, vars) {
    var dict = I18N[state.lang] || I18N.en;
    var s = key in dict ? dict[key] : (key in I18N.en ? I18N.en[key] : key);
    if (vars) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) { return k in vars ? String(vars[k]) : m; });
    }
    return s;
  }
  function local(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    return obj[state.lang] || obj.en || "";
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) { return String(s || "").toLowerCase().trim(); }

  /* ---- Links ------------------------------------------------------------ */
  var waNumber = String(SHOP.whatsapp || "").replace(/\D/g, "");
  var phoneHref = SHOP.phone ? "tel:" + String(SHOP.phone).replace(/[^\d+]/g, "") : "";
  var directionsUrl = "https://www.google.com/maps/dir/?api=1&destination=" + SHOP.geo.lat + "," + SHOP.geo.lng;

  function waLink(text) {
    return "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(text);
  }
  // Hindi messages carry the English name too, so there's no doubt which item is meant.
  function productLabel(p) {
    return state.lang === "en" ? p.name.en : p.name.hi + " (" + p.name.en + ")";
  }

  /* ---- Icons ------------------------------------------------------------ */
  function fillIcons(root) {
    $$("[data-icon]", root).forEach(function (el) {
      if (!el.firstElementChild) el.innerHTML = ICONS.ui(el.getAttribute("data-icon"));
    });
    $$("[data-sport-icon]", root).forEach(function (el) {
      if (!el.firstElementChild) el.innerHTML = ICONS.sport(el.getAttribute("data-sport-icon"));
    });
  }

  /* ---- Static text + links --------------------------------------------- */
  function applyStaticText() {
    document.documentElement.lang = state.lang;
    document.title = t("meta.title");

    $$("[data-i18n]").forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    $$("[data-i18n-placeholder]").forEach(function (el) { el.placeholder = t(el.getAttribute("data-i18n-placeholder")); });
    $$("[data-i18n-aria]").forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
    $$("[data-i18n-title]").forEach(function (el) { el.setAttribute("title", t(el.getAttribute("data-i18n-title"))); });

    $$("#langToggle [data-lang]").forEach(function (el) {
      el.classList.toggle("is-active", el.getAttribute("data-lang") === state.lang);
    });

    $("#footerRights").textContent = t("footer.rights", { year: new Date().getFullYear() });
  }

  function applyLinks() {
    var general = waLink(t("wa.general"));
    $$("[data-wa='general']").forEach(function (a) { a.href = general; });
    $$("[data-directions]").forEach(function (a) { a.href = directionsUrl; });
    $$("[data-maps]").forEach(function (a) { a.href = SHOP.mapsUrl; });
    $$("[data-address]").forEach(function (el) { el.textContent = local(SHOP.address); });
    $$("[data-landmark]").forEach(function (el) {
      el.textContent = local(SHOP.landmark);
      el.hidden = !SHOP.landmark;
    });
    $$("[data-phone-text]").forEach(function (el) { el.textContent = SHOP.phone || ""; });
    $$("[data-call]").forEach(function (a) {
      if (phoneHref) {
        a.href = phoneHref;
      } else {
        var item = a.closest("li");
        (item || a).hidden = true;
      }
    });
  }

  function renderSocials() {
    var box = $("#socials");
    var links = [];
    if (SHOP.instagram) links.push('<a href="' + esc(SHOP.instagram) + '" target="_blank" rel="noopener" aria-label="Instagram">' + ICONS.ui("instagram") + "</a>");
    if (SHOP.facebook) links.push('<a href="' + esc(SHOP.facebook) + '" target="_blank" rel="noopener" aria-label="Facebook">' + ICONS.ui("facebook") + "</a>");
    box.innerHTML = links.join("");
    box.hidden = links.length === 0;
  }

  /* ---- Opening hours (always computed in Indian Standard Time) --------- */
  function istNow() {
    var parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23"
    }).formatToParts(new Date());
    var get = function (type) {
      for (var i = 0; i < parts.length; i++) if (parts[i].type === type) return parts[i].value;
      return "0";
    };
    return {
      day: get("weekday").slice(0, 3).toLowerCase(),
      minutes: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10)
    };
  }
  function toMinutes(hhmm) {
    var p = String(hhmm).split(":");
    return parseInt(p[0], 10) * 60 + parseInt(p[1] || "0", 10);
  }
  function fmtTime(hhmm) {
    var mins = toMinutes(hhmm);
    var h = Math.floor(mins / 60), m = mins % 60;
    var suffix = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return h + ":" + (m < 10 ? "0" : "") + m + " " + suffix;
  }
  function shopStatus() {
    if (!SHOP.hours) return null;
    var now = istNow();
    var today = SHOP.hours[now.day];
    if (today) {
      var open = toMinutes(today[0]), close = toMinutes(today[1]);
      if (now.minutes >= open && now.minutes < close) return { open: true, text: t("status.open", { time: fmtTime(today[1]) }) };
      if (now.minutes < open) return { open: false, text: t("status.opensAt", { time: fmtTime(today[0]) }) };
    }
    return { open: false, text: t("status.closed") };
  }

  function renderHours() {
    var box = $("#hoursBox");
    if (!SHOP.hours) {
      box.innerHTML = '<p class="hours-note">' + esc(t("visit.hoursUnknown")) + "</p>";
    } else if (DAYS.every(function (d) { return String(SHOP.hours[d]) === String(SHOP.hours.mon); }) && SHOP.hours.mon) {
      // Same timings all week: one line instead of seven identical rows.
      box.innerHTML = '<ul class="hours-list"><li class="is-today"><span>' + esc(t("day.everyday")) + "</span><span>" +
        esc(fmtTime(SHOP.hours.mon[0]) + " – " + fmtTime(SHOP.hours.mon[1])) + "</span></li></ul>";
    } else {
      var today = istNow().day;
      box.innerHTML = '<ul class="hours-list">' + DAYS.map(function (d) {
        var h = SHOP.hours[d];
        var time = h ? fmtTime(h[0]) + " – " + fmtTime(h[1]) : t("status.closedDay");
        return '<li class="' + (d === today ? "is-today" : "") + '"><span>' + esc(t("day." + d)) + "</span><span>" + esc(time) + "</span></li>";
      }).join("") + "</ul>";
    }

    var status = shopStatus();
    $$("[data-status]").forEach(function (el) {
      el.hidden = !status;
      if (!status) return;
      el.textContent = status.text;
      el.classList.toggle("is-open", status.open);
      el.classList.toggle("is-closed", !status.open);
    });
  }

  /* ---- Categories + filter chips --------------------------------------- */
  function countIn(catId) {
    return PRODUCTS.filter(function (p) { return p.cat === catId; }).length;
  }
  function catStyle(c) { return "--c-tint:" + c.tint + ";--c-ink:" + c.ink; }

  function renderCategories() {
    $("#categoryGrid").innerHTML = CATEGORIES.map(function (c) {
      return '<li><button type="button" class="cat-tile" data-cat="' + c.id + '" style="' + catStyle(c) + '">' +
        '<span class="cat-icon">' + ICONS.sport(c.icon) + "</span>" +
        '<span class="cat-name">' + esc(local(c.name)) + "</span>" +
        '<span class="cat-count">' + esc(t("cats.count", { n: countIn(c.id) })) + "</span>" +
        "</button></li>";
    }).join("");
  }

  function renderChips() {
    var chips = [{ id: "all", label: t("filter.all") }].concat(CATEGORIES.map(function (c) {
      return { id: c.id, label: local(c.name) };
    }));
    $("#chips").innerHTML = chips.map(function (c) {
      return '<button type="button" class="chip" data-filter="' + c.id + '" aria-pressed="' + (state.cat === c.id) + '">' + esc(c.label) + "</button>";
    }).join("");
  }

  /* ---- Products --------------------------------------------------------- */
  var haystack = {};
  PRODUCTS.forEach(function (p) {
    var c = catById[p.cat];
    haystack[p.id] = norm([p.name.en, p.name.hi, p.desc.en, p.desc.hi, c.name.en, c.name.hi].concat(p.tags || []).join(" "));
  });

  function matches(p) {
    if (state.cat !== "all" && p.cat !== state.cat) return false;
    var q = norm(state.query);
    if (!q) return true;
    var hay = haystack[p.id];
    return q.split(/\s+/).every(function (tok) {
      // "bats" should still find "bat"
      return hay.indexOf(tok) !== -1 || (tok.length > 3 && /s$/.test(tok) && hay.indexOf(tok.slice(0, -1)) !== -1);
    });
  }

  function addButtonInner(inList) {
    return ICONS.ui(inList ? "check" : "plus") + '<span aria-hidden="true">' + esc(t(inList ? "product.addedShort" : "product.addShort")) + "</span>";
  }

  function cardHTML(p) {
    var c = catById[p.cat];
    var name = local(p.name);
    var inList = !!state.list[p.id];
    var media = p.image
      ? '<img src="' + esc(p.image) + '" alt="' + esc(name) + '" loading="lazy" decoding="async">'
      : '<span class="card-icon">' + ICONS.sport(p.icon || c.icon) + "</span>";
    return '<li class="card" style="' + catStyle(c) + '">' +
      '<div class="card-media">' + media +
        '<button type="button" class="card-add' + (inList ? " is-added" : "") + '" data-toggle="' + p.id + '" aria-pressed="' + inList + '" aria-label="' + esc(t(inList ? "product.remove" : "product.add", { name: name })) + '">' +
          addButtonInner(inList) +
        "</button>" +
      "</div>" +
      '<div class="card-body">' +
        '<p class="card-cat">' + esc(local(c.name)) + "</p>" +
        '<h3 class="card-title">' + esc(name) + "</h3>" +
        '<p class="card-desc">' + esc(local(p.desc)) + "</p>" +
        (p.price ? '<p class="card-price">' + esc(local(p.price)) + "</p>" : "") +
        '<div class="card-cta">' +
          '<a class="btn btn-wa btn-block" href="' + esc(waLink(t("wa.product", { product: productLabel(p) }))) + '" target="_blank" rel="noopener">' +
            ICONS.ui("wa") +
            '<span class="lbl-short">' + esc(t("product.askPrice")) + "</span>" +
            '<span class="lbl-long">' + esc(t("product.ask")) + "</span>" +
          "</a>" +
        "</div>" +
      "</div>" +
    "</li>";
  }

  // On first load the "All" view shows only featured items, so phones aren't faced with 40+ cards.
  function renderProducts() {
    var shown = PRODUCTS.filter(matches);
    var q = state.query.trim();
    var total = shown.length;
    var featuredOnly = state.cat === "all" && !q && !state.showAll;
    if (featuredOnly) {
      var featured = shown.filter(function (p) { return p.featured; });
      shown = featured.length ? featured : shown.slice(0, 8);
    }
    var partial = featuredOnly && shown.length < total;

    $("#resultCount").textContent = partial
      ? t("products.countSome", { n: shown.length, total: total })
      : (total === 1 ? t("products.countOne") : t("products.count", { n: total }));
    $("#productGrid").innerHTML = shown.map(cardHTML).join("");

    $("#showAllWrap").hidden = !partial;
    $("#moreNote").hidden = shown.length === 0; // the empty state already offers WhatsApp
    $("#showAllText").textContent = t("products.showAll", { total: total });

    var empty = $("#emptyState");
    empty.hidden = shown.length > 0;
    if (!shown.length) {
      $("#emptyTitle").textContent = t("products.empty.title", { q: q });
      $("#emptyAskText").textContent = t("products.empty.button", { q: q });
      $("#emptyAsk").href = waLink(q ? t("wa.search", { q: q }) : t("wa.general"));
    }

    $$(".chip").forEach(function (chip) {
      chip.setAttribute("aria-pressed", String(chip.getAttribute("data-filter") === state.cat));
    });
    $("#searchClear").hidden = !state.query;
  }

  function syncCardButtons() {
    $$("[data-toggle]").forEach(function (btn) {
      var id = btn.getAttribute("data-toggle");
      var inList = !!state.list[id];
      var name = local(productById[id].name);
      btn.classList.toggle("is-added", inList);
      btn.setAttribute("aria-pressed", String(inList));
      btn.setAttribute("aria-label", t(inList ? "product.remove" : "product.add", { name: name }));
      btn.innerHTML = addButtonInner(inList);
    });
  }

  function updateURL() {
    try {
      var p = new URLSearchParams();
      if (state.cat !== "all") p.set("cat", state.cat);
      if (state.query.trim()) p.set("q", state.query.trim());
      var qs = p.toString();
      history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "") + location.hash);
    } catch (e) { /* file:// or sandboxed — not important */ }
  }

  function setCategory(cat) {
    state.cat = catById[cat] ? cat : "all";
    renderProducts();
    updateURL();
  }

  /* ---- Enquiry list ----------------------------------------------------- */
  function saveList() { storage.set("sf.list", state.list); }

  function setQty(id, qty) {
    if (qty <= 0) delete state.list[id];
    else state.list[id] = Math.min(qty, 99);
    saveList();
    renderList();
    syncCardButtons();
  }

  function toggleItem(id) {
    if (state.list[id]) {
      setQty(id, 0);
      toast(t("toast.removed"));
    } else {
      setQty(id, 1);
      toast(t("toast.added"));
      $$("[data-list-count]").forEach(function (b) {
        b.classList.remove("is-bump");
        void b.offsetWidth; // restart the animation
        b.classList.add("is-bump");
      });
    }
  }

  function listMessage() {
    var ids = Object.keys(state.list);
    var lines = [t("wa.list"), ""];
    ids.forEach(function (id, i) {
      lines.push((i + 1) + ". " + productLabel(productById[id]) + " × " + state.list[id]);
    });
    var name = $("#listName").value.trim();
    if (name) lines.push("", t("wa.from", { name: name }));
    return lines.join("\n");
  }

  function renderList() {
    var ids = Object.keys(state.list);

    $$("[data-list-count]").forEach(function (el) {
      el.textContent = ids.length;
      el.hidden = ids.length === 0;
    });

    $("#listEmpty").hidden = ids.length > 0;
    $("#listFooter").hidden = ids.length === 0;

    $("#listItems").innerHTML = ids.map(function (id) {
      var p = productById[id];
      var c = catById[p.cat];
      var name = local(p.name);
      var qty = state.list[id];
      return '<li class="list-item" style="' + catStyle(c) + '">' +
        '<span class="list-thumb">' + ICONS.sport(p.icon || c.icon) + "</span>" +
        '<div><p class="list-name">' + esc(name) + '</p><p class="list-cat">' + esc(local(c.name)) + "</p></div>" +
        '<div class="qty" role="group" aria-label="' + esc(t("list.qty") + ": " + name) + '">' +
          '<button type="button" data-qty="' + id + '" data-delta="-1" aria-label="' + esc(t("list.decrease")) + '"' + (qty <= 1 ? " disabled" : "") + ">" + ICONS.ui("minus") + "</button>" +
          "<output>" + qty + "</output>" +
          '<button type="button" data-qty="' + id + '" data-delta="1" aria-label="' + esc(t("list.increase")) + '"' + (qty >= 99 ? " disabled" : "") + ">" + ICONS.ui("plus") + "</button>" +
        "</div>" +
        '<button type="button" class="list-remove" data-remove="' + id + '" aria-label="' + esc(t("list.remove") + ": " + name) + '">' + ICONS.ui("trash") + "</button>" +
      "</li>";
    }).join("");

    $("#listSend").href = waLink(listMessage());
  }

  var drawer = $("#listDrawer");
  var lastFocus = null;
  var closeTimer = null;

  function openList() {
    clearTimeout(closeTimer);
    $("#toast").classList.remove("is-show");
    lastFocus = document.activeElement;
    drawer.hidden = false;
    void drawer.offsetWidth; // let the closed state render so the slide-in animates
    drawer.classList.add("is-open");
    document.documentElement.classList.add("no-scroll");
    $("#listClose").focus();
  }

  function closeList(restoreFocus) {
    if (drawer.hidden) return;
    drawer.classList.remove("is-open");
    document.documentElement.classList.remove("no-scroll");
    closeTimer = setTimeout(function () { drawer.hidden = true; }, 300);
    if (restoreFocus !== false && lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function trapFocus(e) {
    if (e.key !== "Tab" || drawer.hidden) return;
    var focusable = $$("button:not([disabled]), a[href], input, [tabindex]:not([tabindex='-1'])", drawer)
      .filter(function (el) { return el.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---- Team enquiry form ------------------------------------------------ */
  function renderSportOptions() {
    var select = $("#sportSelect");
    var current = select.value;
    select.innerHTML =
      '<option value="">' + esc(t("form.sportPick")) + "</option>" +
      CATEGORIES.map(function (c) {
        return '<option value="' + c.id + '">' + esc(local(c.name)) + "</option>";
      }).join("") +
      '<option value="other">' + esc(t("form.sportOther")) + "</option>";
    select.value = current;
  }

  function formatDate(value) {
    if (!value) return "";
    var d = new Date(value + "T00:00:00");
    if (isNaN(d)) return value;
    return d.toLocaleDateString(state.lang === "hi" ? "hi-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function onTeamSubmit(e) {
    e.preventDefault();
    var form = e.currentTarget;
    var el = form.elements;
    var items = el.items.value.trim();
    var error = $("#teamItemsError");

    if (!items) {
      error.textContent = t("form.itemsError");
      error.hidden = false;
      el.items.setAttribute("aria-invalid", "true");
      el.items.focus();
      return;
    }
    error.hidden = true;
    el.items.removeAttribute("aria-invalid");

    var sport = el.sport.value;
    var sportLabel = sport === "other" ? t("form.sportOther") : (catById[sport] ? local(catById[sport].name) : "");

    var lines = [t("wa.team"), ""];
    function add(key, value) { if (value) lines.push("*" + t(key) + ":* " + value); }
    add("wa.f.name", el.person.value.trim());
    add("wa.f.org", el.org.value.trim());
    add("wa.f.sport", sportLabel);
    add("wa.f.items", items);
    add("wa.f.date", formatDate(el.date.value));

    window.open(waLink(lines.join("\n")), "_blank", "noopener");
  }

  /* ---- Toast ------------------------------------------------------------ */
  var toastTimer = null;
  function toast(message) {
    var el = $("#toast");
    el.textContent = message;
    el.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-show"); }, 1800);
  }

  /* ---- Map + structured data ------------------------------------------- */
  function loadMap() {
    $("#mapFrame").src = "https://maps.google.com/maps?q=" + SHOP.geo.lat + "," + SHOP.geo.lng + "&z=16&output=embed";
  }

  function injectStructuredData() {
    var data = {
      "@context": "https://schema.org",
      "@type": "SportingGoodsStore",
      name: SHOP.name,
      url: location.origin + location.pathname,
      address: {
        "@type": "PostalAddress",
        streetAddress: SHOP.streetAddress,
        addressLocality: SHOP.locality,
        addressRegion: SHOP.region,
        addressCountry: SHOP.country
      },
      geo: { "@type": "GeoCoordinates", latitude: SHOP.geo.lat, longitude: SHOP.geo.lng },
      hasMap: SHOP.mapsUrl
    };
    if (SHOP.phone) data.telephone = SHOP.phone;
    if (SHOP.hours) {
      var names = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
      data.openingHoursSpecification = DAYS.filter(function (d) { return SHOP.hours[d]; }).map(function (d) {
        return { "@type": "OpeningHoursSpecification", dayOfWeek: names[d], opens: SHOP.hours[d][0], closes: SHOP.hours[d][1] };
      });
    }
    var sameAs = [SHOP.instagram, SHOP.facebook].filter(Boolean);
    if (sameAs.length) data.sameAs = sameAs;

    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  }

  /* ---- Render everything that depends on language ---------------------- */
  function renderAll() {
    applyStaticText();
    applyLinks();
    renderHours();
    renderCategories();
    renderChips();
    renderProducts();
    renderList();
    renderSportOptions();
  }

  /* ---- Events ----------------------------------------------------------- */
  function bindEvents() {
    $("#langToggle").addEventListener("click", function () {
      state.lang = state.lang === "en" ? "hi" : "en";
      storage.set("sf.lang", state.lang);
      renderAll();
    });

    $("#categoryGrid").addEventListener("click", function (e) {
      var tile = e.target.closest("[data-cat]");
      if (!tile) return;
      state.query = "";
      $("#searchInput").value = "";
      setCategory(tile.getAttribute("data-cat"));
      $("#products").scrollIntoView();
    });

    $("#chips").addEventListener("click", function (e) {
      var chip = e.target.closest("[data-filter]");
      if (!chip) return;
      if (chip.getAttribute("data-filter") === "all") state.showAll = true;
      setCategory(chip.getAttribute("data-filter"));
      chip.scrollIntoView({ block: "nearest", inline: "nearest" });
    });

    var searchTimer = null;
    var searchInput = $("#searchInput");
    searchInput.value = state.query;
    searchInput.addEventListener("input", function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () {
        state.query = searchInput.value;
        renderProducts();
        updateURL();
      }, 120);
    });
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") searchInput.blur(); // closes the phone keyboard so results are visible
    });
    $("#searchClear").addEventListener("click", function () {
      searchInput.value = "";
      state.query = "";
      renderProducts();
      updateURL();
      searchInput.focus();
    });

    $("#showAll").addEventListener("click", function () {
      var firstNew = PRODUCTS.filter(function (p) { return !p.featured; })[0];
      state.showAll = true;
      renderProducts();
      // Keep keyboard users in place: move focus to the first newly shown card's button.
      var target = firstNew && $('[data-toggle="' + firstNew.id + '"]');
      if (target) target.focus({ preventScroll: true });
    });

    $("#productGrid").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-toggle]");
      if (btn) toggleItem(btn.getAttribute("data-toggle"));
    });

    $$("[data-open-list]").forEach(function (b) { b.addEventListener("click", openList); });
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("[data-close-list]")) {
        closeList(!e.target.closest("a"));
        return;
      }
      var qtyBtn = e.target.closest("[data-qty]");
      if (qtyBtn) {
        var id = qtyBtn.getAttribute("data-qty");
        setQty(id, (state.list[id] || 0) + parseInt(qtyBtn.getAttribute("data-delta"), 10));
        var again = drawer.querySelector('[data-qty="' + id + '"][data-delta="' + qtyBtn.getAttribute("data-delta") + '"]');
        if (again && !again.disabled) again.focus();
        return;
      }
      var removeBtn = e.target.closest("[data-remove]");
      if (removeBtn) {
        setQty(removeBtn.getAttribute("data-remove"), 0);
        $("#listClose").focus();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !drawer.hidden) closeList();
      trapFocus(e);
    });

    var listName = $("#listName");
    listName.value = storage.get("sf.name", "") || "";
    listName.addEventListener("input", function () {
      storage.set("sf.name", listName.value);
      $("#listSend").href = waLink(listMessage());
    });
    $("#listClear").addEventListener("click", function () {
      state.list = {};
      saveList();
      renderList();
      syncCardButtons();
      $("#listClose").focus();
    });

    $("#teamForm").addEventListener("submit", onTeamSubmit);
    $("#teamItems").addEventListener("input", function () {
      if (this.value.trim()) {
        $("#teamItemsError").hidden = true;
        this.removeAttribute("aria-invalid");
      }
    });

    // Header shadow + toolbar edge once the page scrolls.
    var header = $("#siteHeader");
    var toolbar = $("#toolbar");
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        header.classList.toggle("is-scrolled", window.scrollY > 8);
        var top = toolbar.getBoundingClientRect().top;
        toolbar.classList.toggle("is-stuck", top <= header.offsetHeight + 1);
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---- Start ------------------------------------------------------------ */
  fillIcons(document);
  $("#setupBanner").hidden = !!waNumber;
  renderSocials();
  renderAll();
  bindEvents();
  loadMap();
  injectStructuredData();

  // Refresh the open/closed badge every minute.
  if (SHOP.hours) setInterval(renderHours, 60000);
})();
