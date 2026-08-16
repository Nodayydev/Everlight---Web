/* =========================================================
   EVERLIGHT — APP.JS
   ========================================================= */

/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

let token = localStorage.getItem("everlight-token") || "";

let currentUser = null;

let imageData = "";
let profileImageData = "";
let coverImageData = "";

let currentView = "hub";


/* =========================================================
   CATEGORY LIMITS
   ========================================================= */

const CATEGORY_LIMITS = {
  Gondolat: 280,
  Történet: 600,
  Idézet: 500,
  Élet: 400,
  Alkotás: 1000
};


/* =========================================================
   TOAST
   ========================================================= */

function notify(message) {
  const toast = $("#toast");

  if (!toast) return;

  toast.textContent = message;

  toast.classList.add("show");

  clearTimeout(toast._timeout);

  toast._timeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}


/* =========================================================
   HTML ESCAPE
   ========================================================= */

function escapeHtml(text = "") {
  const node = document.createElement("div");

  node.textContent = String(text);

  return node.innerHTML;
}


/* =========================================================
   API
   ========================================================= */

async function api(url, options = {}) {
  const headers = {
    ...(options.body
      ? {
          "Content-Type": "application/json"
        }
      : {}),

    ...(token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {}),

    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || "Kapcsolati hiba."
    );
  }

  return data;
}


/* =========================================================
   USER HELPERS
   ========================================================= */

function getUsername(user) {
  return user?.username || "";
}


function getDisplayName(user) {
  if (
    user?.displayName &&
    String(user.displayName).trim()
  ) {
    return String(user.displayName).trim();
  }

  const username = getUsername(user);

  if (username.includes("#")) {
    return username.split("#")[0];
  }

  return username || "?";
}


function getInitial(user) {
  const name = getDisplayName(user);

  return (
    name.charAt(0).toUpperCase() ||
    "?"
  );
}


/* =========================================================
   AVATAR
   ========================================================= */

function avatar(user, anonymous = false) {
  if (anonymous) {
    return `
      <div class="avatar aurora">
        ✦
      </div>
    `;
  }

  if (user?.avatar) {
    return `
      <div class="avatar aurora profile-custom-image">
        <img
          src="${escapeHtml(user.avatar)}"
          alt="Profilkép"
        >
      </div>
    `;
  }

  return `
    <div class="avatar aurora">
      ${escapeHtml(getInitial(user))}
    </div>
  `;
}


/* =========================================================
   SET ACCOUNT
   ========================================================= */

function setAccount(user) {
  if (!user) return;

  currentUser = {
    ...user
  };

  profileImageData = user.avatar || "";
  coverImageData = user.cover || "";

  const username = getUsername(user);
  const displayName = getDisplayName(user);


  /* -------------------------------------------------------
     LEFT PROFILE AVATAR
     ------------------------------------------------------- */

  const profileAvatar = $("#profileAvatar");

  if (profileAvatar) {
    profileAvatar.style.background =
      user.profileColor || "#273638";

    profileAvatar.classList.remove(
      "profile-custom-image"
    );

    if (user.avatar) {
      profileAvatar.innerHTML = `
        <img
          src="${escapeHtml(user.avatar)}"
          alt="Profilkép"
        >
      `;

      profileAvatar.classList.add(
        "profile-custom-image"
      );
    } else {
      profileAvatar.textContent =
        getInitial(user);
    }
  }


  /* -------------------------------------------------------
     PROFILE SUMMARY
     ------------------------------------------------------- */

  const profileSummary =
    $("#profileSummary");

  if (profileSummary) {
    profileSummary.innerHTML = `
      <strong
        style="color:${escapeHtml(
          user.nameColor || "#67e7dd"
        )}"
      >
        ${escapeHtml(username)}
      </strong>

      <br />

      ${escapeHtml(
        user.bio ||
        user.status ||
        "Elérhető"
      )}
    `;
  }


  /* -------------------------------------------------------
     COMPOSER AVATAR
     ------------------------------------------------------- */

  const composerAvatar =
    $("#composerAvatar");

  if (composerAvatar) {
    composerAvatar.style.background =
      user.profileColor || "#273638";

    composerAvatar.classList.remove(
      "profile-custom-image"
    );

    if (user.avatar) {
      composerAvatar.innerHTML = `
        <img
          src="${escapeHtml(user.avatar)}"
          alt="Profilkép"
        >
      `;

      composerAvatar.classList.add(
        "profile-custom-image"
      );
    } else {
      composerAvatar.textContent =
        getInitial(user);
    }
  }


  /* -------------------------------------------------------
     ACTIVITY
     ------------------------------------------------------- */

  const activityLocked =
    $("#activityLocked");

  const activityStats =
    $("#activityStats");

  if (activityLocked) {
    activityLocked.hidden = true;
  }

  if (activityStats) {
    activityStats.hidden = false;
  }


  /* -------------------------------------------------------
     OLD ACCOUNT MENU
     ------------------------------------------------------- */

  const profileSettings =
    $("#profileSettings");

  if (profileSettings) {
    profileSettings.hidden = false;
  }

  const accountMenu =
    $("#accountMenu");

  if (accountMenu) {
    accountMenu.classList.add("logged-in");
  }


  /* -------------------------------------------------------
     PROFILE SETTINGS FIELDS
     ------------------------------------------------------- */

  const fields = {
    displayName:
      displayName,

    profileBio:
      user.bio || "",

    pronouns:
      user.pronouns || "",

    profileLocation:
      user.location || "",

    profileWebsite:
      user.website || "",

    profileStatus:
      user.status || "✦ Elérhető",

    nameColor:
      user.nameColor || "#67e7dd",

    profileColor:
      user.profileColor || "#273638"
  };

  Object.entries(fields).forEach(
    ([id, value]) => {
      const element = $(`#${id}`);

      if (element) {
        element.value = value ?? "";
      }
    }
  );


  /* -------------------------------------------------------
     PROFILE IMAGE PREVIEW
     ------------------------------------------------------- */

  const profileImagePreview =
    $("#profileImagePreview");

  if (profileImagePreview) {
    if (user.avatar) {
      profileImagePreview.innerHTML = `
        <img
          src="${escapeHtml(user.avatar)}"
          alt="Profilkép"
        >
      `;
    } else {
      profileImagePreview.textContent =
        getInitial(user);
    }
  }


  /* -------------------------------------------------------
     COVER PREVIEW
     ------------------------------------------------------- */

  const coverPreview =
    $("#coverPreview");

  if (coverPreview) {
    if (user.cover) {
      coverPreview.style.backgroundImage =
        `url("${escapeHtml(user.cover)}")`;

      coverPreview.classList.add(
        "profile-custom-image"
      );
    } else {
      coverPreview.style.backgroundImage = "";

      coverPreview.classList.remove(
        "profile-custom-image"
      );
    }
  }


  /* -------------------------------------------------------
     FULL PROFILE VIEW
     ------------------------------------------------------- */

  updateProfileView(user);
}


