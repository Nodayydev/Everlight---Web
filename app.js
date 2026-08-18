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

const CATEGORY_LIMITS = Object.freeze({
  Gondolat: 280,
  Történet: 600,
  Idézet: 500,
  Élet: 400,
  Alkotás: 1000
});


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
    if (response.status === 413) {
      throw new Error(
        data.error || "A feltöltött kép túl nagy."
      );
    }

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

  const username =
    getUsername(user);

  if (username.includes("#")) {
    return username.split("#")[0];
  }

  return username || "?";
}


function getInitial(user) {
  const name =
    getDisplayName(user);

  return (
    name.charAt(0).toUpperCase() ||
    "?"
  );
}


/* =========================================================
   AVATAR
   ========================================================= */

function avatar(
  user,
  anonymous = false
) {
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
      ${escapeHtml(
        getInitial(user)
      )}
    </div>
  `;
}


/* =========================================================
   SET ACCOUNT
   ========================================================= */

function setAccount(user) {
  if (!user) return;

  showLoggedInProfileState();

  currentUser = {
    ...user
  };
  document.body.classList.add("everlight-authenticated");

  profileImageData =
    user.avatar || "";

  coverImageData =
    user.cover || "";

  const username =
    getUsername(user);

  const displayName =
    getDisplayName(user);


  /* -------------------------------------------------------
     LEFT PROFILE AVATAR
     ------------------------------------------------------- */

  const profileAvatar =
    $("#profileAvatar");

  if (profileAvatar) {

    profileAvatar.style.background =
      user.profileColor ||
      "#273638";

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
          user.nameColor ||
          "#67e7dd"
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
      user.profileColor ||
      "#273638";

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
    accountMenu.classList.add(
      "logged-in"
    );
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
      user.status ||
      "✦ Elérhető",

    nameColor:
      user.nameColor ||
      "#67e7dd",

    profileColor:
      user.profileColor ||
      "#273638"
  };


  Object.entries(fields).forEach(
    ([id, value]) => {

      const element =
        $(`#${id}`);

      if (element) {
        element.value =
          value ?? "";
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

      coverPreview.style.backgroundImage =
        "";

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
   LOGIN REQUIRED
   ========================================================= */

function showProfileLoginState() {
  const loginState = $("#profileLoginState");
  const loggedState = $("#profileLoggedInState");
  if (loginState) {
    loginState.hidden = false;
    loginState.setAttribute("aria-hidden", "false");
  }
  if (loggedState) {
    loggedState.hidden = true;
    loggedState.setAttribute("aria-hidden", "true");
  }
}

function showLoggedInProfileState() {
  const loginState = $("#profileLoginState");
  const loggedState = $("#profileLoggedInState");
  if (loginState) {
    loginState.hidden = true;
    loginState.setAttribute("aria-hidden", "true");
  }
  if (loggedState) {
    loggedState.hidden = false;
    loggedState.setAttribute("aria-hidden", "false");
  }
}

const profileLoginForm = $("#profileLoginForm");

if (profileLoginForm) {
  profileLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const data = await api("/api/auth/enter", {
        method: "POST",
        body: JSON.stringify({
          username: $("#profileLoginName")?.value.trim() || "",
          email: $("#profileLoginEmail")?.value.trim() || "",
          password: $("#profileLoginPassword")?.value || ""
        })
      });

      token = data.token;
      localStorage.setItem("everlight-token", token);
      setAccount(data.user);
      document.body.classList.add("everlight-authenticated");

      if ($("#profileLoginPassword")) {
        $("#profileLoginPassword").value = "";
      }

      showLoggedInProfileState();
      updateProfileView(data.user);
      notify("Sikeres belépés.");
      await Promise.all([loadPosts(), loadOnline(), loadCommunityLatest()]);
    } catch (error) {
      notify(error.message);
    }
  });
}


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

    counter.style.color =
      "";
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
    Boolean(
      post.is_anonymous
    );

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

  /*
   * A jelenlegi adatmodellben nincs külön "téma/cím" mező.
   * Ezért a bejegyzés első sora lesz a kártya címe.
   * Ha nincs sortörés, az első mondat / rövid részlet kerül címként.
   * A teljes eredeti szöveg a megnyitott nézetben marad meg.
   */
  const rawBody =
    String(post.body || "").trim();

  const lines =
    rawBody
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);

  let title = lines[0] || category;
  let excerpt = lines.length > 1
    ? lines.slice(1).join(" ")
    : rawBody;

  if (lines.length === 1 && title.length > 68) {
    const sentence =
      title.match(/^.{1,68}?[.!?](?:\s|$)/);

    if (sentence) {
      title = sentence[0].trim();
      excerpt = rawBody.slice(title.length).trim();
    } else {
      title =
        title.slice(0, 68).trimEnd() + "…";

      excerpt = rawBody;
    }
  }

  const excerptText =
    excerpt.length > 145
      ? excerpt.slice(0, 145).trimEnd() + "…"
      : excerpt;

  const fullBody =
    rawBody || "A bejegyzéshez nem tartozik szöveg.";

  const imageMarkup =
    post.image
      ? `
        <div class="feed-card-media">
          <img
            class="post-image"
            src="${escapeHtml(post.image)}"
            alt="Megosztott kép"
            loading="lazy"
          >
        </div>
      `
      : `
        <div class="feed-card-media feed-card-no-image" aria-hidden="true">
          <span>✦</span>
        </div>
      `;

  return `
    <article
      class="post feed-card"
      data-post-id="${escapeHtml(String(post.id || ""))}"
      tabindex="0"
      role="button"
      aria-label="${escapeHtml(title)} – bejegyzés megnyitása"
    >

      ${imageMarkup}

      <div class="feed-card-content">

        <h2 class="feed-card-title">
          ${escapeHtml(title)}
        </h2>

        <div class="feed-card-meta">
          <span class="feed-card-category">
            ${escapeHtml(category)}
          </span>
          <time>
            ${escapeHtml(date)}
          </time>
        </div>

        <p class="feed-card-excerpt">
          ${escapeHtml(excerptText)}
        </p>

      </div>

      <div
        class="feed-card-full-text"
        hidden
        data-full-body
      >
        ${escapeHtml(fullBody)}
      </div>

    </article>
  `;
}


/* =========================================================
   FEED CARD — OPEN FULL POST
   ========================================================= */

function openPostModalFromCard(card) {

  if (!card) {
    return;
  }

  const title =
    card.querySelector(".feed-card-title")?.textContent.trim() ||
    "Bejegyzés";

  const category =
    card.querySelector(".feed-card-category")?.textContent.trim() ||
    "Gondolat";

  const time =
    card.querySelector("time")?.textContent.trim() ||
    "";

  const image =
    card.querySelector(".feed-card-media img");

  const fullBody =
    card.querySelector("[data-full-body]")?.textContent.trim() ||
    "";

  let modal =
    document.getElementById("postReaderModal");

  if (!modal) {

    modal =
      document.createElement("div");

    modal.id =
      "postReaderModal";

    modal.className =
      "post-reader-modal";

    modal.innerHTML = `
      <div
        class="post-reader-backdrop"
        data-post-reader-close
      ></div>

      <section
        class="post-reader"
        role="dialog"
        aria-modal="true"
        aria-labelledby="postReaderTitle"
      >

        <button
          type="button"
          class="post-reader-close"
          data-post-reader-close
          aria-label="Bezárás"
        >
          ×
        </button>

        <div class="post-reader-media"></div>

        <div class="post-reader-content">

          <h1 id="postReaderTitle"></h1>

          <div class="post-reader-meta">
            <span class="post-reader-category"></span>
            <time class="post-reader-time"></time>
          </div>

          <div class="post-reader-body"></div>

        </div>

      </section>
    `;

    document.body.appendChild(modal);

    modal.addEventListener(
      "click",
      (event) => {

        if (
          event.target.closest(
            "[data-post-reader-close]"
          )
        ) {

          closePostReader();

        }

      }
    );

  }

  const media =
    modal.querySelector(
      ".post-reader-media"
    );

  media.innerHTML =
    image
      ? `
        <img
          src="${escapeHtml(image.getAttribute("src") || "")}"
          alt="Megosztott kép"
        >
      `
      : "";

  media.classList.toggle(
    "has-image",
    Boolean(image)
  );

  modal.querySelector(
    "#postReaderTitle"
  ).textContent =
    title;

  modal.querySelector(
    ".post-reader-category"
  ).textContent =
    category;

  modal.querySelector(
    ".post-reader-time"
  ).textContent =
    time;

  modal.querySelector(
    ".post-reader-body"
  ).textContent =
    fullBody;

  modal.classList.add("open");
  document.body.classList.add("post-reader-open");

  const closeButton =
    modal.querySelector(
      ".post-reader-close"
    );

  if (closeButton) {
    closeButton.focus();
  }
}


function closePostReader() {

  const modal =
    document.getElementById(
      "postReaderModal"
    );

  if (!modal) {
    return;
  }

  modal.classList.remove("open");

  document.body.classList.remove(
    "post-reader-open"
  );
}


document.addEventListener(
  "click",
  (event) => {

    const card =
      event.target.closest(
        ".feed-card"
      );

    if (!card) {
      return;
    }

    /*
     * A kártya megnyitása legyen egyértelmű:
     * kép, cím, kategória vagy rövid szöveg megnyomása
     * ugyanazt a teljes nézetet nyitja meg.
     */
    openPostModalFromCard(card);
  }
);


document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter" ||
      event.key === " "
    ) {

      const card =
        event.target.closest(
          ".feed-card"
        );

      if (card) {

        event.preventDefault();

        openPostModalFromCard(card);
      }
    }

    if (
      event.key === "Escape"
    ) {

      closePostReader();
    }
  }
);


