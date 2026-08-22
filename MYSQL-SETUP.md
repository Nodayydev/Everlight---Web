# Everlight – MySQL beállítás

Az Everlight mostantól **MySQL-t használ SQLite helyett**, ezért a Render fájlrendszerének újraindítása nem törli a profilokat, bejegyzéseket, kedveléseket, mentéseket és üzeneteket.

## Render Environment Variables

Állítsd be a Render Web Service → Environment menüben:

| Kulcs                  | Érték                                      | Megjegyzés                  |
|------------------------|--------------------------------------------|-----------------------------|
| `JWT_SECRET`           | saját hosszú, véletlenszerű titok          | kötelező                     |
| `DB_HOST`              | `node.tejaa.eu` (vagy a te hostod)         | kötelező                     |
| `DB_PORT`              | `3306`                                     | általában ez                |
| `DB_NAME`              | a tárhelyen létrehozott adatbázis neve     | kötelező                     |
| `DB_USER`              | az adatbázis felhasználóneve               | kötelező                     |
| `DB_PASSWORD`          | az adatbázis jelszava                      | kötelező                     |
| `DB_CONNECTION_LIMIT`  | `5`                                        | ajánlott free plan esetén   |

**Jelszót soha ne tegyél a kódba, ZIP-be vagy GitHubba.**

Az alkalmazás induláskor automatikusan létrehozza az `everlight_*` táblákat az adatbázisban.

## Fontos

A korábbi Render SQLite adatbázis adatai **nem** kerülnek automatikusan át a MySQL-be.  
Az új MySQL adatbázisban létrejön a tartós adatmodell; a később létrehozott profilok, bejegyzések, kedvelések, mentések és üzenetek már ott maradnak restart után is.

Ha migrálni szeretnéd a régi adatokat, exportáld őket SQLite-ból és importáld MySQL-be (külön script szükséges).