/* =========================================================
   PROFILE VIEW
   ========================================================= */

function updateProfileView(user) {
  if (!user) return;

  const username = getUsername(user);
  const displayName = getDisplayName(user);


  const profileViewName =
    $("#profileViewName");

  if (profileViewName) {
    profileViewName.textContent =
      displayName;
    profileViewName.style.color =
      user.nameColor || "#67e7dd";
  }


  const profileViewUsername =
    $("#profileViewUsername");

  if (profileViewUsername) {
    profileViewUsername.textContent =
      `@${username}`;
  }


  const profileViewBio =
    $("#profileViewBio");

  if (profileViewBio) {
    profileViewBio.textContent =
      user.bio ||
      user.status ||
      "Lépj be, hogy nyomot hagyj.";
  }


  const profileViewStatus =
    $("#profileViewStatus");

  if (profileViewStatus) {
    profileViewStatus.textContent =
      user.status ||
      "✦ Elérhető";
  }


  const profileViewLocation =
    $("#profileViewLocation");

  if (profileViewLocation) {
    profileViewLocation.textContent =
      user.location ||
      "—";
  }


  const profileViewWebsite =
    $("#profileViewWebsite");

  if (profileViewWebsite) {
    profileViewWebsite.textContent =
      user.website ||
      "—";
  }


  const profileViewAvatar =
    $("#profileViewAvatar");

  if (profileViewAvatar) {
    profileViewAvatar.style.background =
      user.profileColor || "#273638";

    profileViewAvatar.classList.remove(
      "profile-custom-image"
    );

    if (user.avatar) {
      profileViewAvatar.innerHTML = `
        <img
          src="${escapeHtml(user.avatar)}"
          alt="Profilkép"
        >
      `;

      profileViewAvatar.classList.add(
        "profile-custom-image"
      );
    } else {
      profileViewAvatar.textContent =
        getInitial(user);
    }
  }


  const profileViewCover =
    $("#profileViewCover");

  if (profileViewCover) {
    if (user.cover) {
      profileViewCover.style.backgroundImage =
        `url("${escapeHtml(user.cover)}")`;
    } else {
      profileViewCover.style.backgroundImage =
        "";
    }
  }
}


/* =========================================================
   LOGIN REQUIRED
   ========================================================= */

function requireLogin() {
  if (currentUser) {
    return true;
  }

  openAccountMenu();

  notify(
    "Ehhez előbb jelentkezz be."
  );

  return false;
}


/* =========================================================
   CATEGORY LIMIT
   ========================================================= */

function getCurrentCategoryLimit() {
  const category =
    $("#category");

  if (!category) {
    return 280;
  }

  return (
    CATEGORY_LIMITS[
      category.value
    ] || 280
  );
}


/* =========================================================
   CHARACTER COUNTER
   ========================================================= */

function updateCharacterCounter() {
  const postText =
    $("#postText");

  const counter =
    $("#counter");

  if (
    !postText ||
    !counter
  ) {
    return;
  }

  const limit =
    getCurrentCategoryLimit();

  const currentLength =
    postText.value.length;

  counter.textContent =
    `${currentLength} / ${limit}`;

  if (
    currentLength >= limit
  ) {
    counter.style.color =
      "#ff9c8f";
  } else if (
    currentLength >=
    Math.floor(limit * 0.9)
  ) {
    counter.style.color =
      "#e8c77c";
  } else {
    counter.style.color = "";
  }
}


