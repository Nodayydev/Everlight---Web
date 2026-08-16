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

  node.textContent = text;

  return node.innerHTML;
}


/* =========================================================
   API
   ========================================================= */

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,

    headers: {
      "Content-Type": "application/json",

      ...(token
        ? {
            Authorization: `Bearer ${token}`
          }
        : {}),

      ...(options.headers || {})
    }
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

  if (user.avatar) {
    return `
      <div class="avatar aurora profile-custom-image">
        <img
          src="${escapeHtml(user.avatar)}"
          alt="Profilkép"
        >
      </div>
    `;
  }

  const name =
    user.displayName ||
    user.username ||
    "?";

  return `
    <div class="avatar aurora">
      ${escapeHtml(
        name.charAt(0).toUpperCase()
      )}
    </div>
  `;
}


/* =========================================================
   SET ACCOUNT
   ========================================================= */

function setAccount(user) {

  if (!user) return;

  currentUser = user;

  const displayNameOrUsername =
    user.displayName ||
    user.username ||
    "?";


  /* -----------------------------------------------
     Left profile avatar
     ----------------------------------------------- */

  const profileAvatar = $("#profileAvatar");

  if (profileAvatar) {

    profileAvatar.textContent =
      displayNameOrUsername
        .charAt(0)
        .toUpperCase();

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
    }
  }


  /* -----------------------------------------------
     Profile summary
     ----------------------------------------------- */

  const profileSummary =
    $("#profileSummary");

  if (profileSummary) {

    profileSummary.innerHTML = `
      <strong
        style="color:${escapeHtml(
          user.nameColor || "#67e7dd"
        )}"
      >
        ${escapeHtml(displayNameOrUsername)}
      </strong>

      <br />

      ${escapeHtml(
        user.bio ||
        user.status ||
        "Elérhető"
      )}
    `;
  }


  /* -----------------------------------------------
     Activity
     ----------------------------------------------- */

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


  /* -----------------------------------------------
     Profile settings
     ----------------------------------------------- */

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


  /* -----------------------------------------------
     Fill profile fields
     ----------------------------------------------- */

  const fields = {
    displayName: user.displayName || "",
    profileBio: user.bio || "",
    pronouns: user.pronouns || "",
    profileLocation: user.location || "",
    profileWebsite: user.website || "",
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
        element.value = value;
      }

    }
  );


  /* -----------------------------------------------
     Images
     ----------------------------------------------- */

  profileImageData =
    user.avatar || "";

  coverImageData =
    user.cover || "";


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

      profileImagePreview.textContent = "?";

    }
  }


  const coverPreview =
    $("#coverPreview");

  if (coverPreview) {

    coverPreview.style.backgroundImage =
      user.cover
        ? `url("${user.cover}")`
        : "";
  }
}


/* =========================================================
   LOGIN REQUIRED
   ========================================================= */

function requireLogin() {

  if (currentUser) {
    return true;
  }

  const accountMenu =
    $("#accountMenu");

  const accountButton =
    $("#accountButton");

  if (accountMenu) {
    accountMenu.classList.add("open");
  }

  if (accountButton) {
    accountButton.classList.add("active");
  }

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

  const value =
    category.value;

  return (
    CATEGORY_LIMITS[value] ||
    280
  );
}


/* =========================================================
   UPDATE CHARACTER COUNTER
   ========================================================= */

