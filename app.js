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
let activeProfileSection = "main";
let pendingAuthTarget = null;
let editingPostId = null;
const postCache = new Map();


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

function notify(_message) {
  // A láthatatlan állapotértesítő helyett a releváns nézetek saját UI-ja jelzi az állapotot.
  // A korábbi lebegő toast szándékosan ki van kapcsolva.
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

  /*
   * A szerver camelCase safeUser objektumot küld. Régi
   * válaszokból érkező snake_case mezőket is elfogadjuk,
   * hogy egyetlen profiladat se vesszen el a kliens oldalon.
   */
  const normalizedUser = {
    ...user,
    displayName: user.displayName ?? user.display_name ?? '',
    nameColor: user.nameColor ?? user.name_color ?? '#67e7dd',
    profileColor: user.profileColor ?? user.profile_color ?? '#273638'
  };

  showLoggedInProfileState();

  currentUser = {
    ...normalizedUser
  };
  document.body.classList.add("everlight-authenticated");
  if (typeof startNotificationPolling === "function") startNotificationPolling();

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

  const signedOut = $("#join");
  if (signedOut) signedOut.classList.add("is-authenticated");

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

    const submitButton = profileLoginForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton?.textContent || "Bejelentkezés";

    // Give immediate visual feedback while the authentication request is running.
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.classList.add("is-loading");
      submitButton.innerHTML = '<span class="login-loading-spinner" aria-hidden="true"></span><span>Bejelentkezés…</span>';
    }

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
      applyPendingAuthTarget();
      notify("Sikeres belépés.");
      await Promise.all([loadPosts(), loadOnline(), loadCommunityLatest(), loadStats()]);
    } catch (error) {
      notify(error.message);
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        submitButton.classList.remove("is-loading");
        submitButton.textContent = originalButtonText;
      }
    }
  });
}


const messageLoginForm = $("#messageLoginForm");
if (messageLoginForm) {
  messageLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = messageLoginForm.querySelector('button[type="submit"]');
    const originalText = submitButton?.textContent || "Belépés";
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.textContent = "Belépés…";
    }
    try {
      const data = await api("/api/auth/enter", {
        method: "POST",
        body: JSON.stringify({
          username: $("#messageLoginName")?.value.trim() || "",
          email: $("#messageLoginEmail")?.value.trim() || "",
          password: $("#messageLoginPassword")?.value || ""
        })
      });
      token = data.token;
      localStorage.setItem("everlight-token", token);
      setAccount(data.user);
      document.body.classList.add("everlight-authenticated");
      if ($("#messageLoginPassword")) $("#messageLoginPassword").value = "";
      openMessages();
      await Promise.all([loadPosts(), loadOnline(), loadCommunityLatest(), loadStats()]);
    } catch (error) {
      const note = messageLoginForm.querySelector(".message-login-error");
      if (note) note.textContent = error.message || "A bejelentkezés nem sikerült.";
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        submitButton.textContent = originalText;
      }
    }
  });
}


function requireLogin(target = "profile") {
  if (currentUser) return true;

  if (target === "messages") {
    openMessages();
  } else {
    openProfileView();
    showProfileLoginState();
  }

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
   SAFE MARKDOWN / FEED EDITOR RENDERING
   ========================================================= */
function markdownToSafeHtml(value = "") {
  let html = escapeHtml(String(value));
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  html = html.replace(/\*(?!\s)(.+?)(?<!\s)\*/g, '<em>$1</em>');
  html = html.replace(/_(?!\s)(.+?)(?<!\s)_/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  html = html.replace(/\+\+(.+?)\+\+/g, '<u>$1</u>');
  html = html.replace(/\{\{font:(sans|serif|mono|display)\}\}([\s\S]*?)\{\{\/font\}\}/g, (_, font, text) => `<span class="ev-font-${font}">${text}</span>`);
  html = html.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^#\s+(.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^>\s?(.*)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^•\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)(?:\n|$)/g, '<ul>$1</ul>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

function markdownToPlain(value = "") {
  return String(value)
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\+\+(.*?)\+\+/g, '$1')
    .replace(/\{\{font:(?:sans|serif|mono|display)\}\}([\s\S]*?)\{\{\/font\}\}/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^•\s+/gm, '')
    .replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();
}

/* =========================================================
   RENDER POST
   ========================================================= */

function renderPost(post) {
  const createdAt = new Date(post.created_at);
  const timeOnly = createdAt.toLocaleTimeString("hu-HU", {
    hour: "2-digit",
    minute: "2-digit"
  });
  const dateTimeLabel = createdAt.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }) + " · " + timeOnly;

  const anonymous = Boolean(post.is_anonymous);
  // A bejegyzés fejlécében a fióknév legyen felül, a profilban megadott
  // valódi/megjelenítési név pedig alatta. Ez ugyanazt a hierarchiát adja,
  // mint a megosztott történet-kártyán.
  // A fejlécben a felhasználó saját megjelenítési neve legyen felül,
  // alatta pedig a teljes fióknév (#-taggel együtt) szürkén.
  const accountName = anonymous
    ? "Névtelen"
    : (post.display_name || (post.username ? post.username.split("#")[0] : "Felhasználó"));
  const accountUsername = anonymous ? "" : (post.username || "");
  const hashtags = [...String(post.body || "").matchAll(/(^|\s)(#[\p{L}\p{N}_-]+)/gu)]
    .map((m) => m[2])
    .filter((tag, i, arr) => arr.indexOf(tag) === i)
    .slice(0, 5);
  const category = post.category || "Gondolat";
  const rawBody = String(post.body || "").trim();
  const postTitle = markdownToPlain(String(post.post_title || "").trim());
  const plainBody = markdownToPlain(rawBody);
  const visibleExcerpt = plainBody.length > 320
    ? plainBody.slice(0, 320).trimEnd() + "…"
    : plainBody;
  const fullBody = rawBody || "A bejegyzéshez nem tartozik szöveg.";

  const postStreak = anonymous ? 0 : Number(post.message_streak || 0);
  const streakMarkup = postStreak > 0
    ? `<span class="feed-card-streak" title="${postStreak} napos üzenet streak" aria-label="${postStreak} napos üzenet streak">🔥${escapeHtml(String(postStreak))}</span>`
    : "";

  const avatarMarkup = anonymous
    ? `<div class="feed-card-avatar feed-card-avatar-fallback" aria-hidden="true">✦</div>`
    : `<div class="feed-card-avatar-wrap">${post.avatar
      ? `<div class="feed-card-avatar"><img src="${escapeHtml(post.avatar)}" alt="" loading="lazy"></div>`
      : `<div class="feed-card-avatar" aria-hidden="true">${escapeHtml((accountName.charAt(0) || "?").toUpperCase())}</div>`}${streakMarkup}</div>`;

  const imageMarkup = post.image
    ? `<div class="feed-card-media"><img class="post-image" src="${escapeHtml(post.image)}" alt="Megosztott kép" loading="lazy"></div>`
    : "";

  const titleMarkup = postTitle
    ? `<h2 class="feed-card-title">${escapeHtml(postTitle)}</h2>`
    : "";

  return `
    <article
      class="post feed-card"
      data-post-id="${escapeHtml(String(post.id || ""))}"
      tabindex="0"
      aria-label="${escapeHtml(postTitle || category)} – bejegyzés"
    >
      <div class="feed-card-content">
        <header class="feed-card-author">
          ${avatarMarkup}
          <div class="feed-card-author-copy">
            <div class="feed-card-author-line">
              <strong>${escapeHtml(accountName)}</strong>
            </div>
            <div class="feed-card-author-subline">
              ${accountUsername ? `<span class="feed-card-handle">${escapeHtml(accountUsername)}</span>` : ""}
              ${hashtags.length ? `<span class="feed-card-hashtags">${escapeHtml(hashtags.join(" "))}</span>` : ""}
            </div>
          </div>
          <time class="feed-card-author-date" datetime="${escapeHtml(String(post.created_at || ""))}">${escapeHtml(dateTimeLabel)}</time>
        </header>

        ${titleMarkup}

        <div class="feed-card-meta">
          <span class="feed-card-category">${escapeHtml(category)}</span>
        </div>

        <div class="feed-card-body-preview" data-post-preview>${markdownToSafeHtml(visibleExcerpt)}</div>
        <div class="feed-card-full-text" hidden data-full-body>${markdownToSafeHtml(fullBody)}</div>
        ${imageMarkup}
      </div>

      <footer class="feed-card-actions" aria-label="Bejegyzés műveletei">
        <button type="button" class="feed-action${post.liked ? " is-active" : ""}" data-post-action="like" data-post-id="${escapeHtml(String(post.id || ""))}" aria-label="Kedvelés" aria-pressed="${post.liked ? "true" : "false"}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/></svg>
          <span data-like-count>${escapeHtml(String(post.like_count || 0))}</span>
        </button>
        <button type="button" class="feed-action${post.saved ? " is-active" : ""}" data-post-action="save" data-post-id="${escapeHtml(String(post.id || ""))}" aria-label="Mentés" aria-pressed="${post.saved ? "true" : "false"}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.75A2.25 2.25 0 0 1 8.25 1.5h7.5A2.25 2.25 0 0 1 18 3.75v18.15l-6-3.6-6 3.6V3.75Z"/></svg>
          <span data-save-count>${escapeHtml(String(post.save_count || 0))}</span>
        </button>
        ${currentUser && Number(post.author_id) === Number(currentUser.id) ? `
        <button type="button" class="feed-action feed-edit-trigger" data-post-edit="${escapeHtml(String(post.id || ""))}" aria-label="Bejegyzés szerkesztése" title="Szerkesztés">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3Zm9.5-11.5 3 3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Szerkesztés</span>
        </button>` : ""}
        <div class="feed-share-wrap">
          <button type="button" class="feed-action feed-share-trigger" data-post-share-toggle aria-label="Bejegyzés megosztása" aria-expanded="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m0 0 4 4m-4-4L8 7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 11v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>Megosztás</span>
          </button>
          <div class="feed-share-menu" data-post-share-menu hidden role="menu" aria-label="Bejegyzés megosztása">
            <button type="button" role="menuitem" data-post-share="native">Megosztás…</button>
            <button type="button" role="menuitem" data-post-share="instagram">Instagram Story</button>
            <button type="button" role="menuitem" data-post-share="facebook">Facebook Story</button>
            <button type="button" role="menuitem" data-post-share="tiktok">TikTok</button>
            <button type="button" role="menuitem" data-post-share="snapchat">Snapchat</button>
            <button type="button" role="menuitem" data-post-share="messenger">Messenger</button>
            <button type="button" role="menuitem" data-post-share="x">X</button>
            <button type="button" role="menuitem" data-post-share="whatsapp">WhatsApp</button>
            <button type="button" role="menuitem" data-post-share="copy">Hivatkozás másolása</button>
          </div>
        </div>
      </footer>

      <section class="feed-card-comments" data-comments-section data-post-id="${escapeHtml(String(post.id || ""))}">
        <div class="feed-comments-head">
          <strong>Hozzászólások</strong>
          <span data-comment-count>${escapeHtml(String(post.comment_count || 0))}</span>
        </div>
        <div class="feed-comments-list" data-comments-list>
          <span class="feed-comments-loading">Hozzászólások betöltése…</span>
        </div>
        ${currentUser
          ? `<form class="feed-comment-form" data-comment-form data-post-id="${escapeHtml(String(post.id || ""))}">
              <input type="text" name="body" maxlength="1000" autocomplete="off" placeholder="Írj egy hozzászólást…" aria-label="Hozzászólás írása">
              <button type="submit" aria-label="Hozzászólás küldése">↑</button>
            </form>`
          : `<div class="feed-comments-login">A hozzászóláshoz jelentkezz be a Profilban.</div>`}
      </section>
    </article>
  `;
}

function renderComment(comment) {
  const displayName = comment.display_name || (comment.username ? String(comment.username).split('#')[0] : 'Felhasználó');
  const username = comment.username || '';
  const avatar = comment.avatar
    ? `<img src="${escapeHtml(comment.avatar)}" alt="" loading="lazy">`
    : `<span>${escapeHtml((displayName.charAt(0) || '?').toUpperCase())}</span>`;
  const date = comment.created_at ? new Date(comment.created_at).toLocaleString('hu-HU', { dateStyle: 'short', timeStyle: 'short' }) : '';
  return `<article class="feed-comment" data-comment-id="${escapeHtml(String(comment.id || ''))}">
    <div class="feed-comment-avatar">${avatar}</div>
    <div class="feed-comment-content">
      <div class="feed-comment-author"><strong>${escapeHtml(displayName)}</strong>${username ? `<span>${escapeHtml(username)}</span>` : ''}<time>${escapeHtml(date)}</time></div>
      <div class="feed-comment-body">${escapeHtml(comment.body || '')}</div>
    </div>
  </article>`;
}

async function loadPostComments(section) {
  if (!section || section.dataset.commentsLoaded === 'true' || section.dataset.commentsLoading === 'true') return;
  const postId = section.dataset.postId;
  if (!postId) return;
  section.dataset.commentsLoading = 'true';
  try {
    const data = await api(`/api/posts/${encodeURIComponent(postId)}/comments`);
    const list = section.querySelector('[data-comments-list]');
    const count = section.querySelector('[data-comment-count]');
    if (count) count.textContent = String((data.comments || []).length);
    if (list) {
      list.innerHTML = data.comments?.length
        ? data.comments.map(renderComment).join('')
        : '<span class="feed-comments-empty">Még nincs hozzászólás.</span>';
    }
    section.dataset.commentsLoaded = 'true';
  } catch (_) {
    const list = section.querySelector('[data-comments-list]');
    if (list) list.innerHTML = '<span class="feed-comments-empty">A hozzászólások most nem érhetők el.</span>';
  } finally {
    section.dataset.commentsLoading = 'false';
  }
}

function refreshCommentSections() {
  document.querySelectorAll('[data-comments-section]').forEach(loadPostComments);
}


/* =========================================================
   FEED CARD — INLINE EXPANSION (NO MODAL)
   ========================================================= */

function togglePostExpanded(card, force) {
  if (!card) return;

  const expanded = typeof force === "boolean"
    ? force
    : !card.classList.contains("is-expanded");

  card.classList.toggle("is-expanded", expanded);

  const preview = card.querySelector("[data-post-preview]");
  const full = card.querySelector("[data-full-body]");

  if (preview) preview.hidden = expanded;
  if (full) full.hidden = !expanded;
  card.setAttribute("aria-expanded", expanded ? "true" : "false");
}

document.addEventListener("click", (event) => {
  if (
    event.target.closest("[data-post-action]") ||
    event.target.closest("[data-post-share-toggle]") ||
    event.target.closest("[data-post-share]") ||
    event.target.closest("[data-comment-form]") ||
    event.target.closest(".feed-card-comments")
  ) return;

  const card = event.target.closest(".feed-card");
  if (!card) return;

  togglePostExpanded(card);
});

document.addEventListener("keydown", (event) => {
  const card = event.target.closest(".feed-card");
  if (!card) return;

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    togglePostExpanded(card);
  }
});

/* =========================================================
   FEED REACTIONS
   ========================================================= */

/* =========================================================
   POST SHARING
   ========================================================= */
function getPostShareData(card) {
  const title = card?.querySelector(".feed-card-title")?.textContent.trim() ||
    card?.querySelector(".feed-card-category")?.textContent.trim() || "Everlight bejegyzés";
  const body = card?.querySelector("[data-full-body]")?.textContent.trim() ||
    card?.querySelector(".feed-card-body-preview")?.textContent.trim() || "";
  const accountName = card?.querySelector(".feed-card-author-line strong")?.textContent.trim() || "Névtelen";
  const realName = card?.querySelector(".feed-card-real-name")?.textContent.trim() || "";
  const handle = card?.querySelector(".feed-card-handle")?.textContent.trim() || "";
  const hashtags = card?.querySelector(".feed-card-hashtags")?.textContent.trim() || "";
  const date = card?.querySelector(".feed-card-author-date")?.textContent.trim() || "";
  const avatar = card?.querySelector(".feed-card-avatar img")?.currentSrc || card?.querySelector(".feed-card-avatar img")?.src || "";
  const id = card?.dataset.postId || "";
  const url = id ? `${window.location.origin}${window.location.pathname}#post-${encodeURIComponent(id)}` : window.location.href;

  // Keep the image that is handed to iOS/Android sharing at the same aspect
  // ratio as the actual Everlight post bubble. The previous implementation
  // always generated a 1080x1920 image, which made short posts look like a
  // huge, mostly empty block in the system share/Story preview.
  const rect = card?.getBoundingClientRect?.();
  const shareWidth = Math.max(1, Math.round(rect?.width || 0));
  const shareHeight = Math.max(1, Math.round(rect?.height || 0));

  return {
    accountName, realName, handle, hashtags, date, avatar, title, body, url,
    shareWidth, shareHeight,
    shareAspectRatio: shareWidth > 0 && shareHeight > 0 ? shareHeight / shareWidth : (16 / 9),
    text: `${title}${body ? ` — ${body}` : ""}`
  };
}

function escapeXml(value) {
  return String(value ?? "").replace(/[&<>\"']/g, (ch) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;", "'":"&apos;"}[ch]));
}

function wrapShareText(text, maxChars = 32, maxLines = 8) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) { lines.push(line); line = word; }
    else line = next;
    if (lines.length >= maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (words.join(" ").length > lines.join(" ").length && lines.length) lines[lines.length - 1] += "…";
  return lines.slice(0, maxLines);
}

