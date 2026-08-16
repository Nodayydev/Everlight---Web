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
   PROFILE VIEW
   ========================================================= */

function updateProfileView(user) {
  if (!user) return;

  const username =
    getUsername(user);

  const displayName =
    getDisplayName(user);


  const profileViewName =
    $("#profileViewName");

  if (profileViewName) {

    profileViewName.textContent =
      displayName;

    profileViewName.style.color =
      user.nameColor ||
      "#67e7dd";
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

      if (currentUser) {
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

  openProfileSettings.addEventListener(
    "click",
    () => {

      if (!requireLogin()) {
        return;
      }


      /*
       * A teljes profilnézetből
       * megnyitjuk a szerkesztő panelt.
       */

      closeProfileView();

      openAccountMenu();


      /*
       * Görgessünk a profilbeállításokhoz,
       * ha szükséges.
       */

      setTimeout(
        () => {

          const profileSettings =
            $("#profileSettings");

          if (profileSettings) {

            profileSettings.scrollIntoView({
              behavior: "smooth",
              block: "start"
            });
          }

        },
        80
      );
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

function handleAccountNavigation() {

  if (!currentUser) {

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
   DISCORD-STYLE PROFILE CUSTOMIZER
   ========================================================= */

function readCustomizerImage(
  file,
  callback
) {
  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    notify("Csak képfájl tölthető fel.");
    return;
  }

  if (file.size > 1024 * 1024) {
    notify("A kép legfeljebb 1 MB lehet.");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    callback(reader.result);
  };

  reader.readAsDataURL(file);
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

        syncCustomizerToProfileFields();

        const originalSave =
          $("#saveProfile");

        if (originalSave) {
          originalSave.click();
        }

        setTimeout(
          () => {
            closeProfileCustomizer();
          },
          450
        );
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