/* =========================================================
   CATEGORY LIMIT UPDATE
   ========================================================= */

function updateCategoryLimit() {
  const postText =
    $("#postText");

  if (!postText) {
    return;
  }

  const limit =
    getCurrentCategoryLimit();

  postText.maxLength =
    limit;

  if (
    postText.value.length >
    limit
  ) {
    postText.value =
      postText.value.slice(
        0,
        limit
      );

    notify(
      `Ez a kategória legfeljebb ${limit} karakter lehet.`
    );
  }

  updateCharacterCounter();
}


/* =========================================================
   RENDER POST
   ========================================================= */

function renderPost(post) {
  const date =
    new Date(
      post.created_at
    ).toLocaleTimeString(
      "hu-HU",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );

  const anonymous =
    Boolean(post.is_anonymous);

  const postUser = {
    username:
      post.username || "",

    displayName:
      post.display_name ||
      (
        post.username &&
        post.username.includes("#")
          ? post.username.split("#")[0]
          : post.username
      ),

    avatar:
      post.avatar || "",

    nameColor:
      post.name_color ||
      "#67e7dd"
  };

  const category =
    post.category ||
    "Gondolat";

  return `
    <article class="post">

      <div class="post-top">

        <div class="identity">

          ${avatar(
            postUser,
            anonymous
          )}

          <div>

            <strong
              style="${
                !anonymous
                  ? `color:${escapeHtml(
                      postUser.nameColor
                    )}`
                  : ""
              }"
            >
              ${
                anonymous
                  ? "Névtelen"
                  : escapeHtml(
                      postUser.displayName
                    )
              }
            </strong>

            <span>
              ${
                anonymous
                  ? "@anonymous"
                  : "@" +
                    escapeHtml(
                      postUser.username
                    )
              }
            </span>

          </div>

        </div>

        <time>
          ${escapeHtml(date)}
        </time>

      </div>

      ${
        post.body
          ? `
            <p>
              ${escapeHtml(
                post.body
              )}
            </p>
          `
          : ""
      }

      ${
        post.image
          ? `
            <img
              class="post-image"
              src="${escapeHtml(
                post.image
              )}"
              alt="Megosztott kép"
              loading="lazy"
            >
          `
          : ""
      }

      <div class="post-bottom">

        <span class="story-label">
          ${escapeHtml(
            category
          ).toUpperCase()}
        </span>

      </div>

    </article>
  `;
}


/* =========================================================
   LOAD POSTS
   ========================================================= */

async function loadPosts() {
  try {
    const { posts } =
      await api("/api/posts");

    const feedList =
      $("#feedList");

    if (!feedList) {
      return;
    }

    feedList.innerHTML =
      posts.length
        ? posts
            .map(renderPost)
            .join("")
        : `
          <p class="loading-copy">
            Még nincs bejegyzés.
            Légy te az első.
          </p>
        `;
  } catch {
    const feedList =
      $("#feedList");

    if (!feedList) {
      return;
    }

    feedList.innerHTML = `
      <p class="loading-copy">
        Az áramlás nem érhető el.
        Ellenőrizd, hogy a Node szerver fut-e.
      </p>
    `;
  }
}


/* =========================================================
   LOAD ONLINE
   ========================================================= */

async function loadOnline() {
  try {
    const { users } =
      await api("/api/online");

    const onlineCount =
      $("#onlineCount");

    const onlineFaces =
      $("#onlineFaces");

    if (onlineCount) {
      onlineCount.innerHTML =
        `<i></i> ${users.length}`;
    }

    if (onlineFaces) {
      onlineFaces.innerHTML =
        users.length
          ? users
              .map((user) =>
                avatar({
                  username:
                    user.username,

                  displayName:
                    user.display_name ||
                    (
                      user.username &&
                      user.username.includes("#")
                        ? user.username.split("#")[0]
                        : user.username
                    ),

                  avatar:
                    user.avatar
                })
              )
              .join("")
          : `
            <span class="loading-copy">
              Most nincs aktív felhasználó.
            </span>
          `;
    }
  } catch {
    const onlineFaces =
      $("#onlineFaces");

    if (onlineFaces) {
      onlineFaces.innerHTML = `
        <span class="loading-copy">
          Nincs kapcsolat.
        </span>
      `;
    }
  }
}


/* =========================================================
   VIEW HELPERS
   ========================================================= */

function getViewElements() {
  return {
    feed:
      $("#feed"),

    messages:
      $("#messagesView"),

    profile:
      $("#profileView")
  };
}


/* =========================================================
   UPDATE NAVIGATION STATE
   ========================================================= */