/* =========================================================
   LOAD POSTS
   ========================================================= */

async function loadPosts() {

  try {

    const { posts } =
      await api(
        "/api/posts"
      );


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
   EVERLIGHT COMMUNITY — LATEST LOCAL POST
   ========================================================= */

async function loadCommunityLatest() {
  const community = $("#communityLatest");
  if (!community) return;

  try {
    const { posts } = await api("/api/posts");
    const latestPosts = Array.isArray(posts) ? posts.slice(0, 4) : [];

    if (!latestPosts.length) {
      community.innerHTML = `
        <div class="community-empty">
          <strong>Legutóbbi bejegyzések</strong>
          <span>Még nincs közzétett tartalom az Everlighton.</span>
        </div>
      `;
      return;
    }

    community.innerHTML = `
      <div class="community-latest-list">
        ${latestPosts.map((post) => {
          const rawBody = String(post.body || "").trim();
          const lines = rawBody.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
          let title = lines[0] || post.category || "Bejegyzés";
          if (title.length > 48) title = title.slice(0, 48).trimEnd() + "…";

          const category = post.category || "Gondolat";
          const author = post.is_anonymous
            ? "Névtelen"
            : (post.display_name || (post.username || "").split("#")[0] || "Felhasználó");

          const date = post.created_at
            ? new Date(post.created_at).toLocaleDateString("hu-HU", {
                year: "numeric", month: "short", day: "numeric"
              })
            : "";

          const avatar = post.avatar
            ? `<img src="${escapeHtml(post.avatar)}" alt="" loading="lazy">`
            : `<span class="community-avatar-fallback">✦</span>`;

          return `
            <article class="community-latest-item" data-post-id="${escapeHtml(String(post.id || ""))}" tabindex="0" role="button">
              <div class="community-avatar">${avatar}</div>
              <div class="community-latest-copy">
                <strong>${escapeHtml(title)}</strong>
                <span>Legutóbbi: ${escapeHtml(author)} · ${escapeHtml(date)}</span>
                <small>${escapeHtml(category)}</small>
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;

  } catch {
    community.innerHTML = `
      <div class="community-empty">
        <strong>Legutóbbi bejegyzések</strong>
        <span>Az Everlight legfrissebb tartalma jelenik meg itt.</span>
      </div>
    `;
  }
}

/* A KÖZÖSSÉG kártya ugyanazt a helyi adatforrást használja,
   mint a fő feed. Kattintásra a legújabb helyi bejegyzés nyílik meg. */
document.addEventListener("click", (event) => {
  const item = event.target.closest(".community-latest-item");
  if (!item) return;

  const postId = item.getAttribute("data-post-id");
  if (!postId) return;

  const card = document.querySelector(`.feed-card[data-post-id="${CSS.escape(postId)}"]`);
  if (card) openPostModalFromCard(card);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;

  const item = event.target.closest(".community-latest-item");
  if (!item) return;

  event.preventDefault();
  item.click();
});

/* =========================================================
   LOAD ONLINE
   ========================================================= */

async function loadOnline() {

  try {

    const { users } =
      await api(
        "/api/online"
      );


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
   ACCOUNT / NAVIGATION
   ========================================================= */


/* =========================================================
   OPEN ACCOUNT MENU
   ========================================================= */

function openAccountMenu() {

  const accountMenu =
    $("#accountMenu");

  const accountButton =
    $("#accountButton");

  if (!accountMenu) {
    return;
  }

  accountMenu.classList.add("open");

  accountMenu.setAttribute(
    "aria-hidden",
    "false"
  );

  if (accountButton) {

    accountButton.classList.add(
      "active"
    );

    accountButton.setAttribute(
      "aria-expanded",
      "true"
    );
  }
}


/* =========================================================
   CLOSE ACCOUNT MENU
   ========================================================= */

function closeAccountMenu() {

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

    accountButton.setAttribute(
      "aria-expanded",
      "false"
    );
  }
}


/* =========================================================
   TOGGLE ACCOUNT MENU
   ========================================================= */

function toggleAccountMenu() {

  const accountMenu =
    $("#accountMenu");

  if (!accountMenu) {
    return;
  }

  const isOpen =
    accountMenu.classList.contains(
      "open"
    );

  if (isOpen) {

    closeAccountMenu();

  } else {

    openAccountMenu();
  }
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

      if (currentUser || token) {
        closeAccountMenu();
        openProfileView();
      } else {
        toggleAccountMenu();
      }
    }
  );
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
      )
    ) {
      return;
    }

    closeAccountMenu();
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


        const passwordElement =
          passwordInput ||
          loginForm.querySelector(
            'input[type="password"]'
          );


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
                    passwordElement
                      ? passwordElement.value
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


        if (passwordElement) {
          passwordElement.value = "";
        }


        notify(
          "Sikeres belépés."
        );


        await Promise.all([
          loadPosts(),
          loadOnline()
        ]);


        closeAccountMenu();

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
    async () => {

      const file = imageInput.files[0];

      if (!file) return;

      try {
        imageData = await compressImageFile(file, {
          maxBytes: 900 * 1024,
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 0.86
        });

        const imagePreview = $("#imagePreview");
        const imageName = $("#imageName");

        if (imagePreview) {
          imagePreview.innerHTML = `
            <img
              src="${escapeHtml(imageData)}"
              alt="Előnézet"
            >
            <button
              type="button"
              aria-label="Kép eltávolítása"
            >×</button>
          `;
          imagePreview.classList.add("visible");
        }

        if (imageName) {
          imageName.textContent = file.name.slice(0, 16);
        }
      } catch (error) {
        imageInput.value = "";
        imageData = "";
        notify(error.message || "A kép feldolgozása nem sikerült.");
      }
    }
  );
}


/* =========================================================
   IMAGE PREVIEW REMOVE
   ========================================================= */

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
   FEED EDITOR TOOLBAR
   Works directly with the existing textarea; no editor
   dependency is introduced.
   ========================================================= */
(() => {
  const toolbar = document.getElementById("feedEditorToolbar");
  const editor = document.getElementById("postText");
  if (!toolbar || !editor) return;

  const wrapSelection = (before, after = before) => {
    const start = editor.selectionStart ?? editor.value.length;
    const end = editor.selectionEnd ?? start;
    const selected = editor.value.slice(start, end);
    const replacement = before + (selected || "szöveg") + after;

    editor.setRangeText(replacement, start, end, "select");
    editor.focus();
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const prefixLines = (prefix) => {
    const start = editor.selectionStart ?? 0;
    const end = editor.selectionEnd ?? start;
    const selected = editor.value.slice(start, end) || "szöveg";
    const replacement = selected
      .split(/\r?\n/)
      .map(line => prefix + line)
      .join("\n");

    editor.setRangeText(replacement, start, end, "select");
    editor.focus();
    editor.dispatchEvent(new Event("input", { bubbles: true }));
  };

  toolbar.addEventListener("mousedown", event => {
    const button = event.target.closest("button");
    if (button) event.preventDefault();
  });

  toolbar.addEventListener("click", event => {
    const button = event.target.closest("button[data-editor-action]");
    if (!button) return;

    const action = button.dataset.editorAction;

    if (action === "bold") wrapSelection("**");
    if (action === "italic") wrapSelection("*");
    if (action === "heading") prefixLines("# ");
    if (action === "bullet") prefixLines("• ");
    if (action === "quote") prefixLines("> ");
    if (action === "link") wrapSelection("[", "](https://)");
    if (action === "clear") {
      const start = editor.selectionStart ?? 0;
      const end = editor.selectionEnd ?? start;
      const selected = editor.value.slice(start, end);
      if (!selected) return;
      const cleaned = selected
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/^#\s+/gm, "")
        .replace(/^•\s+/gm, "")
        .replace(/^>\s+/gm, "")
        .replace(/\[(.*?)\]\(https?:\/\/[^)]*\)/g, "$1");
      editor.setRangeText(cleaned, start, end, "select");
      editor.focus();
      editor.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });
})();


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


      if (
        !body &&
        !imageData
      ) {

        notify(
          "Írj valamit, vagy válassz egy képet."
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
        await loadCommunityLatest();

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

async function compressImageFile(
  file,
  {
    maxBytes = 900 * 1024,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.86
  } = {}
) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Csak képfájl tölthető fel.");
  }

  if (file.type === "image/gif") {
    /* GIF-et csak akkor tartjuk meg, ha kicsi; a canvas elveszítené az animációt. */
    if (file.size > maxBytes) {
      throw new Error("A GIF túl nagy. PNG/JPG/WebP képet válassz.");
    }
    return await fileToDataUrl(file);
  }

  const source = await fileToDataUrl(file);
  const image = await loadImage(source);

  const scale = Math.min(
    1,
    maxWidth / image.naturalWidth,
    maxHeight / image.naturalHeight
  );

  let width = Math.max(1, Math.round(image.naturalWidth * scale));
  let height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  async function encode() {
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", quality);
  }

  let data = await encode();

  /* Ha még mindig nagy, fokozatosan csökkentjük a felbontást/minőséget. */
  for (let i = 0; i < 7 && data.length * 0.75 > maxBytes; i++) {
    width = Math.max(320, Math.round(width * 0.82));
    height = Math.max(320, Math.round(height * 0.82));
    quality = Math.max(0.55, quality - 0.05);
    data = await encode();
  }

  if (data.length * 0.75 > maxBytes) {
    throw new Error("A kép tömörítés után is túl nagy.");
  }

  return data;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("A kép beolvasása nem sikerült."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("A kép nem tölthető be."));
    image.src = src;
  });
}

