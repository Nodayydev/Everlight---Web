import 'dotenv/config';
import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const required = ['JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  throw new Error(
    `Hiányzó környezeti változó: ${missing.join(', ')}`
  );
}

/* =========================================================
   DATABASE
   ========================================================= */

const dbFile = process.env.DB_FILE || 'everlight.db';
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');
  db.run('PRAGMA journal_mode = WAL');
  db.run('PRAGMA busy_timeout = 5000');
});

/* =========================================================
   EXPRESS
   ========================================================= */

const app = express();

const root = path.dirname(
  fileURLToPath(import.meta.url)
);

app.use(
  express.json({
    limit: '6mb'
  })
);

/* =========================================================
   CORS
   ========================================================= */

app.use((req, res, next) => {
  res.header(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.header(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );

  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

/* =========================================================
   STATIC FILE TYPES
   ========================================================= */

app.use((req, res, next) => {
  if (req.path.endsWith('.css')) {
    res.type('text/css');
  }

  if (req.path.endsWith('.js')) {
    res.type('application/javascript');
  }

  if (req.path.endsWith('.svg')) {
    res.type('image/svg+xml');
  }

  if (
    req.path.endsWith('.webmanifest') ||
    req.path.endsWith('.json')
  ) {
    res.type('application/json');
  }

  next();
});

/* =========================================================
   STATIC WEBSITE
   ========================================================= */

app.use(express.static(root));

/* =========================================================
   HELPERS
   ========================================================= */

function clean(value, max) {
  if (
    value === undefined ||
    value === null
  ) {
    return '';
  }

  return String(value)
    .trim()
    .slice(0, max);
}

function validUsername(value) {
  return /^[\p{L}\p{N}_.-]{3,24}#[0-9]{4}$/u.test(
    value
  );
}

function validColor(value, fallback) {
  return (
    typeof value === 'string' &&
    /^#[0-9a-f]{6}$/i.test(value)
  )
    ? value
    : fallback;
}

function validImage(
  value,
  max = 3500000
) {
  if (typeof value !== 'string' || !value.length) {
    return null;
  }

  /*
   * Képek data: URL-ként kerülnek SQLite-ba.
   * A kliens tömöríti őket, a szerver pedig még egyszer
   * ellenőrzi a típust és a maximális méretet.
   */
  const match = value.match(/^data:(image\/(?:png|jpe?g|webp|gif));base64,([A-Za-z0-9+/=]+)$/i);

  if (!match) {
    return null;
  }

  const base64 = match[2];

  if (base64.length > max) {
    return null;
  }

  return value;
}

/* =========================================================
   SAFE USER
   ========================================================= */

function safeUser(user) {
  if (!user) {
    return null;
  }

  const username =
    user.username || '';

  /*
   * FONTOS:
   *
   * username:
   *   nodayy#0614
   *
   * displayName:
   *   Nodayy
   *
   * A kettőt nem keverjük össze.
   */

  const fallbackDisplayName =
    username.includes('#')
      ? username.split('#')[0]
      : username;

  return {
    id: user.id,

    /*
     * Ez mindig a teljes azonosító.
     * Pl. Nodayy#0614
     */
    username,

    /*
     * Ez a profil megjelenítési neve.
     */
    displayName:
      user.display_name ||
      fallbackDisplayName,

    bio:
      user.bio || '',

    avatar:
      user.avatar || '',

    cover:
      user.cover || '',

    nameColor:
      user.name_color ||
      '#67e7dd',

    profileColor:
      user.profile_color ||
      '#273638',

    status:
      user.status ||
      '✦ Elérhető',

    pronouns:
      user.pronouns || '',

    location:
      user.location || '',

    website:
      user.website || ''
  };
}

function tokenFor(user) {
  return jwt.sign(
    {
      id: user.id
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d'
    }
  );
}

/* =========================================================
   AUTH
   ========================================================= */

function auth(req, res, next) {
  try {
    const header =
      req.headers.authorization || '';

    const token =
      header.startsWith('Bearer ')
        ? header.slice(7)
        : '';

    if (!token) {
      return res
        .status(401)
        .json({
          error:
            'Jelentkezz be újra.'
        });
    }

    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.userId =
      decoded.id;

    /* Minden hitelesített kérés frissíti az Everlight saját
       jelenléti idejét, így az online lista tényleg ezt az oldalt
       tükrözi. */
    touch(req.userId)
      .catch((error) => {
        console.warn('last_seen frissítési hiba:', error.message);
      })
      .finally(() => next());
  } catch {
    return res
      .status(401)
      .json({
        error:
          'Jelentkezz be újra.'
      });
  }
}

/* =========================================================
   DATABASE HELPERS
   ========================================================= */

function dbRun(
  sql,
  params = []
) {
  return new Promise(
    (resolve, reject) => {
      db.run(
        sql,
        params,
        function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this);
          }
        }
      );
    }
  );
}

