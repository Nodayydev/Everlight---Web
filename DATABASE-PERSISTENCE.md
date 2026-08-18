# Everlight adatmentés – fontos

A kód minden lényeges Everlight-adatot SQLite-ba ment:

- felhasználó és bejelentkezési adatok
- e-mail cím
- megjelenítési név
- bemutatkozás
- avatar és borítókép
- név- és profil-színek
- státusz, névmások, hely, weboldal
- Everlight-bejegyzések, kategória, kép és névtelenség
- privát üzenetek
- létrehozási és aktivitási időpontok

A csomag szándékosan NEM tartalmaz élő `everlight.db` fájlt. Így egy telepítés/frissítés nem írja felül a már meglévő adatbázist.

A szerver induláskor automatikusan létrehozza/migrálja a szükséges táblákat. A DB helye a `DB_FILE` környezeti változóval állítható; ha nincs megadva, a régi kompatibilitás miatt `everlight.db` marad.

## Render / Docker

Az SQLite fájl csak akkor marad meg újraindítás/deploy után, ha a futtatási környezet tartós lemezt biztosít. Renderen például persistent disk vagy külső adatbázis szükséges.

Ha persistent disk van `/var/data` alatt, állítsd:

```text
DB_FILE=/var/data/everlight.db
```

## Username

A bejelentkezés kis-/nagybetű-független, de az újonnan létrehozott felhasználónév eredeti írásmódja megmarad. Például `Nodayy#0614` nem alakul át automatikusan `nodayy#0614` értékre.

## Bejegyzések

A szerveroldali karakterlimit most ugyanazt a kategóriafüggő limitet használja, mint a kliens:

- Gondolat: 280
- Történet: 600
- Idézet: 500
- Élet: 400
- Alkotás: 1000
