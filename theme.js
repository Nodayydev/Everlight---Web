(() => {
  const key = "everlight-theme";
  const button = document.getElementById("themeToggle");
  const menu = document.getElementById("stylePickerMenu");
  const picker = document.getElementById("stylePicker");

  const apply = (mode) => {
    const normalized = ["aqua", "sun", "mono"].includes(mode) ? mode : "aqua";
    document.body.classList.toggle("sun-mode", normalized === "sun");
    document.body.classList.toggle("mono-mode", normalized === "mono");

    if (button) {
      button.classList.toggle("is-sun", normalized === "sun");
      button.classList.toggle("is-mono", normalized === "mono");
      button.setAttribute("aria-label", "Stílus váltás");
      button.setAttribute("title", "Stílus váltás");
    }

    localStorage.setItem(key, normalized);
    closeMenu();
  };

  const closeMenu = () => {
    if (!menu || !button) return;
    menu.hidden = true;
    button.setAttribute("aria-expanded", "false");
  };

  const toggleMenu = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (!menu || !button) return;
    const open = menu.hidden;
    menu.hidden = !open;
    button.setAttribute("aria-expanded", open ? "true" : "false");
  };

  const saved = localStorage.getItem(key);
  apply(saved === "sun" || saved === "mono" ? saved : "aqua");

  button?.addEventListener("click", toggleMenu);

  menu?.querySelectorAll("[data-theme-mode]").forEach((option) => {
    option.addEventListener("click", () => {
      apply(option.getAttribute("data-theme-mode") || "aqua");
    });
  });

  document.addEventListener("click", (event) => {
    if (picker && !picker.contains(event.target)) closeMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
})();

/* Mobile style switch: keep its menu above header layers and inside viewport. */
(function(){
  function fixStyleMenu(){
    if(window.innerWidth>660) return;
    document.querySelectorAll(".theme-menu,.style-menu,[role='menu']").forEach(function(menu){
      menu.style.zIndex="2147483647";
      menu.style.pointerEvents="auto";
      menu.style.maxWidth="calc(100vw - 24px)";
    });
  }
  document.addEventListener("click",fixStyleMenu,true);
  window.addEventListener("resize",fixStyleMenu);
  setTimeout(fixStyleMenu,50);
})();

/* =========================================================
   EVERLIGHT SITE SETTINGS — SINGLE CONTROLLER
   ========================================================= */
(function(){
  function initSiteSettings(){
    var toggle=document.getElementById("settingsToggle");
    var menu=document.getElementById("settingsMenu");
    if(!toggle || !menu) return;

    // Portal the menu to body so fixed/mobile header layers cannot clip it.
    if(menu.parentNode !== document.body){
      document.body.appendChild(menu);
    }

    var open=false;
    var touchHandled=false;
    var storageKey="everlight-site-settings";

    function render(){
      menu.hidden=!open;
      menu.classList.toggle("settings-menu-open",open);
      menu.setAttribute("aria-hidden",open?"false":"true");
      toggle.setAttribute("aria-expanded",open?"true":"false");
      toggle.classList.toggle("is-open",open);

      // Explicitly keep the menu above every fixed UI layer.
      menu.style.zIndex="2147483647";
      if(open){
        menu.style.display="block";
        menu.style.visibility="visible";
        menu.style.pointerEvents="auto";
      }else{
        menu.style.display="none";
        menu.style.visibility="hidden";
        menu.style.pointerEvents="none";
      }
    }

    function setTheme(mode){
      var body=document.body;
      body.classList.remove("sun-mode","mono-mode","white-mode");
      if(mode==="sun") body.classList.add("sun-mode");
      if(mode==="mono") body.classList.add("mono-mode");
      if(mode==="white") body.classList.add("white-mode");

      document.querySelectorAll("[data-theme-mode]").forEach(function(btn){
        btn.classList.toggle("active",btn.dataset.themeMode===mode);
      });

      var state={};
      try{ state=JSON.parse(localStorage.getItem(storageKey)||"{}"); }catch(e){}
      state.theme=mode;
      localStorage.setItem(storageKey,JSON.stringify(state));
    }

    function isDesktop(){
      return window.matchMedia("(min-width: 661px)").matches;
    }

    function applyRail(collapsed){
      document.body.classList.toggle("right-rail-collapsed", collapsed);
      toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
      toggle.classList.toggle("is-open", !collapsed);
      toggle.setAttribute("aria-label", collapsed ? "Jobb panel megnyitása" : "Jobb panel bezárása");
      toggle.setAttribute("title", collapsed ? "Jobb panel" : "Jobb panel elrejtése");
      try { localStorage.setItem("everlight-right-rail-collapsed", collapsed ? "1" : "0"); } catch (err) {}
      open = false;
      render();
    }

    function toggleMenu(e){
      if(e){
        e.preventDefault();
        e.stopPropagation();
      }
      if(isDesktop()){
        applyRail(!document.body.classList.contains("right-rail-collapsed"));
        return;
      }
      open=!open;
      render();
    }

    // Clone once to remove stale handlers installed by previous versions.
    var cleanToggle=toggle.cloneNode(true);
    toggle.parentNode.replaceChild(cleanToggle,toggle);
    toggle=cleanToggle;

    if(isDesktop()){
      applyRail(localStorage.getItem("everlight-right-rail-collapsed") === "1");
    }

    toggle.addEventListener("click",function(e){
      if(touchHandled){
        touchHandled=false;
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      toggleMenu(e);
    },false);

    toggle.addEventListener("touchend",function(e){
      touchHandled=true;
      toggleMenu(e);
      window.setTimeout(function(){touchHandled=false;},650);
    },{passive:false});

    menu.addEventListener("click",function(e){
      e.stopPropagation();
    },false);

    menu.addEventListener("touchend",function(e){
      e.stopPropagation();
    },{passive:true});

    document.addEventListener("click",function(e){
      if(!open) return;
      if(menu.contains(e.target) || toggle.contains(e.target)) return;
      open=false;
      render();
    },false);

    document.addEventListener("keydown",function(e){
      if(e.key==="Escape"){
        open=false;
        render();
      }
    });

    document.querySelectorAll("[data-theme-mode]").forEach(function(btn){
      btn.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        setTheme(btn.dataset.themeMode);
      });
    });

    var font=document.getElementById("settingsFont");
    if(font){
      font.addEventListener("change",function(){
        document.body.dataset.font=font.value;
        localStorage.setItem("everlight-font",font.value);
      });
      var savedFont=localStorage.getItem("everlight-font");
      if(savedFont){
        font.value=savedFont;
        document.body.dataset.font=savedFont;
      }
    }

    var lang=document.getElementById("settingsLanguage");
    if(lang){
      var savedLang=localStorage.getItem("everlight-language")||"hu";
      lang.value=savedLang;
      lang.addEventListener("change",function(){
        localStorage.setItem("everlight-language",lang.value);
        document.documentElement.lang=lang.value;
      });
    }

    var saved={};
    try{ saved=JSON.parse(localStorage.getItem(storageKey)||"{}"); }catch(e){}
    setTheme(saved.theme||"aqua");
    render();
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",initSiteSettings,{once:true});
  }else{
    initSiteSettings();
  }
})();

