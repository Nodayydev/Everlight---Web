# Everlight – végső javítások

## Feed / szövegszerkesztő
- A szövegszerkesztő gombjai most ténylegesen markdown-formázást készítenek.
- A feed és a teljes bejegyzés nézete a formázást rendereli, ezért nem jelenik meg többé nyersen a `**szöveg**`.
- Működik: félkövér, dőlt, cím, lista, idézet, link, kód, emoji, táblázat, kép/média beszúrás, visszavonás/újra, piszkozat mentése és előnézet.
- Kép nélküli bejegyzésnél nincs üres képmező vagy díszítő blokk: csak a szöveges kártya jelenik meg.
- A kategóriafüggő karakterlimit továbbra is érvényes.

## Profil
- A profil-szerkesztő ideiglenes képállapota most nyitáskor a ténylegesen mentett profilból indul.
- Mégse után a félbehagyott képválasztás nem marad bent.
- A profilkép és borítókép előnézete fix méretű, nem tud kifutni a kártyából.
- Mobilon a profil-szerkesztő képkártyái egységes, kontrollált méretűek.
- A teljes profilnézet borítója és tartalma stabil, nem nyúlik túl a viewporton.
- Bejelentkezés után a profil összefoglalója sem marad „Még ismeretlen vagy” állapotban.

## Adatmentés
- A meglévő adatbázist a csomag nem tartalmazza, így telepítéskor nem írható felül egy üres SQLite adatbázissal.
- A korábbi szerveroldali profil- és bejegyzésmentés változatlanul megmaradt.