function updateNavigationState(view) {
  currentView = view;

  const desktopHubNav =
    $("#desktopHubNav");

  const messageNav =
    $("#messageNav");

  const accountButton =
    $("#accountButton");

  const leftMessageNav =
    $("#leftMessageNav");

  const leftProfileNav =
    $("#leftProfileNav");

  const mobileHubNav =
    $("#mobileHubNav");

  const mobileMessageNav =
    $("#mobileMessageNav");

  const mobileProfileNav =
    $("#mobileProfileNav");


  const desktopItems = [
    desktopHubNav,
    messageNav,
    accountButton,
    leftMessageNav,
    leftProfileNav
  ];

  desktopItems.forEach((item) => {
    if (!item) return;

    item.classList.remove(
      "active",
      "nav-active"
    );
  });


  const mobileItems = [
    mobileHubNav,
    mobileMessageNav,
    mobileProfileNav
  ];

  mobileItems.forEach((item) => {
    if (!item) return;

    item.classList.remove(
      "active"
    );
  });


  if (view === "hub") {
    desktopHubNav?.classList.add("active");
    mobileHubNav?.classList.add("active");
  }

  if (view === "messages") {
    messageNav?.classList.add("active");
    leftMessageNav?.classList.add("nav-active");
    mobileMessageNav?.classList.add("active");
  }

  if (view === "profile") {
    accountButton?.classList.add("active");
    leftProfileNav?.classList.add("nav-active");
    mobileProfileNav?.classList.add("active");
  }
}


/* =========================================================
   CLOSE ALL VIEWS
   ========================================================= */

function closeAllViews() {
  const {
    feed,
    messages,
    profile
  } = getViewElements();


  if (messages) {
    messages.classList.remove("open");
    messages.setAttribute(
      "aria-hidden",
      "true"
    );
  }


  if (profile) {
    profile.classList.remove("open");
    profile.setAttribute(
      "aria-hidden",
      "true"
    );
  }


  if (feed) {
    feed.classList.remove(
      "view-hidden"
    );
  }


  document.body.classList.remove(
    "messages-open",
    "profile-open"
  );
}


/* =========================================================
   OPEN HUB
   ========================================================= */

function openHub() {
  closeAllViews();

  updateNavigationState(
    "hub"
  );

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (
    window.location.hash !==
    "#feed"
  ) {
    history.replaceState(
      null,
      "",
      "#feed"
    );
  }
}


/* =========================================================
   OPEN MESSAGES
   ========================================================= */

function openMessages() {
  if (!requireLogin()) {
    return;
  }

  const messages =
    $("#messagesView");

  if (!messages) {
    return;
  }


  closeAllViews();


  messages.classList.add(
    "open"
  );

  messages.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "messages-open"
  );


  updateNavigationState(
    "messages"
  );


  history.replaceState(
    null,
    "",
    "#messages"
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  const recipient =
    $("#dmRecipient");

  if (
    recipient &&
    recipient.value.trim()
  ) {
    loadMessages();
  }
}


/* =========================================================
   OPEN PROFILE
   ========================================================= */

function openProfile() {
  if (!requireLogin()) {
    return;
  }

  const profile =
    $("#profileView");

  if (!profile) {
    return;
  }


  closeAllViews();


  if (currentUser) {
    updateProfileView(
      currentUser
    );
  }


  profile.classList.add(
    "open"
  );

  profile.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "profile-open"
  );


  updateNavigationState(
    "profile"
  );


  history.replaceState(
    null,
    "",
    "#profile"
  );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   TOGGLE MESSAGES
   ========================================================= */

function toggleMessages() {
  if (
    currentView ===
    "messages"
  ) {
    openHub();
    return;
  }

  openMessages();
}


/* =========================================================
   TOGGLE PROFILE
   ========================================================= */

function toggleProfile() {
  if (
    currentView ===
    "profile"
  ) {
    openHub();
    return;
  }

  openProfile();
}


/* =========================================================
   ACCOUNT BUTTON
   ========================================================= */

const accountButton =
  $("#accountButton");

if (accountButton) {
  accountButton.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      /*
       * Az új rendszerben a Fiók nem popup,
       * hanem teljes nézet.
       */

      toggleProfile();
    }
  );
}


/* =========================================================
   DESKTOP HUB
   ========================================================= */

const desktopHubNav =
  $("#desktopHubNav");

if (desktopHubNav) {
  desktopHubNav.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      if (
        currentView ===
        "hub"
      ) {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });

        return;
      }

      openHub();
    }
  );
}


/* =========================================================
   HEADER LOGO
   ========================================================= */

const headerLogo =
  document.querySelector(
    ".header-logo"
  );

if (headerLogo) {
  headerLogo.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      openHub();
    }
  );
}


/* =========================================================
   DESKTOP MESSAGE NAV
   ========================================================= */

const messageNav =
  $("#messageNav");

if (messageNav) {
  messageNav.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      toggleMessages();
    }
  );
}


/* =========================================================
   LEFT MESSAGE NAV
   ========================================================= */

const leftMessageNav =
  $("#leftMessageNav");

if (leftMessageNav) {
  leftMessageNav.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      toggleMessages();
    }
  );
}


/* =========================================================
   LEFT PROFILE NAV
   ========================================================= */

const leftProfileNav =
  $("#leftProfileNav");

if (leftProfileNav) {
  leftProfileNav.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      toggleProfile();
    }
  );
}


/* =========================================================
   MOBILE HUB
   ========================================================= */

const mobileHubNav =
  $("#mobileHubNav");

if (mobileHubNav) {
  mobileHubNav.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      openHub();
    }
  );
}


/* =========================================================
   MOBILE MESSAGE NAV
   ========================================================= */

const mobileMessageNav =
  $("#mobileMessageNav");

