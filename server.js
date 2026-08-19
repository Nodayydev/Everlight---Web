import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
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

const root = path.dirname(
  fileURLToPath(import.meta.url)
);

/* =========================================================
   DATABASE
   ========================================================= */

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 5),
  queueLimit: 0,
  charset: 'utf8mb4'
};

const missingDb = ['DB_HOST','DB_USER','DB_PASSWORD','DB_NAME']
  .filter((key) => !process.env[key]);

if (missingDb.length) {
  throw new Error(`Hiányzó adatbázis környezeti változó: ${missingDb.join(', ')}`);
}

const db = mysql.createPool(dbConfig);

/* =========================================================
   EXPRESS
   ========================================================= */

const app = express();

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
   * Képek data: URL-ként kerülnek a MySQL adatbázisba.
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
      '#ffffff',

    nameFont:
      user.name_font ||
      'sans',

    nameBold:
      Boolean(user.name_bold),

    nameItalic:
      Boolean(user.name_italic),

    nameUnderline:
      Boolean(user.name_underline),

    nameStrike:
      Boolean(user.name_strike),

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
      user.website || '',

    messageStreak:
      Number(user.message_streak || 0)
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

/* A nyilvános feedhez a belépés opcionális. Ha van érvényes token,
   a kérést a felhasználóhoz kötjük; hibás/hiányzó token esetén
   a kérés névtelen marad. */
function optionalAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.id;
    }
  } catch {
    req.userId = null;
  }
  next();
}

/* =========================================================
   DATABASE HELPERS
   ========================================================= */

async function dbRun(sql, params = []) {
  const [result] = await db.execute(sql, params);
  return result;
}

async function dbGet(sql, params = []) {
  const [rows] = await db.execute(sql, params);
  return rows[0] || null;
}

async function dbAll(sql, params = []) {
  const [rows] = await db.execute(sql, params);
  return rows;
}

/* =========================================================
   DATABASE SCHEMA
   ========================================================= */