function readImage(input, callback) {
  const file = input?.files?.[0];
  if (!file) return;

  compressImageFile(file)
    .then(callback)
    .catch((error) => {
      if (input) input.value = "";
      notify(error.message || "A kép feldolgozása nem sikerült.");
    });
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


          /*
           * Azonnal frissítjük a teljes profilnézetet is.
           */

          if (currentUser) {

            updateProfileView({
              ...currentUser,
              avatar: data
            });
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


          if (currentUser) {

            updateProfileView({
              ...currentUser,
              cover: data
            });
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


        /*
         * Ha nem választottál új képet,
         * megtartjuk a szerveren lévő régit.
         */

        const currentAvatar =
          profileImageData ||
          currentUser?.avatar ||
          "";

        const currentCover =
          coverImageData ||
          currentUser?.cover ||
          "";


        const { user } =
          await api(
            "/api/profile",
            {
              method: "PUT",

              body:
                JSON.stringify({

                  /*
                   * A username-t itt továbbra sem módosítjuk.
                   */

                  displayName:
                    displayNameInput
                      ? displayNameInput.value.trim()
                      : getDisplayName(
                          currentUser
                        ),

                  bio:
                    bioInput
                      ? bioInput.value.trim()
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
                      ? pronounsInput.value.trim()
                      : currentUser?.pronouns ||
                        "",

                  location:
                    locationInput
                      ? locationInput.value.trim()
                      : currentUser?.location ||
                        "",

                  website:
                    websiteInput
                      ? websiteInput.value.trim()
                      : currentUser?.website ||
                        ""
                })
            }
          );


        /*
         * A szerver által visszaadott
         * felhasználó lesz az új állapot.
         */

        setAccount(
          user
        );


        /*
         * A teljes profilnézetet is frissítjük.
         */

        updateProfileView(
          user
        );


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
   PROFILE VIEW — UPDATE
   ========================================================= */

function updateProfileView(
  user = currentUser
) {

  if (!user) {
    return;
  }


  const profileViewName =
    $("#profileViewName");

  const profileViewUsername =
    $("#profileViewUsername");

  const profileViewBio =
    $("#profileViewBio");

  const profileViewStatus =
    $("#profileViewStatus");

  const profileViewLocation =
    $("#profileViewLocation");

  const profileViewWebsite =
    $("#profileViewWebsite");

  const profileViewAvatar =
    $("#profileViewAvatar");

  const profileViewCover =
    $("#profileViewCover");


  /* -------------------------------------------------------
     NAME
     ------------------------------------------------------- */

  if (profileViewName) {

    profileViewName.textContent =
      getDisplayName(user);

    profileViewName.style.color =
      user.nameColor ||
      "#67e7dd";
  }


  /* -------------------------------------------------------
     USERNAME
     ------------------------------------------------------- */

  if (profileViewUsername) {

    profileViewUsername.textContent =
      user.username
        ? `@${user.username}`
        : "Lépj be az Everlightba.";
  }


  /* -------------------------------------------------------
     BIO
     ------------------------------------------------------- */

  if (profileViewBio) {

    profileViewBio.textContent =
      user.bio ||
      "Lépj be, hogy nyomot hagyj.";
  }


  /* -------------------------------------------------------
     STATUS
     ------------------------------------------------------- */

  if (profileViewStatus) {

    profileViewStatus.textContent =
      user.status ||
      "✦ Elérhető";
  }


  /* -------------------------------------------------------
     LOCATION
     ------------------------------------------------------- */

  if (profileViewLocation) {

    profileViewLocation.textContent =
      user.location ||
      "—";
  }


  /* -------------------------------------------------------
     WEBSITE
     ------------------------------------------------------- */

  if (profileViewWebsite) {

    profileViewWebsite.textContent =
      user.website ||
      "—";
  }


  /* -------------------------------------------------------
     AVATAR
     ------------------------------------------------------- */

  if (profileViewAvatar) {

    profileViewAvatar.style.background =
      user.profileColor ||
      "#273638";

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


  /* -------------------------------------------------------
     COVER
     ------------------------------------------------------- */

  if (profileViewCover) {

    if (user.cover) {

      profileViewCover.style.backgroundImage =
        `url("${escapeHtml(user.cover)}")`;

      profileViewCover.classList.add(
        "profile-custom-image"
      );

    } else {

      profileViewCover.style.backgroundImage =
        "";

      profileViewCover.classList.remove(
        "profile-custom-image"
      );
    }
  }
}


/* =========================================================
   AUTH UI — STORED SESSION SHOULD NEVER SHOW LOGIN FIRST
   ========================================================= */
function syncAuthenticatedShell() {
  if (!token) return;

  document.body.classList.add("everlight-authenticated");

  const accountMenu = $("#accountMenu");
  if (accountMenu) {
    accountMenu.classList.remove("open");
    accountMenu.setAttribute("aria-hidden", "true");
  }

  const loginState = $("#profileLoginState");
  const loggedState = $("#profileLoggedInState");

  if (loginState && loggedState) {
    loginState.hidden = true;
    loginState.setAttribute("aria-hidden", "true");
    loggedState.hidden = false;
    loggedState.setAttribute("aria-hidden", "false");
  }
}

syncAuthenticatedShell();


/* =========================================================
   OPEN PROFILE VIEW
   ========================================================= */

function openProfileView() {
  const profileView = $("#profileView");
  if (!profileView) return;

  profileView.classList.add("open");
  profileView.setAttribute("aria-hidden", "false");
  closeAccountMenu();
  setMobileDockActive("profile");
  document.body.classList.add("profile-view-open");

  if (!currentUser) {
    /*
     * A stored token means the browser already has a login session.
     * Do not expose the login form while /api/auth/me is validating it.
     */
    if (token) {
      showLoggedInProfileState();

      const loadingName = $("#profileViewName");
      const loadingUsername = $("#profileViewUsername");
      if (loadingName && !loadingName.textContent.trim()) {
        loadingName.textContent = "Betöltés…";
      }
      if (loadingUsername && !loadingUsername.textContent.trim()) {
        loadingUsername.textContent = "Bejelentkezett munkamenet";
      }
      return;
    }

    showProfileLoginState();
    return;
  }

  showLoggedInProfileState();
  updateProfileView(currentUser);
}


/* =========================================================
   CLOSE PROFILE VIEW
   ========================================================= */

function closeProfileView() {

  const profileView =
    $("#profileView");

  if (!profileView) {
    return;
  }


  profileView.classList.remove(
    "open"
  );

  profileView.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "profile-view-open"
  );


  setMobileDockActive(
    "hub"
  );
}


/* =========================================================
   PROFILE SETTINGS FROM FULLSCREEN PROFILE
   ========================================================= */

const openProfileSettings =
  $("#openProfileSettings");

if (openProfileSettings) {
  openProfileSettings.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openProfileCustomizer();
  });
}


/* =========================================================
   CLOSE PROFILE VIEW BUTTON
   ========================================================= */

const openProfileSettingsSecondary =
  $("#openProfileSettingsSecondary");

if (openProfileSettingsSecondary) {
  openProfileSettingsSecondary.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openProfileCustomizer();
  });
}


const closeProfileViewButton =
  $("#closeProfileView");

if (closeProfileViewButton) {

  closeProfileViewButton.addEventListener(
    "click",
    closeProfileView
  );
}


/* =========================================================
   CLICK PROFILE VIEW BACKDROP
   ========================================================= */

const profileView =
  $("#profileView");

if (profileView) {

  profileView.addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        profileView
      ) {

        closeProfileView();
      }
    }
  );
}


/* =========================================================
   DESKTOP LEFT PROFILE NAV
   ========================================================= */

const leftProfileNav =
  $("#leftProfileNav");

if (leftProfileNav) {

  leftProfileNav.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      openProfileView();
    }
  );
}


/* =========================================================
   HEADER ACCOUNT → PROFILE VIEW
   ========================================================= */

function handleAccountNavigation() {

  if (!currentUser) {

    if (token) {
      openProfileView();
      return;
    }

    toggleAccountMenu();

    return;
  }


  /*
   * Bejelentkezve a Fiók már nem
   * egy kis lenyíló ablakot jelent,
   * hanem a teljes profilnézetet.
   */

  openProfileView();
}





/* =========================================================
   MOBILE DOCK ACTIVE STATE
   ========================================================= */

function setMobileDockActive(
  view
) {

  const items =
    document.querySelectorAll(
      ".mobile-dock-item"
    );


  items.forEach(
    (item) => {

      item.classList.remove(
        "active"
      );
    }
  );


  const target =
    document.querySelector(
      `.mobile-dock-item[data-view="${view}"]`
    );


  if (target) {

    target.classList.add(
      "active"
    );
  }
}


/* =========================================================
   HUB VIEW
   ========================================================= */

function openHubView() {

  closeMessages();

  closeProfileView();


  setMobileDockActive(
    "hub"
  );


  /*
   * A főoldal elejére megyünk,
   * de nem ugrunk agresszívan.
   */

  const feed =
    $("#feed");

  if (feed) {

    feed.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
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

      openHubView();
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

      openHubView();
    }
  );
}


/* =========================================================
   MESSAGES / CHAT
   ========================================================= */


/* =========================================================
   OPEN MESSAGES VIEW
   ========================================================= */