if (mobileMessageNav) {
  mobileMessageNav.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      toggleMessages();
    }
  );
}


/* =========================================================
   MOBILE PROFILE NAV
   ========================================================= */

const mobileProfileNav =
  $("#mobileProfileNav");

if (mobileProfileNav) {
  mobileProfileNav.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      toggleProfile();
    }
  );
}


/* =========================================================
   CLOSE MESSAGES VIEW
   ========================================================= */

const closeMessagesView =
  $("#closeMessagesView");

if (closeMessagesView) {
  closeMessagesView.addEventListener(
    "click",
    () => {
      openHub();
    }
  );
}


/* =========================================================
   CLOSE PROFILE VIEW
   ========================================================= */

const closeProfileView =
  $("#closeProfileView");

if (closeProfileView) {
  closeProfileView.addEventListener(
    "click",
    () => {
      openHub();
    }
  );
}


/* =========================================================
   PROFILE SETTINGS
   ========================================================= */

const openProfileSettings =
  $("#openProfileSettings");

if (openProfileSettings) {
  openProfileSettings.addEventListener(
    "click",
    () => {
      if (!requireLogin()) {
        return;
      }

      /*
       * A szerkesztéshez a régi account menüt használjuk,
       * de a profil nézetet nem zárjuk be.
       */

      const accountMenu =
        $("#accountMenu");

      if (!accountMenu) {
        return;
      }

      accountMenu.classList.add(
        "open"
      );

      accountMenu.setAttribute(
        "aria-hidden",
        "false"
      );

      const accountButton =
        $("#accountButton");

      if (accountButton) {
        accountButton.classList.add(
          "active"
        );
      }
    }
  );
}


/* =========================================================
   OLD ACCOUNT MENU OPEN
   ========================================================= */

function openAccountMenu() {
  const accountMenu =
    $("#accountMenu");

  const accountButton =
    $("#accountButton");

  if (!accountMenu) {
    return;
  }

  accountMenu.classList.add(
    "open"
  );

  accountMenu.setAttribute(
    "aria-hidden",
    "false"
  );

  if (accountButton) {
    accountButton.classList.add(
      "active"
    );
  }
}


/* =========================================================
   CLOSE ACCOUNT MENU OUTSIDE
   ========================================================= */

document.addEventListener(
  "click",
  (event) => {
    if (
      event.target.closest(
        ".account-wrap"
      ) ||
      event.target.closest(
        "#openProfileSettings"
      )
    ) {
      return;
    }

    const accountMenu =
      $("#accountMenu");

    const accountButton =
      $("#accountButton");

    if (accountMenu) {
      accountMenu.classList.remove(
        "open"
      );

      accountMenu.setAttribute(
        "aria-hidden",
        "true"
      );
    }

    /*
     * Csak akkor vesszük le az aktív állapotot,
     * ha ténylegesen nem a profil nézet aktív.
     */

    if (
      accountButton &&
      currentView !== "profile"
    ) {
      accountButton.classList.remove(
        "active"
      );
    }
  }
);


/* =========================================================
   ESC KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key !==
      "Escape"
    ) {
      return;
    }

    if (
      currentView === "messages" ||
      currentView === "profile"
    ) {
      openHub();
    }
  }
);


/* =========================================================
   BROWSER BACK / FORWARD
   ========================================================= */

window.addEventListener(
  "popstate",
  () => {
    const hash =
      window.location.hash;

    if (
      hash === "#messages"
    ) {
      if (currentUser) {
        openMessages();
      } else {
        openHub();
      }

      return;
    }

    if (
      hash === "#profile"
    ) {
      if (currentUser) {
        openProfile();
      } else {
        openHub();
      }

      return;
    }

    openHub();
  }
);


/* =========================================================
   LOGIN
   ========================================================= */

const loginForm =
  $("#loginForm");

if (loginForm) {
  loginForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      try {
        const loginName =
          $("#loginName");

        const emailInput =
          $("#loginEmail");

        const passwordInput =
          $("#loginPassword");

        const data =
          await api(
            "/api/auth/enter",
            {
              method: "POST",

              body:
                JSON.stringify({
                  username:
                    loginName
                      ? loginName.value.trim()
                      : "",

                  email:
                    emailInput
                      ? emailInput.value.trim()
                      : "",

                  password:
                    passwordInput
                      ? passwordInput.value
                      : ""
                })
            }
          );


        token =
          data.token;

        localStorage.setItem(
          "everlight-token",
          token
        );


        setAccount(
          data.user
        );


        if (passwordInput) {
          passwordInput.value = "";
        }


        /*
         * Belépés után bezárjuk a login menüt,
         * majd visszatérünk a Hubra.
         */

        const accountMenu =
          $("#accountMenu");

        const accountButton =
          $("#accountButton");

        if (accountMenu) {
          accountMenu.classList.remove(
            "open"
          );

          accountMenu.setAttribute(
            "aria-hidden",
            "true"
          );
        }

        if (accountButton) {
          accountButton.classList.remove(
            "active"
          );
        }


        openHub();


        notify(
          "Sikeres belépés."
        );


        await Promise.all([
          loadPosts(),
          loadOnline()
        ]);

      } catch (error) {
        notify(
          error.message
        );
      }
    }
  );
}


