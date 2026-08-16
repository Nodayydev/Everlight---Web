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

/*
 * Teljes azonosító:
 *
 * Nodayy#0614
 *
 * Ezt használjuk olyan helyeken, ahol
 * a tényleges felhasználói azonosító kell.
 */

function getUsername(user) {
  return (
    user?.username ||
    ""
  );
}


/*
 * Megjelenítési név:
 *
 * Nodayy
 *
 * Ezt csak ott használjuk, ahol valóban
 * külön megjelenítési név szükséges.
 */

function getDisplayName(user) {
  if (
    user?.displayName &&
    user.displayName.trim()
  ) {
    return user.displayName.trim();
  }

  const username =
    getUsername(user);

  if (username.includes("#")) {
    return username.split("#")[0];
  }

  return username || "?";
}


/*
 * Profilhoz tartozó kezdőbetű.
 */

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

  if (
    user &&
    user.avatar
  ) {
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
   * A szerver által visszaadott teljes user objektumot
   * változtatás nélkül megtartjuk.
   */

  currentUser = {
    ...user
  };


  /* -----------------------------------------------
     Persistent profile image state
     ----------------------------------------------- */

  profileImageData =
    user.avatar || "";

  coverImageData =
    user.cover || "";


  /* -----------------------------------------------
     Names
     ----------------------------------------------- */

  const username =
    getUsername(user);

  const displayName =
    getDisplayName(user);


  /*
   * FONTOS:
   *
   * username = Nodayy#0614
   *
   * displayName = Nodayy
   *
   * A kettőt nem írjuk felül egymással.
   */


  /* -----------------------------------------------
     Left profile avatar
     ----------------------------------------------- */

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


  /* -----------------------------------------------
     Profile summary
     ----------------------------------------------- */

  const profileSummary =
    $("#profileSummary");

  if (profileSummary) {

    /*
     * Itt a TELJES username jelenik meg:
     *
     * Nodayy#0614
     */

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
     Profile fields
     ----------------------------------------------- */

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

      if (!element) {
        return;
      }

      element.value =
        value ?? "";
    }
  );


  /* -----------------------------------------------
     Profile image preview
     ----------------------------------------------- */

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


  /* -----------------------------------------------
     Cover preview
     ----------------------------------------------- */

  const coverPreview =
    $("#coverPreview");

  if (coverPreview) {

    if (user.cover) {

      coverPreview.style.backgroundImage =
        `url("${user.cover}")`;

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
    accountMenu.classList.add(
      "open"
    );

    accountMenu.setAttribute(
      "aria-hidden",
      "false"
    );
  }

  if (accountButton) {
    accountButton.classList.add(
      "active"
    );
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

  return (
    CATEGORY_LIMITS[
      category.value
    ] || 280
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
   UPDATE CATEGORY LIMIT
   ========================================================= */

function updateCategoryLimit() {

  const postText =
    $("#postText");

  if (!postText) {
    return;
  }

  const limit =
    getCurrentCategoryLimit();


  /*
   * A HTML maxlength is dinamikus.
   */

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
   * A posztban:
   *
   * fő név = displayName
   * azonosító = @username
   *
   * Így:
   *
   * Nodayy
   * @nodayy#0614
   */

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
   ACCOUNT BUTTON
   ========================================================= */

const accountButton =
  $("#accountButton");

if (accountButton) {

  accountButton.addEventListener(
    "click",
    (event) => {

      event.stopPropagation();

      const accountMenu =
        $("#accountMenu");

      if (!accountMenu) {
        return;
      }


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
      event.target.closest(
        ".account-wrap"
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


    if (accountButton) {

      accountButton.classList.remove(
        "active"
      );
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

        const loginName =
          $("#loginName");

        const emailInput =
          $("#loginEmail");

        const passwordInput =
          $("#loginPassword");


        /*
         * A HTML-edben a password input jelenleg
         * nincs ID-val ellátva, ezért fallbackként
         * a formon belüli password mezőt is keressük.
         */

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
                      ? loginName.value
                      : "",

                  email:
                    emailInput
                      ? emailInput.value
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


        /*
         * A teljes user objektumot
         * használjuk.
         */

        setAccount(
          data.user
        );


        /*
         * Bejelentkezés után a jelszómezőt
         * kiürítjük.
         */

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

          /*
           * Fontos:
           * csak akkor változtatjuk meg,
           * ha ténylegesen új képet választott.
           */

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

        /*
         * Megőrizzük a jelenlegi képeket.
         *
         * Ha nincs új kép kiválasztva,
         * akkor a jelenlegi profileImageData /
         * coverImageData marad.
         */

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

                  /*
                   * Ez csak displayName.
                   *
                   * A username-t SOHA nem küldjük
                   * módosítandó mezőként.
                   */

                  displayName:
                    displayNameInput
                      ? displayNameInput.value
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


        /*
         * A szerver által visszaadott user
         * az új aktuális állapot.
         */

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

  if (!messages) {
    return;
  }


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

  if (!messages) {
    return;
  }


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

      /*
       * Az üzenet fejlécében a teljes
       * azonosítót használjuk.
       */

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
           * A service worker nem kötelező.
           */
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
   INITIAL CATEGORY LIMIT
   ========================================================= */

updateCategoryLimit();


/* =========================================================
   INITIAL LOAD
   ========================================================= */

(async () => {

  /*
   * Elsőként mindig a szervertől kérjük le
   * a tényleges felhasználót.
   *
   * Ez biztosítja, hogy F5 után is:
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


      setAccount(
        user
      );

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


  /*
   * Online lista frissítése.
   *
   * Üzeneteket csak akkor kérünk le,
   * ha már van megadott címzett.
   */

  setInterval(
    async () => {

      await loadOnline();

      if (
        currentUser &&
        $("#dmRecipient")?.value.trim()
      ) {

        await loadMessages();
      }

    },
    30000
  );

})();