async function loadMessageContacts() {
  const contactsList = $("#messageContactsList");
  if (!contactsList || !currentUser) return;

  contactsList.innerHTML = `
    <p class="loading-copy">Beszélgetések betöltése…</p>
  `;

  try {
    const data = await api("/api/messages");
    const contacts = data.contacts || [];

    if (!contacts.length) {
      contactsList.innerHTML = `
        <div class="chat-empty">
          <div class="chat-empty-icon">✉</div>
          <strong>Még nincs beszélgetés</strong>
          <p>Írd be a címzett nevét#1234 alul, és küldj üzenetet.</p>
        </div>
      `;
      return;
    }

    contactsList.innerHTML = contacts.map((user) => `
      <button
        type="button"
        class="message-contact"
        data-recipient="${escapeHtml(user.username)}"
      >
        <span class="message-contact-avatar">
          ${user.avatar
            ? `<img src="${escapeHtml(user.avatar)}" alt="">`
            : escapeHtml(getInitial(user))}
        </span>
        <span class="message-contact-copy">
          <strong>${escapeHtml(getDisplayName(user))}</strong>
          <small>@${escapeHtml(user.username)}</small>
        </span>
      </button>
    `).join("");

    const recipient = $("#dmRecipient")?.value.trim();
    if (recipient) {
      const active = contactsList.querySelector(
        `.message-contact[data-recipient="${CSS.escape(recipient)}"]`
      );
      active?.classList.add("active");
    }
  } catch (error) {
    contactsList.innerHTML = `
      <div class="chat-empty">
        <strong>Nem sikerült betölteni</strong>
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
  }
}


function openMessages() {

  const messagesView =
    $("#messagesView");

  if (!messagesView) {
    return;
  }


  /*
   * Profilnézet bezárása,
   * hogy egyszerre csak egy teljes nézet legyen nyitva.
   */

  closeProfileView();

  closeAccountMenu();


  messagesView.classList.add(
    "open"
  );

  messagesView.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.classList.add(
    "messages-view-open"
  );


  setMobileDockActive(
    "messages"
  );

  if (!currentUser) {
    const noticeHost = $("#messageContactsList");
    if (
      noticeHost &&
      !sessionStorage.getItem("everlight-chat-login-notice")
    ) {
      noticeHost.innerHTML = `
        <div class="chat-login-notice" role="status">
          <strong>Be kell jelentkezned az üzenetekhez.</strong>
          <p>Jelentkezz be a Fiók menüben, majd itt tudsz beszélgetést kezdeményezni.</p>
        </div>
      `;
      sessionStorage.setItem("everlight-chat-login-notice", "1");
    }
  } else {
    loadMessageContacts();
  }

  /*
   * Ha már van címzett, rögtön betöltjük
   * a hozzá tartozó beszélgetést.
   */

  if (
    $("#dmRecipient")?.value.trim()
  ) {

    loadMessages();
  }
}


/* =========================================================
   CLOSE MESSAGES VIEW
   ========================================================= */

function closeMessages() {

  const messagesView =
    $("#messagesView");

  if (!messagesView) {
    return;
  }


  messagesView.classList.remove(
    "open"
  );

  messagesView.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.classList.remove(
    "messages-view-open"
  );


  setMobileDockActive(
    "hub"
  );
}


/* =========================================================
   TOGGLE MESSAGES
   ========================================================= */

function toggleMessages() {

  const messagesView =
    $("#messagesView");

  if (!messagesView) {
    return;
  }


  const isOpen =
    messagesView.classList.contains(
      "open"
    );


  if (isOpen) {

    closeMessages();

  } else {

    openMessages();
  }
}


/* =========================================================
   DESKTOP MESSAGE BUTTON
   ========================================================= */

const messageNav =
  $("#messageNav");

if (messageNav) {

  messageNav.addEventListener(
    "click",
    (event) => {

      event.preventDefault();
      event.stopPropagation();

      toggleMessages();
    }
  );
}


/* =========================================================
   LEFT RAIL MESSAGE BUTTON
   ========================================================= */

const leftMessageNav =
  $("#leftMessageNav");

if (leftMessageNav) {

  leftMessageNav.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      openMessages();
    }
  );
}


/* =========================================================
   CLOSE FULLSCREEN CHAT
   ========================================================= */

const closeMessagesView =
  $("#closeMessagesView");

if (closeMessagesView) {

  closeMessagesView.addEventListener(
    "click",
    () => {

      closeMessages();
    }
  );
}


/* =========================================================
   BACKDROP CLOSE
   ========================================================= */

const messagesView =
  $("#messagesView");

if (messagesView) {

  messagesView.addEventListener(
    "click",
    (event) => {

      /*
       * Csak akkor zárjuk,
       * ha ténylegesen a háttérre kattintottak.
       */

      if (
        event.target ===
        messagesView
      ) {

        closeMessages();
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

    dmList.innerHTML = `
      <div class="chat-empty">

        <div class="chat-empty-icon">
          ✉
        </div>

        <strong>
          Válassz egy beszélgetést
        </strong>

        <p>
          Add meg annak a felhasználónak
          az azonosítóját, akivel beszélgetni szeretnél.
        </p>

      </div>
    `;

    return;
  }


  /*
   * Betöltés közben egyértelmű állapot.
   */

  dmList.innerHTML = `
    <p class="loading-copy">
      Beszélgetés betöltése…
    </p>
  `;


  try {

    const data =
      await api(
        `/api/messages/${encodeURIComponent(
          recipient
        )}`
      );


    const user =
      data.user;


    /* -----------------------------------------------------
       CHAT TITLE
       ----------------------------------------------------- */

    const dmTitle =
      $("#dmTitle");


    if (dmTitle) {

      dmTitle.textContent =
        getDisplayName(user) ||
        getUsername(user) ||
        recipient;
    }


    /* -----------------------------------------------------
       CONTACT LIST
       ----------------------------------------------------- */

    renderMessageContact(
      user
    );


    /* -----------------------------------------------------
       EMPTY CHAT
       ----------------------------------------------------- */

    if (
      !data.messages ||
      !data.messages.length
    ) {

      dmList.innerHTML = `
        <div class="chat-empty">

          <div class="chat-empty-icon">
            ✦
          </div>

          <strong>
            Még nincs üzenet
          </strong>

          <p>
            Írd meg az első üzenetet
            ebben a beszélgetésben.
          </p>

        </div>
      `;

      return;
    }


    /* -----------------------------------------------------
       RENDER MESSAGES
       ----------------------------------------------------- */

    dmList.innerHTML =
      data.messages
        .map(
          (message) => {

            const ownMessage =
              message.sender_username ===
              currentUser?.username;


            const sender =
              message.sender_name ||
              message.sender_username ||
              "";


            const messageTime =
              message.created_at
                ? new Date(
                    message.created_at
                  ).toLocaleTimeString(
                    "hu-HU",
                    {
                      hour:
                        "2-digit",

                      minute:
                        "2-digit"
                    }
                  )
                : "";


            return `
              <article
                class="
                  chat-message
                  ${
                    ownMessage
                      ? "chat-message-own"
                      : "chat-message-other"
                  }
                "
              >

                <div class="chat-message-meta">

                  <strong>
                    ${escapeHtml(
                      sender
                    )}
                  </strong>

                  <time>
                    ${escapeHtml(
                      messageTime
                    )}
                  </time>

                </div>


                <div class="chat-bubble">

                  ${escapeHtml(
                    message.body
                  )}

                </div>

              </article>
            `;
          }
        )
        .join("");


    /*
     * A legújabb üzenetre görgetünk.
     */

    requestAnimationFrame(
      () => {

        dmList.scrollTop =
          dmList.scrollHeight;
      }
    );


  } catch (error) {

    dmList.innerHTML = `
      <div class="chat-empty">

        <div class="chat-empty-icon">
          !
        </div>

        <strong>
          Nem sikerült betölteni
        </strong>

        <p>
          ${escapeHtml(
            error.message
          )}
        </p>

      </div>
    `;
  }
}


/* =========================================================
   MESSAGE CONTACT
   ========================================================= */

function renderMessageContact(
  user
) {

  const contactsList =
    $("#messageContactsList");

  if (
    !contactsList ||
    !user
  ) {
    return;
  }


  const username =
    getUsername(user);

  const displayName =
    getDisplayName(user);


  contactsList.innerHTML = `
    <button
      type="button"
      class="message-contact active"
      data-recipient="${escapeHtml(
        username
      )}"
    >

      <span class="message-contact-avatar">

        ${
          user.avatar

            ? `
              <img
                src="${escapeHtml(
                  user.avatar
                )}"
                alt=""
              >
            `

            : escapeHtml(
                getInitial(user)
              )
        }

      </span>


      <span class="message-contact-copy">

        <strong>
          ${escapeHtml(
            displayName
          )}
        </strong>

        <small>
          @${escapeHtml(
            username
          )}
        </small>

      </span>

    </button>
  `;
}


/* =========================================================
   MESSAGE CONTACT CLICK
   ========================================================= */

const messageContactsList =
  $("#messageContactsList");

if (messageContactsList) {

  messageContactsList.addEventListener(
    "click",
    (event) => {

      const contact =
        event.target.closest(
          ".message-contact"
        );


      if (!contact) {
        return;
      }


      const recipient =
        contact.dataset.recipient;


      const recipientInput =
        $("#dmRecipient");


      if (
        recipientInput
      ) {

        recipientInput.value =
          recipient;
      }


      document
        .querySelectorAll(
          ".message-contact"
        )
        .forEach(
          (item) => {

            item.classList.remove(
              "active"
            );
          }
        );


      contact.classList.add(
        "active"
      );


      loadMessages();
    }
  );
}


/* =========================================================
   RECIPIENT CHANGE
   ========================================================= */

const dmRecipient =
  $("#dmRecipient");

if (dmRecipient) {

  dmRecipient.addEventListener(
    "change",
    () => {

      loadMessages();
    }
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

        if (dmRecipient) {
          dmRecipient.focus();
        }

        return;
      }


      if (!body) {

        notify(
          "Az üzenet üres."
        );

        if (bodyInput) {
          bodyInput.focus();
        }

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

          bodyInput.value =
            "";
        }


        await loadMessages();
        await loadMessageContacts();

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
   ESCAPE KEY
   ========================================================= */

document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key !== "Escape"
    ) {
      return;
    }


    const messagesView =
      $("#messagesView");

    const profileView =
      $("#profileView");


    if (
      messagesView?.classList.contains(
        "open"
      )
    ) {

      closeMessages();

      return;
    }


    if (
      profileView?.classList.contains(
        "open"
      )
    ) {

      closeProfileView();

      return;
    }


    closeAccountMenu();
  }
);


/* =========================================================
   PREVENT BACKGROUND SCROLL
   ========================================================= */

function updateViewScrollLock() {

  const messagesOpen =
    $("#messagesView")?.classList.contains(
      "open"
    );

  const profileOpen =
    $("#profileView")?.classList.contains(
      "open"
    );


  document.body.classList.toggle(
    "view-is-open",
    Boolean(
      messagesOpen ||
      profileOpen
    )
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


      try {

        window.everlightInstall.prompt();

        await window.everlightInstall
          .userChoice;

      } catch {

        /*
         * A telepítési ablakot a böngésző kezeli.
         */

      } finally {

        window.everlightInstall =
          null;
      }
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
          permission === "granted"
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

          /*
           * A service worker nem kötelező
           * az oldal működéséhez.
           */

        });

    }
  );
}


/* =========================================================
   CLOCK + DATE
   ========================================================= */

function updateClock() {

  const clock =
    $("#mainClock");

  const date =
    $("#mainDate");


  const now =
    new Date();


  if (clock) {

    clock.textContent =
      now.toLocaleTimeString(
        "hu-HU",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );
  }


  if (date) {

    date.textContent =
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
}


updateClock();


setInterval(
  updateClock,
  1000
);


/* =========================================================
   VIEW SCROLL LOCK
   ========================================================= */

function syncViewScrollLock() {

  const messagesOpen =
    $("#messagesView")?.classList.contains(
      "open"
    );


  const profileOpen =
    $("#profileView")?.classList.contains(
      "open"
    );


  document.body.classList.toggle(
    "view-is-open",
    Boolean(
      messagesOpen ||
      profileOpen
    )
  );
}


/* =========================================================
   OBSERVE FULLSCREEN VIEWS
   ========================================================= */

const messagesViewObserver =
  $("#messagesView");

const profileViewObserver =
  $("#profileView");


if (
  messagesViewObserver
) {

  const observer =
    new MutationObserver(
      syncViewScrollLock
    );


  observer.observe(
    messagesViewObserver,
    {
      attributes: true,
      attributeFilter: [
        "class"
      ]
    }
  );
}


if (
  profileViewObserver
) {

  const observer =
    new MutationObserver(
      syncViewScrollLock
    );


  observer.observe(
    profileViewObserver,
    {
      attributes: true,
      attributeFilter: [
        "class"
      ]
    }
  );
}


/* =========================================================
   INITIAL CATEGORY LIMIT
   ========================================================= */

updateCategoryLimit();


/* =========================================================
   INITIAL MOBILE DOCK STATE
   ========================================================= */

setMobileDockActive(
  "hub"
);


/* =========================================================
   INITIAL PROFILE VIEW
   ========================================================= */

if (currentUser) {

  updateProfileView(
    currentUser
  );
}


/* =========================================================
   INITIAL LOAD
   ========================================================= */

(async () => {

  /*
   * Ha van mentett token,
   * először mindig a szervertől kérjük le
   * az aktuális felhasználót.
   */

  if (token) {

    syncAuthenticatedShell();

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


      setAccount(
        user
      );


      updateProfileView(
        user
      );


    } catch {

      localStorage.removeItem(
        "everlight-token"
      );


      token = "";

      currentUser = null;

      document.body.classList.remove("everlight-authenticated");

      profileImageData = "";

      coverImageData = "";

      showProfileLoginState();
    }
  }


  /*
   * Fő tartalom betöltése.
   */

  await Promise.all([
    loadPosts(),
    loadOnline()
  ]);


  /*
   * Ha van megnyitott beszélgetés,
   * azt is betöltjük.
   */

  if (
    currentUser &&
    $("#dmRecipient")?.value.trim()
  ) {

    await loadMessages();
  }


  /*
   * Nézet scroll állapot.
   */

  syncViewScrollLock();


  /*
   * Online lista + megnyitott chat
   * frissítése 30 másodpercenként.
   */

  setInterval(
    async () => {

      try {

        await loadOnline();
        await loadCommunityLatest();


        if (
          currentUser &&
          $("#dmRecipient")?.value.trim() &&
          $("#messagesView")?.classList.contains(
            "open"
          )
        ) {

          await loadMessages();
        }

      } catch {

        /*
         * Háttérfrissítésnél nem dobunk
         * külön toast hibát.
         */

      }

    },
    30000
  );

})();



/* =========================================================
   DISCORD-STYLE PROFILE CUSTOMIZER
   ========================================================= */

async function readCustomizerImage(
  file,
  callback
) {
  if (!file) return;

  try {
    const data = await compressImageFile(file, {
      maxBytes: 900 * 1024,
      maxWidth: 1600,
      maxHeight: 900,
      quality: 0.86
    });

    callback(data);
  } catch (error) {
    notify(error.message || "A kép feldolgozása nem sikerült.");
  }
}


function customizerValue(id, fallback = "") {
  const element = $(`#${id}`);

  if (!element) {
    return fallback;
  }

  return element.value ?? fallback;
}