/* =========================================================
   CATEGORY CHANGE
   ========================================================= */

const category =
  $("#category");

if (category) {
  category.addEventListener(
    "change",
    updateCategoryLimit
  );
}


/* =========================================================
   POST TEXT INPUT
   ========================================================= */

const postText =
  $("#postText");

if (postText) {
  postText.addEventListener(
    "input",
    () => {
      const limit =
        getCurrentCategoryLimit();

      if (
        postText.value.length >
        limit
      ) {
        postText.value =
          postText.value.slice(
            0,
            limit
          );
      }

      updateCharacterCounter();
    }
  );
}


/* =========================================================
   IMAGE UPLOAD
   ========================================================= */

const imageInput =
  $("#imageInput");

if (imageInput) {
  imageInput.addEventListener(
    "change",
    () => {
      const file =
        imageInput.files[0];

      if (!file) {
        return;
      }

      if (
        !file.type.startsWith(
          "image/"
        )
      ) {
        imageInput.value = "";

        notify(
          "Csak képfájl tölthető fel."
        );

        return;
      }

      if (
        file.size >
        1024 * 1024
      ) {
        imageInput.value = "";

        notify(
          "A kép legfeljebb 1 MB lehet."
        );

        return;
      }

      const reader =
        new FileReader();

      reader.onload = () => {
        imageData =
          reader.result;

        const imagePreview =
          $("#imagePreview");

        const imageName =
          $("#imageName");

        if (imagePreview) {
          imagePreview.innerHTML = `
            <img
              src="${escapeHtml(
                imageData
              )}"
              alt="Előnézet"
            >

            <button
              type="button"
              aria-label="Kép eltávolítása"
            >
              ×
            </button>
          `;

          imagePreview.classList.add(
            "visible"
          );
        }

        if (imageName) {
          imageName.textContent =
            file.name.slice(
              0,
              16
            );
        }
      };

      reader.readAsDataURL(file);
    }
  );
}


/* =========================================================
   IMAGE PREVIEW REMOVE
   ========================================================= */

const imagePreview =
  $("#imagePreview");

if (imagePreview) {
  imagePreview.addEventListener(
    "click",
    (event) => {
      if (
        event.target.tagName !==
        "BUTTON"
      ) {
        return;
      }

      imageData = "";

      const input =
        $("#imageInput");

      if (input) {
        input.value = "";
      }

      imagePreview.innerHTML = "";

      imagePreview.classList.remove(
        "visible"
      );

      const imageName =
        $("#imageName");

      if (imageName) {
        imageName.textContent =
          "Kép";
      }
    }
  );
}


/* =========================================================
   CREATE POST
   ========================================================= */

const postButton =
  $("#postButton");

if (postButton) {
  postButton.addEventListener(
    "click",
    async () => {
      if (!requireLogin()) {
        return;
      }

      const body =
        postText
          ? postText.value.trim()
          : "";

      const selectedCategory =
        category
          ? category.value
          : "Gondolat";

      const limit =
        CATEGORY_LIMITS[
          selectedCategory
        ] || 280;

      if (
        body.length >
        limit
      ) {
        notify(
          `A ${selectedCategory.toLowerCase()} kategóriában maximum ${limit} karakter használható.`
        );

        return;
      }

      try {
        const { post } =
          await api(
            "/api/posts",
            {
              method: "POST",

              body:
                JSON.stringify({
                  body,

                  category:
                    selectedCategory,

                  anonymous:
                    $("#anonymous")
                      ? $("#anonymous").checked
                      : false,

                  image:
                    imageData
                })
            }
          );


        const feedList =
          $("#feedList");

        if (feedList) {
          feedList.insertAdjacentHTML(
            "afterbegin",
            renderPost(post)
          );
        }


        if (postText) {
          postText.value = "";
        }

        imageData = "";


        if (imageInput) {
          imageInput.value = "";
        }


        if (imagePreview) {
          imagePreview.innerHTML = "";

          imagePreview.classList.remove(
            "visible"
          );
        }


        const imageName =
          $("#imageName");

        if (imageName) {
          imageName.textContent =
            "Kép";
        }


        updateCharacterCounter();


        const postCount =
          $("#postCount");

        if (postCount) {
          postCount.textContent =
            Number(
              postCount.textContent || 0
            ) + 1;
        }


        notify(
          "A bejegyzésed megjelent."
        );


        await loadOnline();

      } catch (error) {
        notify(
          error.message
        );
      }
    }
  );
}


/* =========================================================
   READ IMAGE
   ========================================================= */

function readImage(
  input,
  callback
) {
  const file =
    input.files[0];

  if (!file) {
    return;
  }

  if (
    !file.type.startsWith(
      "image/"
    )
  ) {
    input.value = "";

    notify(
      "Csak képfájl tölthető fel."
    );

    return;
  }

  if (
    file.size >
    1024 * 1024
  ) {
    input.value = "";

    notify(
      "A kép legfeljebb 1 MB lehet."
    );

    return;
  }

  const reader =
    new FileReader();

  reader.onload = () => {
    callback(
      reader.result
    );
  };

  reader.readAsDataURL(file);
}


/* =========================================================
   PROFILE IMAGE
   ========================================================= */