function updateCharacterCounter() {

  const postText =
    $("#postText");

  const counter =
    $("#counter");

  if (!postText || !counter) {
    return;
  }

  const limit =
    getCurrentCategoryLimit();

  const currentLength =
    postText.value.length;

  counter.textContent =
    `${currentLength} / ${limit}`;


  /* -----------------------------------------------
     Visual warning
     ----------------------------------------------- */

  if (currentLength >= limit) {

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
   UPDATE CATEGORY LIMIT
   ========================================================= */

function updateCategoryLimit() {

  const postText =
    $("#postText");

  if (!postText) return;

  const limit =
    getCurrentCategoryLimit();


  /* Browser maxlength */

  postText.maxLength =
    limit;


  /* If current text is too long,
     trim it to the new category limit. */

  if (postText.value.length > limit) {

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


  const user = {

    username:
      post.username,

    displayName:
      post.display_name ||
      post.username.split("#")[0],

    avatar:
      post.avatar || ""
  };


  const category =
    post.category ||
    "Gondolat";


  return `
    <article class="post">

      <div class="post-top">

        <div class="identity">

          ${avatar(
            user,
            anonymous
          )}

          <div>

            <strong>
              ${
                anonymous
                  ? "Névtelen"
                  : escapeHtml(
                      user.displayName
                    )
              }
            </strong>

            <span>
              ${
                anonymous
                  ? "@anonymous"
                  : "@" +
                    escapeHtml(
                      user.username
                    )
              }
            </span>

          </div>

        </div>


        <time>
          ${date}
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
      await api(
        "/api/posts"
      );


    const feedList =
      $("#feedList");

    if (!feedList) return;


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

    if (!feedList) return;

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
                  ...user,

                  displayName:
                    user.display_name ||
                    user.username
                      .split("#")[0]
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
   ACCOUNT BUTTON
   ========================================================= */

const accountButton =
  $("#accountButton");

if (accountButton) {

  accountButton.addEventListener(
    "click",
    () => {

      const accountMenu =
        $("#accountMenu");

      if (!accountMenu) return;


      const open =
        accountMenu.classList.toggle(
          "open"
        );


      accountButton.classList.toggle(
        "active",
        open
      );


      accountMenu.setAttribute(
        "aria-hidden",
        String(!open)
      );
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
      !event.target.closest(
        ".account-wrap"
      )
    ) {

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
    }
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

        const emailInput =
          $("#loginEmail");

        const passwordInput =
          $("#loginPassword");


        const data =
          await api(
            "/api/auth/enter",
            {
              method: "POST",

              body: JSON.stringify({

                username:
                  $("#loginName").value,

                email:
                  emailInput
                    ? emailInput.value
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

      if (!file) return;


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
              src="${imageData}"
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


        /* -----------------------------------------
           Reset composer
           ----------------------------------------- */

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


        /* -----------------------------------------
           Post count
           ----------------------------------------- */

        const postCount =
          $("#postCount");

        if (postCount) {

          postCount.textContent =
            Number(
              postCount.textContent || 0
            ) + 1;
        }


        notify(
          "A bejegyzésed megjelent az áramlásban."
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

  if (!file) return;


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
                src="${data}"
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

        const { user } =
          await api(
            "/api/profile",
            {
              method: "PUT",

              body:
                JSON.stringify({

                  displayName:
                    $("#displayName")
                      .value,

                  bio:
                    $("#profileBio")
                      .value,

                  avatar:
                    profileImageData,

                  cover:
                    coverImageData,

                  nameColor:
                    $("#nameColor")
                      .value,

                  profileColor:
                    $("#profileColor")
                      .value,

                  status:
                    $("#profileStatus")
                      .value,

                  pronouns:
                    $("#pronouns")
                      .value,

                  location:
                    $("#profileLocation")
                      .value,

                  website:
                    $("#profileWebsite")
                      .value
                })
            }
          );


        setAccount(user);


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
   OPEN MESSAGES
   ========================================================= */

function openMessages() {

  if (!requireLogin()) {
    return;
  }


  const messages =
    $("#messages");

  if (!messages) return;


  messages.classList.add(
    "open"
  );

  messages.setAttribute(
    "aria-hidden",
    "false"
  );
}


/* =========================================================
   CLOSE MESSAGES
   ========================================================= */

function closeMessages() {

  const messages =
    $("#messages");

  if (!messages) return;


  messages.classList.remove(
    "open"
  );

  messages.setAttribute(
    "aria-hidden",
    "true"
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

      openMessages();
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

      openMessages();
    }
  );
}


/* =========================================================
   HEADER MESSAGE BUTTON
   ========================================================= */

const messagesHeaderButton =
  $("#messagesHeaderButton");

if (messagesHeaderButton) {

  messagesHeaderButton.addEventListener(
    "click",
    () => {

      openMessages();
    }
  );
}


/* =========================================================
   CLOSE MESSAGE WINDOW
   ========================================================= */

const closeMessagesButton =
  $("#closeMessages");

if (closeMessagesButton) {

  closeMessagesButton.addEventListener(
    "click",
    closeMessages
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

  if (!recipientInput || !dmList) {
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
        user.displayName ||
        user.username ||
        "Ismeretlen";
    }


    if (!data.messages.length) {

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
                    message.sender_username
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
          /* Service worker nem kötelező */
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

  if (!clock) return;


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
   INITIALIZE CATEGORY LIMIT
   ========================================================= */

updateCategoryLimit();


/* =========================================================
   INITIAL LOAD
   ========================================================= */

(async () => {

  if (token) {

    try {

      const { user } =
        await api(
          "/api/auth/me"
        );


      setAccount(user);

    } catch {

      localStorage.removeItem(
        "everlight-token"
      );

      token = "";

      currentUser = null;
    }
  }


  await Promise.all([
    loadPosts(),
    loadOnline()
  ]);


  /* -----------------------------------------------
     Background refresh
     ----------------------------------------------- */

  setInterval(
    async () => {

      await loadOnline();

      if (currentUser) {
        await loadMessages();
      }

    },
    30000
  );

})();