function syncCustomizerToProfileFields() {

  const map = {
    customizerDisplayName: "displayName",
    customizerBio: "profileBio",
    customizerStatus: "profileStatus",
    customizerPronouns: "pronouns",
    customizerLocation: "profileLocation",
    customizerWebsite: "profileWebsite",
    customizerNameColor: "nameColor",
    customizerProfileColor: "profileColor"
  };

  Object.entries(map).forEach(
    ([sourceId, targetId]) => {

      const source = $(`#${sourceId}`);
      const target = $(`#${targetId}`);

      if (source && target) {
        target.value = source.value;
      }
    }
  );
}


function buildProfileCustomizer() {

  if ($("#profileCustomizer")) {
    return $("#profileCustomizer");
  }

  const modal =
    document.createElement("div");

  modal.id =
    "profileCustomizer";

  modal.className =
    "profile-customizer";

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  modal.innerHTML = `

    <div class="profile-customizer-backdrop"
         data-customizer-close></div>

    <section
      class="profile-customizer-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profileCustomizerTitle"
    >

      <header class="profile-customizer-header">

        <div>
          <div class="profile-customizer-kicker">
            PROFIL
          </div>

          <h2 id="profileCustomizerTitle">
            Profil testreszabása
          </h2>

          <p>
            Állítsd be, hogyan jelenjen meg a profilod.
          </p>
        </div>

        <button
          type="button"
          class="profile-customizer-close"
          data-customizer-close
          aria-label="Bezárás"
        >×</button>

      </header>


      <div class="profile-customizer-body">

        <aside class="profile-customizer-sidebar">

          <button
            type="button"
            class="profile-customizer-nav active"
            data-customizer-scroll="customizerProfileSection"
          >
            <span>◉</span>
            Profil
          </button>

          <button
            type="button"
            class="profile-customizer-nav"
            data-customizer-scroll="customizerAppearanceSection"
          >
            <span>✦</span>
            Megjelenés
          </button>

          <button
            type="button"
            class="profile-customizer-nav"
            data-customizer-scroll="customizerImagesSection"
          >
            <span>▣</span>
            Képek
          </button>

          <div class="profile-customizer-sidebar-note">
            A változtatások mentés után mindenhol
            frissülnek.
          </div>

        </aside>


        <main class="profile-customizer-content">

          <section
            id="customizerProfileSection"
            class="profile-customizer-section"
          >

            <div class="profile-customizer-section-title">
              <div>
                <strong>Profil</strong>
                <span>Alapvető információk rólad.</span>
              </div>
            </div>


            <div class="profile-customizer-grid">

              <label class="customizer-field">
                <span>Megjelenítési név</span>
                <input
                  id="customizerDisplayName"
                  type="text"
                  maxlength="60"
                  autocomplete="off"
                >
              </label>

              <label class="customizer-field">
                <span>Állapot</span>
                <select id="customizerStatus">
                  <option>✦ Elérhető</option>
                  <option>● Elfoglalt</option>
                  <option>◐ Ne zavarjanak</option>
                  <option>○ Távol</option>
                  <option>— Offline</option>
                </select>
              </label>

            </div>


            <label class="customizer-field customizer-field-full">
              <span>Bemutatkozás</span>
              <textarea
                id="customizerBio"
                maxlength="500"
                rows="5"
                placeholder="Írj pár sort magadról..."
              ></textarea>
              <small class="customizer-counter" id="customizerBioCounter">
                0 / 500
              </small>
            </label>


            <div class="profile-customizer-grid">

              <label class="customizer-field">
                <span>Névmások</span>
                <input
                  id="customizerPronouns"
                  type="text"
                  maxlength="40"
                  placeholder="pl. she/her"
                >
              </label>

              <label class="customizer-field">
                <span>Hely</span>
                <input
                  id="customizerLocation"
                  type="text"
                  maxlength="80"
                  placeholder="pl. Budapest"
                >
              </label>

            </div>


            <label class="customizer-field customizer-field-full">
              <span>Weboldal</span>
              <input
                id="customizerWebsite"
                type="text"
                maxlength="180"
                placeholder="https://..."
              >
            </label>

          </section>


          <section
            id="customizerAppearanceSection"
            class="profile-customizer-section"
          >

            <div class="profile-customizer-section-title">
              <div>
                <strong>Megjelenés</strong>
                <span>Színek a profilodhoz.</span>
              </div>
            </div>


            <div class="customizer-color-row">

              <label class="customizer-color-card">
                <span>
                  Név színe
                  <small>A profilodon megjelenő név.</small>
                </span>

                <input
                  id="customizerNameColor"
                  type="color"
                >
              </label>


              <label class="customizer-color-card">
                <span>
                  Profil színe
                  <small>Avatar és profil kiemelőszín.</small>
                </span>

                <input
                  id="customizerProfileColor"
                  type="color"
                >
              </label>

            </div>

          </section>


          <section
            id="customizerImagesSection"
            class="profile-customizer-section"
          >

            <div class="profile-customizer-section-title">
              <div>
                <strong>Képek</strong>
                <span>Avatar és profilborító.</span>
              </div>
            </div>


            <div class="customizer-image-card">

              <div class="customizer-image-card-preview"
                   id="customizerAvatarPreview">
              </div>

              <div class="customizer-image-card-copy">
                <strong>Profilkép</strong>
                <span>
                  Négyzetes kép ajánlott. Maximum 1 MB.
                </span>

                <label class="customizer-upload-button">
                  Kép kiválasztása
                  <input
                    id="customizerAvatarInput"
                    type="file"
                    accept="image/*"
                  >
                </label>
              </div>

            </div>


            <div class="customizer-image-card customizer-banner-card">

              <div
                class="customizer-banner-preview"
                id="customizerCoverPreview"
              >
                <span>PROFIL BORÍTÓKÉP</span>
              </div>

              <div class="customizer-image-card-copy">
                <strong>Borítókép</strong>
                <span>
                  Széles kép ajánlott. Maximum 1 MB.
                </span>

                <label class="customizer-upload-button">
                  Borítókép kiválasztása
                  <input
                    id="customizerCoverInput"
                    type="file"
                    accept="image/*"
                  >
                </label>

              </div>

            </div>

          </section>

        </main>


        <aside class="profile-customizer-preview-column">

          <div class="profile-customizer-preview-label">
            ELŐNÉZET
          </div>

          <div
            class="discord-profile-preview"
            id="customizerLivePreview"
          >

            <div
              class="discord-preview-banner"
              id="customizerLiveBanner"
            ></div>

            <div class="discord-preview-card">

              <div
                class="discord-preview-avatar"
                id="customizerLiveAvatar"
              ></div>

              <div class="discord-preview-name"
                   id="customizerLiveName">
              </div>

              <div class="discord-preview-username"
                   id="customizerLiveUsername">
              </div>

              <div class="discord-preview-status"
                   id="customizerLiveStatus">
              </div>

              <div class="discord-preview-divider"></div>

              <div class="discord-preview-label">
                RÓLAM
              </div>

              <div class="discord-preview-bio"
                   id="customizerLiveBio">
              </div>

              <div class="discord-preview-meta"
                   id="customizerLiveMeta">
              </div>

            </div>

          </div>

        </aside>

      </div>


      <footer class="profile-customizer-footer">

        <button
          type="button"
          class="profile-customizer-cancel"
          data-customizer-close
        >
          Mégse
        </button>

        <button
          type="button"
          class="profile-customizer-save"
          id="profileCustomizerSave"
        >
          <span>Mentés</span>
        </button>

      </footer>

    </section>
  `;

  document.body.appendChild(modal);

  bindProfileCustomizer(modal);

  return modal;
}


