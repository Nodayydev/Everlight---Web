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
   SITE SETTINGS MENU
   ========================================================= */
(function(){
  const toggle=document.getElementById("settingsToggle");
  const menu=document.getElementById("settingsMenu");
  if(!toggle || !menu) return;

  const key="everlight-site-settings";

  function setTheme(mode){
    document.body.classList.remove("sun-mode","mono-mode","white-mode");
    if(mode==="sun") document.body.classList.add("sun-mode");
    if(mode==="mono") document.body.classList.add("mono-mode");
    if(mode==="white") document.body.classList.add("white-mode");

    document.querySelectorAll("[data-theme-mode]").forEach(btn=>{
      btn.classList.toggle("active", btn.dataset.themeMode===mode);
    });

    localStorage.setItem(key, JSON.stringify({
      ...(JSON.parse(localStorage.getItem(key)||"{}")),
      theme:mode
    }));
  }

  function openMenu(){
    menu.hidden=false;
    toggle.setAttribute("aria-expanded","true");
  }

  function closeMenu(){
    menu.hidden=true;
    toggle.setAttribute("aria-expanded","false");
  }

  toggle.addEventListener("click",function(e){
    e.preventDefault();
    e.stopPropagation();
    menu.hidden ? openMenu() : closeMenu();
  });

  document.addEventListener("click",function(e){
    if(!menu.hidden && !menu.contains(e.target) && !toggle.contains(e.target)){
      closeMenu();
    }
  });

  menu.querySelectorAll("[data-theme-mode]").forEach(btn=>{
    btn.addEventListener("click",function(){
      setTheme(btn.dataset.themeMode);
    });
  });

  const font=document.getElementById("settingsFont");
  if(font){
    font.addEventListener("change",function(){
      document.body.dataset.font=font.value;
      localStorage.setItem("everlight-font",font.value);
    });
    const savedFont=localStorage.getItem("everlight-font");
    if(savedFont) {
      font.value=savedFont;
      document.body.dataset.font=savedFont;
    }
  }

  const lang=document.getElementById("settingsLanguage");
  if(lang){
    const savedLang=localStorage.getItem("everlight-language")||"hu";
    lang.value=savedLang;
    lang.addEventListener("change",function(){
      localStorage.setItem("everlight-language",lang.value);
      document.documentElement.lang=lang.value;
      /* Translation layer can be expanded here without changing layout. */
    });
  }

  let saved={};
  try { saved=JSON.parse(localStorage.getItem(key)||"{}"); } catch(e){}
  setTheme(saved.theme || "aqua");

  document.addEventListener("keydown",function(e){
    if(e.key==="Escape") closeMenu();
  });
})();

/* =========================================================
   EVERLIGHT SETTINGS — SINGLE RELIABLE CONTROLLER
   ========================================================= */
(function () {
  function initSettings() {
    var button = document.getElementById("settingsToggle");
    var menu = document.getElementById("settingsMenu");
    if (!button || !menu) return;

    // Put the menu at body level so no header overflow/transform can clip it.
    if (menu.parentNode !== document.body) {
      document.body.appendChild(menu);
    }

    var open = false;

    function render() {
      open = !!open;
      menu.hidden = !open;
      menu.style.display = open ? "block" : "none";
      menu.style.visibility = open ? "visible" : "hidden";
      menu.style.opacity = open ? "1" : "0";
      menu.style.pointerEvents = open ? "auto" : "none";
      button.setAttribute("aria-expanded", open ? "true" : "false");
      button.classList.toggle("is-open", open);
    }

    function toggleMenu(event) {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      open = !open;
      render();
    }

    // Remove any stale inline listeners by using a cloned button once.
    var cleanButton = button.cloneNode(true);
    button.parentNode.replaceChild(cleanButton, button);
    button = cleanButton;

    button.addEventListener("click", toggleMenu, false);
    button.addEventListener("touchend", function (event) {
      // iOS can swallow click after touch interactions; use touchend only
      // when it has not already generated a click.
      if (event.cancelable) event.preventDefault();
      toggleMenu(event);
    }, {passive:false});

    menu.addEventListener("click", function (event) {
      event.stopPropagation();
    }, false);

    document.addEventListener("click", function (event) {
      if (!open) return;
      if (menu.contains(event.target) || button.contains(event.target)) return;
      open = false;
      render();
    }, false);

    document.addEventListener("touchend", function (event) {
      if (!open) return;
      if (menu.contains(event.target) || button.contains(event.target)) return;
      open = false;
      render();
    }, {passive:true});

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        open = false;
        render();
      }
    });

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettings, {once:true});
  } else {
    initSettings();
  }
})();

/* Keep the full-page theme state synchronized with the selected mode. */
(function(){
  function sync(){
    if(!document.body) return;
    document.body.classList.toggle("full-black-theme",document.body.classList.contains("mono-mode"));
    document.body.classList.toggle("full-white-theme",document.body.classList.contains("white-mode"));
  }
  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",sync,{once:true});
  }else sync();
  new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:["class"]});
})();
