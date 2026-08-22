/* Everlight desktop navigation — one small, stable controller. */
(() => {
  const nav = document.querySelector(".desktop-rail-actions");
  if (!nav) return;

  const buttons = () => [...nav.querySelectorAll("[data-rail-view]")];
  const categoryButton = () => document.getElementById("desktopCategoryToggle");
  let activeView = "hub";

  const gradient = () => {
    const root = getComputedStyle(document.documentElement);
    if (document.body.classList.contains("sun-mode")) {
      return (
        root.getPropertyValue("--ever-gold-gradient").trim() ||
        "linear-gradient(135deg,#fff0ae 0%,#d7a53a 52%,#9b5e08 100%)"
      );
    }
    if (document.body.classList.contains("mono-mode")) {
      return "linear-gradient(135deg,#fff 0%,#aaa 52%,#666 100%)";
    }
    return (
      root.getPropertyValue("--ever-gradient").trim() ||
      "linear-gradient(135deg,#c9e2f5 0%,#8badcc 48%,#67e7dd 100%)"
    );
  };

  const textColor = () => {
    if (document.body.classList.contains("sun-mode")) return "#20170a";
    if (document.body.classList.contains("mono-mode")) return "#111";
    return "#081014";
  };

  function clearInline(el) {
    if (!el) return;
    for (const prop of [
      "background",
      "background-image",
      "background-color",
      "color",
      "border-color",
      "box-shadow",
      "filter",
      "opacity",
    ]) {
      el.style.removeProperty(prop);
    }
    el.querySelectorAll(".rail-action-icon, > span").forEach((node) => {
      node.style.removeProperty("color");
      node.style.removeProperty("opacity");
    });
  }

  function paint(el, isActive) {
    if (!el) return;
    clearInline(el);
    el.classList.toggle("active", isActive);
    if (!isActive) {
      el.removeAttribute("data-desktop-active");
      el.removeAttribute("aria-current");
      return;
    }
    // Inline !important is intentional: it guarantees the active state
    // wins over any theme / hover CSS without fighting specificity wars.
    const c = textColor();
    const g = gradient();
    el.setAttribute("data-desktop-active", "true");
    el.setAttribute("aria-current", "page");
    el.style.setProperty("background", g, "important");
    el.style.setProperty("background-image", g, "important");
    el.style.setProperty("background-color", "transparent", "important");
    el.style.setProperty("color", c, "important");
    el.style.setProperty("border-color", "transparent", "important");
    el.style.setProperty("box-shadow", "none", "important");
    el.style.setProperty("filter", "none", "important");
    el.style.setProperty("opacity", "1", "important");
    el.querySelectorAll(".rail-action-icon, > span").forEach((node) => {
      node.style.setProperty("color", c, "important");
      node.style.setProperty("opacity", "1", "important");
    });
  }

  function sync(view = "hub") {
    activeView = view || "hub";
    buttons().forEach((btn) => paint(btn, btn.dataset.railView === activeView));
    const cat = categoryButton();
    if (cat) {
      paint(
        cat,
        activeView === "category" && cat.getAttribute("aria-expanded") === "true"
      );
    }
    window.__everlightDesktopNavView = activeView;
  }

  function messagesOpen() {
    return document.getElementById("messagesView")?.classList.contains("open") === true;
  }
  function profileOpen() {
    return document.getElementById("profileView")?.classList.contains("open") === true;
  }

  function closeAllViews() {
    try {
      window.closeMessages?.();
    } catch {}
    try {
      window.closeProfileView?.();
    } catch {}
    document.getElementById("messagesView")?.classList.remove("open");
    document.getElementById("profileView")?.classList.remove("open");
    document.getElementById("messagesView")?.setAttribute("aria-hidden", "true");
    document.getElementById("profileView")?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("messages-view-open", "profile-view-open");
  }

  function openMessagesView() {
    if (typeof window.openProtectedView === "function") {
      window.openProtectedView("messages");
    } else if (typeof window.openMessages === "function") {
      window.openMessages();
    }
    // Keep the view inside the feed on desktop.
    const view = document.getElementById("messagesView");
    const feed = document.getElementById("feed");
    if (
      view &&
      feed &&
      window.matchMedia("(min-width: 961px)").matches &&
      view.parentElement !== feed
    ) {
      feed.appendChild(view);
    }
    view?.classList.add("open");
    view?.setAttribute("aria-hidden", "false");
    document.body.classList.add("messages-view-open");
  }

  function openProfileView(section) {
    if (typeof window.openProtectedView === "function") {
      window.openProtectedView(section);
    } else if (typeof window.openProfileView === "function") {
      window.openProfileView();
      window.activateProfileSection?.(section);
    }
    const view = document.getElementById("profileView");
    const feed = document.getElementById("feed");
    if (
      view &&
      feed &&
      window.matchMedia("(min-width: 961px)").matches &&
      view.parentElement !== feed
    ) {
      feed.appendChild(view);
    }
    view?.classList.add("open");
    view?.setAttribute("aria-hidden", "false");
    document.body.classList.add("profile-view-open");
    if (window.currentUser && typeof window.activateProfileSection === "function") {
      window.activateProfileSection(section);
    }
  }

  function activate(view) {
    if (view === "hub") {
      closeAllViews();
      const cat = categoryButton();
      if (cat) cat.setAttribute("aria-expanded", "false");
      const menu = document.getElementById("desktopCategoryMenu");
      if (menu) menu.hidden = true;
      sync("hub");
      return;
    }

    if (view === "messages") {
      if (messagesOpen() && activeView === "messages") {
        closeAllViews();
        sync("hub");
        return;
      }
      closeAllViews();
      openMessagesView();
      sync("messages");
      return;
    }

    const sectionMap = {
      profile: "main",
      "profile-liked": "liked",
      "profile-saved": "saved",
      "profile-history": "history",
    };
    const section = sectionMap[view];
    if (!section) return;

    if (profileOpen() && activeView === view) {
      closeAllViews();
      sync("hub");
      return;
    }

    closeAllViews();
    openProfileView(section);
    sync(view);
  }

  // Normal bubble-phase delegation. No capture/stopImmediatePropagation, so the
  // buttons remain genuinely clickable and no second handler is cancelled.
  nav.addEventListener("click", (event) => {
    const target = event.target.closest("[data-rail-view]");
    if (!target || !nav.contains(target)) return;
    event.preventDefault();
    activate(target.dataset.railView || "hub");
  });

  const cat = categoryButton();
  if (cat) {
    cat.addEventListener("click", (event) => {
      event.preventDefault();
      const menu = document.getElementById("desktopCategoryMenu");
      const next = cat.getAttribute("aria-expanded") !== "true";
      closeAllViews();
      cat.setAttribute("aria-expanded", String(next));
      if (menu) menu.hidden = !next;
      sync(next ? "category" : "hub");
    });
  }

  window.__syncDesktopNav = sync;
  window.__everlightDesktopNavActivate = activate;
  sync("hub");

  // Re-paint when theme classes change (sun-mode / mono-mode / etc.)
  new MutationObserver(() => sync(activeView)).observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
})();