function updateCustomizerPreview() {

  const displayName =
    customizerValue(
      "customizerDisplayName",
      getDisplayName(currentUser)
    );

  const username =
    getUsername(currentUser);

  const bio =
    customizerValue(
      "customizerBio",
      currentUser?.bio || ""
    );

  const status =
    customizerValue(
      "customizerStatus",
      currentUser?.status || "✦ Elérhető"
    );

  const location =
    customizerValue(
      "customizerLocation",
      currentUser?.location || ""
    );

  const website =
    customizerValue(
      "customizerWebsite",
      currentUser?.website || ""
    );

  const nameColor =
    customizerValue(
      "customizerNameColor",
      currentUser?.nameColor || "#67e7dd"
    );

  const profileColor =
    customizerValue(
      "customizerProfileColor",
      currentUser?.profileColor || "#273638"
    );


  const name =
    $("#customizerLiveName");

  if (name) {
    name.textContent =
      displayName || "Név";

    name.style.color =
      nameColor;
  }


  const userName =
    $("#customizerLiveUsername");

  if (userName) {
    userName.textContent =
      `@${username}`;
  }


  const statusNode =
    $("#customizerLiveStatus");

  if (statusNode) {
    statusNode.textContent =
      status;

    statusNode.style.color =
      nameColor;
  }


  const bioNode =
    $("#customizerLiveBio");

  if (bioNode) {
    bioNode.textContent =
      bio ||
      "Írj pár sort magadról...";
  }


  const meta =
    $("#customizerLiveMeta");

  if (meta) {

    const values = [];

    if (location) {
      values.push(`⌖ ${location}`);
    }

    if (website) {
      values.push(`↗ ${website}`);
    }

    meta.textContent =
      values.join("  ·  ");
  }


  const avatar =
    $("#customizerLiveAvatar");

  if (avatar) {

    const avatarData =
      profileImageData ||
      currentUser?.avatar ||
      "";

    avatar.style.background =
      profileColor;

    if (avatarData) {
      avatar.innerHTML = `
        <img
          src="${escapeHtml(avatarData)}"
          alt="Profilkép előnézet"
        >
      `;
    } else {
      avatar.textContent =
        getInitial({
          ...currentUser,
          displayName
        });
    }
  }


  const banner =
    $("#customizerLiveBanner");

  if (banner) {

    const coverData =
      coverImageData ||
      currentUser?.cover ||
      "";

    banner.style.backgroundColor =
      profileColor;

    if (coverData) {
      banner.style.backgroundImage =
        `url("${coverData}")`;
    } else {
      banner.style.backgroundImage =
        "";
    }
  }


  const counter =
    $("#customizerBioCounter");

  if (counter) {
    counter.textContent =
      `${bio.length} / 500`;
  }
}


function fillProfileCustomizer() {

  const values = {
    customizerDisplayName:
      customizerValue(
        "displayName",
        getDisplayName(currentUser)
      ),

    customizerBio:
      customizerValue(
        "profileBio",
        currentUser?.bio || ""
      ),

    customizerStatus:
      customizerValue(
        "profileStatus",
        currentUser?.status || "✦ Elérhető"
      ),

    customizerPronouns:
      customizerValue(
        "pronouns",
        currentUser?.pronouns || ""
      ),

    customizerLocation:
      customizerValue(
        "profileLocation",
        currentUser?.location || ""
      ),

    customizerWebsite:
      customizerValue(
        "profileWebsite",
        currentUser?.website || ""
      ),

    customizerNameColor:
      customizerValue(
        "nameColor",
        currentUser?.nameColor || "#67e7dd"
      ),

    customizerProfileColor:
      customizerValue(
        "profileColor",
        currentUser?.profileColor || "#273638"
      )
  };


  Object.entries(values).forEach(
    ([id, value]) => {

      const element =
        $(`#${id}`);

      if (element) {
        element.value =
          value ?? "";
      }
    }
  );


  const avatarPreview =
    $("#customizerAvatarPreview");

  const avatarData =
    profileImageData ||
    currentUser?.avatar ||
    "";

  if (avatarPreview) {

    avatarPreview.style.background =
      currentUser?.profileColor ||
      "#273638";

    if (avatarData) {
      avatarPreview.innerHTML = `
        <img
          src="${escapeHtml(avatarData)}"
          alt="Profilkép"
        >
      `;
    } else {
      avatarPreview.textContent =
        getInitial(currentUser);
    }
  }


  const coverPreview =
    $("#customizerCoverPreview");

  const coverData =
    coverImageData ||
    currentUser?.cover ||
    "";

  if (coverPreview) {

    coverPreview.style.backgroundColor =
      currentUser?.profileColor ||
      "#273638";

    if (coverData) {
      coverPreview.style.backgroundImage =
        `url("${coverData}")`;
    } else {
      coverPreview.style.backgroundImage =
        "";
    }
  }

  updateCustomizerPreview();
}


function openProfileCustomizer() {

  if (!requireLogin()) {
    return;
  }

  const modal =
    buildProfileCustomizer();

  fillProfileCustomizer();

  modal.classList.add("open");

  modal.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "profile-customizer-open"
  );

  closeProfileView();
  closeAccountMenu();
}


function closeProfileCustomizer() {

  const modal =
    $("#profileCustomizer");

  if (!modal) {
    return;
  }

  modal.classList.remove("open");

  modal.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "profile-customizer-open"
  );
}