async function imageUrlToDataUrl(url) {
  if (!url) return "";
  try {
    const response = await fetch(url, { credentials: "same-origin" });
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch (_) { return ""; }
}

async function createPostShareFile(data) {
  const avatarData = await imageUrlToDataUrl(data.avatar);

  // Use the real post bubble aspect ratio instead of a fixed Story-sized
  // 1080x1920 canvas. This is what the native iOS share sheet receives, so
  // the preview now follows the same proportions as the Everlight post.
  const targetWidth = 1080;
  const ratio = Number(data.shareAspectRatio) > 0 ? Number(data.shareAspectRatio) : (16 / 9);
  const targetHeight = Math.max(420, Math.min(2200, Math.round(targetWidth * ratio)));
  const scale = targetWidth / Math.max(1, Number(data.shareWidth) || targetWidth);

  const side = 72;
  const headerHeight = Math.max(150, Math.round(76 * scale));
  const contentWidth = targetWidth - side * 2;
  const titleFont = Math.max(34, Math.round(44 * Math.min(1.25, scale)));
  const bodyFont = Math.max(25, Math.round(28 * Math.min(1.25, scale)));
  const titleLineHeight = Math.round(titleFont * 1.2);
  const bodyLineHeight = Math.round(bodyFont * 1.55);
  const titleLines = wrapShareText(data.title, 34, 3);
  const bodyLines = wrapShareText(data.body, 52, Math.max(3, Math.min(12, Math.floor((targetHeight - 360) / bodyLineHeight))));

  const avatarSize = Math.min(78, Math.max(58, Math.round(headerHeight * .62)));
  const avatarCx = side + avatarSize / 2;
  const avatarCy = Math.round(headerHeight / 2);
  const avatarMarkup = avatarData
    ? `<defs><clipPath id="avatarClip"><circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarSize / 2}"/></clipPath></defs><image href="${escapeXml(avatarData)}" x="${side}" y="${avatarCy - avatarSize / 2}" width="${avatarSize}" height="${avatarSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)"/>`
    : `<circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarSize / 2}" fill="#18272b"/><text x="${avatarCx}" y="${avatarCy + 11}" text-anchor="middle" fill="#9fc4e7" font-size="34" font-family="Arial">✦</text>`;

  const textX = side + avatarSize + 24;
  const titleStartY = headerHeight + 72;
  const titleSvg = titleLines.map((line, i) =>
    `<text x="${side}" y="${titleStartY + i * titleLineHeight}" fill="#f1f4f5" font-size="${titleFont}" font-weight="800" font-family="Arial">${escapeXml(line)}</text>`
  ).join("");

  const bodyStartY = titleStartY + Math.max(1, titleLines.length) * titleLineHeight + 28;
  const bodySvg = bodyLines.map((line, i) =>
    `<text x="${side}" y="${bodyStartY + i * bodyLineHeight}" fill="#c4cdd0" font-size="${bodyFont}" font-family="Arial">${escapeXml(line)}</text>`
  ).join("");

  const meta = [data.realName, data.handle, data.hashtags].filter(Boolean).join("  ");
  const footerY = targetHeight - 52;
  const dividerY = headerHeight + 18;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}">
    <rect width="${targetWidth}" height="${targetHeight}" fill="#000000"/>
    <rect x="18" y="18" width="${targetWidth - 36}" height="${targetHeight - 36}" rx="30" fill="#080b0d" stroke="#253238" stroke-width="3"/>
    <rect x="18" y="18" width="${targetWidth - 36}" height="${headerHeight}" rx="30" fill="#11191d"/>
    <rect x="18" y="${Math.max(18, headerHeight - 30)}" width="${targetWidth - 36}" height="30" fill="#11191d"/>
    ${avatarMarkup}
    <text x="${textX}" y="${avatarCy - 4}" fill="#eef2f4" font-size="32" font-weight="800" font-family="Arial">${escapeXml(data.accountName)}</text>
    <text x="${textX}" y="${avatarCy + 30}" fill="#8b989e" font-size="23" font-family="Arial">${escapeXml(meta)}</text>
    <text x="${targetWidth - side}" y="${avatarCy + 30}" text-anchor="end" fill="#7e8a90" font-size="21" font-family="Arial">${escapeXml(data.date)}</text>
    <line x1="${side}" y1="${dividerY}" x2="${targetWidth - side}" y2="${dividerY}" stroke="#263238" stroke-width="2"/>
    ${titleSvg}
    ${bodySvg}
    <text x="${side}" y="${footerY}" fill="#88b6dc" font-size="22" font-family="Arial">Everlight</text>
    <text x="${targetWidth - side}" y="${footerY}" text-anchor="end" fill="#69767c" font-size="19" font-family="Arial">${escapeXml(data.url)}</text>
  </svg>`;

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const pngBlob = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      canvas.toBlob((out) => out ? resolve(out) : reject(new Error("PNG conversion failed")), "image/png", 1);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });

  return new File([pngBlob], "everlight-bejegyzes.png", { type: "image/png" });
}

async function copyPostShareLink(data) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(data.url);
      notify("A bejegyzés hivatkozása a vágólapra került.");
      return true;
    }
  } catch (_) {}
  notify("A hivatkozást nem sikerült a vágólapra másolni.");
  return false;
}

async function sharePostToNetwork(network, data) {
  const encodedUrl = encodeURIComponent(data.url);
  const encodedText = encodeURIComponent(data.text);
  const targets = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
    whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
    instagram: "https://www.instagram.com/",
    tiktok: "https://www.tiktok.com/upload",
    snapchat: "https://www.snapchat.com/",
    messenger: "https://www.messenger.com/"
  };

  if (network === "copy") return copyPostShareLink(data);

  if (network === "native") {
    try {
      if (navigator.share) {
        let shareFile = null;
        try { shareFile = await createPostShareFile(data); } catch (_) {}
        if (shareFile && navigator.canShare?.({ files: [shareFile] })) {
          await navigator.share({
            title: data.title,
            text: data.text,
            files: [shareFile],
            url: data.url
          });
        } else {
          await navigator.share({ title: data.title, text: data.text, url: data.url });
        }
      } else {
        await copyPostShareLink(data);
      }
    } catch (error) {
      if (error?.name !== "AbortError") notify("A megosztás nem sikerült.");
    }
    return;
  }

  if (network === "instagram" || network === "tiktok" || network === "snapchat" || network === "messenger") {
    await copyPostShareLink(data);
    window.open(targets[network], "_blank", "noopener,noreferrer");
    notify("A bejegyzés linkje kimásolva. Illeszd be a megnyíló alkalmazásban.");
    return;
  }

  if (targets[network]) {
    window.open(targets[network], "_blank", "noopener,noreferrer");
  }
}


/* =========================================================
   MOBILE POST SHARE SHEET — REAL DOM PREVIEW
   ========================================================= */
function closeMobilePostShareSheet() {
  const sheet = document.getElementById("mobilePostShareSheet");
  if (!sheet) return;
  sheet.classList.remove("is-open");
  sheet.setAttribute("aria-hidden", "true");
  document.body.classList.remove("mobile-share-open");
  setTimeout(() => sheet.remove(), 220);
}

function openMobilePostShareSheet(card) {
  if (!card) return;
  closeMobilePostShareSheet();

  const clone = card.cloneNode(true);
  clone.removeAttribute("tabindex");
  clone.removeAttribute("aria-expanded");
  clone.classList.remove("is-expanded");
  clone.querySelectorAll("[data-post-action], [data-post-share-toggle], [data-post-share-menu], .feed-card-actions").forEach((el) => el.remove());
  const preview = clone.querySelector("[data-post-preview]");
  const full = clone.querySelector("[data-full-body]");
  if (preview) preview.hidden = true;
  if (full) full.hidden = false;

  const sheet = document.createElement("div");
  sheet.id = "mobilePostShareSheet";
  sheet.className = "mobile-post-share-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `
    <div class="mobile-post-share-backdrop" data-share-close></div>
    <section class="mobile-post-share-panel" role="dialog" aria-modal="true" aria-labelledby="mobilePostShareTitle">
      <div class="mobile-post-share-grabber" aria-hidden="true"></div>
      <header class="mobile-post-share-header">
        <h2 id="mobilePostShareTitle">Megosztás</h2>
        <button type="button" class="mobile-post-share-close" data-share-close aria-label="Bezárás">×</button>
      </header>
      <div class="mobile-post-share-preview" aria-label="Bejegyzés előnézete"></div>
      <div class="mobile-post-share-heading">Megosztás hová?</div>
      <div class="mobile-post-share-options">
        <button type="button" class="mobile-post-share-option" data-share-destination="story">
          <span class="mobile-post-share-option-icon story">✦</span>
          <span><strong>A történeted</strong><small>Oszd meg a történetedben</small></span>
          <b>›</b>
        </button>
        <button type="button" class="mobile-post-share-option" data-share-destination="close-friends">
          <span class="mobile-post-share-option-icon friends">★</span>
          <span><strong>Közeli ismerősök</strong><small>Oszd meg csak a közeli ismerőseiddel</small></span>
          <b>›</b>
        </button>
        <button type="button" class="mobile-post-share-option" data-share-destination="message">
          <span class="mobile-post-share-option-icon message">➤</span>
          <span><strong>Üzenet küldése</strong><small>Oszd meg privát üzenetben valakivel</small></span>
          <b>›</b>
        </button>
        <button type="button" class="mobile-post-share-option" data-share-destination="copy">
          <span class="mobile-post-share-option-icon link">↗</span>
          <span><strong>Hivatkozás másolása</strong><small>Másold ki a bejegyzés hivatkozását</small></span>
          <b>›</b>
        </button>
      </div>
      <div class="mobile-post-share-info">
        <span>🔒</span>
        <div><strong>Biztonságos megosztás</strong><small>A bejegyzés eredeti tartalma és formázása megmarad. Nem készül belőle képernyőkép.</small></div>
      </div>
    </section>
  `;

  document.body.appendChild(sheet);
  sheet.querySelector(".mobile-post-share-preview")?.appendChild(clone);
  document.body.classList.add("mobile-share-open");
  requestAnimationFrame(() => {
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
  });

  const data = getPostShareData(card);
  sheet.addEventListener("click", async (event) => {
    if (event.target.closest("[data-share-close]")) {
      closeMobilePostShareSheet();
      return;
    }
    const option = event.target.closest("[data-share-destination]");
    if (!option) return;
    const destination = option.dataset.shareDestination;

    if (destination === "copy") {
      await copyPostShareLink(data);
      closeMobilePostShareSheet();
      return;
    }

    // A választott cél szerint más payloadot adunk át.
    // Történet/Közeli ismerősök esetén NEM küldünk URL-t, mert az iOS/Android
    // ilyenkor link-megosztásként kezeli az Everlight bejegyzést. Ehelyett a
    // bejegyzésből készített, az oldalon látott kártyát tartalmazó fájlt adjuk
    // át a natív megosztásnak. A megosztási lap/előnézet ettől továbbra is
    // valódi DOM marad, nem screenshot.
    if (destination === "story" || destination === "close-friends" || destination === "message") {
      try {
        if (navigator.share) {
          if (destination === "story" || destination === "close-friends") {
            let shareFile = null;
            try { shareFile = await createPostShareFile(data); } catch (_) {}

            if (shareFile && navigator.canShare?.({ files: [shareFile] })) {
              await navigator.share({
                title: data.title || "Everlight",
                files: [shareFile]
              });
            } else {
              // Ha a böngésző nem támogat fájlmegosztást, ne adjunk át URL-t,
              // mert az pont a nem kívánt link-megosztást eredményezné.
              await navigator.share({
                title: data.title || "Everlight",
                text: data.text
              });
            }
          } else {
            // Privát üzenetnél a címzettnek a közvetlen bejegyzés-hivatkozás
            // hasznos, ezért itt maradhat a link + szöveg.
            await navigator.share({
              title: data.title || "Everlight",
              text: data.text,
              url: data.url
            });
          }
        } else {
          await copyPostShareLink(data);
        }
      } catch (error) {
        if (error?.name !== "AbortError") notify("A megosztás nem sikerült.");
      }
      closeMobilePostShareSheet();
    }
  });

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      closeMobilePostShareSheet();
      document.removeEventListener("keydown", onKeyDown);
    }
  };
  document.addEventListener("keydown", onKeyDown);
}

document.addEventListener("click", async (event) => {
  const toggle = event.target.closest("[data-post-share-toggle]");
  if (toggle) {
    event.preventDefault();
    event.stopPropagation();
    const card = toggle.closest(".feed-card");
    if (!card) return;

    // Mobile: use an in-page Everlight share sheet. The preview is the real
    // DOM post card (not a generated screenshot/image), so typography,
    // spacing, radius, background and metadata stay identical to the feed.
    if (window.matchMedia?.("(max-width: 760px)").matches) {
      openMobilePostShareSheet(card);
      return;
    }

    // Desktop keeps the compact per-post network menu.
    const wrap = toggle.closest(".feed-share-wrap");
    const menu = wrap?.querySelector("[data-post-share-menu]");
    if (!menu) return;
    const willOpen = menu.hidden;
    document.querySelectorAll("[data-post-share-menu]").forEach((other) => {
      other.hidden = true;
      other.closest(".feed-share-wrap")?.querySelector("[data-post-share-toggle]")?.setAttribute("aria-expanded", "false");
    });
    menu.hidden = !willOpen;
    toggle.setAttribute("aria-expanded", String(willOpen));
    return;
  }

  const shareItem = event.target.closest("[data-post-share]");
  if (shareItem) {
    event.preventDefault();
    event.stopPropagation();
    const card = shareItem.closest(".feed-card");
    const menu = shareItem.closest("[data-post-share-menu]");
    const toggleButton = card?.querySelector("[data-post-share-toggle]");
    if (menu) menu.hidden = true;
    if (toggleButton) toggleButton.setAttribute("aria-expanded", "false");
    if (card) await sharePostToNetwork(shareItem.dataset.postShare, getPostShareData(card));
    return;
  }

  if (!event.target.closest(".feed-share-wrap")) {
    document.querySelectorAll("[data-post-share-menu]").forEach((menu) => { menu.hidden = true; });
    document.querySelectorAll("[data-post-share-toggle]").forEach((button) => button.setAttribute("aria-expanded", "false"));
  }
});

document.addEventListener("click", async (event) => {
  const editButton = event.target.closest("[data-post-edit]");
  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    beginPostEdit(editButton.dataset.postEdit);
    return;
  }

  const button = event.target.closest("[data-post-action]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();

  if (!currentUser) {
    openProfileView();
    showProfileLoginState();
    return;
  }

  const action = button.dataset.postAction;
  const postId = button.dataset.postId;
  if (!postId) return;

  try {
    const data = await api(`/api/posts/${encodeURIComponent(postId)}/${action}`, { method: "POST" });
    button.setAttribute("aria-pressed", data[action === "like" ? "liked" : "saved"] ? "true" : "false");
    button.classList.toggle("is-active", data[action === "like" ? "liked" : "saved"]);
    const count = button.querySelector(action === "like" ? "[data-like-count]" : "[data-save-count]");
    if (count) count.textContent = String(data.count || 0);
  } catch (error) {
    notify(error.message);
  }
});

/* =========================================================
   POST COMMENTS — UI
   ========================================================= */
document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-comment-form]');
  if (!form) return;
  event.preventDefault();
  event.stopPropagation();
  if (!currentUser) {
    openProfileView();
    showProfileLoginState();
    return;
  }

  const postId = form.dataset.postId;
  const input = form.querySelector('input[name="body"]');
  const body = input?.value.trim() || '';
  if (!postId || !body) return;

  const button = form.querySelector('button[type="submit"]');
  if (button) button.disabled = true;
  try {
    const data = await api(`/api/posts/${encodeURIComponent(postId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body })
    });
    const section = form.closest('[data-comments-section]');
    const list = section?.querySelector('[data-comments-list]');
    const count = section?.querySelector('[data-comment-count]');
    if (list && data.comment) {
      const empty = list.querySelector('.feed-comments-empty, .feed-comments-loading');
      if (empty) list.innerHTML = '';
      list.insertAdjacentHTML('beforeend', renderComment(data.comment));
    }
    if (count) count.textContent = String(data.count || 0);
    if (input) { input.value = ''; input.focus(); }
    if (section) section.dataset.commentsLoaded = 'true';
  } catch (error) {
    notify(error.message || 'A hozzászólás küldése nem sikerült.');
  } finally {
    if (button) button.disabled = false;
  }
});

