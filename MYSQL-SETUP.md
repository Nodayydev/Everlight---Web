# Everlight – MySQL beállítás

Az Everlight mostantól **MySQL-t használ SQLite helyett**, ezért a Render fájlrendszerének újraindítása nem törli a profilokat, bejegyzéseket, kedveléseket, mentéseket és üzeneteket.

## Render Environment Variables

Állítsd be a Render Web Service → Environment menüben:

- `JWT_SECRET` = saját hosszú, véletlenszerű titok
- `DB_HOST` = `node.tejaa.eu`
- `DB_PORT` = `3306`
- `DB_NAME` = a tárhelyen létrehozott adatbázis neve
- `DB_USER` = az adatbázis felhasználóneve
- `DB_PASSWORD` = az adatbázis jelszava
- `DB_CONNECTION_LIMIT` = `5`

**Jelszót ne tegyél a kódba, ZIP-be vagy GitHubba.**

Az alkalmazás induláskor automatikusan létrehozza az `everlight_*` táblákat az adatbázisban.

## Fontos

A korábbi Render SQLite adatbázis adatai nem kerülnek automatikusan át a MySQL-be. Az új MySQL adatbázisban létrejön a tartós adatmodell; a később létrehozott profilok, bejegyzések, kedvelések, mentések és üzenetek már ott maradnak restart után is.
