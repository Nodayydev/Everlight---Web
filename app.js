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

  currentUser = {
    ...user
  };

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
     LOGGED-IN ACCOUNT STATE
     ------------------------------------------------------- */

  document
    .querySelectorAll(".login-only")
    .forEach((element) => {
      element.hidden = true;
    });

  const profileSettings =
    $("#profileSettings");

  if (profileSettings) {
    profileSettings.hidden = true;
  }

  const accountMenu =
    $("#accountMenu");

  if (accountMenu) {
    accountMenu.classList.add("logged-in");
    accountMenu.classList.remove("open");
    accountMenu.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  ensureProfileSettingsLocation();


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
   PROFILE VIEW
   ========================================================= */

/*
 * A teljes updateProfileView implementáció lejjebb található.
 */


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

  document.body.classList.remove(
    "profile-editor-open"
  );
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
   PROFILE SETTINGS LOCATION
   ========================================================= */

function ensureProfileSettingsLocation() {

  const profileSettings =
    $("#profileSettings");

  const profileViewContent =
    document.querySelector(
      ".profile-view-content"
    );

  if (
    !profileSettings ||
    !profileViewContent
  ) {
    return;
  }

  /*
   * A profil szerkesztő fizikailag is a teljes
   * profilnézetbe kerül, így nem jelenik meg
   * a jobb felső Fiók lenyíló ablakában.
   */

  if (
    profileSettings.parentElement !==
    profileViewContent
  ) {
    profileViewContent.appendChild(
      profileSettings
    );
  }

  profileSettings.hidden = true;

  profileSettings.classList.add(
    "profile-settings-inline"
  );
}


/* =========================================================
   OPEN PROFILE VIEW
   ========================================================= */

function openProfileView() {

  if (!requireLogin()) {
    return;
  }


  const profileView =
    $("#profileView");

  if (!profileView) {
    return;
  }


  /*
   * Mindig a legfrissebb adatokat mutatjuk.
   */

  closeMessages();
  closeAccountMenu();

  updateProfileView(
    currentUser
  );


  profileView.classList.add(
    "open"
  );

  profileView.setAttribute(
    "aria-hidden",
    "false"
  );


  /*
   * Desktopon és mobilon is
   * bezárjuk az account lenyílót.
   */

  closeAccountMenu();


  /*
   * Mobil dock állapot.
   */

  currentView = "profile";

  setMobileDockActive(
    "profile"
  );


  document.body.classList.add(
    "profile-view-open"
  );
}


/* =========================================================
   CLOSE PROFILE VIEW
   ========================================================= */

function closeProfileView(
  updateDock = true
) {

  const profileView =
    $("#profileView");

  if (!profileView) {
    return;
  }


  profileView.classList.remove(
    "open"
  );

  profileView.classList.remove(
    "profile-editing"
  );

  profileView.setAttribute(
    "aria-hidden",
    "true"
  );

  const profileSettings =
    $("#profileSettings");

  if (profileSettings) {
    profileSettings.hidden = true;
  }


  document.body.classList.remove(
    "profile-view-open"
  );


  if (updateDock) {
    syncNavigationState();
  }

  syncViewScrollLock();
}


/* =========================================================
   PROFILE SETTINGS FROM FULLSCREEN PROFILE
   ========================================================= */

function openProfileEditor() {

  if (!requireLogin()) {
    return;
  }

  const profileSettings =
    $("#profileSettings");

  const profileViewContent =
    document.querySelector(
      ".profile-view-content"
    );

  const profileView =
    $("#profileView");

  if (
    !profileSettings ||
    !profileViewContent ||
    !profileView
  ) {
    notify(
      "A profil szerkesztő nem érhető el."
    );
    return;
  }

  /*
   * A szerkesztés ugyanabban a teljes profilnézetben
   * történik. Nincs account dropdown, nincs visszadobás
   * a Hubra.
   */

  ensureProfileSettingsLocation();

  closeMessages();
  closeAccountMenu();

  updateProfileView(
    currentUser
  );

  profileView.classList.add(
    "open"
  );

  profileView.setAttribute(
    "aria-hidden",
    "false"
  );

  profileView.classList.add(
    "profile-editing"
  );

  profileSettings.hidden = false;

  document.body.classList.add(
    "profile-view-open"
  );

  currentView = "profile";

  setMobileDockActive(
    "profile"
  );

  syncViewScrollLock();

  requestAnimationFrame(() => {

    const top =
      Math.max(
        0,
        profileSettings.offsetTop - 24
      );

    if (
      typeof profileView.scrollTo ===
      "function"
    ) {
      profileView.scrollTo({
        top,
        behavior: "smooth"
      });
    }

  });
}


const openProfileSettings =
  $("#openProfileSettings");

if (openProfileSettings) {

  openProfileSettings.addEventListener(
    "click",
    (event) => {

      event.preventDefault();
      event.stopPropagation();

      openProfileEditor();
    }
  );
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

function handleAccountNavigation(
  event
) {

  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (!currentUser) {
    openAccountMenu();
    return;
  }

  openProfileView();
}


if (accountButton) {

  accountButton.addEventListener(
    "click",
    handleAccountNavigation
  );
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
   NAVIGATION STATE
   ========================================================= */

function syncNavigationState() {

  const messagesOpen =
    $("#messagesView")?.classList.contains(
      "open"
    );

  const profileOpen =
    $("#profileView")?.classList.contains(
      "open"
    );

  if (messagesOpen) {
    currentView = "messages";

    setMobileDockActive(
      "messages"
    );

    return;
  }

  if (profileOpen) {
    currentView = "profile";

    setMobileDockActive(
      "profile"
    );

    return;
  }

  currentView = "hub";

  setMobileDockActive(
    "hub"
  );
}


/* =========================================================
   HUB VIEW
   ========================================================= */

function openHubView() {

  closeMessages(false);
  closeProfileView(false);
  closeAccountMenu();

  currentView = "hub";

  setMobileDockActive(
    "hub"
  );

  syncViewScrollLock();


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
   MOBILE PROFILE
   ========================================================= */

const mobileProfileNav =
  $("#mobileProfileNav");

if (mobileProfileNav) {

  mobileProfileNav.addEventListener(
    "click",
    (event) => {

      event.preventDefault();

      openProfileView();
    }
  );
}
/* =========================================================
   MESSAGES / CHAT
   ========================================================= */


/* =========================================================
   OPEN MESSAGES VIEW
   ========================================================= */

function openMessages() {

  if (!requireLogin()) {
    return;
  }


  const messagesView =
    $("#messagesView");

  if (!messagesView) {
    return;
  }


  /*
   * Profilnézet bezárása,
   * hogy egyszerre csak egy teljes nézet legyen nyitva.
   */

  closeProfileView(false);
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


  currentView = "messages";

  setMobileDockActive(
    "messages"
  );

  syncViewScrollLock();


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

function closeMessages(
  updateDock = true
) {

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


  if (updateDock) {
    syncNavigationState();
  }

  syncViewScrollLock();
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
   MOBILE MESSAGE BUTTON
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
  syncViewScrollLock();
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

  document.body.classList.toggle(
    "profile-editor-open",
    Boolean(
      $("#accountMenu")?.classList.contains(
        "open"
      ) &&
      $("#profileSettings") &&
      !$("#profileSettings").hidden
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
   INITIAL PROFILE SETTINGS LOCATION
   ========================================================= */

ensureProfileSettingsLocation();


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

      document
        .querySelectorAll(".login-only")
        .forEach((element) => {
          element.hidden = false;
        });

      const profileSettings =
        $("#profileSettings");

      if (profileSettings) {
        profileSettings.hidden = true;
      }

      profileImageData = "";

      coverImageData = "";
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
   FINAL NAVIGATION SAFETY OVERRIDES
   ========================================================= */

/*
 * Ez a végső delegated handler akkor is helyesen működik,
 * ha a korábbi verzióból egy régi click handler még betöltődött.
 */

document.addEventListener(
  "click",
  (event) => {

    const editButton =
      event.target.closest(
        "#openProfileSettings"
      );

    if (!editButton) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!currentUser) {
      requireLogin();
      return;
    }

    openProfileEditor();
  },
  true
);


/*
 * Bejelentkezett állapotban a Fiók soha ne nyissa
 * meg a régi lenyíló panelt.
 */

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "#accountButton"
      );

    if (!button || !currentUser) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    closeAccountMenu();
    openProfileView();
  },
  true
);


/*
 * Mobil Fiók gomb: közvetlenül a teljes profilnézet.
 */

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "#mobileProfileNav"
      );

    if (!button) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (!currentUser) {
      requireLogin();
      return;
    }

    closeMessages();
    closeAccountMenu();
    openProfileView();
  },
  true
);


/*
 * Minden bejelentkezett állapotban a login blokk
 * legyen ténylegesen láthatatlan.
 */

function enforceLoggedInAccountUI() {

  if (!currentUser) {
    return;
  }

  document
    .querySelectorAll(".login-only")
    .forEach((element) => {
      element.hidden = true;
      element.style.display = "none";
    });

  const accountMenu =
    $("#accountMenu");

  if (accountMenu) {
    accountMenu.classList.remove("open");
    accountMenu.setAttribute(
      "aria-hidden",
      "true"
    );
  }

  ensureProfileSettingsLocation();
}


window.addEventListener(
  "load",
  () => {
    enforceLoggedInAccountUI();
  }
);
