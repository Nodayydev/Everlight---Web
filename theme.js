(() => {
  const key = "everlight-theme";
  const button = document.getElementById("themeToggle");
  const logoButton = document.getElementById("themeLogoToggle");

  const apply = (mode) => {
    const isSun = mode === "sun";
    document.body.classList.toggle("sun-mode", isSun);

    const logo = document.querySelector(".header-logo-image");
    if (logo) {
      logo.src = isSun ? "logo-sun.png" : "logo.png";
    }

    [button, logoButton].forEach((el) => {
      if (!el) return;
      el.classList.toggle("is-sun", isSun);
      el.setAttribute("aria-label", isSun ? "Vissza kék módra" : "Sárga mód");
      el.setAttribute("title", isSun ? "Vissza kék módra" : "Sárga mód");
    });

    localStorage.setItem(key, mode);
  };

  const toggle = () => {
    apply(document.body.classList.contains("sun-mode") ? "aqua" : "sun");
  };

  apply(localStorage.getItem(key) === "sun" ? "sun" : "aqua");
  button?.addEventListener("click", toggle);
  logoButton?.addEventListener("click", toggle);
})();