/* =========================================================
   LOAD POSTS
   ========================================================= */

async function loadPosts() {

  try {

    const { posts } =
      await api(
        "/api/posts"
      );

    postCache.clear();
    (posts || []).forEach((post) => {
      if (post?.id != null) postCache.set(String(post.id), post);
    });

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

    refreshCommentSections();

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
          const postName = markdownToPlain(String(post.post_title || "").trim());
          const lines = rawBody.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
          // A Legutóbbi bejegyzések kártya ne másolja ki az egész bejegyzés
          // szövegét: ha van bejegyzésnév/cím, kizárólag azt mutatjuk.
          let title = postName || markdownToPlain(lines[0] || post.category || "Bejegyzés");
          if (title.length > 64) title = title.slice(0, 64).trimEnd() + "…";

          const category = post.category || "Gondolat";

          const avatar = post.avatar
            ? `<img src="${escapeHtml(post.avatar)}" alt="" loading="lazy">`
            : `<span class="community-avatar-fallback">✦</span>`;

          return `
            <article class="community-latest-item" data-post-id="${escapeHtml(String(post.id || ""))}" tabindex="0" role="button">
              <div class="community-avatar">${avatar}</div>
              <div class="community-latest-copy">
                <strong>${escapeHtml(title)}</strong>
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
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => togglePostExpanded(card, true), 220);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;

  const item = event.target.closest(".community-latest-item");
  if (!item) return;

  event.preventDefault();
  item.click();
});

/* =========================================================
   LOAD PUBLIC STATS
   ========================================================= */

async function loadStats() {
  try {
    const data = await api('/api/stats');

    const streak = $('#streak');
    const postCount = $('#postCount');
    const lightCount = $('#lightCount');
    const newUserName = $('#newUserName');

    if (streak) streak.textContent = String(Number(data.topics || 0));
    if (postCount) postCount.textContent = String(Number(data.messages || 0));
    if (lightCount) lightCount.textContent = String(Number(data.users || 0));
    if (newUserName) newUserName.textContent = String(Number(data.newUsers || 0));
  } catch (error) {
    // Keep the visible zero values if the public stats endpoint is temporarily unavailable.
    console.warn('Statisztika betöltése sikertelen:', error);
  }
}

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
              .map((user) => {
                const displayName =
                  user.display_name ||
                  (
                    user.username &&
                    user.username.includes("#")
                      ? user.username.split("#")[0]
                      : user.username
                  ) ||
                  "Felhasználó";

                const avatarHtml = user.avatar
                  ? `<img src="${escapeHtml(user.avatar)}" alt="" loading="lazy">`
                  : `<span class="everlight-online-avatar-fallback">✦</span>`;
                const streak = Number(user.message_streak || 0);

                return `
                  <div class="everlight-online-user" role="listitem" title="${escapeHtml(displayName)}${streak > 0 ? ` — 🔥${streak}` : ''}">
                    <span class="everlight-online-avatar" aria-label="${escapeHtml(displayName)}">
                      ${avatarHtml}
                      <i aria-hidden="true"></i>
                      ${streak > 0 ? `<b class="everlight-online-streak" aria-label="${streak} napos üzenet streak">🔥${escapeHtml(String(streak))}</b>` : ''}
                    </span>
                  </div>
                `;
              })
              .join("")

          : `
            <span class="everlight-online-empty" aria-hidden="true">✦</span>
          `;
    }

  } catch {

    const onlineFaces =
      $("#onlineFaces");

    if (onlineFaces) {

      onlineFaces.innerHTML = `<span class="everlight-online-empty" aria-hidden="true">✦</span>`;
    }
  }
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
   FEED RICH EDITOR TOOLBAR
   Uses a real contenteditable editor so formatting is visible
   immediately instead of showing Discord/Markdown markers.
   ========================================================= */
(() => {
  const toolbar = document.getElementById("feedEditorToolbar");
  const editor = document.getElementById("postTextEditor");
  const storage = document.getElementById("postText");
  const fontSelect = document.getElementById("editorFontFormat");
  if (!toolbar || !editor || !storage) return;

  const fontMap = {
    sans: 'Manrope, Arial, sans-serif',
    serif: 'Playfair Display, Georgia, serif',
    mono: 'DM Mono, ui-monospace, monospace',
    display: 'Playfair Display, Georgia, serif'
  };

  const escapeText = value => String(value).replace(/\\/g, '\\\\').replace(/\*/g, '\\*').replace(/_/g, '\\_').replace(/~/g, '\\~').replace(/`/g, '\\`');

  function nodeToMarkup(node) {
    if (node.nodeType === Node.TEXT_NODE) return escapeText(node.nodeValue || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName.toLowerCase();
    const inner = Array.from(node.childNodes).map(nodeToMarkup).join('');

    if (tag === 'br') return '\n';
    if (tag === 'strong' || tag === 'b') return inner ? `**${inner}**` : '';
    if (tag === 'em' || tag === 'i') return inner ? `*${inner}*` : '';
    if (tag === 'u') return inner ? `++${inner}++` : '';
    if (tag === 's' || tag === 'strike' || tag === 'del') return inner ? `~~${inner}~~` : '';
    if (tag === 'font') {
      const face = (node.getAttribute('face') || '').toLowerCase();
      const font = face.includes('mono') ? 'mono' : face.includes('playfair') || face.includes('georgia') ? 'serif' : 'sans';
      return inner ? `{{font:${font}}}${inner}{{/font}}` : '';
    }
    if (tag === 'span') {
      const cls = node.className || '';
      const match = String(cls).match(/(?:^|\\s)ev-font-(sans|serif|mono|display)(?:\\s|$)/);
      if (match) return inner ? `{{font:${match[1]}}}${inner}{{/font}}` : '';
    }
    if (tag === 'li') return `• ${inner}`;
    if (tag === 'div' || tag === 'p') return inner + '\n';
    if (tag === 'ul' || tag === 'ol') return inner + '\n';
    return inner;
  }

  function htmlToMarkup() {
    return Array.from(editor.childNodes)
      .map(nodeToMarkup)
      .join('')
      .replace(/\u00a0/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+$/g, '')
      .trim();
  }

  function plainLength() {
    return (editor.innerText || '').replace(/\u00a0/g, ' ').length;
  }

  function syncStorage() {
    storage.value = htmlToMarkup();
    storage.dispatchEvent(new Event('input', { bubbles: true }));
    try { localStorage.setItem('everlight-feed-draft', storage.value); } catch {}
  }

  function focusEditor() {
    editor.focus({ preventScroll: true });
  }

  function isEditorFocused() {
    return document.activeElement === editor || editor.contains(document.activeElement);
  }

  // Keep a separate typing state so an empty editor does not make Bold/Italic/etc.
  // appear active just because the browser reports an inherited command state.
  const typingState = { bold:false, italic:false, underline:false, strike:false, bullet:false };

  function selectionInsideEditor() {
    const sel = window.getSelection();
    return !!(sel && sel.rangeCount && editor.contains(sel.anchorNode));
  }

  function elementHasFormat(node, action) {
    let el = node && node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (el && el !== editor) {
      const tag = el.tagName.toLowerCase();
      const style = el.style || {};
      if (action === 'bold' && (tag === 'strong' || tag === 'b' || parseInt(style.fontWeight || '0', 10) >= 600 || style.fontWeight === 'bold')) return true;
      if (action === 'italic' && (tag === 'em' || tag === 'i' || style.fontStyle === 'italic' || style.fontStyle === 'oblique')) return true;
      if (action === 'underline' && (tag === 'u' || String(style.textDecoration || '').includes('underline'))) return true;
      if (action === 'strike' && (tag === 's' || tag === 'strike' || tag === 'del' || String(style.textDecoration || '').includes('line-through'))) return true;
      if (action === 'bullet' && tag === 'li') return true;
      el = el.parentElement;
    }
    return false;
  }

  function updateToolbarState() {
    const actions = {
      bold: 'bold',
      italic: 'italic',
      underline: 'underline',
      strike: 'strikeThrough',
      bullet: 'insertUnorderedList'
    };

    const hasContent = plainLength() > 0;
    const selection = window.getSelection();
    const hasSelection = !!(selection && selection.rangeCount && !selection.isCollapsed);
    const inside = isEditorFocused() && selectionInsideEditor();

    Object.entries(actions).forEach(([action, commandName]) => {
      const button = toolbar.querySelector(`[data-editor-action=\"${action}\"]`);
      if (!button) return;
      let active = false;
      if (inside) {
        // For selected/existing text, derive the state from the actual DOM first.
        // This prevents the browser's inherited execCommand state from marking
        // the button active all the time.
        if (hasContent) active = elementHasFormat(selection.anchorNode, action);
        if (hasSelection) {
          try { active = document.queryCommandState(commandName) && active; } catch {}
        }
        // When the caret is in an empty/new formatting run, preserve only the
        // formatting explicitly toggled by the user.
        if (!hasContent) active = typingState[action];
      }
      button.classList.toggle('is-active', !!active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // A symbol is an insert action, not a persistent formatting state.
    const symbolButton = toolbar.querySelector('[data-editor-action=\"symbol\"]');
    if (symbolButton) symbolButton.setAttribute('aria-pressed', 'false');

    // Keep the font selector in sync with the text under the caret.
    if (fontSelect && isEditorFocused()) {
      try {
        const raw = String(document.queryCommandValue('fontName') || '').toLowerCase();
        if (raw) {
          const key = raw.includes('mono') ? 'mono' : raw.includes('playfair') || raw.includes('georgia') ? 'serif' : 'sans';
          if ([...fontSelect.options].some(o => o.value === key)) fontSelect.value = key;
        }
      } catch {}
    }
  }

  function command(command, value = null) {
    focusEditor();
    document.execCommand(command, false, value);
    const action = command === 'underline' ? 'underline' : command === 'strikeThrough' ? 'strike' : command === 'insertUnorderedList' ? 'bullet' : null;
    if (action) typingState[action] = !typingState[action];
    syncStorage();
    requestAnimationFrame(updateToolbarState);
  }

  function insertText(text) {
    focusEditor();
    document.execCommand('insertText', false, text);
    syncStorage();
  }

  function applyFont(font) {
    focusEditor();
    document.execCommand('fontName', false, fontMap[font] || fontMap.sans);
    // Normalize browser <font face> output into our own font classes.
    editor.querySelectorAll('font[face]').forEach(el => {
      const face = (el.getAttribute('face') || '').toLowerCase();
      const key = face.includes('mono') ? 'mono' : face.includes('playfair') || face.includes('georgia') ? 'serif' : font;
      const span = document.createElement('span');
      span.className = `ev-font-${key}`;
      while (el.firstChild) span.appendChild(el.firstChild);
      el.replaceWith(span);
    });
    syncStorage();
  }

  toolbar.addEventListener('mousedown', event => {
    const button = event.target.closest('button');
    if (button) event.preventDefault();
  });

  toolbar.addEventListener('click', event => {
    const button = event.target.closest('button[data-editor-action]');
    if (!button) return;
    const action = button.dataset.editorAction;

    if (action === 'bold') {
      // execCommand('bold') may return <b> in some browsers and <strong> in others.
      // Normalize both to <strong> so the editor always renders and saves real bold text.
      focusEditor();
      document.execCommand('bold', false, null);
      typingState.bold = !typingState.bold;
      editor.querySelectorAll('b').forEach(el => {
        const strong = document.createElement('strong');
        while (el.firstChild) strong.appendChild(el.firstChild);
        Array.from(el.attributes).forEach(attr => strong.setAttribute(attr.name, attr.value));
        el.replaceWith(strong);
      });
      editor.querySelectorAll('span[style*="font-weight"], span[style*="font-weight:"]').forEach(el => {
        const weight = (el.style.fontWeight || '').toLowerCase();
        if (weight === 'bold' || parseInt(weight, 10) >= 600) el.style.fontWeight = '800';
      });
      syncStorage();
      requestAnimationFrame(updateToolbarState);
      return;
    }
    if (action === 'italic') {
      // Robust italic toggle.  Mobile Safari/Chrome can report execCommand('italic')
      // as supported while not actually creating a visible <em>/<i> node for a
      // selected range.  Handle a real selection ourselves and keep execCommand
      // only for a collapsed caret (typing mode).
      focusEditor();
      const sel = window.getSelection();
      const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
      const selectedText = range ? range.toString() : '';

      if (range && !range.collapsed && selectedText) {
        const alreadyItalic = elementHasFormat(range.commonAncestorContainer, 'italic') ||
          elementHasFormat(range.startContainer, 'italic') ||
          elementHasFormat(range.endContainer, 'italic');

        if (alreadyItalic) {
          // Remove italic only from the selected content while keeping other
          // formatting (bold/underline/etc.) intact.
          document.execCommand('italic', false, null);
        } else {
          const em = document.createElement('em');
          const fragment = range.extractContents();
          em.appendChild(fragment);
          range.insertNode(em);
          range.selectNodeContents(em);
          sel.removeAllRanges();
          sel.addRange(range);
        }
      } else {
        // Collapsed caret: native command gives the browser a persistent typing
        // state for the next characters.
        document.execCommand('italic', false, null);
      }

      // Normalize all browser variants to semantic <em>.
      editor.querySelectorAll('i').forEach(el => {
        const em = document.createElement('em');
        while (el.firstChild) em.appendChild(el.firstChild);
        Array.from(el.attributes).forEach(attr => em.setAttribute(attr.name, attr.value));
        el.replaceWith(em);
      });
      editor.querySelectorAll('span').forEach(el => {
        const fs = String(el.style.fontStyle || '').toLowerCase();
        if (fs === 'italic' || fs === 'oblique') el.style.fontStyle = 'italic';
      });

      typingState.italic = range && !range.collapsed ? false : !typingState.italic;
      syncStorage();
      requestAnimationFrame(updateToolbarState);
      return;
    }
    if (action === 'underline') return command('underline');
    if (action === 'strike') return command('strikeThrough');
    if (action === 'bullet') return command('insertUnorderedList');
    if (action === 'symbol') {
      const symbols = ['✦','☆','★','♡','♥','→','←','∞','☾','☼','◇','◆','•','…'];
      let picker = document.getElementById('editorSymbolPicker');
      if (!picker) {
        picker = document.createElement('div');
        picker.id = 'editorSymbolPicker';
        picker.className = 'editor-symbol-picker';
        picker.setAttribute('role', 'dialog');
        picker.innerHTML = symbols.map(symbol => `<button type="button" data-symbol="${symbol}">${symbol}</button>`).join('');
        document.body.appendChild(picker);
        picker.addEventListener('click', e => {
          const btn = e.target.closest('button[data-symbol]');
          if (!btn) return;
          insertText(btn.dataset.symbol);
          picker.classList.remove('open');
        });
      }
      const rect = button.getBoundingClientRect();
      picker.style.left = `${Math.min(rect.left, window.innerWidth - 230)}px`;
      picker.style.top = `${rect.bottom + 6}px`;
      picker.classList.toggle('open');
    }
  });

  fontSelect?.addEventListener('change', event => {
    applyFont(event.target.value || 'sans');
    requestAnimationFrame(updateToolbarState);
  });

  editor.addEventListener('keyup', updateToolbarState);
  editor.addEventListener('mouseup', updateToolbarState);
  editor.addEventListener('focus', updateToolbarState);
  editor.addEventListener('blur', () => {
    // Keep the last visible state while the user is moving between toolbar controls.
    requestAnimationFrame(updateToolbarState);
  });
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount && editor.contains(selection.anchorNode)) {
      const hasContent = plainLength() > 0;
      if (hasContent && !selection.isCollapsed) {
        // A real selection gets its state exclusively from the selected DOM.
        Object.keys(typingState).forEach(k => typingState[k] = false);
      }
      updateToolbarState();
    }
  });

  editor.addEventListener('input', () => {
    syncStorage();
    const limit = typeof getCurrentCategoryLimit === 'function' ? getCurrentCategoryLimit() : 280;
    if (plainLength() > limit) {
      // Trim through the visible editor so formatting remains intact.
      const selection = window.getSelection();
      const range = document.createRange();
      const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
      let count = 0, node;
      while ((node = walker.nextNode())) {
        const remaining = limit - count;
        if (remaining <= 0) {
          node.parentNode?.removeChild(node);
          continue;
        }
        if (count + node.nodeValue.length > limit) node.nodeValue = node.nodeValue.slice(0, remaining);
        count += node.nodeValue.length;
      }
      syncStorage();
    }
  });

  document.addEventListener('click', event => {
    const picker = document.getElementById('editorSymbolPicker');
    if (picker?.classList.contains('open') && !event.target.closest('#editorSymbolPicker, [data-editor-action="symbol"]')) picker.classList.remove('open');
  });

  // Restore a previous draft without exposing formatting markers.
  const savedDraft = localStorage.getItem('everlight-feed-draft');
  if (savedDraft && !storage.value && !editor.innerHTML) {
    editor.innerHTML = markdownToSafeHtml(savedDraft);
    storage.value = savedDraft;
  }
})();