async function saveProfileCustomizer() {
  if (!requireLogin()) return;

  const saveButton = $("#profileCustomizerSave");
  if (saveButton) {
    saveButton.disabled = true;
    const label = saveButton.querySelector("span");
    if (label) label.textContent = "Mentés…";
  }

  try {
    const payload = {
      displayName: customizerValue("customizerDisplayName", getDisplayName(currentUser)).trim(),
      bio: customizerValue("customizerBio", currentUser?.bio || "").trim(),
      avatar: profileImageData || currentUser?.avatar || "",
      cover: coverImageData || currentUser?.cover || "",
      nameColor: customizerValue("customizerNameColor", currentUser?.nameColor || "#67e7dd"),
      profileColor: customizerValue("customizerProfileColor", currentUser?.profileColor || "#273638"),
      status: customizerValue("customizerStatus", currentUser?.status || "✦ Elérhető"),
      pronouns: customizerValue("customizerPronouns", currentUser?.pronouns || "").trim(),
      location: customizerValue("customizerLocation", currentUser?.location || "").trim(),
      website: customizerValue("customizerWebsite", currentUser?.website || "").trim()
    };

    const { user } = await api("/api/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    setAccount(user);
    updateProfileView(user);

    notify("A profilod mentve lett.");
    closeProfileCustomizer();
  } catch (error) {
    notify(error.message || "A profil mentése nem sikerült.");
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      const label = saveButton.querySelector("span");
      if (label) label.textContent = "Mentés";
    }
  }
}


function bindProfileCustomizer(
  modal
) {

  modal.addEventListener(
    "input",
    (event) => {

      if (
        event.target.matches(
          "#customizerBio"
        )
      ) {
        updateCustomizerPreview();
        return;
      }

      if (
        event.target.matches(
          "input, textarea, select"
        )
      ) {
        updateCustomizerPreview();
      }
    }
  );


  modal.addEventListener(
    "change",
    (event) => {

      if (
        event.target.matches(
          "#customizerAvatarInput"
        )
      ) {

        readCustomizerImage(
          event.target.files[0],
          (data) => {

            profileImageData =
              data;

            const preview =
              $("#customizerAvatarPreview");

            if (preview) {
              preview.innerHTML = `
                <img
                  src="${escapeHtml(data)}"
                  alt="Profilkép"
                >
              `;
            }

            updateCustomizerPreview();
          }
        );

        return;
      }


      if (
        event.target.matches(
          "#customizerCoverInput"
        )
      ) {

        readCustomizerImage(
          event.target.files[0],
          (data) => {

            coverImageData =
              data;

            const preview =
              $("#customizerCoverPreview");

            if (preview) {
              preview.style.backgroundImage =
                `url("${data}")`;
            }

            updateCustomizerPreview();
          }
        );

        return;
      }

      updateCustomizerPreview();
    }
  );


  modal.addEventListener(
    "click",
    (event) => {

      const close =
        event.target.closest(
          "[data-customizer-close]"
        );

      if (close) {
        closeProfileCustomizer();
        return;
      }


      const nav =
        event.target.closest(
          "[data-customizer-scroll]"
        );

      if (nav) {

        modal
          .querySelectorAll(
            ".profile-customizer-nav"
          )
          .forEach(
            (item) =>
              item.classList.remove(
                "active"
              )
          );

        nav.classList.add("active");

        const target =
          document.getElementById(
            nav.dataset.customizerScroll
          );

        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }

        return;
      }


      const save =
        event.target.closest(
          "#profileCustomizerSave"
        );

      if (save) {
        saveProfileCustomizer();
      }
    }
  );
}


/*
 * A régi, keskeny profil-szerkesztő helyett
 * minden "Profil szerkesztése" gomb a Discord-szerű
 * teljes képernyős szerkesztőt nyitja.
 *
 * Capture fázisban kezeljük, hogy a régi handler
 * ne tudjon közben visszanyitni az account menüt.
 */

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "#openProfileSettings"
      );

    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openProfileCustomizer();

  },
  true
);


document.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Escape"
    ) {
      closeProfileCustomizer();
    }

  }
);


/* =========================================================
   V6 — MOBILE / FULLSCREEN ESCAPE + BACK BEHAVIOUR
   ========================================================= */

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  const customizer = $("#profileCustomizer");
  if (customizer?.classList.contains("open")) {
    closeProfileCustomizer();
    return;
  }

  const messages = $("#messagesView");
  if (messages?.classList.contains("open")) {
    closeMessages();
    return;
  }

  const profile = $("#profileView");
  if (profile?.classList.contains("open")) {
    closeProfileView();
  }
});

/* On mobile browsers, Back should close the current Everlight view first. */
window.addEventListener("popstate", () => {
  const customizer = $("#profileCustomizer");
  if (customizer?.classList.contains("open")) {
    closeProfileCustomizer();
    return;
  }

  const messages = $("#messagesView");
  if (messages?.classList.contains("open")) {
    closeMessages();
    return;
  }

  const profile = $("#profileView");
  if (profile?.classList.contains("open")) {
    closeProfileView();
  }
});


/* =========================================================
   DESKTOP RAIL ACTIONS — HUB / CSEVEGÉS / PROFIL
   ========================================================= */
(() => {
  const items = document.querySelectorAll(".desktop-rail-action");
  if (!items.length) return;

  const setActive = (view) => {
    items.forEach((item) => {
      item.classList.toggle("active", item.dataset.railView === view);
    });
  };

  items.forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const view = item.dataset.railView;

      if (view === "hub") {
        if (typeof openHubView === "function") openHubView();
        setActive("hub");
        return;
      }

      if (view === "messages") {
        if (typeof openMessages === "function") openMessages();
        setActive("messages");
        return;
      }

      if (view === "profile") {
        if (typeof openProfileView === "function") openProfileView();
        setActive("profile");
      }
    });
  });

  document.addEventListener("click", () => {
    if (document.body.classList.contains("messages-view-open")) {
      setActive("messages");
    } else if (document.body.classList.contains("profile-view-open")) {
      setActive("profile");
    } else {
      setActive("hub");
    }
  });
})();


/* =========================================================
   SHARE PAGE
   ========================================================= */
const sharePageButton = $("#sharePageButton");
if (sharePageButton) {
  sharePageButton.addEventListener("click", async () => {
    const shareData = {
      title: "Everlight",
      text: "Nézd meg az Everlightot.",
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        notify("Az oldal címe a vágólapra került.");
      } else {
        notify("Másold ki az oldal címét a böngészőből.");
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        notify("A megosztás nem sikerült.");
      }
    }
  });
}


/* =========================================================
   DESKTOP CATEGORY ACCORDION
   ========================================================= */
(() => {
  const toggle = document.getElementById("desktopCategoryToggle");
  const menu = document.getElementById("desktopCategoryMenu");

  if (!toggle || !menu) return;

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    menu.hidden = expanded;
  });
})();




/* =========================================================
   MOBILE DOCK — SINGLE CONTROLLER / NO DOUBLE TOGGLE
   ========================================================= */
(() => {
  const goMessages = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();

    const view = document.getElementById("messagesView");
    if (!view) return;

    const isOpen = view.classList.contains("open");
    if (isOpen) {
      if (typeof closeMessages === "function") closeMessages();
      return;
    }

    /* Open the shell first to prevent a flash; authentication is handled
       after the shell is on screen. */
    view.classList.add("open");
    view.setAttribute("aria-hidden","false");
    document.body.classList.add("messages-view-open");

    if (typeof setMobileDockActive === "function") {
      setMobileDockActive("messages");
    }

    if (typeof currentUser !== "undefined" && currentUser) {
      closeAccountMenu?.();
      loadMessageContacts?.();
      if (document.getElementById("dmRecipient")?.value.trim()) {
        loadMessages?.();
      }
    } else {
      const list=document.getElementById("messageContactsList");
      if (list) {
        list.innerHTML='<div class="chat-empty"><strong>Jelentkezz be</strong><p>Privát üzenetek használatához jelentkezz be.</p></div>';
      }
    }
  };

  const goProfile = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();

    const view = document.getElementById("profileView");
    if (!view) return;

    if (typeof closeMessages === "function") closeMessages();

    view.classList.add("open");
    view.setAttribute("aria-hidden","false");
    document.body.classList.add("profile-view-open");

    if (typeof setMobileDockActive === "function") {
      setMobileDockActive("profile");
    }

    if (typeof currentUser !== "undefined" && currentUser) {
      updateProfileView?.(currentUser);
      closeAccountMenu?.();
    }
  };

  ["mobileHubNav","mobileMessageNav","mobileProfileNav"].forEach((id) => {
    const item = document.getElementById(id);
    if (!item) return;
    item.addEventListener("click", () => {
      if (panel.classList.contains("is-open")) close();
    }, true);
  });

  const bind=(id,handler)=>{
    const el=document.getElementById(id);
    if(!el) return;
    el.addEventListener("click",handler,{capture:true});
    el.addEventListener("pointerup",handler,{capture:true});
  };

  bind("mobileMessageNav",goMessages);
  bind("mobileProfileNav",goProfile);
})();

/* =========================================================
   MOBILE ISLAND GESTURE
   Long-press / upward drag expands the island.
   Downward drag collapses it.
   ========================================================= */
