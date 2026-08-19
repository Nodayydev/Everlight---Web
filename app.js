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


function requireLogin() {

  if (currentUser) {
    return true;
  }

  openProfileView();

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
  const accountName = anonymous
    ? "Névtelen"
    : (post.username || post.display_name || "Felhasználó");
  const realName = anonymous
    ? ""
    : (post.display_name && post.display_name !== post.username ? post.display_name : "");
  const handle = anonymous ? "" : (post.username ? `@${post.username}` : "");
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

  const avatarMarkup = anonymous
    ? `<div class="feed-card-avatar feed-card-avatar-fallback" aria-hidden="true">✦</div>`
    : (post.avatar
      ? `<div class="feed-card-avatar"><img src="${escapeHtml(post.avatar)}" alt="" loading="lazy"></div>`
      : `<div class="feed-card-avatar" aria-hidden="true">${escapeHtml((displayName.charAt(0) || "?").toUpperCase())}</div>`);

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
              ${realName ? `<span class="feed-card-real-name">${escapeHtml(realName)}</span>` : ""}
              ${handle ? `<span class="feed-card-handle">${escapeHtml(handle)}</span>` : ""}
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
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a3 3 0 1 0-2.83-4A3 3 0 0 0 15 5c0 .34.06.67.17.97L8.83 9.25A3 3 0 1 0 9 12c0-.34-.06-.67-.17-.97l6.34-3.28c.51.44 1.16.7 1.83.7Zm0 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM6 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 7c-.7 0-1.34.24-1.85.65l-6.28-3.27c.1-.3.15-.62.15-.95s-.05-.65-.15-.95l6.28-3.27A3 3 0 1 0 15 5c0 .34.06.67.17.97L8.83 9.25A3 3 0 1 0 9 12c0-.34-.06-.67-.17-.97l6.34-3.28c.51.44 1.16.7 1.83.7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
    </article>
  `;
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
    event.target.closest("[data-post-share]")
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
  return { accountName, realName, handle, hashtags, date, avatar, title, body, url, text: `${title}${body ? ` — ${body}` : ""}` };
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
  const titleLines = wrapShareText(data.title, 30, 2);
  const bodyLines = wrapShareText(data.body, 40, 9);
  const avatarMarkup = avatarData
    ? `<defs><clipPath id="avatarClip"><circle cx="108" cy="170" r="48"/></clipPath></defs><image href="${escapeXml(avatarData)}" x="60" y="122" width="96" height="96" preserveAspectRatio="xMidYMid slice" clip-path="url(#avatarClip)"/>`
    : `<circle cx="108" cy="170" r="48" fill="#18272b"/><text x="108" y="180" text-anchor="middle" fill="#9fc4e7" font-size="34" font-family="Arial">✦</text>`;
  const titleSvg = titleLines.map((line, i) => `<text x="90" y="330" dy="${i * 54}" fill="#f1f4f5" font-size="44" font-weight="800" font-family="Arial">${escapeXml(line)}</text>`).join("");
  const bodySvg = bodyLines.map((line, i) => `<text x="90" y="485" dy="${i * 42}" fill="#c4cdd0" font-size="28" font-family="Arial">${escapeXml(line)}</text>`).join("");
  const meta = [data.realName, data.handle, data.hashtags].filter(Boolean).join("  ");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <rect width="1080" height="1920" fill="#000000"/>
    <rect x="42" y="42" width="996" height="1836" rx="42" fill="#080b0d" stroke="#253238" stroke-width="3"/>
    <rect x="42" y="42" width="996" height="250" rx="42" fill="#11191d"/>
    <rect x="42" y="250" width="996" height="42" fill="#11191d"/>
    ${avatarMarkup}
    <text x="190" y="155" fill="#eef2f4" font-size="34" font-weight="800" font-family="Arial">${escapeXml(data.accountName)}</text>
    <text x="190" y="205" fill="#8b989e" font-size="25" font-family="Arial">${escapeXml(meta)}</text>
    <text x="965" y="205" text-anchor="end" fill="#7e8a90" font-size="23" font-family="Arial">${escapeXml(data.date)}</text>
    <line x1="90" y1="292" x2="990" y2="292" stroke="#263238" stroke-width="2"/>
    ${titleSvg}
    ${bodySvg}
    <text x="90" y="1755" fill="#88b6dc" font-size="23" font-family="Arial">Everlight</text>
    <text x="990" y="1755" text-anchor="end" fill="#69767c" font-size="21" font-family="Arial">${escapeXml(data.url)}</text>
  </svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const pngBlob = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1080; canvas.height = 1920;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
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

document.addEventListener("click", async (event) => {
  const toggle = event.target.closest("[data-post-share-toggle]");
  if (toggle) {
    event.preventDefault();
    event.stopPropagation();
    const card = toggle.closest(".feed-card");
    if (!card) return;

    // Mobile follows the native X/iOS sharing interaction: one tap on the
    // share icon immediately opens the system share sheet. There is no
    // intermediate menu to fight with the fixed mobile layout.
    if (window.matchMedia?.("(max-width: 760px)").matches) {
      await sharePostToNetwork("native", getPostShareData(card));
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
    notify("A kedveléshez vagy mentéshez jelentkezz be.");
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

                return `
                  <div class="everlight-online-user">
                    <span class="everlight-online-avatar">
                      ${avatarHtml}
                      <i aria-hidden="true"></i>
                    </span>
                    <span class="everlight-online-name">${escapeHtml(displayName)}</span>
                  </div>
                `;
              })
              .join("")

          : `
            <span class="loading-copy">
              Jelenleg nincs aktív felhasználó ezen az oldalon.
            </span>
          `;
    }

  } catch {

    const onlineFaces =
      $("#onlineFaces");

    if (onlineFaces) {

      onlineFaces.innerHTML = `
        <span class="loading-copy">
          Az aktív felhasználók jelenleg nem érhetők el.
        </span>
      `;
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

document.addEventListener("click", (event) => {
  const tab = event.target.closest("[data-profile-reaction-tab]");
  if (!tab) return;
  if (!currentUser) {
    showProfileLoginState();
    notify("A kedvelések és mentések megtekintéséhez jelentkezz be.");
    return;
  }
  document.querySelectorAll("[data-profile-reaction-tab]").forEach(node => node.classList.toggle("active", node === tab));
  const section = tab.dataset.profileReactionTab;
  document.querySelectorAll(".profile-main-only").forEach(node => node.hidden = section !== "main");
  const reactionList = document.getElementById("profileReactionList");
  if (reactionList) reactionList.hidden = section === "main";
  if (section !== "main") loadProfileReactions(section);
});

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
  document.querySelectorAll("[data-profile-reaction-tab]").forEach(node => node.classList.toggle("active", node.dataset.profileReactionTab === "main"));
  const main = document.querySelector(".profile-main-only");
  const reactions = document.getElementById("profileReactionList");
  if (main) main.hidden = false;
  if (reactions) reactions.hidden = true;
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
  openProfileView();
  requestAnimationFrame(() => {
    const tab = document.querySelector(`[data-profile-reaction-tab="${section}"]`);
    if (tab) tab.click();
  });
}

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


const desktopLikedNav = $("#desktopLikedNav");
if (desktopLikedNav) {
  desktopLikedNav.addEventListener("click", (event) => {
    event.preventDefault();
    openProfileReactionSection("liked");
  });
}

const desktopSavedNav = $("#desktopSavedNav");
if (desktopSavedNav) {
  desktopSavedNav.addEventListener("click", (event) => {
    event.preventDefault();
    openProfileReactionSection("saved");
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
        ${Number(user.message_streak || 0) > 0
          ? `<span class="message-streak" title="Üzenet streak">🔥${escapeHtml(String(user.message_streak))}</span>`
          : ""}
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

/* Mobile island position is controlled only by CSS.
   Do not calculate its bottom offset from a footer/AI element. */

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