/* =========================================================
   CREATE POST
   ========================================================= */

const postButton =
  $("#postButton");

const postTitleInput =
  $("#postTitle");

function setPostEditMode(post) {
  editingPostId = post?.id != null ? String(post.id) : null;
  if (postButton) postButton.textContent = editingPostId ? "Mentés ✓" : "Megosztás ↗";
  const cancel = $("#cancelPostEdit");
  if (cancel) cancel.hidden = !editingPostId;
}

function resetPostComposer() {
  editingPostId = null;
  if (postText) postText.value = "";
  const visualEditor = document.getElementById("postTextEditor");
  if (visualEditor) visualEditor.innerHTML = "";
  if (postTitleInput) postTitleInput.value = "";
  if (category) category.value = "Gondolat";
  const anonymousInput = $("#anonymous");
  if (anonymousInput) anonymousInput.checked = false;
  imageData = "";
  if (imageInput) imageInput.value = "";
  if (imagePreview) {
    imagePreview.innerHTML = "";
    imagePreview.classList.remove("visible");
  }
  const imageName = $("#imageName");
  if (imageName) imageName.textContent = "Kép";
  if (postButton) postButton.textContent = "Megosztás ↗";
  const cancel = $("#cancelPostEdit");
  if (cancel) cancel.hidden = true;
  updateCategoryLimit();
  updateCharacterCounter();
}