(function initMobileIsland(){
  const dock = document.getElementById("mobileDock");
  if (!dock) return;

  let startY = 0;
  let startX = 0;
  let dragging = false;
  let moved = false;
  let suppressClick = false;

  const expand = () => {
    dock.classList.add("is-expanded");
    dock.setAttribute("aria-expanded","true");
  };

  const collapse = () => {
    dock.classList.remove("is-expanded");
    dock.setAttribute("aria-expanded","false");
  };

  const onStart = (event) => {
    if (window.innerWidth > 660) return;
    const point = event.touches ? event.touches[0] : event;
    startY = point.clientY;
    startX = point.clientX;
    dragging = true;
    moved = false;
  };

  const onMove = (event) => {
    if (!dragging || window.innerWidth > 660) return;
    const point = event.touches ? event.touches[0] : event;
    const dy = point.clientY - startY;
    const dx = point.clientX - startX;

    if (Math.abs(dy) > 8 || Math.abs(dx) > 8) moved = true;

    /* Upward pull = expand, downward pull = collapse. */
    if (dy < -28) {
      expand();
    } else if (dy > 28) {
      collapse();
    }

    if (event.cancelable) event.preventDefault();
  };

  const onEnd = () => {
    if (!dragging) return;
    suppressClick = moved;
    dragging = false;
    if (moved) {
      window.setTimeout(() => { suppressClick = false; }, 260);
    }
  };

  dock.addEventListener("touchstart", onStart, {passive:false});
  dock.addEventListener("touchmove", onMove, {passive:false});
  dock.addEventListener("touchend", onEnd, {passive:true});
  dock.addEventListener("pointerdown", onStart);
  dock.addEventListener("pointermove", onMove);
  dock.addEventListener("pointerup", onEnd);

  dock.addEventListener("click", (event) => {
    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
    }
  }, true);

  /* Long press also opens the larger bubble, matching the Dynamic Island interaction. */
  let holdTimer = null;
  dock.addEventListener("touchstart", () => {
    holdTimer = window.setTimeout(expand, 430);
  }, {passive:true});
  ["touchend","touchcancel","pointerup","pointercancel"].forEach(type => {
    dock.addEventListener(type, () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    }, {passive:true});
  });

  dock.setAttribute("aria-expanded","false");
})();

/* Mobile island: collapse after an expanded tap/interaction. */
(function(){
  const dock = document.getElementById("mobileDock");
  if (!dock) return;

  let collapseTimer = null;

  function scheduleIslandCollapse(){
    if (window.innerWidth > 660) return;
    clearTimeout(collapseTimer);
    collapseTimer = setTimeout(() => {
      dock.classList.remove("is-expanded");
      dock.setAttribute("aria-expanded","false");
    }, 1800);
  }

  dock.addEventListener("click", () => {
    if (dock.classList.contains("is-expanded")) {
      scheduleIslandCollapse();
    }
  }, false);

  dock.addEventListener("touchend", () => {
    if (dock.classList.contains("is-expanded")) {
      scheduleIslandCollapse();
    }
  }, {passive:true});
})();



/* Final visual pass intentionally leaves domain markup untouched.
   Mobile CSS controls the two-line presentation to avoid duplicates. */

/* Keep the mobile island directly below the AI label when it exists. */
(function(){
  const dock=document.getElementById("mobileDock");
  if(!dock) return;
  const selectors=[".ai-status",".ai-prompt",".ai-label",".ai-assistant-label",".floating-ai",".ai-floating"];
  function place(){
    if(window.innerWidth>660) return;
    const ai=selectors.map(s=>document.querySelector(s)).find(Boolean);
    if(!ai) return;
    const r=ai.getBoundingClientRect();
    if(r.height<1) return;
    const bottom=Math.max(72,window.innerHeight-r.bottom+8);
    dock.style.bottom=`calc(${Math.round(bottom)}px + env(safe-area-inset-bottom,0px))`;
  }
  window.addEventListener("resize",place);
  window.addEventListener("orientationchange",()=>setTimeout(place,100));
  setTimeout(place,150);
})();

/* Disable mobile island drag/long-press expansion. */
(function(){
  const dock=document.getElementById("mobileDock");
  if(!dock) return;
  const collapse=()=>dock.classList.remove("is-expanded");
  ["touchstart","touchmove","touchend","pointerdown","pointermove","pointerup"].forEach(type=>{
    dock.addEventListener(type,()=>{ if(dock.classList.contains("is-expanded")) collapse(); }, true);
  });
  dock.addEventListener("click",collapse,true);
  window.addEventListener("resize",collapse);
})();



/* Header divider: one instance, positioned from the real header geometry. */
(function(){
  function mountHeaderDivider(){
    var header=document.querySelector(".topbar");
    if(!header) return;

    var divider=header.querySelector(".header-symbol-divider");
    if(!divider){
      divider=document.createElement("div");
      divider.className="header-symbol-divider";
      divider.setAttribute("aria-hidden","true");
      divider.innerHTML='<span class="header-symbols">⋆⋅☆⋅⋆</span>';
      header.appendChild(divider);
    }

    function position(){
      if(window.innerWidth <= 660){
        var r=header.getBoundingClientRect();
        divider.style.setProperty("--mobile-header-bottom", Math.round(r.bottom) + "px");
      }else{
        divider.style.removeProperty("--mobile-header-bottom");
      }
    }

    position();
    window.addEventListener("resize",position,{passive:true});
    window.addEventListener("orientationchange",function(){setTimeout(position,50)},{passive:true});
  }

  if(document.readyState==="loading"){
    document.addEventListener("DOMContentLoaded",mountHeaderDivider,{once:true});
  }else{
    mountHeaderDivider();
  }
})();


/* =========================================================
   MOBILE COMMUNITY NOTIFICATION PANEL
   The desktop right rail becomes an expandable notification sheet.
   ========================================================= */
(function initMobileCommunityPanel(){
  const alertButton = document.getElementById("mobileCommunityAlert");
  const panel = document.getElementById("mobileCommunityPanel");
  let previousDockView = "hub";
  const panelBody = document.getElementById("mobileCommunityPanelBody");
  const closeButton = document.getElementById("mobileCommunityClose");
  const rightRail = document.querySelector(".right-rail");
  if(!alertButton || !panel || !panelBody || !rightRail) return;

  const cleanClone = () => {
    const clone = rightRail.cloneNode(true);
    clone.classList.add("mobile-cloned-rail");
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
    clone.querySelectorAll("script").forEach(el => el.remove());
    return clone;
  };

  const open = () => {
    const active = document.querySelector("#mobileDock .mobile-dock-item.active");
    previousDockView = active?.dataset?.view || previousDockView || "hub";

    document.querySelectorAll("#mobileDock .mobile-dock-item").forEach((item) => {
      item.classList.remove("active");
    });

    panelBody.replaceChildren(cleanClone());
    panel.classList.add("is-open");
    alertButton.classList.add("is-open");
    panel.setAttribute("aria-hidden","false");
    alertButton.setAttribute("aria-expanded","true");
    document.body.classList.add("mobile-community-open");
  };

  const close = () => {
    panel.classList.remove("is-open");
    alertButton.classList.remove("is-open");
    panel.setAttribute("aria-hidden","true");
    alertButton.setAttribute("aria-expanded","false");
    document.body.classList.remove("mobile-community-open");

    document.querySelectorAll("#mobileDock .mobile-dock-item").forEach((item) => {
      item.classList.remove("active");
    });
    const restore = document.querySelector(
      `#mobileDock .mobile-dock-item[data-view="${previousDockView || "hub"}"]`
    );
    if (restore) restore.classList.add("active");
  };

  alertButton.addEventListener("click",(event)=>{
    event.preventDefault();
    event.stopPropagation();
    if(panel.classList.contains("is-open")) close();
    else open();
  },true);

  closeButton.addEventListener("click",(event)=>{
    event.preventDefault();
    event.stopPropagation();
    close();
  },true);

  document.addEventListener("click",(event)=>{
    if(!panel.classList.contains("is-open")) return;
    if(panel.contains(event.target) || alertButton.contains(event.target)) return;
    close();
  },true);

  document.addEventListener("keydown",(event)=>{
    if(event.key === "Escape" && panel.classList.contains("is-open")) close();
  });

  window.addEventListener("resize",()=>{
    if(window.innerWidth > 660) close();
  });
})();

/* =========================================================
   EVERLIGHT DOMAIN DOT — DEFINITIVE SLOW PULSE
   The pulse is driven frame-by-frame so no CSS animation,
   reduced-motion rule, or older !important declaration can
   cancel it.
   ========================================================= */
(function(){
  const start = () => {
    const dots = document.querySelectorAll(".topbar .domain .domain-mode-light");
    if (!dots.length) return;

    dots.forEach(dot => {
      if (dot.__everlightPulseFrame) {
        cancelAnimationFrame(dot.__everlightPulseFrame);
      }

      const begin = performance.now();
      const period = 3200; // slow, clearly visible 3.2 second cycle

      const frame = (now) => {
        const t = ((now - begin) % period) / period;
        // Smooth 0 -> 1 -> 0 pulse.
        const wave = (1 - Math.cos(t * Math.PI * 2)) / 2;
        const opacity = 0.28 + wave * 0.72;
        const scale = 0.78 + wave * 0.40;
        const glow = 4 + wave * 16;

        const sun = document.body.classList.contains("sun-mode");
        const rgb = sun ? "242,196,92" : "130,185,232";

        dot.style.setProperty("opacity", opacity.toFixed(3), "important");
        dot.style.setProperty("transform", "scale(" + scale.toFixed(3) + ")", "important");
        dot.style.setProperty(
          "box-shadow",
          "0 0 " + (glow * .45).toFixed(1) + "px rgba(" + rgb + ",.95), " +
          "0 0 " + glow.toFixed(1) + "px rgba(" + rgb + ",.62), " +
          "0 0 " + (glow * 1.65).toFixed(1) + "px rgba(" + rgb + ",.28)",
          "important"
        );

        dot.__everlightPulseFrame = requestAnimationFrame(frame);
      };

      dot.style.setProperty("animation", "none", "important");
      dot.style.setProperty("animation-play-state", "paused", "important");
      dot.__everlightPulseFrame = requestAnimationFrame(frame);
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {once:true});
  } else {
    start();
  }

  // If the header is rebuilt dynamically, start the pulse again.
  const observer = new MutationObserver(() => {
    const dots = document.querySelectorAll(".topbar .domain .domain-mode-light");
    if (dots.length && !dots[0].__everlightPulseFrame) start();
  });
  observer.observe(document.body, {childList:true, subtree:true});
})();