const profileImageInput =
  $("#profileImageInput");

if (profileImageInput) {
  profileImageInput.addEventListener(
    "change",
    () => {
      readImage(
        profileImageInput,
        (data) => {
          profileImageData =
            data;

          const preview =
            $("#profileImagePreview");

          if (preview) {
            preview.innerHTML = `
              <img
                src="${escapeHtml(data)}"
                alt="Profilkép"
              >
            `;
          }
        }
      );
    }
  );
}


/* =========================================================
   COVER IMAGE
   ========================================================= */

const coverImageInput =
  $("#coverImageInput");

if (coverImageInput) {
  coverImageInput.addEventListener(
    "change",
    () => {
      readImage(
        coverImageInput,
        (data) => {
          coverImageData =
            data;

          const preview =
            $("#coverPreview");

          if (preview) {
            preview.style.backgroundImage =
              `url("${data}")`;

            preview.classList.add(
              "profile-custom-image"
            );
          }
        }
      );
    }
  );
}


/* =========================================================
   SAVE PROFILE
   ========================================================= */

const saveProfile =
  $("#saveProfile");

if (saveProfile) {
  saveProfile.addEventListener(
    "click",
    async () => {
      if (!requireLogin()) {
        return;
      }

      try {
        const currentAvatar =
          profileImageData ||
          currentUser?.avatar ||
          "";

        const currentCover =
          coverImageData ||
          currentUser?.cover ||
          "";


        const displayNameInput =
          $("#displayName");

        const bioInput =
          $("#profileBio");

        const nameColorInput =
          $("#nameColor");

        const profileColorInput =
          $("#profileColor");

        const statusInput =
          $("#profileStatus");

        const pronounsInput =
          $("#pronouns");

        const locationInput =
          $("#profileLocation");

        const websiteInput =
          $("#profileWebsite");


        const { user } =
          await api(
            "/api/profile",
            {
              method: "PUT",

              body:
                JSON.stringify({
                  displayName:
                    displayNameInput
                      ? displayNameInput.value.trim()
                      : getDisplayName(
                          currentUser
                        ),

                  bio:
                    bioInput
                      ? bioInput.value
                      : currentUser?.bio || "",

                  avatar:
                    currentAvatar,

                  cover:
                    currentCover,

                  nameColor:
                    nameColorInput
                      ? nameColorInput.value
                      : currentUser?.nameColor ||
                        "#67e7dd",

                  profileColor:
                    profileColorInput
                      ? profileColorInput.value
                      : currentUser?.profileColor ||
                        "#273638",

                  status:
                    statusInput
                      ? statusInput.value
                      : currentUser?.status ||
                        "✦ Elérhető",

                  pronouns:
                    pronounsInput
                      ? pronounsInput.value
                      : currentUser?.pronouns ||
                        "",

                  location:
                    locationInput
                      ? locationInput.value
                      : currentUser?.location ||
                        "",

                  website:
                    websiteInput
                      ? websiteInput.value
                      : currentUser?.website ||
                        ""
                })
            }
          );


        setAccount(user);


        /*
         * Sikeres mentés után bezárjuk
         * a szerkesztő popupot.
         */

        const accountMenu =
          $("#accountMenu");

        if (accountMenu) {
          accountMenu.classList.remove(
            "open"
          );

          accountMenu.setAttribute(
            "aria-hidden",
            "true"
          );
        }


        notify(
          "A profilod mentve lett."
        );

      } catch (error) {
        notify(
          error.message
        );
      }
    }
  );
}


/* =========================================================
   LOAD MESSAGES
   ========================================================= */

async function loadMessages() {
  const recipientInput =
    $("#dmRecipient");

  const dmList =
    $("#dmList");

  if (
    !recipientInput ||
    !dmList
  ) {
    return;
  }

  const recipient =
    recipientInput.value.trim();

  if (
    !recipient ||
    !currentUser
  ) {
    return;
  }

  try {
    const data =
      await api(
        `/api/messages/${encodeURIComponent(
          recipient
        )}`
      );

    const user =
      data.user;

    const dmTitle =
      $("#dmTitle");

    if (dmTitle && user) {
      dmTitle.textContent =
        getUsername(user) ||
        getDisplayName(user) ||
        "Ismeretlen";
    }

    if (
      !data.messages ||
      !data.messages.length
    ) {
      dmList.innerHTML = `
        <p class="loading-copy">
          Még nincs üzenet.
        </p>
      `;

      return;
    }

    dmList.innerHTML =
      data.messages
        .map(
          (message) => `
            <div class="dm">

              <div>

                <strong>
                  ${escapeHtml(
                    message.sender_name ||
                    message.sender_username ||
                    ""
                  )}
                </strong>

                <p>
                  ${escapeHtml(
                    message.body
                  )}
                </p>

              </div>

            </div>
          `
        )
        .join("");

  } catch (error) {
    dmList.innerHTML = `
      <p class="loading-copy">
        ${escapeHtml(
          error.message
        )}
      </p>
    `;
  }
}


/* =========================================================
   MESSAGE RECIPIENT CHANGE
   ========================================================= */

const dmRecipient =
  $("#dmRecipient");