function beginPostEdit(postId) {
  if (!requireLogin()) return;

  const post = postCache.get(String(postId));
  if (!post || Number(post.author_id) !== Number(currentUser?.id)) {
    notify("Csak a saját bejegyzésedet szerkesztheted.");
    return;
  }

  editingPostId = String(post.id);
  if (category) category.value = post.category || "Gondolat";
  updateCategoryLimit();
  if (postTitleInput) postTitleInput.value = post.post_title || "";
  if (postText) postText.value = post.body || "";

  const visualEditor = document.getElementById("postTextEditor");
  if (visualEditor) {
    visualEditor.innerHTML = markdownToSafeHtml(post.body || "");
    visualEditor.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const anonymousInput = $("#anonymous");
  if (anonymousInput) anonymousInput.checked = Boolean(post.is_anonymous);

  imageData = post.image || "";
  if (imagePreview) {
    if (imageData) {
      imagePreview.innerHTML = `<button type="button" aria-label="Kép eltávolítása"><img src="${escapeHtml(imageData)}" alt="Kiválasztott kép"></button>`;
      imagePreview.classList.add("visible");
    } else {
      imagePreview.innerHTML = "";
      imagePreview.classList.remove("visible");
    }
  }
  const imageName = $("#imageName");
  if (imageName) imageName.textContent = imageData ? "Kép kiválasztva" : "Kép";

  setPostEditMode(post);

  const composer = document.querySelector(".composer");
  composer?.scrollIntoView({ behavior: "smooth", block: "center" });
  visualEditor?.focus({ preventScroll: true });
  notify("A saját bejegyzésed szerkesztése folyamatban van.");
}

const cancelPostEdit = $("#cancelPostEdit");
if (cancelPostEdit) cancelPostEdit.addEventListener("click", resetPostComposer);

if (postButton) {
  postButton.addEventListener("click", async () => {
    const body = postText ? postText.value.trim() : "";
    const selectedCategory = category ? category.value : "Gondolat";
    const limit = CATEGORY_LIMITS[selectedCategory] || 280;

    if (body.length > limit) {
      notify(`A ${selectedCategory.toLowerCase()} kategóriában maximum ${limit} karakter használható.`);
      return;
    }

    if (!body && !imageData) {
      notify("Írj valamit, vagy válassz egy képet.");
      return;
    }

    try {
      const editing = Boolean(editingPostId);
      const endpoint = editing ? `/api/posts/${encodeURIComponent(editingPostId)}` : "/api/posts";
      const method = editing ? "PUT" : "POST";
      const { post } = await api(endpoint, {
        method,
        body: JSON.stringify({
          body,
          post_title: postTitleInput ? postTitleInput.value.trim() : "",
          category: selectedCategory,
          anonymous: $("#anonymous") ? $("#anonymous").checked : false,
          image: imageData
        })
      });

      postCache.set(String(post.id), post);
      const feedList = $("#feedList");
      if (feedList) {
        const oldCard = feedList.querySelector(`[data-post-id="${CSS.escape(String(post.id))}"]`);
        if (oldCard) {
          oldCard.outerHTML = renderPost(post);
        } else {
          feedList.insertAdjacentHTML("afterbegin", renderPost(post));
        }
      }

      resetPostComposer();
      notify(editing ? "A bejegyzés módosításai elmentve." : "A bejegyzésed megjelent.");
      await loadOnline();
      await loadCommunityLatest();
    } catch (error) {
      notify(error.message || "A bejegyzés mentése nem sikerült.");
    }
  });
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
    quality = 0.86,
    cropAspect = null,
    outputWidth = null,
    outputHeight = null
  } = {}
) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Csak képfájl tölthető fel.");
  }

  if (file.type === "image/gif" && !cropAspect) {
    /* GIF-et csak akkor tartjuk meg, ha kicsi; a canvas elveszítené az animációt. */
    if (file.size > maxBytes) {
      throw new Error("A GIF túl nagy. PNG/JPG/WebP képet válassz.");
    }
    return await fileToDataUrl(file);
  }

  const source = await fileToDataUrl(file);
  const image = await loadImage(source);

  /*
   * Ha egy konkrét formátumot kérünk (avatar/borító), a felhasználónak
   * nem kell előre levágnia a képet. Középre igazítva automatikusan
   * kivágjuk a felesleges részeket, majd a kívánt méretre méretezzük.
   */
  let cropX = 0;
  let cropY = 0;
  let cropWidth = image.naturalWidth;
  let cropHeight = image.naturalHeight;

  if (cropAspect && Number.isFinite(cropAspect) && cropAspect > 0) {
    const sourceAspect = image.naturalWidth / image.naturalHeight;

    if (sourceAspect > cropAspect) {
      cropWidth = Math.max(1, Math.round(image.naturalHeight * cropAspect));
      cropX = Math.max(0, Math.round((image.naturalWidth - cropWidth) / 2));
    } else if (sourceAspect < cropAspect) {
      cropHeight = Math.max(1, Math.round(image.naturalWidth / cropAspect));
      cropY = Math.max(0, Math.round((image.naturalHeight - cropHeight) / 2));
    }
  }

  const targetW = outputWidth || maxWidth;
  const targetH = outputHeight || maxHeight;
  const scale = Math.min(
    1,
    targetW / cropWidth,
    targetH / cropHeight
  );

  let width = Math.max(1, Math.round(cropWidth * scale));
  let height = Math.max(1, Math.round(cropHeight * scale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false });

  async function encode() {
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      width,
      height
    );

    return canvas.toDataURL("image/jpeg", quality);
  }

  let data = await encode();

  /* Ha még mindig nagy, fokozatosan csökkentjük a felbontást/minőséget. */
  for (let i = 0; i < 8 && data.length * 0.75 > maxBytes; i++) {
    width = Math.max(160, Math.round(width * 0.84));
    height = Math.max(160, Math.round(height * 0.84));
    quality = Math.max(0.52, quality - 0.045);
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

function readImage(input, callback, options = {}) {
  const file = input?.files?.[0];
  if (!file) return;

  compressImageFile(file, options)
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
        },
        {
          maxBytes: 900 * 1024,
          maxWidth: 512,
          maxHeight: 512,
          cropAspect: 1,
          outputWidth: 512,
          outputHeight: 512,
          quality: 0.88
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
        },
        {
          maxBytes: 700 * 1024,
          maxWidth: 1600,
          maxHeight: 680,
          outputWidth: 1600,
          outputHeight: 680,
          cropAspect: 1600 / 680,
          quality: 0.84
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


function fontFamilyForName(font) {
  return ({
    sans: 'Manrope, Arial, sans-serif',
    serif: 'Georgia, "Times New Roman", serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    display: '"Playfair Display", Georgia, serif'
  })[font] || 'Manrope, Arial, sans-serif';
}

function modalNameFormatState(key, fallback = false) {
  const state = window.__everlightNameFormatState || {};
  return key in state ? Boolean(state[key]) : Boolean(fallback);
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
      "#ffffff";
    profileViewName.style.fontFamily = fontFamilyForName(user.nameFont || "sans");
    profileViewName.style.fontWeight = user.nameBold ? "800" : "400";
    profileViewName.style.fontStyle = user.nameItalic ? "italic" : "normal";
    profileViewName.style.textDecoration = [user.nameUnderline ? "underline" : "", user.nameStrike ? "line-through" : ""].filter(Boolean).join(" ") || "none";
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

  const profileViewStreak = $("#profileViewStreak");
  if (profileViewStreak) {
    const streak = Number(user.messageStreak || user.message_streak || 0);
    profileViewStreak.hidden = streak <= 0;
    profileViewStreak.textContent = streak > 0 ? `🔥${streak}` : "";
    profileViewStreak.title = streak > 0 ? `${streak} napos üzenet streak` : "";
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


async function loadProfileReactions(section = "liked") {
  const container = document.getElementById("profileReactionList");
  if (!container || !currentUser) return;
  container.hidden = false;
  container.innerHTML = `<p class="profile-reaction-loading">Betöltés…</p>`;
  try {
    const data = await api("/api/profile/reactions");
    const posts = section === "saved" ? (data.saved || []) : (data.liked || []);
    container.innerHTML = posts.length
      ? posts.map(renderPost).join("")
      : `<p class="profile-reaction-empty">${section === "saved" ? "Még nincs lementett tartalmad." : "Még nincs kedvelt tartalmad."}</p>`;
  } catch (error) {
    container.innerHTML = `<p class="profile-reaction-empty">${escapeHtml(error.message)}</p>`;
  }
}

async function loadProfileHistory() {
  const container = document.getElementById("profileHistoryList");
  if (!container || !currentUser) return;
  container.hidden = false;
  container.innerHTML = `<p class="profile-reaction-loading">Betöltés…</p>`;
  try {
    const data = await api("/api/profile/history");
    const posts = data.posts || [];
    container.innerHTML = posts.length
      ? posts.map(renderPost).join("")
      : `<p class="profile-reaction-empty">Még nincs saját bejegyzésed.</p>`;
  } catch (error) {
    container.innerHTML = `<p class="profile-reaction-empty">${escapeHtml(error.message)}</p>`;
  }
}

function activateProfileSection(section = "main") {
  activeProfileSection = section;
  document.querySelectorAll("[data-profile-reaction-tab]").forEach(node => {
    node.classList.toggle("active", node.dataset.profileReactionTab === section);
  });
  const main = document.querySelector(".profile-main-only");
  const reactions = document.getElementById("profileReactionList");
  const history = document.getElementById("profileHistoryList");
  if (main) main.hidden = section !== "main";
  if (reactions) reactions.hidden = !(section === "liked" || section === "saved");
  if (history) history.hidden = section !== "history";
  if (!currentUser) return;
  if (section === "liked" || section === "saved") loadProfileReactions(section);
  if (section === "history") loadProfileHistory();
}

document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-profile-reaction-tab]");
  if (!tab) return;
  event.preventDefault();
  event.stopPropagation();
  const section = tab.dataset.profileReactionTab || "main";
  if (!currentUser) {
    pendingAuthTarget = section;
    openProfileView();
    return;
  }
  activateProfileSection(section);
});

function openProtectedView(target = "profile") {
  pendingAuthTarget = target;
  if (target === "messages") {
    openMessages();
  } else {
    openProfileView();
    if (currentUser) activateProfileSection(target === "profile" ? "main" : target);
  }
}

function applyPendingAuthTarget() {
  const target = pendingAuthTarget;
  pendingAuthTarget = null;
  if (!target) return;
  if (target === "messages") {
    openMessages();
    return;
  }
  openProfileView();
  activateProfileSection(target === "profile" ? "main" : target);
}

/* =========================================================
   AUTH UI — STORED SESSION SHOULD NEVER SHOW LOGIN FIRST
   ========================================================= */
function syncAuthenticatedShell() {
  if (!token) return;

  document.body.classList.add("everlight-authenticated");

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
  closeMessages();
  mountProfileInFeed();
  window.__closeMobileCommunity?.();
  profileView.classList.add("open");
  profileView.setAttribute("aria-hidden", "false");
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
  activateProfileSection(activeProfileSection || "main");
}


/* =========================================================
   CLOSE PROFILE VIEW
   ========================================================= */

function closeProfileView(options = {}) {

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
  window.__syncDesktopNav?.("hub");
  restoreProfileHome();
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

function openProfileReactionSection(section) {
  pendingAuthTarget = section;
  openProfileView();
  if (currentUser) activateProfileSection(section);
}

const leftProfileNav = $("#leftProfileNav");
if (leftProfileNav) {
  leftProfileNav.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openProtectedView("profile");
  });
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

    openProfileView();

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

function setMobileDockActive(view) {
  const items = document.querySelectorAll("#mobileDock .mobile-dock-item");
  items.forEach((item) => {
    item.classList.remove("active");
    item.removeAttribute("aria-current");
  });

  const target = document.querySelector(`#mobileDock .mobile-dock-item[data-view="${view}"]`);
  if (target) {
    target.classList.add("active");
    target.setAttribute("aria-current", "page");
  }

  const menu = document.getElementById("mobileCommunityAlert");
  if (menu) {
    menu.classList.toggle("is-open", view === "menu");
    menu.setAttribute("aria-expanded", view === "menu" ? "true" : "false");
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
   MOBILE CHAT / PROFILE TOGGLE
   Keep these controls independent from the desktop rail.
   ========================================================= */

const mobileMessageNav = $("#mobileMessageNav");
if (mobileMessageNav) {
  mobileMessageNav.addEventListener("click", (event) => {
    event.preventDefault();
    const messagesView = $("#messagesView");
    const isOpen = messagesView?.classList.contains("open");

    if (isOpen) {
      closeMessages();
      setMobileDockActive("hub");
    } else {
      openMessages();
      setMobileDockActive("messages");
    }
  });
}

const mobileProfileNav = $("#mobileProfileNav");
if (mobileProfileNav) {
  mobileProfileNav.addEventListener("click", (event) => {
    event.preventDefault();
    const profileView = $("#profileView");
    const isOpen = profileView?.classList.contains("open");

    if (isOpen) {
      closeProfileView();
      setMobileDockActive("hub");
    } else {
      openProfileView();
      setMobileDockActive("profile");
    }
  });
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
          <p>Válassz egy beszélgetést, vagy indíts újat az ＋ Új gombbal.</p>
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
        ${Number(user.message_streak || 0) > 0
          ? `<span class="message-streak" title="Üzenet streak">🔥${escapeHtml(String(user.message_streak))}</span>`
          : ""}
      </button>
    `).join("");

    filterMessageContacts();

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


const messagesViewHome = (() => {
  const node = document.getElementById("messagesView");
  return node ? { parent: node.parentNode, next: node.nextSibling } : null;
})();

function isDesktopLayout() {
  return window.matchMedia("(min-width: 961px)").matches;
}

function mountMessagesInFeed() {
  const messagesView = document.getElementById("messagesView");
  const feed = document.getElementById("feed");
  if (!messagesView || !feed || !isDesktopLayout()) return;
  if (messagesView.parentElement !== feed) {
    feed.appendChild(messagesView);
  }
}

const profileViewHome = (() => {
  const node = document.getElementById("profileView");
  return node ? { parent: node.parentNode, next: node.nextSibling } : null;
})();
function mountProfileInFeed() {
  const view=document.getElementById("profileView"), feed=document.getElementById("feed");
  if (view && feed && isDesktopLayout() && view.parentElement !== feed) feed.appendChild(view);
}
function restoreProfileHome() {
  const view=document.getElementById("profileView");
  if (!view || !profileViewHome?.parent || view.parentElement===profileViewHome.parent) return;
  if (profileViewHome.next && profileViewHome.next.parentNode===profileViewHome.parent) profileViewHome.parent.insertBefore(view, profileViewHome.next);
  else profileViewHome.parent.appendChild(view);
}

function restoreMessagesHome() {
  const messagesView = document.getElementById("messagesView");
  if (!messagesView || !messagesViewHome?.parent) return;
  if (messagesView.parentElement === messagesViewHome.parent) return;
  if (messagesViewHome.next && messagesViewHome.next.parentNode === messagesViewHome.parent) {
    messagesViewHome.parent.insertBefore(messagesView, messagesViewHome.next);
  } else {
    messagesViewHome.parent.appendChild(messagesView);
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

  // Desktopon a chat a feed oszlopába kerül, mobilon marad teljes nézet.
  mountMessagesInFeed();

  window.__closeMobileCommunity?.();

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
  window.__syncDesktopNav?.("messages");

  const authGate = $("#messageAuthGate");
  const contacts = $(".message-contacts");
  const chat = $(".message-chat");
  const dmList = $("#dmList");
  const dmBody = $("#dmBody");
  const sendButton = $(".message-send-button");
  const composeNewButton = $("#composeNewButton");
  const isMobileMessages = window.matchMedia("(max-width: 660px)").matches;

  if (!currentUser) {
    // A Csevegés soha nem tartalmaz külön bejelentkezési űrlapot.
    // A teljes bejelentkezés kizárólag a Profil nézetben történik.
    if (authGate) {
      authGate.hidden = true;
      authGate.setAttribute("aria-hidden", "true");
    }
    if (contacts) contacts.hidden = true;
    if (chat) chat.hidden = false;
    messagesView.classList.add("chat-open");
    if (dmList) {
      dmList.innerHTML = `
        <div class="chat-login-required">
          <div class="chat-welcome-icon">✦</div>
          <strong>Bejelentkezés szükséges</strong>
          <p>Az üzenetek küldéséhez jelentkezz be a Profilban.</p>
          <div class="chat-demo-preview" aria-label="Tesztbeszélgetés előnézete">
            <div class="chat-demo-label">TESZT BESZÉLGETÉS</div>
            <div class="chat-demo-message">Szia! Így fog kinézni egy privát üzenetváltás.</div>
            <div class="chat-demo-message chat-demo-message-me">A teljes beszélgetéshez jelentkezz be.</div>
          </div>
        </div>`;
    }
    if (dmBody) {
      dmBody.value = "";
      dmBody.disabled = true;
      dmBody.placeholder = "Jelentkezz be a Profilban az üzenetküldéshez…";
    }
    if (sendButton) sendButton.disabled = true;
    if (composeNewButton) composeNewButton.disabled = true;
  } else {
    if (authGate) {
      authGate.hidden = true;
      authGate.setAttribute("aria-hidden", "true");
    }
    if (contacts) contacts.hidden = false;
    if (chat) chat.hidden = false;
    if (dmBody) {
      dmBody.disabled = false;
      dmBody.placeholder = "Írj egy üzenetet…";
    }
    if (sendButton) sendButton.disabled = false;
    if (composeNewButton) composeNewButton.disabled = false;
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
    document.getElementById("messagesView")?.classList.add("chat-open");
  } else if (window.matchMedia("(max-width: 660px)").matches) {
    // Mobilon a Csevegés maga a megnyitott panel; ne csússzon ki jobbra.
    document.getElementById("messagesView")?.classList.add("chat-open");
  } else {
    document.getElementById("messagesView")?.classList.remove("chat-open");
  }
}


/* =========================================================
   CLOSE MESSAGES VIEW
   ========================================================= */

function closeMessages(options = {}) {

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

  restoreMessagesHome();

  if (options.syncDock !== false) {
    setMobileDockActive("hub");
  }
  window.__syncDesktopNav?.("hub");
}


const closeMessagesViewButton = $("#closeMessagesView");
if (closeMessagesViewButton) {
  closeMessagesViewButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeMessages();
  });
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
   LEFT RAIL MESSAGE BUTTON
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
   CLOSE CHAT
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

    if (user) {
      user.message_streak = Number(data.streak || 0);
    }


    /* -----------------------------------------------------
       CHAT TITLE
       ----------------------------------------------------- */

    const dmTitle =
      $("#dmTitle");


    if (dmTitle) {
      const displayName =
        getDisplayName(user) ||
        getUsername(user) ||
        recipient;
      const streak = Number(data.streak || 0);
      dmTitle.innerHTML = `${escapeHtml(displayName)}${streak > 0
        ? ` <span class="chat-streak" title="Üzenet streak">🔥${escapeHtml(String(streak))}</span>`
        : ""}`;
    }

    const dmHandle = $("#dmHandle");
    if (dmHandle) {
      const username = getUsername(user) || recipient;
      dmHandle.textContent = username ? `@${username}` : "Privát beszélgetés";
    }
    const dmAvatar = $("#dmAvatar");
    if (dmAvatar) {
      dmAvatar.innerHTML = user?.avatar
        ? `<img src="${escapeHtml(user.avatar)}" alt="">`
        : escapeHtml(getInitial(user));
    }
    document.getElementById("messagesView")?.classList.add("chat-open");


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

      ${Number(user.message_streak || 0) > 0
        ? `<span class="message-streak" title="Üzenet streak">🔥${escapeHtml(String(user.message_streak))}</span>`
        : ""}

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

      document.getElementById("messagesView")?.classList.add("chat-open");
      document.getElementById("newMessageRecipientWrap")?.setAttribute("hidden", "");

      loadMessages();
    }
  );
}


/* =========================================================
   MOBILE / FRIENDLY CHAT CONTROLS
   ========================================================= */
const messagesViewElement = $("#messagesView");
const messageChatBack = $("#messageChatBack");
const newMessageButton = $("#newMessageButton");
const composeNewButton = $("#composeNewButton");
const cancelNewMessage = $("#cancelNewMessage");
const newMessageRecipientWrap = $("#newMessageRecipientWrap");
const messageSearch = $("#messageSearch");

async function loadMessageUserOptions() {
  if (!currentUser) return;
  const list = document.getElementById("messageUserOptions");
  if (!list) return;
  try {
    const data = await api("/api/message-users");
    list.innerHTML = (data.users || []).map((user) =>
      `<option value="${escapeHtml(user.username)}">${escapeHtml(getDisplayName(user))}</option>`
    ).join("");
  } catch (error) {
    console.warn("Címzettlista betöltése sikertelen:", error.message);
  }
}

function openNewMessageComposer() {
  messagesViewElement?.classList.add("chat-open");
  newMessageRecipientWrap?.removeAttribute("hidden");
  if (dmRecipient) {
    dmRecipient.value = "";
    dmRecipient.focus();
  }
  const dmList = $("#dmList");
  if (dmList) {
    dmList.innerHTML = `
      <div class="chat-welcome chat-welcome-new">
        <div class="chat-welcome-icon">＋</div>
        <strong>Új beszélgetés</strong>
        <p>Írd be a címzett <b>név#1234</b> azonosítóját, majd küldd el az első üzenetet.</p>
      </div>
    `;
  }
  const dmTitle = $("#dmTitle");
  const dmHandle = $("#dmHandle");
  if (dmTitle) dmTitle.textContent = "Új beszélgetés";
  if (dmHandle) dmHandle.textContent = "Címzett megadása szükséges";
}

function closeMobileChat() {
  messagesViewElement?.classList.remove("chat-open");
}

newMessageButton?.addEventListener("click", async () => {
  await loadMessageUserOptions();
  openNewMessageComposer();
});
composeNewButton?.addEventListener("click", async () => {
  await loadMessageUserOptions();
  openNewMessageComposer();
});
cancelNewMessage?.addEventListener("click", () => {
  newMessageRecipientWrap?.setAttribute("hidden", "");
  if (dmRecipient) dmRecipient.value = "";
  closeMobileChat();
});
messageChatBack?.addEventListener("click", closeMobileChat);

function filterMessageContacts() {
  const query = messageSearch?.value.trim().toLowerCase() || "";
  document.querySelectorAll(".message-contact").forEach((contact) => {
    const text = contact.textContent.toLowerCase();
    contact.hidden = Boolean(query && !text.includes(query));
  });
}

messageSearch?.addEventListener("input", filterMessageContacts);

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
   IN-APP NOTIFICATIONS
   ========================================================= */

let notificationPollTimer = null;
let lastNotificationIds = new Set();
let notificationsInitialized = false;

function formatNotificationTime(value) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString("hu-HU", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch { return ""; }
}

function renderNotificationTargets(notifications, unread) {
  document.querySelectorAll(".notification-list").forEach((list) => {
    if (!currentUser) {
      list.innerHTML = `<div class="notification-empty">Jelentkezz be a Profilban az értesítésekhez.</div>`;
      return;
    }
    if (!notifications.length) {
      list.innerHTML = `<div class="notification-empty">Nincsenek új értesítések.</div>`;
      return;
    }
    list.innerHTML = notifications.map((item) => {
      const avatar = item.actor_avatar
        ? `<img src="${escapeHtml(item.actor_avatar)}" alt="">`
        : escapeHtml((item.actor_name || item.actor_username || "?").charAt(0).toUpperCase());
      return `
        <button type="button" class="notification-item ${Number(item.is_read) ? "" : "unread"}"
          data-notification-target="${escapeHtml(item.target || "")}" data-notification-id="${escapeHtml(String(item.id))}">
          <span class="notification-avatar">${avatar}</span>
          <span class="notification-copy">
            <strong>${escapeHtml(item.title || "Értesítés")}</strong>
            <span>${escapeHtml(item.actor_name || item.actor_username || "Valaki")} · ${escapeHtml(item.body || "")}</span>
            <small class="notification-time">${escapeHtml(formatNotificationTime(item.created_at))}</small>
          </span>
        </button>`;
    }).join("");
  });
  document.querySelectorAll(".notification-unread-badge").forEach((badge) => {
    badge.textContent = String(unread || 0);
    badge.hidden = !(unread > 0);
  });
}

async function loadInAppNotifications({ markRead = false } = {}) {
  if (!currentUser) {
    renderNotificationTargets([], 0);
    return;
  }
  try {
    const data = await api("/api/notifications");
    const notifications = data.notifications || [];
    const fresh = notifications.filter((n) => !lastNotificationIds.has(String(n.id)) && !Number(n.is_read));
    if (notificationsInitialized && fresh.length && document.visibilityState !== "visible" && "Notification" in window && Notification.permission === "granted") {
      fresh.slice(0, 3).forEach((n) => {
        try { new Notification(n.title || "Everlight", { body: `${n.actor_name || n.actor_username || "Valaki"}: ${n.body || "Új üzenet"}` }); } catch {}
      });
    }
    lastNotificationIds = new Set(notifications.map((n) => String(n.id)));
    renderNotificationTargets(notifications, data.unread);
    notificationsInitialized = true;
    if (markRead && Number(data.unread || 0) > 0) {
      await api("/api/notifications/read", { method: "POST", body: JSON.stringify({}) });
      notifications.forEach((n) => { n.is_read = 1; });
      renderNotificationTargets(notifications, 0);
    }
  } catch (error) {
    console.warn("Értesítések betöltése sikertelen:", error.message);
  }
}

function startNotificationPolling() {
  if (notificationPollTimer) clearInterval(notificationPollTimer);
  loadInAppNotifications();
  notificationPollTimer = setInterval(() => loadInAppNotifications(), 5000);
}

function stopNotificationPolling() {
  if (notificationPollTimer) clearInterval(notificationPollTimer);
  notificationPollTimer = null;
  lastNotificationIds = new Set();
  notificationsInitialized = false;
}

document.addEventListener("click", async (event) => {
  const item = event.target.closest?.(".notification-item");
  if (!item) return;
  event.preventDefault();
  const target = item.dataset.notificationTarget || "";
  await loadInAppNotifications({ markRead: true });
  if (target.startsWith("/messages/")) {
    const recipient = decodeURIComponent(target.slice("/messages/".length));
    const input = document.getElementById("dmRecipient");
    if (input) input.value = recipient;
    openMessages();
    document.getElementById("messagesView")?.classList.add("chat-open");
    await loadMessages();
  }
});

window.addEventListener("everlight:auth", () => startNotificationPolling());

/* A jelenlegi app auth eseménytől függetlenül is elindítjuk, ha már be van jelentkezve. */
if (currentUser) startNotificationPolling();

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
   SESSION RESTORE
   ========================================================= */

async function restoreSession() {
  if (!token) {
    currentUser = null;
    return null;
  }

  syncAuthenticatedShell();

  try {
    const { user } = await api('/api/auth/me');
    if (!user) throw new Error('A felhasználó nem található.');

    setAccount(user);
    updateProfileView(user);
    return user;
  } catch (error) {
    localStorage.removeItem('everlight-token');
    token = '';
    currentUser = null;
    document.body.classList.remove('everlight-authenticated');
    profileImageData = '';
    coverImageData = '';
    showProfileLoginState();
    return null;
  }
}

/* =========================================================
   INITIAL LOAD
   ========================================================= */

(async () => {

  await restoreSession();

  /*
   * Fő tartalom betöltése.
   */

  await Promise.all([
    loadPosts(),
    loadOnline(),
    loadCommunityLatest(),
    loadStats()
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
      maxWidth: 512,
      maxHeight: 512,
      outputWidth: 512,
      outputHeight: 512,
      cropAspect: 1,
      quality: 0.88
    });

    callback(data);
  } catch (error) {
    notify(error.message || "A kép feldolgozása nem sikerült.");
  }
}


async function readCustomizerCoverImage(file, callback) {
  if (!file) return;

  try {
    const data = await compressImageFile(file, {
      // A borítókép automatikusan középre vágódik a profil által
      // használt széles formátumra. A felhasználónak nem kell
      // előre szerkesztenie vagy átméreteznie a képet.
      maxBytes: 700 * 1024,
      maxWidth: 1600,
      maxHeight: 680,
      outputWidth: 1600,
      outputHeight: 680,
      cropAspect: 1600 / 680,
      quality: 0.84
    });

    callback(data);
  } catch (error) {
    notify(error.message || "A borítókép feldolgozása nem sikerült.");
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
            Profil szerkesztése
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

            <div class="customizer-name-format-row">
              <label class="customizer-field customizer-name-font-field">
                <span>Név betűtípusa</span>
                <select id="customizerNameFont">
                  <option value="sans">Sans</option>
                  <option value="serif">Serif</option>
                  <option value="mono">Monospace</option>
                  <option value="display">Display</option>
                </select>
              </label>
              <div class="customizer-name-format-tools" role="group" aria-label="Név formázása">
                <span class="customizer-format-label">Formázás</span>
                <button type="button" class="customizer-format-toggle" data-name-format="bold" aria-pressed="false" title="Félkövér"><b>B</b></button>
                <button type="button" class="customizer-format-toggle" data-name-format="italic" aria-pressed="false" title="Dőlt"><i>I</i></button>
                <button type="button" class="customizer-format-toggle" data-name-format="underline" aria-pressed="false" title="Aláhúzás"><u>U</u></button>
                <button type="button" class="customizer-format-toggle" data-name-format="strike" aria-pressed="false" title="Áthúzás"><s>S</s></button>
              </div>
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
                  Bármilyen képet feltölthetsz. Automatikusan négyzetesre vágjuk. Maximum 1 MB.
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
                  Bármilyen képet feltölthetsz. Automatikusan a borító méretére vágjuk. Maximum 1 MB.
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
      currentUser?.nameColor || "#ffffff"
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

    const nameFont = customizerValue("customizerNameFont", currentUser?.nameFont || "sans");
    const nameBold = modalNameFormatState("bold", currentUser?.nameBold);
    const nameItalic = modalNameFormatState("italic", currentUser?.nameItalic);
    const nameUnderline = modalNameFormatState("underline", currentUser?.nameUnderline);
    const nameStrike = modalNameFormatState("strike", currentUser?.nameStrike);

    name.style.color = nameColor;
    name.style.fontFamily = fontFamilyForName(nameFont);
    name.style.fontWeight = nameBold ? "800" : "400";
    name.style.fontStyle = nameItalic ? "italic" : "normal";
    name.style.textDecoration = [nameUnderline ? "underline" : "", nameStrike ? "line-through" : ""].filter(Boolean).join(" ") || "none";
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
        currentUser?.nameColor || "#ffffff"
      ),

    customizerNameFont:
      customizerValue(
        "nameFont",
        currentUser?.nameFont || "sans"
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

  const nameFormatState = {
    bold: Boolean(currentUser?.nameBold),
    italic: Boolean(currentUser?.nameItalic),
    underline: Boolean(currentUser?.nameUnderline),
    strike: Boolean(currentUser?.nameStrike)
  };
  window.__everlightNameFormatState = nameFormatState;
  document.querySelectorAll("#profileCustomizer .customizer-format-toggle").forEach((button) => {
    const key = button.dataset.nameFormat;
    const active = Boolean(nameFormatState[key]);
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });


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

  profileImageData = currentUser?.avatar || "";
  coverImageData = currentUser?.cover || "";

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
}


function closeProfileCustomizer() {

  const modal =
    $("#profileCustomizer");

  if (!modal) {
    return;
  }

  profileImageData = currentUser?.avatar || "";
  coverImageData = currentUser?.cover || "";

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
      nameColor: customizerValue("customizerNameColor", currentUser?.nameColor || "#ffffff"),
      nameFont: customizerValue("customizerNameFont", currentUser?.nameFont || "sans"),
      nameBold: modalNameFormatState("bold", currentUser?.nameBold),
      nameItalic: modalNameFormatState("italic", currentUser?.nameItalic),
      nameUnderline: modalNameFormatState("underline", currentUser?.nameUnderline),
      nameStrike: modalNameFormatState("strike", currentUser?.nameStrike),
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
    currentUser = user;
    profileImageData = user.avatar || "";
    coverImageData = user.cover || "";
    updateProfileView(user);

    /* A mentés után a szerverről újra lekérjük a rekordot.
       Így nem maradhat csak kliensoldali állapotban egy módosítás. */
    const verified = await api("/api/auth/me");
    if (verified?.user) {
      setAccount(verified.user);
      currentUser = verified.user;
      updateProfileView(verified.user);
    }

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

        const file = event.target.files?.[0];
        if (!file) return;

        readCustomizerCoverImage(
          file,
          (data) => {

            coverImageData =
              data;

            const preview =
              $("#customizerCoverPreview");

            if (preview) {
              preview.style.backgroundImage =
                `url("${escapeHtml(data)}")`;
              preview.classList.add("has-cover-image");
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

      const formatButton = event.target.closest(".customizer-format-toggle");
      if (formatButton) {
        const key = formatButton.dataset.nameFormat;
        const state = window.__everlightNameFormatState || {};
        state[key] = !Boolean(state[key]);
        window.__everlightNameFormatState = state;
        formatButton.classList.toggle("is-active", state[key]);
        formatButton.setAttribute("aria-pressed", String(state[key]));
        updateCustomizerPreview();
        return;
      }

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


/* Legacy desktop navigation controller removed. See desktop-nav-controller.js. */

/* =========================================================
   DESKTOP RAIL — SINGLE DIRECT BUTTON CONTROLLER
   Uses the original buttons directly; no cloning, capture,
   stopImmediatePropagation or external controller is needed.
   ========================================================= */
(() => {
  const ids = [
    "desktopHubNav",
    "desktopMessageNav",
    "desktopProfileNav",
    "desktopLikedNav",
    "desktopSavedNav",
    "desktopHistoryNav",
    "desktopCategoryToggle"
  ];

  const setActive = (id) => {
    ids.forEach((key) => {
      const el = document.getElementById(key);
      if (!el) return;
      el.classList.toggle("active", key === id);
    });
    window.__activeDesktopRail = id;
  };

  const isOpen = (id) => !!document.getElementById(id)?.classList.contains("open");

  const closeViews = () => {
    if (isOpen("messagesView") && typeof closeMessages === "function") closeMessages();
    if (isOpen("profileView") && typeof closeProfileView === "function") closeProfileView();
  };

  const openMessagesDesktop = () => {
    if (typeof openMessages === "function") openMessages();
    setActive("desktopMessageNav");
  };

  const openProfileDesktop = (section = "main") => {
    if (typeof openProtectedView === "function") {
      openProtectedView(section === "main" ? "profile" : section);
    } else if (typeof openProfileView === "function") {
      openProfileView();
      if (typeof activateProfileSection === "function" && currentUser) {
        activateProfileSection(section);
      }
    }
    const map = {
      main: "desktopProfileNav",
      liked: "desktopLikedNav",
      saved: "desktopSavedNav",
      history: "desktopHistoryNav"
    };
    setActive(map[section] || "desktopProfileNav");
  };

  const bindButton = (id, handler) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.cleanRailBound === "1") return;
    el.dataset.cleanRailBound = "1";
    el.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handler(event);
    });
  };

  bindButton("desktopHubNav", () => {
    const alreadyHub = window.__activeDesktopRail === "desktopHubNav" &&
      !isOpen("messagesView") && !isOpen("profileView");
    if (alreadyHub) return;
    closeViews();
    const menu = document.getElementById("desktopCategoryMenu");
    const cat = document.getElementById("desktopCategoryToggle");
    if (menu) menu.hidden = true;
    cat?.setAttribute("aria-expanded", "false");
    if (typeof openHubView === "function") openHubView();
    setActive("desktopHubNav");
  });

  bindButton("desktopMessageNav", () => {
    const active = window.__activeDesktopRail === "desktopMessageNav";
    if (active && isOpen("messagesView")) {
      closeMessages();
      setActive("desktopHubNav");
      return;
    }
    closeViews();
    openMessagesDesktop();
  });

  bindButton("desktopProfileNav", () => {
    const active = window.__activeDesktopRail === "desktopProfileNav";
    if (active && isOpen("profileView") && (typeof activeProfileSection === "undefined" || activeProfileSection === "main")) {
      closeProfileView();
      setActive("desktopHubNav");
      return;
    }
    closeViews();
    openProfileDesktop("main");
  });

  bindButton("desktopLikedNav", () => {
    const active = window.__activeDesktopRail === "desktopLikedNav";
    if (active && isOpen("profileView") && activeProfileSection === "liked") {
      closeProfileView();
      setActive("desktopHubNav");
      return;
    }
    closeViews();
    openProfileDesktop("liked");
  });

  bindButton("desktopSavedNav", () => {
    const active = window.__activeDesktopRail === "desktopSavedNav";
    if (active && isOpen("profileView") && activeProfileSection === "saved") {
      closeProfileView();
      setActive("desktopHubNav");
      return;
    }
    closeViews();
    openProfileDesktop("saved");
  });

  bindButton("desktopHistoryNav", () => {
    const active = window.__activeDesktopRail === "desktopHistoryNav";
    if (active && isOpen("profileView") && activeProfileSection === "history") {
      closeProfileView();
      setActive("desktopHubNav");
      return;
    }
    closeViews();
    openProfileDesktop("history");
  });

  bindButton("desktopCategoryToggle", () => {
    const toggle = document.getElementById("desktopCategoryToggle");
    const menu = document.getElementById("desktopCategoryMenu");
    if (!toggle || !menu) return;
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    if (expanded) {
      toggle.setAttribute("aria-expanded", "false");
      menu.hidden = true;
      setActive("desktopHubNav");
      return;
    }
    closeViews();
    toggle.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    setActive("desktopCategoryToggle");
  });

  window.__syncDesktopNav = (view = "hub") => {
    const map = {
      hub: "desktopHubNav",
      messages: "desktopMessageNav",
      profile: "desktopProfileNav",
      "profile-liked": "desktopLikedNav",
      "profile-saved": "desktopSavedNav",
      "profile-history": "desktopHistoryNav",
      history: "desktopHistoryNav",
      category: "desktopCategoryToggle"
    };
    setActive(map[view] || "desktopHubNav");
  };

  setActive("desktopHubNav");
})();

/* =========================================================
   FINAL MOBILE COMMUNITY / NOTIFICATION SHEET
   The right-side community content is presented in the same
   floating sheet pattern as Csevegés and Profil.
   ========================================================= */
(function initMobileCommunitySheet(){
  const alertButton = document.getElementById("mobileCommunityAlert");
  const panel = document.getElementById("mobileCommunityPanel");
  const closeButton = document.getElementById("mobileCommunityClose");
  const panelBody = document.getElementById("mobileCommunityPanelBody");
  if (!alertButton || !panel || !panelBody) return;

  const source = document.querySelector(".right-rail");
  if (source && !panelBody.dataset.ready) {
    const clone = source.cloneNode(true);
    clone.classList.add("mobile-cloned-rail");
    panelBody.innerHTML = "";
    panelBody.appendChild(clone);
    panelBody.dataset.ready = "1";
  }

  const closeCommunity = () => {
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden", "true");
    alertButton.classList.remove("is-open");
    alertButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("mobile-community-open");
    setMobileDockActive("hub");
  };

  const openCommunity = () => {
    closeMessages();
    closeProfileView();
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden", "false");
    alertButton.classList.add("is-open");
    alertButton.setAttribute("aria-expanded", "true");
    document.body.classList.add("mobile-community-open");
    setMobileDockActive("menu");
  };

  window.__closeMobileCommunity = closeCommunity;

  alertButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (panel.classList.contains("is-open")) closeCommunity();
    else openCommunity();
  });

  closeButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeCommunity();
  });

  panel.addEventListener("click", (event) => {
    if (event.target === panel) closeCommunity();
  });

  document.addEventListener("click", (event) => {
    if (!panel.classList.contains("is-open")) return;
    if (panel.contains(event.target) || alertButton.contains(event.target)) return;
    if (event.target.closest?.(".mobile-dock-item")) return;
    closeCommunity();
  }, true);
})();

/* Mobile dock cleanup: primary handlers above own these buttons.
   Do not add secondary click handlers here; they can reset the active
   state immediately after a view is opened. */