function dbGet(
  sql,
  params = []
) {
  return new Promise(
    (resolve, reject) => {
      db.get(
        sql,
        params,
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    }
  );
}

function dbAll(
  sql,
  params = []
) {
  return new Promise(
    (resolve, reject) => {
      db.all(
        sql,
        params,
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    }
  );
}

/* =========================================================
   DATABASE SCHEMA
   ========================================================= */

async function createSchema() {
  try {
    await dbRun(`
      CREATE TABLE IF NOT EXISTS everlight_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        username TEXT NOT NULL UNIQUE,

        email TEXT,

        password_hash TEXT NOT NULL,

        display_name TEXT,

        bio TEXT,

        avatar TEXT,

        cover TEXT,

        name_color TEXT,

        profile_color TEXT,

        status TEXT,

        pronouns TEXT,

        location TEXT,

        website TEXT,

        last_seen DATETIME
          DEFAULT CURRENT_TIMESTAMP,

        created_at DATETIME
          DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS everlight_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        author_id INTEGER NOT NULL,

        body TEXT DEFAULT '',

        category TEXT DEFAULT 'Gondolat',

        image TEXT,

        is_anonymous INTEGER DEFAULT 0,

        created_at DATETIME
          DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (
          author_id
        )
        REFERENCES everlight_users(id)
        ON DELETE CASCADE
      )
    `);

    await dbRun(`
      CREATE TABLE IF NOT EXISTS everlight_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,

        sender_id INTEGER NOT NULL,

        recipient_id INTEGER NOT NULL,

        body TEXT NOT NULL,

        created_at DATETIME
          DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (
          sender_id
        )
        REFERENCES everlight_users(id)
        ON DELETE CASCADE,

        FOREIGN KEY (
          recipient_id
        )
        REFERENCES everlight_users(id)
        ON DELETE CASCADE
      )
    `);

    /*
     * Régi adatbázisokhoz szükséges mezők.
     */

    const columns =
      await dbAll(
        `PRAGMA table_info(everlight_users)`
      );

    const existingColumns =
      new Set(
        columns.map(
          (column) => column.name
        )
      );

    const migrations = [
      [
        'display_name',
        'ALTER TABLE everlight_users ADD COLUMN display_name TEXT'
      ],

      [
        'bio',
        'ALTER TABLE everlight_users ADD COLUMN bio TEXT'
      ],

      [
        'avatar',
        'ALTER TABLE everlight_users ADD COLUMN avatar TEXT'
      ],

      [
        'cover',
        'ALTER TABLE everlight_users ADD COLUMN cover TEXT'
      ],

      [
        'name_color',
        'ALTER TABLE everlight_users ADD COLUMN name_color TEXT'
      ],

      [
        'profile_color',
        'ALTER TABLE everlight_users ADD COLUMN profile_color TEXT'
      ],

      [
        'status',
        'ALTER TABLE everlight_users ADD COLUMN status TEXT'
      ],

      [
        'pronouns',
        'ALTER TABLE everlight_users ADD COLUMN pronouns TEXT'
      ],

      [
        'location',
        'ALTER TABLE everlight_users ADD COLUMN location TEXT'
      ],

      [
        'website',
        'ALTER TABLE everlight_users ADD COLUMN website TEXT'
      ],

      [
        'last_seen',
        'ALTER TABLE everlight_users ADD COLUMN last_seen DATETIME DEFAULT CURRENT_TIMESTAMP'
      ]
    ];

    for (
      const [name, sql]
      of migrations
    ) {
      if (
        !existingColumns.has(name)
      ) {
        try {
          await dbRun(sql);
        } catch (error) {
          console.warn(
            `Migráció kihagyva (${name}):`,
            error.message
          );
        }
      }
    }

    /*
     * Régi felhasználók display neve.
     *
     * FONTOS:
     * A username ettől NEM változik.
     *
     * nodayy#0614
     *      ↓
     * display_name = nodayy
     */

    await dbRun(`
      UPDATE everlight_users

      SET display_name =
        CASE

          WHEN display_name IS NULL
            OR TRIM(display_name) = ''

          THEN
            CASE

              WHEN instr(username, '#') > 0

              THEN substr(
                username,
                1,
                instr(username, '#') - 1
              )

              ELSE username

            END

          ELSE display_name

        END

      WHERE
        display_name IS NULL
        OR TRIM(display_name) = ''
    `);

    await dbRun(`
      UPDATE everlight_users
      SET name_color = '#67e7dd'
      WHERE name_color IS NULL
        OR TRIM(name_color) = ''
    `);

    await dbRun(`
      UPDATE everlight_users
      SET profile_color = '#273638'
      WHERE profile_color IS NULL
        OR TRIM(profile_color) = ''
    `);

    await dbRun(`
      UPDATE everlight_users
      SET status = '✦ Elérhető'
      WHERE status IS NULL
        OR TRIM(status) = ''
    `);

    console.log(
      `SQLite adatbázis: ${dbFile}`
    );
  } catch (error) {
    console.error(
      'Schema hiba:',
      error
    );

    throw error;
  }
}

/* =========================================================
   LAST SEEN
   ========================================================= */

async function touch(id) {
  await dbRun(
    `
      UPDATE everlight_users

      SET last_seen =
        CURRENT_TIMESTAMP

      WHERE id = ?
    `,
    [id]
  );
}

/* =========================================================
   LOGIN / REGISTER
   ========================================================= */

app.post(
  '/api/auth/enter',
  async (req, res, next) => {
    try {
      /*
       * A felhasználónevet csak a kereséshez kezeljük
       * kis-/nagybetű-függetlenül. A ténylegesen mentett
       * username megtartja a felhasználó által beírt alakot,
       * így pl. Nodayy#0614 nem változik nodayy#0614 -> nodayy#0614.
       */
      const submittedUsername =
        clean(
          req.body.username,
          30
        );

      const username =
        submittedUsername;

      const lookupUsername =
        submittedUsername.toLowerCase();

      const password =
        String(
          req.body.password || ''
        );

      const email =
        clean(
          req.body.email,
          254
        ) || null;

      if (
        !validUsername(username)
      ) {
        return res
          .status(400)
          .json({
            error:
              'A név formátuma: nev#1234.'
          });
      }

      if (
        password.length < 6
      ) {
        return res
          .status(400)
          .json({
            error:
              'A jelszó legalább 6 karakter legyen.'
          });
      }

      let user =
        await dbGet(
          `
            SELECT *
            FROM everlight_users
            WHERE LOWER(username) = ?
            LIMIT 1
          `,
          [lookupUsername]
        );

      /*
       * Új felhasználó.
       */

      if (!user) {
        const hash =
          await bcrypt.hash(
            password,
            12
          );

        const defaultName =
          username.split('#')[0];

        const result =
          await dbRun(
            `
              INSERT INTO everlight_users (
                username,
                email,
                password_hash,
                display_name,
                name_color,
                profile_color,
                status
              )
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
              username,
              email,
              hash,
              defaultName,
              '#67e7dd',
              '#273638',
              '✦ Elérhető'
            ]
          );

        user =
          await dbGet(
            `
              SELECT *
              FROM everlight_users
              WHERE id = ?
            `,
            [result.lastID]
          );
      } else {
        /*
         * A bejelentkezés nem csak ellenőriz: ha a kliens
         * e-mail címet adott meg és a régi rekordban még nincs,
         * azt is elmentjük.
         */
        if (email && !user.email) {
          await dbRun(
            `
              UPDATE everlight_users
              SET email = ?
              WHERE id = ?
            `,
            [email, user.id]
          );

          user.email = email;
        }

        const passwordOk =
          await bcrypt.compare(
            password,
            user.password_hash
          );

        if (!passwordOk) {
          return res
            .status(401)
            .json({
              error:
                'Hibás jelszó.'
            });
        }
      }

      await touch(
        user.id
      );

      /*
       * Friss adatbázis-adatot
       * küldünk vissza.
       */

      user =
        await dbGet(
          `
            SELECT *
            FROM everlight_users
            WHERE id = ?
          `,
          [user.id]
        );

      return res.json({
        token:
          tokenFor(user),

        user:
          safeUser(user)
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   CURRENT USER
   ========================================================= */

app.get(
  '/api/auth/me',
  auth,
  async (req, res, next) => {
    try {
      const user =
        await dbGet(
          `
            SELECT *
            FROM everlight_users
            WHERE id = ?
          `,
          [req.userId]
        );

      if (!user) {
        return res
          .status(401)
          .json({
            error:
              'A fiók nem található.'
          });
      }

      await touch(
        req.userId
      );

      const updatedUser =
        await dbGet(
          `
            SELECT *
            FROM everlight_users
            WHERE id = ?
          `,
          [req.userId]
        );

      return res.json({
        user:
          safeUser(updatedUser)
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   PROFILE UPDATE
   ========================================================= */

app.put(
  '/api/profile',
  auth,
  async (req, res, next) => {
    try {
      const p =
        req.body || {};

      /*
       * Jelenlegi felhasználó.
       */

      const currentUser =
        await dbGet(
          `
            SELECT *
            FROM everlight_users
            WHERE id = ?
          `,
          [req.userId]
        );

      if (!currentUser) {
        return res
          .status(404)
          .json({
            error:
              'A felhasználó nem található.'
          });
      }

      /* ---------------------------------------------
         DISPLAY NAME
         --------------------------------------------- */

      const oldDisplayName =
        currentUser.display_name ||
        currentUser.username.split('#')[0];

      const incomingDisplayName =
        clean(
          p.displayName,
          30
        );

      const displayName =
        incomingDisplayName ||
        oldDisplayName;

      /* ---------------------------------------------
         BIO
         --------------------------------------------- */

      const bio =
        p.bio !== undefined
          ? clean(
              p.bio,
              160
            )
          : (
              currentUser.bio ||
              ''
            );

      /* ---------------------------------------------
         AVATAR
         --------------------------------------------- */

      const hasAvatarField =
        Object.prototype.hasOwnProperty.call(p, 'avatar');

      const newAvatar =
        hasAvatarField && p.avatar
          ? validImage(p.avatar)
          : null;

      if (hasAvatarField && p.avatar && !newAvatar) {
        return res.status(413).json({
          error: 'A profilkép túl nagy vagy nem támogatott képformátum.'
        });
      }

      const avatar =
        hasAvatarField && !p.avatar
          ? ''
          : (
              newAvatar !== null
                ? newAvatar
                : (currentUser.avatar || '')
            );

      /* ---------------------------------------------
         COVER
         --------------------------------------------- */

      const hasCoverField =
        Object.prototype.hasOwnProperty.call(p, 'cover');

      const newCover =
        hasCoverField && p.cover
          ? validImage(p.cover)
          : null;

      if (hasCoverField && p.cover && !newCover) {
        return res.status(413).json({
          error: 'A borítókép túl nagy vagy nem támogatott képformátum.'
        });
      }

      const cover =
        hasCoverField && !p.cover
          ? ''
          : (
              newCover !== null
                ? newCover
                : (currentUser.cover || '')
            );

      /* ---------------------------------------------
         COLORS
         --------------------------------------------- */

      const nameColor =
        validColor(
          p.nameColor,
          currentUser.name_color ||
            '#67e7dd'
        );

      const profileColor =
        validColor(
          p.profileColor,
          currentUser.profile_color ||
            '#273638'
        );

      /* ---------------------------------------------
         STATUS
         --------------------------------------------- */

      const status =
        p.status !== undefined
          ? clean(
              p.status,
              40
            )
          : (
              currentUser.status ||
              '✦ Elérhető'
            );

      /* ---------------------------------------------
         PRONOUNS
         --------------------------------------------- */

      const pronouns =
        p.pronouns !== undefined
          ? clean(
              p.pronouns,
              30
            )
          : (
              currentUser.pronouns ||
              ''
            );

      /* ---------------------------------------------
         LOCATION
         --------------------------------------------- */

      const location =
        p.location !== undefined
          ? clean(
              p.location,
              50
            )
          : (
              currentUser.location ||
              ''
            );

      /* ---------------------------------------------
         WEBSITE
         --------------------------------------------- */

      const website =
        p.website !== undefined
          ? clean(
              p.website,
              100
            )
          : (
              currentUser.website ||
              ''
            );

      /* ---------------------------------------------
         UPDATE
         --------------------------------------------- */

      await dbRun(
        `
          UPDATE everlight_users

          SET

            display_name = ?,

            bio = ?,

            avatar = ?,

            cover = ?,

            name_color = ?,

            profile_color = ?,

            status = ?,

            pronouns = ?,

            location = ?,

            website = ?,

            last_seen =
              CURRENT_TIMESTAMP

          WHERE id = ?
        `,
        [
          displayName,

          bio,

          avatar,

          cover,

          nameColor,

          profileColor,

          status,

          pronouns,

          location,

          website,

          req.userId
        ]
      );

      /*
       * Újra lekérjük.
       */

      const updatedUser =
        await dbGet(
          `
            SELECT *
            FROM everlight_users
            WHERE id = ?
          `,
          [req.userId]
        );

      console.log(
        `Profil mentve: ${updatedUser.username}`
      );

      return res.json({
        success: true,

        user:
          safeUser(updatedUser)
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   POSTS — GET
   ========================================================= */

app.get(
  '/api/posts',
  async (req, res, next) => {
    try {
      const rows =
        await dbAll(
          `
            SELECT

              p.*,

              u.username,

              u.display_name,

              u.avatar,

              u.name_color

            FROM everlight_posts p

            JOIN everlight_users u
              ON u.id = p.author_id

            ORDER BY
              p.created_at DESC

            LIMIT 100
          `
        );

      return res.json({
        posts:
          rows || []
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   POSTS — CATEGORY LIMITS
   ========================================================= */

const POST_CATEGORY_LIMITS = Object.freeze({
  Gondolat: 280,
  Történet: 600,
  Idézet: 500,
  Élet: 400,
  Alkotás: 1000
});

/* =========================================================
   POSTS — CREATE
   ========================================================= */

app.post(
  '/api/posts',
  auth,
  async (req, res, next) => {
    try {
      const categories = Object.keys(POST_CATEGORY_LIMITS);
      const category =
        categories.includes(req.body.category)
          ? req.body.category
          : 'Gondolat';
      const body =
        clean(
          req.body.body,
          POST_CATEGORY_LIMITS[category]
        );

      const hasImageField =
        Object.prototype.hasOwnProperty.call(req.body || {}, 'image');

      const image =
        hasImageField && req.body.image
          ? validImage(req.body.image)
          : null;

      if (hasImageField && req.body.image && !image) {
        return res.status(413).json({
          error: 'A posztképed túl nagy vagy nem támogatott képformátum.'
        });
      }

      if (
        !body &&
        !image
      ){
        return res
          .status(400)
          .json({
            error:
              'Írj valamit vagy adj hozzá képet.'
          });
      }

      if (
        /(https?:\/\/\S+.*){3,}|(.)\2{10,}/i
          .test(body)
      ) {
        return res
          .status(400)
          .json({
            error:
              'A spam-szűrő megállította a bejegyzést.'
          });
      }

      const result =
        await dbRun(
          `
            INSERT INTO everlight_posts (
              author_id,
              body,
              category,
              image,
              is_anonymous
            )
            VALUES (?, ?, ?, ?, ?)
          `,
          [
            req.userId,
            body,
            category,
            image,
            req.body.anonymous
              ? 1
              : 0
          ]
        );

      await touch(
        req.userId
      );

      const post =
        await dbGet(
          `
            SELECT

              p.*,

              u.username,

              u.display_name,

              u.avatar,

              u.name_color

            FROM everlight_posts p

            JOIN everlight_users u
              ON u.id = p.author_id

            WHERE p.id = ?
          `,
          [result.lastID]
        );

      return res
        .status(201)
        .json({
          post
        });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   EVERLIGHT ONLINE USERS — LOCAL SITE ONLY
   Source: everlight_users in the Everlight database.
   Do not pull presence from Mineforum or any external service.
   ========================================================= */

app.get(
  '/api/online',
  async (req, res, next) => {
    try {
      const users =
        await dbAll(
          `
            SELECT

              id,

              username,

              display_name,

              avatar,

              name_color

            FROM everlight_users

            WHERE last_seen >
              datetime(
                'now',
                '-5 minutes'
              )

            ORDER BY
              last_seen DESC

            LIMIT 12
          `
        );

      return res.json({
        users:
          users || []
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   MESSAGES — CONTACTS / CONVERSATIONS
   ========================================================= */

app.get(
  '/api/messages',
  auth,
  async (req, res, next) => {
    try {
      const contacts = await dbAll(
        `
          SELECT
            u.id,
            u.username,
            u.display_name,
            u.avatar,
            u.name_color,
            MAX(m.created_at) AS last_message_at
          FROM everlight_messages m
          JOIN everlight_users u
            ON u.id = CASE
              WHEN m.sender_id = ? THEN m.recipient_id
              ELSE m.sender_id
            END
          WHERE
            m.sender_id = ?
            OR m.recipient_id = ?
          GROUP BY u.id
          ORDER BY last_message_at DESC
          LIMIT 50
        `,
        [req.userId, req.userId, req.userId]
      );

      return res.json({
        contacts: contacts || []
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   MESSAGES — GET
   ========================================================= */

app.get(
  '/api/messages/:username',
  auth,
  async (req, res, next) => {
    try {
      const username =
        clean(
          req.params.username,
          30
        ).toLowerCase();

      const other =
        await dbGet(
          `
            SELECT

              id,

              username,

              display_name,

              avatar

            FROM everlight_users

            WHERE username = ?
          `,
          [username]
        );

      if (!other) {
        return res
          .status(404)
          .json({
            error:
              'Ez a felhasználó nem található.'
          });
      }

      const messages =
        await dbAll(
          `
            SELECT

              m.*,

              s.username
                AS sender_username,

              s.display_name
                AS sender_name

            FROM everlight_messages m

            JOIN everlight_users s
              ON s.id = m.sender_id

            WHERE

              (
                m.sender_id = ?
                AND
                m.recipient_id = ?
              )

              OR

              (
                m.sender_id = ?
                AND
                m.recipient_id = ?
              )

            ORDER BY
              m.created_at ASC

            LIMIT 100
          `,
          [
            req.userId,
            other.id,

            other.id,
            req.userId
          ]
        );

      return res.json({
        user:
          safeUser(other),

        messages:
          messages || []
      });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   MESSAGES — SEND
   ========================================================= */

app.post(
  '/api/messages/:username',
  auth,
  async (req, res, next) => {
    try {
      const body =
        clean(
          req.body.body,
          1000
        );

      if (!body) {
        return res
          .status(400)
          .json({
            error:
              'Az üzenet üres.'
          });
      }

      const username =
        clean(
          req.params.username,
          30
        ).toLowerCase();

      const other =
        await dbGet(
          `
            SELECT id
            FROM everlight_users
            WHERE username = ?
          `,
          [username]
        );

      if (!other) {
        return res
          .status(404)
          .json({
            error:
              'A címzett nem található.'
          });
      }

      if (
        other.id === req.userId
      ) {
        return res
          .status(400)
          .json({
            error:
              'Magadnak nem küldhetsz üzenetet.'
          });
      }

      const result =
        await dbRun(
          `
            INSERT INTO everlight_messages (
              sender_id,
              recipient_id,
              body
            )
            VALUES (?, ?, ?)
          `,
          [
            req.userId,
            other.id,
            body
          ]
        );

      await touch(
        req.userId
      );

      return res
        .status(201)
        .json({
          id:
            result.lastID
        });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   ERROR HANDLER
   ========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {
    console.error(
      'Szerverhiba:',
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    return res
      .status(500)
      .json({
        error:
          'Szerverhiba. Nézd meg a szerver konzolt.'
      });
  }
);

/* =========================================================
   START
   ========================================================= */

(async () => {
  try {
    await createSchema();

    const port =
      Number(
        process.env.PORT ||
        5470
      );

    app.listen(
      port,
      () => {
        console.log(
          `Everlight fut a ${port} porton.`
        );

        console.log(
          `Adatbázis: ${dbFile}`
        );
      }
    );
  } catch (error) {
    console.error(
      'Az Everlight nem tudott elindulni:',
      error
    );

    process.exit(1);
  }
})();