if (dmRecipient) {
  dmRecipient.addEventListener(
    "change",
    loadMessages
  );

  dmRecipient.addEventListener(
    "blur",
    loadMessages
  );

  dmRecipient.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter"
      ) {
        event.preventDefault();

        loadMessages();
      }
    }
  );
}


/* =========================================================
   MESSAGE FORM
   ========================================================= */

const messageForm =
  $("#messageForm");

if (messageForm) {
  messageForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      if (!requireLogin()) {
        return;
      }

      const recipient =
        dmRecipient
          ? dmRecipient.value.trim()
          : "";

      const bodyInput =
        $("#dmBody");

      const body =
        bodyInput
          ? bodyInput.value.trim()
          : "";

      if (!recipient) {
        notify(
          "Add meg a címzettet."
        );

        return;
      }

      if (!body) {
        notify(
          "Az üzenet üres."
        );

        return;
      }

      try {
        await api(
          `/api/messages/${encodeURIComponent(
            recipient
          )}`,
          {
            method: "POST",

            body:
              JSON.stringify({
                body
              })
          }
        );

        if (bodyInput) {
          bodyInput.value = "";
        }

        await loadMessages();

        notify(
          "Üzenet elküldve."
        );

      } catch (error) {
        notify(
          error.message
        );
      }
    }
  );
}


/* =========================================================
   PWA INSTALL
   ========================================================= */

window.addEventListener(
  "beforeinstallprompt",
  (event) => {
    event.preventDefault();

    window.everlightInstall =
      event;
  }
);


const installButton =
  $("#installButton");

if (installButton) {
  installButton.addEventListener(
    "click",
    async () => {
      if (
        !window.everlightInstall
      ) {
        notify(
          "iPhone: Safari → Megosztás → Főképernyőhöz adás. Android: böngésző menü → Telepítés."
        );

        return;
      }

      window.everlightInstall.prompt();

      await window.everlightInstall
        .userChoice;

      window.everlightInstall =
        null;
    }
  );
}


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

const notificationButton =
  $("#notificationButton");

if (notificationButton) {
  notificationButton.addEventListener(
    "click",
    async () => {
      if (
        !("Notification" in window)
      ) {
        notify(
          "Ez a böngésző nem támogatja az értesítéseket."
        );

        return;
      }

      try {
        const permission =
          await Notification.requestPermission();

        if (
          permission ===
          "granted"
        ) {
          notify(
            "Értesítések engedélyezve."
          );
        } else {
          notify(
            "Az értesítések nem lettek engedélyezve."
          );
        }
      } catch {
        notify(
          "Az értesítések engedélyezése nem sikerült."
        );
      }
    }
  );
}


/* =========================================================
   SERVICE WORKER
   ========================================================= */

if (
  "serviceWorker" in navigator
) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register("./sw.js")
        .catch(() => {
          /* Nem kötelező. */
        });
    }
  );
}


/* =========================================================
   CLOCK
   ========================================================= */

function updateClock() {
  const clock =
    $("#mainClock");

  if (!clock) {
    return;
  }

  const now =
    new Date();

  clock.textContent =
    now.toLocaleTimeString(
      "hu-HU",
      {
        hour: "2-digit",
        minute: "2-digit"
      }
    );
}

updateClock();

setInterval(
  updateClock,
  1000
);


/* =========================================================
   DATE
   ========================================================= */

function updateDate() {
  const dateElement =
    $("#mainDate");

  if (!dateElement) {
    return;
  }

  const now =
    new Date();

  dateElement.textContent =
    now.toLocaleDateString(
      "hu-HU",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long"
      }
    );
}

updateDate();


/* =========================================================
   INITIAL CATEGORY LIMIT
   ========================================================= */

updateCategoryLimit();


/* =========================================================
   INITIAL VIEW FROM HASH
   ========================================================= */

function initializeView() {
  const hash =
    window.location.hash;

  if (
    hash === "#messages" &&
    currentUser
  ) {
    openMessages();
    return;
  }

  if (
    hash === "#profile" &&
    currentUser
  ) {
    openProfile();
    return;
  }

  openHub();
}


/* =========================================================
   INITIAL LOAD
   ========================================================= */

(async () => {

  /*
   * Mindig a szerverről kérjük le
   * a teljes usert.
   *
   * Így F5 után:
   *
   * username    = Nodayy#0614
   * displayName = Nodayy
   * avatar      = mentett kép
   * cover       = mentett kép
   */

  if (token) {
    try {
      const { user } =
        await api(
          "/api/auth/me"
        );

      if (!user) {
        throw new Error(
          "A felhasználó nem található."
        );
      }

      setAccount(user);

    } catch {
      localStorage.removeItem(
        "everlight-token"
      );

      token = "";

      currentUser = null;

      profileImageData = "";

      coverImageData = "";
    }
  }


  await Promise.all([
    loadPosts(),
    loadOnline()
  ]);


  initializeView();


  /* -------------------------------------------------------
     Background refresh
     ------------------------------------------------------- */

  setInterval(
    async () => {

      await loadOnline();

      if (
        currentUser &&
        currentView === "messages" &&
        $("#dmRecipient")?.value.trim()
      ) {
        await loadMessages();
      }

    },
    30000
  );

})();
