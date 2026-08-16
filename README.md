# Everlight 🌙

Egy emberi léptékű tér rövid történetekhez, félbehagyott gondolatokhoz és idézetekhez, amiket jó lenne nem elfelejteni.

## Funkciók

- ✨ Anonim és bejelentkezés utáni posztolás
- 🎨 Testreszabható profil (borítókép, profilkép, szín, bio)
- 💬 Privát üzenetek felhasználók között
- 👥 Valós idejű online felhasználók listája
- 📱 PWA - telepíthető mobilra
- 🌗 Fekete-fehér mód

## Telepítés

### Lokálisan (Node.js szükséges)

```bash
# Függőségek telepítése
npm install

# .env fájl létrehozása
cp .env.example .env

# JWT_SECRET módosítása
nano .env

# Szerver indítása
npm start
```

Nyissa meg: `http://localhost:5470`

### Docker / Pterodactyl

Startup command:
```bash
npm install && npm start
```

### Render.com

1. Regisztráljon [render.com](https://render.com) oldalon
2. Csatlakozzon GitHub-hoz
3. Új Web Service → válassza ki ezt a repo-t
4. Build command: `npm install`
5. Start command: `npm start`
6. Environment variables:
   - `JWT_SECRET`: generálja egy hosszú random szöveget
   - `PORT`: 5470 (opcionális, Render automatikusan beállítja)

## Technológia

- **Frontend**: Vanilla JavaScript (modern HTML/CSS, PWA)
- **Backend**: Express.js
- **Adatbázis**: SQLite3
- **Authentikáció**: JWT + bcryptjs

## API Dokumentáció

### Authentikáció

```
POST /api/auth/enter
Bejelentkezés vagy regisztráció

Body:
{
  "username": "nev#1234",
  "password": "jelszó",
  "email": "optional@email.com"
}

Response:
{
  "token": "jwt...",
  "user": { ... }
}
```

```
GET /api/auth/me
Headers: Authorization: Bearer {token}
Jelenlegi felhasználó adatai
```

### Posztok

```
GET /api/posts
Összes posztot listázza

POST /api/posts
Headers: Authorization: Bearer {token}
Body:
{
  "body": "Gondolat szövege",
  "category": "Gondolat|Történet|Idézet|Élet|Alkotás",
  "image": "base64...",
  "anonymous": false
}
```

### Profil

```
PUT /api/profile
Headers: Authorization: Bearer {token}
Body:
{
  "displayName": "Megjelenítési név",
  "bio": "Bemutatkozás",
  "avatar": "base64...",
  "cover": "base64...",
  "nameColor": "#67e7dd",
  "profileColor": "#273638",
  "status": "✦ Elérhető",
  "pronouns": "ő/őt",
  "location": "Budapest",
  "website": "example.com"
}
```

### Üzenetek

```
GET /api/messages/:username
Headers: Authorization: Bearer {token}
Üzenetek egy felhasználóval

POST /api/messages/:username
Headers: Authorization: Bearer {token}
Body: { "body": "Üzenet szövege" }
```

### Online felhasználók

```
GET /api/online
Az elmúlt 5 percben aktív felhasználók
```

## Fejlesztés

```bash
# Szerver indítása fejlesztési módban
npm start

# Böngésző: http://localhost:5470
```

## Licencia

Egyéni felhasználásra. Fordítás, módosítás szabad.

---

**Készítette:** nodayy 🙏