/* Header divider: real DOM symbols, once per page. */
(function(){
  function addHeaderSymbolDivider(){
    var header=document.querySelector(".topbar");
    if(!header || header.querySelector(".header-symbol-divider")) return;
    var divider=document.createElement("div");
    divider.className="header-symbol-divider";
    divider.setAttribute("aria-hidden","true");
    divider.innerHTML='<span class="header-symbols">⋆⋅☆⋅⋆</span>';
    header.appendChild(divider);
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",addHeaderSymbolDivider,{once:true});
  }else{
    addHeaderSymbolDivider();
  }
})();


/* =========================================================
   FOOTER CONTRAST + ACCENT + PWA INSTALL
   ========================================================= */
(function(){
  var contrastKey = "everlight-contrast";
  var accentKey = "everlight-accent";
  var deferredPrompt = null;

  function applyLook(){
    var contrast = localStorage.getItem(contrastKey) === "white" ? "white" : "dark";
    var accent = localStorage.getItem(accentKey) === "sun" ? "sun" : "aqua";
    document.body.classList.remove("sun-mode","mono-mode","white-mode");
    if (contrast === "white") document.body.classList.add("white-mode");
    if (accent === "sun") document.body.classList.add("sun-mode");

    document.querySelectorAll("[data-contrast]").forEach(function(btn){
      btn.classList.toggle("is-active", btn.getAttribute("data-contrast") === contrast);
    });
    document.querySelectorAll("[data-accent]").forEach(function(btn){
      btn.classList.toggle("is-active", btn.getAttribute("data-accent") === accent);
    });

    try {
      var state = JSON.parse(localStorage.getItem("everlight-site-settings") || "{}");
      state.theme = contrast === "white" ? "white" : accent;
      localStorage.setItem("everlight-site-settings", JSON.stringify(state));
    } catch (e) {}
  }

  document.addEventListener("click", function(event){
    var contrastBtn = event.target.closest("[data-contrast]");
    if (contrastBtn) {
      localStorage.setItem(contrastKey, contrastBtn.getAttribute("data-contrast") || "dark");
      applyLook();
      return;
    }
    var accentBtn = event.target.closest("[data-accent]");
    if (accentBtn) {
      localStorage.setItem(accentKey, accentBtn.getAttribute("data-accent") || "aqua");
      applyLook();
    }
  });

  applyLook();

  window.addEventListener("beforeinstallprompt", function(event){
    event.preventDefault();
    deferredPrompt = event;
    var btn = document.getElementById("installAppButton");
    if (btn) btn.hidden = false;
  });

  function isStandalone(){
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  document.getElementById("headerInstallButton")?.addEventListener("click", function(){ document.getElementById("installAppButton")?.click(); });
  document.getElementById("installAppButton")?.addEventListener("click", async function(){
    if (isStandalone()) {
      alert("Az Everlight már az asztalon van.");
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      return;
    }
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) {
      alert("iPhone-on: Oszd meg → Kezdőképernyőhöz adás.");
      return;
    }
    alert("A böngészőben add hozzá az asztalhoz / telepítsd az Everlightot. Az ikon az icon.svg.");
  });
})();