async function createSchema() {
  await dbRun(`
    CREATE TABLE IF NOT EXISTS everlight_users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      username VARCHAR(64) NOT NULL,
      email VARCHAR(254) NULL,
      password_hash VARCHAR(255) NOT NULL,
      display_name VARCHAR(100) NULL,
      bio TEXT NULL,
      avatar LONGTEXT NULL,
      cover LONGTEXT NULL,
      name_color VARCHAR(7) NULL,
      name_font VARCHAR(24) NULL,
      name_bold TINYINT(1) NOT NULL DEFAULT 0,
      name_italic TINYINT(1) NOT NULL DEFAULT 0,
      name_underline TINYINT(1) NOT NULL DEFAULT 0,
      name_strike TINYINT(1) NOT NULL DEFAULT 0,
      profile_color VARCHAR(7) NULL,
      status VARCHAR(80) NULL,
      pronouns VARCHAR(60) NULL,
      location VARCHAR(120) NULL,
      website VARCHAR(255) NULL,
      last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_everlight_users_username (username)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS everlight_posts (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      author_id BIGINT UNSIGNED NOT NULL,
      body TEXT NOT NULL,
      category VARCHAR(40) NOT NULL DEFAULT 'Gondolat',
      image LONGTEXT NULL,
      is_anonymous TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_everlight_posts_created (created_at),
      CONSTRAINT fk_everlight_posts_author FOREIGN KEY (author_id) REFERENCES everlight_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // A régebbi, már létrehozott adatbázisokhoz is hozzáadjuk az opcionális címet.
  const postTitleColumn = await dbGet(`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'everlight_posts'
      AND COLUMN_NAME = 'post_title'
    LIMIT 1
  `);

  if (!postTitleColumn) {
    await dbRun(`
      ALTER TABLE everlight_posts
      ADD COLUMN post_title VARCHAR(160) NULL AFTER body
    `);
  }

  await dbRun(`
    CREATE TABLE IF NOT EXISTS everlight_post_likes (
      post_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (post_id, user_id),
      KEY idx_post_likes_user (user_id, created_at),
      CONSTRAINT fk_post_likes_post FOREIGN KEY (post_id) REFERENCES everlight_posts(id) ON DELETE CASCADE,
      CONSTRAINT fk_post_likes_user FOREIGN KEY (user_id) REFERENCES everlight_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS everlight_post_saves (
      post_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (post_id, user_id),
      KEY idx_post_saves_user (user_id, created_at),
      CONSTRAINT fk_post_saves_post FOREIGN KEY (post_id) REFERENCES everlight_posts(id) ON DELETE CASCADE,
      CONSTRAINT fk_post_saves_user FOREIGN KEY (user_id) REFERENCES everlight_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS everlight_messages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      sender_id BIGINT UNSIGNED NOT NULL,
      recipient_id BIGINT UNSIGNED NOT NULL,
      body TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_messages_sender (sender_id, created_at),
      KEY idx_messages_recipient (recipient_id, created_at),
      CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES everlight_users(id) ON DELETE CASCADE,
      CONSTRAINT fk_messages_recipient FOREIGN KEY (recipient_id) REFERENCES everlight_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbRun(`
    CREATE TABLE IF NOT EXISTS everlight_message_streaks (
      user_a_id BIGINT UNSIGNED NOT NULL,
      user_b_id BIGINT UNSIGNED NOT NULL,
      current_streak INT UNSIGNED NOT NULL DEFAULT 0,
      last_message_date DATE NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_a_id, user_b_id),
      KEY idx_message_streaks_b (user_b_id),
      CONSTRAINT fk_message_streaks_a FOREIGN KEY (user_a_id) REFERENCES everlight_users(id) ON DELETE CASCADE,
      CONSTRAINT fk_message_streaks_b FOREIGN KEY (user_b_id) REFERENCES everlight_users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const migrations = [
    ['display_name', 'ALTER TABLE everlight_users ADD COLUMN display_name VARCHAR(100) NULL'],
    ['bio', 'ALTER TABLE everlight_users ADD COLUMN bio TEXT NULL'],
    ['avatar', 'ALTER TABLE everlight_users ADD COLUMN avatar LONGTEXT NULL'],
    ['cover', 'ALTER TABLE everlight_users ADD COLUMN cover LONGTEXT NULL'],
    ['name_color', 'ALTER TABLE everlight_users ADD COLUMN name_color VARCHAR(7) NULL'],
    ['name_font', 'ALTER TABLE everlight_users ADD COLUMN name_font VARCHAR(24) NULL'],
    ['name_bold', 'ALTER TABLE everlight_users ADD COLUMN name_bold TINYINT(1) NOT NULL DEFAULT 0'],
    ['name_italic', 'ALTER TABLE everlight_users ADD COLUMN name_italic TINYINT(1) NOT NULL DEFAULT 0'],
    ['name_underline', 'ALTER TABLE everlight_users ADD COLUMN name_underline TINYINT(1) NOT NULL DEFAULT 0'],
    ['name_strike', 'ALTER TABLE everlight_users ADD COLUMN name_strike TINYINT(1) NOT NULL DEFAULT 0'],
    ['profile_color', 'ALTER TABLE everlight_users ADD COLUMN profile_color VARCHAR(7) NULL'],
    ['status', 'ALTER TABLE everlight_users ADD COLUMN status VARCHAR(80) NULL'],
    ['pronouns', 'ALTER TABLE everlight_users ADD COLUMN pronouns VARCHAR(60) NULL'],
    ['location', 'ALTER TABLE everlight_users ADD COLUMN location VARCHAR(120) NULL'],
    ['website', 'ALTER TABLE everlight_users ADD COLUMN website VARCHAR(255) NULL'],
    ['last_seen', 'ALTER TABLE everlight_users ADD COLUMN last_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP']
  ];

  const columns = await dbAll(`
    SELECT COLUMN_NAME AS name
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'everlight_users'
  `);
  const existing = new Set(columns.map((c) => c.name));

  for (const [name, sql] of migrations) {
    if (!existing.has(name)) {
      try { await dbRun(sql); } catch (error) { console.warn(`Migráció kihagyva (${name}):`, error.message); }
    }
  }

  await dbRun(`
    UPDATE everlight_users
    SET display_name = CASE
      WHEN display_name IS NULL OR TRIM(display_name) = '' THEN
        CASE WHEN INSTR(username, '#') > 0 THEN LEFT(username, INSTR(username, '#') - 1) ELSE username END
      ELSE display_name END
    WHERE display_name IS NULL OR TRIM(display_name) = ''
  `);
  await dbRun(`UPDATE everlight_users SET name_color = '#ffffff' WHERE name_color IS NULL OR TRIM(name_color) = '' OR LOWER(TRIM(name_color)) = '#67e7dd'`);
  await dbRun(`UPDATE everlight_users SET name_font = 'sans' WHERE name_font IS NULL OR TRIM(name_font) = ''`);
  await dbRun(`UPDATE everlight_users SET profile_color = '#273638' WHERE profile_color IS NULL OR TRIM(profile_color) = ''`);
  await dbRun(`UPDATE everlight_users SET status = '✦ Elérhető' WHERE status IS NULL OR TRIM(status) = ''`);

  // Megjelenítési tesztpéldány: egyszer létrejövő névtelen bejegyzés.
  const anonymousId = await getAnonymousUserId();
  const demoMarker = '[EVERLIGHT_ANONYMOUS_DEMO]';
  const demoPost = await dbGet(
    `SELECT id FROM everlight_posts WHERE body LIKE ? LIMIT 1`,
    [`%${demoMarker}%`]
  );

  if (!demoPost) {
    await dbRun(
      `INSERT INTO everlight_posts (author_id, body, post_title, category, image, is_anonymous)
       VALUES (?, ?, ?, ?, NULL, 1)`,
      [
        anonymousId,
        `${demoMarker} Ez egy névtelen tesztbejegyzés. #teszt #Everlight`,
        'Névtelen tesztbejegyzés',
        'Gondolat'
      ]
    );
  }

  console.log(`MySQL adatbázis: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
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
            [result.insertId]
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
            SELECT
              u.*,
              COALESCE((
                SELECT MAX(ms.current_streak)
                FROM everlight_message_streaks ms
                WHERE (ms.user_a_id = u.id OR ms.user_b_id = u.id)
                  AND ms.last_message_date >= DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)
              ), 0) AS message_streak
            FROM everlight_users u
            WHERE u.id = ?
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
            SELECT
              u.*,
              COALESCE((
                SELECT MAX(ms.current_streak)
                FROM everlight_message_streaks ms
                WHERE (ms.user_a_id = u.id OR ms.user_b_id = u.id)
                  AND ms.last_message_date >= DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)
              ), 0) AS message_streak
            FROM everlight_users u
            WHERE u.id = ?
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
              500
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
            '#ffffff'
        );

      const profileColor =
        validColor(
          p.profileColor,
          currentUser.profile_color ||
            '#273638'
        );

      const nameFont =
        ['sans', 'serif', 'mono', 'display'].includes(String(p.nameFont || ''))
          ? String(p.nameFont)
          : (currentUser.name_font || 'sans');

      const nameBold = p.nameBold !== undefined
        ? Boolean(p.nameBold)
        : Boolean(currentUser.name_bold);

      const nameItalic = p.nameItalic !== undefined
        ? Boolean(p.nameItalic)
        : Boolean(currentUser.name_italic);

      const nameUnderline = p.nameUnderline !== undefined
        ? Boolean(p.nameUnderline)
        : Boolean(currentUser.name_underline);

      const nameStrike = p.nameStrike !== undefined
        ? Boolean(p.nameStrike)
        : Boolean(currentUser.name_strike);

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

            name_font = ?,

            name_bold = ?,

            name_italic = ?,

            name_underline = ?,

            name_strike = ?,

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

          nameFont,

          nameBold ? 1 : 0,

          nameItalic ? 1 : 0,

          nameUnderline ? 1 : 0,

          nameStrike ? 1 : 0,

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

async function getAnonymousUserId() {
  const existing = await dbGet(
    `SELECT id FROM everlight_users WHERE username = ? LIMIT 1`,
    ['anonymous#0000']
  );
  if (existing) return existing.id;

  const result = await dbRun(
    `INSERT INTO everlight_users (username, password_hash, display_name, name_color, profile_color, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ['anonymous#0000', 'ANONYMOUS_SYSTEM_ACCOUNT', 'Névtelen', '#8d9aa0', '#273638', '✦ Névtelen']
  );
  return result.insertId;
}

/* =========================================================
   POSTS — GET
   ========================================================= */

app.get(
  '/api/posts',
  optionalAuth,
  async (req, res, next) => {
    try {
      const viewerId = Number(req.userId || 0);
      const rows = await dbAll(
        `
          SELECT
            p.*,
            u.username,
            u.display_name,
            u.avatar,
            u.name_color,
            (SELECT COUNT(*) FROM everlight_post_likes l WHERE l.post_id = p.id) AS like_count,
            (SELECT COUNT(*) FROM everlight_post_saves s WHERE s.post_id = p.id) AS save_count,
            CASE WHEN ? > 0 AND EXISTS (SELECT 1 FROM everlight_post_likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) THEN 1 ELSE 0 END AS liked,
            CASE WHEN ? > 0 AND EXISTS (SELECT 1 FROM everlight_post_saves s2 WHERE s2.post_id = p.id AND s2.user_id = ?) THEN 1 ELSE 0 END AS saved
          FROM everlight_posts p
          JOIN everlight_users u ON u.id = p.author_id
          ORDER BY p.created_at DESC
          LIMIT 100
        `,
        [viewerId, viewerId, viewerId, viewerId]
      );
      return res.json({ posts: rows || [] });
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
  optionalAuth,
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

      const postTitle =
        clean(req.body.post_title ?? req.body.title, 160) || null;

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

      const anonymous = !req.userId || Boolean(req.body.anonymous);
      const authorId = req.userId || await getAnonymousUserId();

      const result =
        await dbRun(
          `
            INSERT INTO everlight_posts (
              author_id,
              body,
              post_title,
              category,
              image,
              is_anonymous
            )
            VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            authorId,
            body,
            postTitle,
            category,
            image,
            anonymous ? 1 : 0
          ]
        );

      if (req.userId) {
        await touch(req.userId);
      }

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
          [result.insertId]
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
   POSTS — UPDATE OWN POST
   ========================================================= */

app.put(
  '/api/posts/:id',
  auth,
  async (req, res, next) => {
    try {
      const postId = Number(req.params.id);
      if (!Number.isInteger(postId) || postId <= 0) {
        return res.status(400).json({ error: 'Érvénytelen bejegyzés.' });
      }

      const existing = await dbGet(
        `SELECT * FROM everlight_posts WHERE id = ? LIMIT 1`,
        [postId]
      );

      if (!existing) {
        return res.status(404).json({ error: 'A bejegyzés nem található.' });
      }

      if (Number(existing.author_id) !== Number(req.userId)) {
        return res.status(403).json({ error: 'Csak a saját bejegyzésedet szerkesztheted.' });
      }

      const categories = Object.keys(POST_CATEGORY_LIMITS);
      const category = categories.includes(req.body.category)
        ? req.body.category
        : existing.category || 'Gondolat';
      const limit = POST_CATEGORY_LIMITS[category] || 280;
      const body = clean(req.body.body, limit);
      const postTitle = clean(req.body.post_title ?? req.body.title ?? existing.post_title ?? '', 160) || null;
      const isAnonymous = req.body.anonymous !== undefined
        ? (Boolean(req.body.anonymous) ? 1 : 0)
        : Number(existing.is_anonymous || 0);

      const hasImageField = Object.prototype.hasOwnProperty.call(req.body || {}, 'image');
      const image = hasImageField
        ? (req.body.image ? validImage(req.body.image) : null)
        : (existing.image || null);

      if (hasImageField && req.body.image && !image) {
        return res.status(413).json({
          error: 'A bejegyzés képe túl nagy vagy nem támogatott képformátum.'
        });
      }

      if (!body && !image) {
        return res.status(400).json({ error: 'Írj valamit vagy adj hozzá képet.' });
      }

      if (/(https?:\/\/\S+.*){3,}|(.)\2{10,}/i.test(body)) {
        return res.status(400).json({ error: 'A spam-szűrő megállította a bejegyzést.' });
      }

      await dbRun(
        `UPDATE everlight_posts
         SET body = ?, post_title = ?, category = ?, image = ?
         WHERE id = ? AND author_id = ?`,
        [body, postTitle, category, image, postId, req.userId]
      );

      await touch(req.userId);

      const post = await dbGet(
        `SELECT
           p.*,
           u.username,
           u.display_name,
           u.avatar,
           u.name_color,
           (SELECT COUNT(*) FROM everlight_post_likes l WHERE l.post_id = p.id) AS like_count,
           (SELECT COUNT(*) FROM everlight_post_saves s WHERE s.post_id = p.id) AS save_count,
           CASE WHEN EXISTS (SELECT 1 FROM everlight_post_likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) THEN 1 ELSE 0 END AS liked,
           CASE WHEN EXISTS (SELECT 1 FROM everlight_post_saves s2 WHERE s2.post_id = p.id AND s2.user_id = ?) THEN 1 ELSE 0 END AS saved
         FROM everlight_posts p
         JOIN everlight_users u ON u.id = p.author_id
         WHERE p.id = ?`,
        [req.userId, req.userId, postId]
      );

      return res.json({ success: true, post });
    } catch (error) {
      next(error);
    }
  }
);

/* =========================================================
   POST REACTIONS — LIKE / SAVE
   ========================================================= */

app.post('/api/posts/:id/like', auth, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const post = await dbGet(`SELECT id FROM everlight_posts WHERE id = ?`, [postId]);
    if (!post) return res.status(404).json({ error: 'A bejegyzés nem található.' });
    const existing = await dbGet(`SELECT 1 FROM everlight_post_likes WHERE post_id = ? AND user_id = ?`, [postId, req.userId]);
    if (existing) {
      await dbRun(`DELETE FROM everlight_post_likes WHERE post_id = ? AND user_id = ?`, [postId, req.userId]);
    } else {
      await dbRun(`INSERT INTO everlight_post_likes (post_id, user_id) VALUES (?, ?)`, [postId, req.userId]);
    }
    const row = await dbGet(`SELECT COUNT(*) AS count FROM everlight_post_likes WHERE post_id = ?`, [postId]);
    return res.json({ liked: !existing, count: row.count });
  } catch (error) { next(error); }
});

app.post('/api/posts/:id/save', auth, async (req, res, next) => {
  try {
    const postId = Number(req.params.id);
    const post = await dbGet(`SELECT id FROM everlight_posts WHERE id = ?`, [postId]);
    if (!post) return res.status(404).json({ error: 'A bejegyzés nem található.' });
    const existing = await dbGet(`SELECT 1 FROM everlight_post_saves WHERE post_id = ? AND user_id = ?`, [postId, req.userId]);
    if (existing) {
      await dbRun(`DELETE FROM everlight_post_saves WHERE post_id = ? AND user_id = ?`, [postId, req.userId]);
    } else {
      await dbRun(`INSERT INTO everlight_post_saves (post_id, user_id) VALUES (?, ?)`, [postId, req.userId]);
    }
    const row = await dbGet(`SELECT COUNT(*) AS count FROM everlight_post_saves WHERE post_id = ?`, [postId]);
    return res.json({ saved: !existing, count: row.count });
  } catch (error) { next(error); }
});

app.get('/api/profile/history', auth, async (req, res, next) => {
  try {
    const posts = await dbAll(`
      SELECT p.*, u.username, u.display_name, u.avatar, u.name_color,
        (SELECT COUNT(*) FROM everlight_post_likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM everlight_post_saves s WHERE s.post_id = p.id) AS save_count,
        CASE WHEN EXISTS (SELECT 1 FROM everlight_post_likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) THEN 1 ELSE 0 END AS liked,
        CASE WHEN EXISTS (SELECT 1 FROM everlight_post_saves s2 WHERE s2.post_id = p.id AND s2.user_id = ?) THEN 1 ELSE 0 END AS saved
      FROM everlight_posts p
      JOIN everlight_users u ON u.id = p.author_id
      WHERE p.author_id = ?
      ORDER BY p.created_at DESC
      LIMIT 100
    `, [req.userId, req.userId, req.userId]);
    return res.json({ posts: posts || [] });
  } catch (error) { next(error); }
});

app.get('/api/profile/reactions', auth, async (req, res, next) => {
  try {
    const liked = await dbAll(`
      SELECT p.*, u.username, u.display_name, u.avatar, u.name_color,
        (SELECT COUNT(*) FROM everlight_post_likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM everlight_post_saves s WHERE s.post_id = p.id) AS save_count,
        1 AS liked,
        CASE WHEN EXISTS (SELECT 1 FROM everlight_post_saves s2 WHERE s2.post_id = p.id AND s2.user_id = ?) THEN 1 ELSE 0 END AS saved
      FROM everlight_post_likes l
      JOIN everlight_posts p ON p.id = l.post_id
      JOIN everlight_users u ON u.id = p.author_id
      WHERE l.user_id = ?
      ORDER BY l.created_at DESC
      LIMIT 100
    `, [req.userId, req.userId]);
    const saved = await dbAll(`
      SELECT p.*, u.username, u.display_name, u.avatar, u.name_color,
        (SELECT COUNT(*) FROM everlight_post_likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM everlight_post_saves s WHERE s.post_id = p.id) AS save_count,
        CASE WHEN EXISTS (SELECT 1 FROM everlight_post_likes l2 WHERE l2.post_id = p.id AND l2.user_id = ?) THEN 1 ELSE 0 END AS liked,
        1 AS saved
      FROM everlight_post_saves s
      JOIN everlight_posts p ON p.id = s.post_id
      JOIN everlight_users u ON u.id = p.author_id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
      LIMIT 100
    `, [req.userId, req.userId]);
    return res.json({ liked, saved });
  } catch (error) { next(error); }
});

/* =========================================================
   EVERLIGHT PUBLIC STATS
   ========================================================= */

app.get('/api/stats', async (req, res, next) => {
  try {
    const [postRow, messageRow, userRow, newUserRow] = await Promise.all([
      dbGet(`SELECT COUNT(*) AS count FROM everlight_posts`),
      dbGet(`SELECT COUNT(*) AS count FROM everlight_messages`),
      dbGet(`SELECT COUNT(*) AS count FROM everlight_users WHERE username <> 'anonymous#0000'`),
      dbGet(`SELECT COUNT(*) AS count FROM everlight_users WHERE username <> 'anonymous#0000' AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)`)
    ]);

    return res.json({
      topics: Number(postRow?.count || 0),
      messages: Number(messageRow?.count || 0),
      users: Number(userRow?.count || 0),
      newUsers: Number(newUserRow?.count || 0)
    });
  } catch (error) {
    next(error);
  }
});

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

              name_color,

              COALESCE((
                SELECT MAX(ms.current_streak)
                FROM everlight_message_streaks ms
                WHERE (ms.user_a_id = u.id OR ms.user_b_id = u.id)
                  AND ms.last_message_date >= DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)
              ), 0) AS message_streak

            FROM everlight_users u

            WHERE last_seen >
              DATE_SUB(UTC_TIMESTAMP(), INTERVAL 5 MINUTE)
              AND username <> 'anonymous#0000'

            ORDER BY
              message_streak DESC,
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
   MESSAGE STREAKS
   A streak is maintained by message activity on consecutive calendar days.
   Same-day messages do not increase it; a missed day resets it to 1.
   ========================================================= */

function orderedPair(a, b) {
  const first = Number(a);
  const second = Number(b);
  return first < second
    ? [first, second]
    : [second, first];
}

async function updateMessageStreak(userA, userB) {
  const [a, b] = orderedPair(userA, userB);
  const today = await dbGet(`SELECT CURRENT_DATE AS today`);
  const todayValue = today?.today;
  const existing = await dbGet(
    `SELECT current_streak, last_message_date
     FROM everlight_message_streaks
     WHERE user_a_id = ? AND user_b_id = ?
     LIMIT 1`,
    [a, b]
  );

  if (!existing) {
    await dbRun(
      `INSERT INTO everlight_message_streaks
       (user_a_id, user_b_id, current_streak, last_message_date)
       VALUES (?, ?, 1, ?)`,
      [a, b, todayValue]
    );
    return 1;
  }

  const last = existing.last_message_date
    ? new Date(`${String(existing.last_message_date).slice(0, 10)}T00:00:00Z`)
    : null;
  const now = new Date(`${String(todayValue).slice(0, 10)}T00:00:00Z`);
  const diffDays = last
    ? Math.round((now - last) / 86400000)
    : Infinity;

  let streak = Number(existing.current_streak || 0);
  if (diffDays === 0) {
    // Already active today.
  } else if (diffDays === 1) {
    streak += 1;
  } else {
    streak = 1;
  }

  await dbRun(
    `UPDATE everlight_message_streaks
     SET current_streak = ?, last_message_date = ?
     WHERE user_a_id = ? AND user_b_id = ?`,
    [streak, todayValue, a, b]
  );

  return streak;
}

async function getMessageStreak(userA, userB) {
  const [a, b] = orderedPair(userA, userB);
  const row = await dbGet(
    `SELECT current_streak, last_message_date
     FROM everlight_message_streaks
     WHERE user_a_id = ? AND user_b_id = ?
     LIMIT 1`,
    [a, b]
  );

  if (!row || !row.last_message_date) return 0;

  const today = await dbGet(`SELECT CURRENT_DATE AS today`);
  const last = new Date(`${String(row.last_message_date).slice(0, 10)}T00:00:00Z`);
  const now = new Date(`${String(today?.today).slice(0, 10)}T00:00:00Z`);
  const diffDays = Math.round((now - last) / 86400000);

  // A missed day ends the visible streak immediately, without deleting history.
  if (diffDays > 1) return 0;
  return Number(row.current_streak || 0);
}

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
            MAX(m.created_at) AS last_message_at,
            COALESCE((
              SELECT ms.current_streak
              FROM everlight_message_streaks ms
              WHERE ms.user_a_id = LEAST(?, u.id)
                AND ms.user_b_id = GREATEST(?, u.id)
              LIMIT 1
            ), 0) AS message_streak
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
        [req.userId, req.userId, req.userId, req.userId, req.userId]
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

      const streak = await getMessageStreak(
        req.userId,
        other.id
      );

      return res.json({
        user: safeUser(other),
        streak,
        messages: messages || []
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

      const streak = await updateMessageStreak(
        req.userId,
        other.id
      );

      return res
        .status(201)
        .json({
          id: result.insertId,
          streak
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

        console.log(`Adatbázis: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
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
