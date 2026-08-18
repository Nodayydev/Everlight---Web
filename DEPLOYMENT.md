# GitHub & Render Deployment Guide

## 1️⃣ GitHub Repository Létrehozása

### A. Csatlakozzon GitHub-hoz
1. Menjen: [github.com](https://github.com)
2. Kattintson a **"+"** ikonra (jobb felső sarok)
3. **"New repository"** → Adja meg az adatokat:
   - **Repository name:** `everlight`
   - **Description:** `Everlight - secure anonymous posting platform`
   - **Visibility:** Public (vagy Private, ahogy szeretné)
   - **Initialize repository:** NE válassza ki (már van .gitignore és README.md)

4. Kattintson **"Create repository"**

### B. GitHub SSH/HTTPS beállítása

Miután létrehozta a repo-t, GitHub megmutatja az instructionokat. Az egyik lehetőség:

#### HTTPS megoldás (egyszerűbb):

```bash
cd /home/nodayy/IdeaProjects/Everlight

# Adjuk hozzá a GitHub remote-ot
git remote add origin https://github.com/YOURUSERNAME/everlight.git

# Kattintson az "master" branch-re (vagy main, aszerint)
git branch -M main

# Push-oljuk a kódot
git push -u origin main
```

**YOURUSERNAME** helyére írja be a GitHub felhasználónevét!

#### SSH megoldás (biztonságosabb):

```bash
cd /home/nodayy/IdeaProjects/Everlight

git remote add origin git@github.com:YOURUSERNAME/everlight.git
git branch -M main
git push -u origin main
```

(SSH kulcs szükséges - ha nincs, a HTTPS könnyebb)

---

## 2️⃣ Render.com Deployment

### A. Regisztráció

1. Menjen: [render.com](https://render.com)
2. **"Sign up"** → GitHub-bal csatlakozzon
3. Engedélyezze a Render-nek, hogy elérje GitHub repo-it

### B. New Web Service

1. Dashboard → **"New +"** → **"Web Service"**
2. **"Connect a repository"** → válassza ki az `everlight` repo-t
3. Adja meg az adatokat:
   - **Name:** `everlight`
   - **Region:** Frankfurt (vagy bármilyen)
   - **Branch:** `main`
   - **Runtime:** Node
   - **Build command:** `npm install`
   - **Start command:** `npm start`

### C. Environment Variables

Alul az "Environment" szekció:
- Kattintson **"Add Environment Variable"**
- **Key:** `JWT_SECRET`
- **Value:** Generáljon egy hosszú random szöveget, pl.:
  ```
  your_super_secret_random_key_at_least_32_chars_long_12345abcdefgh
  ```
  
  (Vagy bash-ben: `openssl rand -hex 32`)

### D. Deploy

1. Kattintson **"Create Web Service"**
2. Render elkezdi a build-et és deploy-t
3. Vájon 3-5 percet, míg végezzen

### E. Egyedi URL

Miután ready, a Render adni fog egy URL-t, pl:
```
https://everlight-xxxxx.onrender.com
```

**Ezzel lehet elérni az alkalmazást!**

---

## 3️⃣ Frissítések Push-olása

Minden alkalommal, amikor módosít kódot:

```bash
cd /home/nodayy/IdeaProjects/Everlight

# Hozzáadja a módosított fájlokat
git add .

# Commit az üzenettel
git commit -m "Describe your changes here"

# Push a GitHub-ra
git push origin main
```

**Render automatikusan deploy-ol minden push után!** ✨

---

## 4️⃣ Pterodactyl (Docker)

A Docker konténerben is használható. A Startup Command:

```bash
/bin/bash start.sh
```

Vagy közvetlenül:

```bash
npm install && npm start
```

---

## 5️⃣ Troubleshooting

### Render: "No available memory"
- Cserélje meg Paid плануra (free 0.5 GB RAM)

### Render: Build hiba
- Nézze meg a build logs-okat
- Győződjön meg, hogy a `package.json` helyes
- `npm install` helyileg működik?

### GitHub: Push auth error
- Generálja újra az SSH kulcsot vagy használjon HTTPS-t
- https://docs.github.com/en/authentication/connecting-to-github-with-ssh

---

**Kész!** Az alkalmazás fent lesz a Render-en! 🚀

Kérdés? Írjon! 💬


## Everlight javított csomag — 2026-08-16

A jelenlegi javítások:
- profil testreszabás közvetlenül a `/api/profile` végpontra ment;
- profil- és borítóképek kliensoldali tömörítést kapnak;
- a szerver a hibás/túl nagy képeket nem nyeli el csendben;
- posztképek tömörítve kerülnek mentésre;
- üzenetekhez külön beszélgetéslista API került be;
- a mobil fejléc fixen látható;
- a mobil feed nem tud oldalirányban kilógni;
- a mobil dock vékonyabb és safe-area kompatibilis;
- az üres toast nem jelenik meg fehér kapszulaként;
- a profil-testreszabó mobilon saját belső görgetést használ.

### Fontos Render megjegyzés

Az SQLite adatbázis (`everlight.db`) a szerver fájlrendszerén van. Renderen a tartós adatmegőrzéshez persistent disk vagy külső adatbázis szükséges. A frontend/backend javítás önmagában nem teszi az ingyenes, ephemeral fájlrendszert tartóssá új deploy/restart után.