(function(){
  var toggle = document.getElementById("headerLookToggle");
  var menu = document.getElementById("headerLookMenu");
  if (!toggle || !menu) return;

  function setOpen(open) {
    menu.hidden = !open;
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("look-menu-open", open);
  }

  toggle.addEventListener("click", function(event){
    event.preventDefault();
    event.stopPropagation();
    setOpen(menu.hidden || !menu.classList.contains("is-open"));
  }, true);

  document.addEventListener("click", function(event){
    if (!event.target.closest(".header-look-menu-wrap")) setOpen(false);
  }, true);
})();


/* EQUAL RAILS HARD LOCK handler */
(function(){
  document.addEventListener("click", function(e){
    if (!window.matchMedia("(min-width: 661px)").matches) return;
    var btn = e.target.closest("#settingsToggle");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    document.body.classList.toggle("right-rail-collapsed");
    var collapsed = document.body.classList.contains("right-rail-collapsed");
    try { localStorage.setItem("everlight-right-rail-collapsed", collapsed ? "1" : "0"); } catch (err) {}
    var menu = document.getElementById("settingsMenu");
    if (menu) {
      menu.hidden = true;
      menu.style.display = "none";
    }
  }, true);
})();


/* Domain status dot — JS pulse fallback */
(function(){
  function pulseDot(){
    var dot = document.querySelector(".topbar .domain .domain-mode-light");
    if (!dot) return;
    dot.style.animation = "everlight-domain-pulse 1.55s ease-in-out infinite";
    dot.style.animationPlayState = "running";
    // JS fallback if CSS animation is blocked
    var t = 0;
    if (window.__everlightDotPulse) return;
    window.__everlightDotPulse = true;
    setInterval(function(){
      var d = document.querySelector(".topbar .domain .domain-mode-light");
      if (!d) return;
      t = (t + 1) % 32;
      var phase = Math.abs(16 - t) / 16;
      var opacity = 0.3 + phase * 0.7;
      var scale = 0.82 + phase * 0.36;
      d.style.opacity = String(opacity);
      d.style.transform = "scale(" + scale + ")";
    }, 50);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", pulseDot);
  } else {
    pulseDot();
  }
})();
