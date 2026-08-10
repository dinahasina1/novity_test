# Bowling Score — GraphQL + UI

Scoreur de bowling **15 quilles** (5 frames) : API GraphQL (FastAPI / Strawberry) + interface Next.js.

[![UI Web](https://img.shields.io/badge/UI_Web-Production-0ea5e9?style=for-the-badge&logo=nextdotjs&logoColor=white)](http://novity-test.dinagency.tech/)
[![GraphQL](https://img.shields.io/badge/GraphQL-Production-E10098?style=for-the-badge&logo=graphql&logoColor=white)](https://backend-novity.dinagency.tech/graphql)

| Interface | URL prod |
|---|---|
| **UI Web** (Vercel) | [http://novity-test.dinagency.tech/](http://novity-test.dinagency.tech/) |
| **GraphQL** (Dokploy) | [https://backend-novity.dinagency.tech/graphql](https://backend-novity.dinagency.tech/graphql) |

---

## Comment marche l’UI

L’écran principal (`Partie`) édite une partie complète puis l’envoie à l’API pour calcul + persistance.

### Frames F1–F5

- Chaque frame a jusqu’à **3 lancers** (tokens : `X`, `/`, `-`, `1`…`14`).
- **Strike** `X` : 1 lancer, 15 quilles.
- **Spare** `/` : complète le frame (total 15).
- **Open** : 3 lancers si les deux premiers n’atteignent pas 15.
- Les listes déroulantes ne proposent que les options **valides** (pas plus de 15 quilles).
- Bouton **rnd** sur une frame : régénère uniquement cette frame.

### Bonus (extensions)

- Après F1–F5, si un strike / spare a besoin de lancers suivants, un bloc **Bonus** apparaît.
- Les bonus suivent **les mêmes règles de groupes** que les frames (reframe si trop de quilles) :
  - un strike = groupe de 1 ;
  - un spare = fin de groupe ;
  - sinon groupes de 2 ou 3 lancers comme une frame.
- Le nombre de slots bonus est calculé automatiquement (`missingBonusThrows`).

### Actions

| Bouton | Effet |
|---|---|
| **Aléatoire** | Génère 1 partie valide (5 frames + bonus) |
| **10 aléatoires** | Génère et **score** 10 parties via GraphQL, les ajoute au tableau |
| **Reset** | Vide l’éditeur |
| **Scorer** | Mutation `scoreGame` → total + détail des frames, ligne ajoutée au tableau |

### Tableau des jeux

- Liste les parties déjà scorées (chargées au démarrage via `games`, puis enrichies localement).
- Affiche total, frames, bonus et scores par frame.

---

## Exemples

[Exemples → playground GraphQL](https://backend-novity.dinagency.tech/graphql) — colle la mutation + les variables ci-dessous (prod).  
En local : [http://localhost:8003/graphql](http://localhost:8003/graphql).

### Calculs de score (données factices)

On ne regarde que le **total** (et les scores de frames).

| Cas | Frames | Bonus | Total |
|---|---|---|---|
| Parfait | `[["X"],["X"],["X"],["X"],["X"]]` | `["X","X","X"]` | **300** |
| Mixte | `[["6","/"],["12","-","1"],["-","-","/"],["14","-","-"],["X"]]` | `["-","-","/"]` | **113** |
| Bonus spare puis strike | `[["X"],["X"],["X"],["X"],["X"]]` | `["6","/","X"]` | **261** |

Scores de frames attendus (mixte) : `27, 13, 29, 14, 30`.

### Mutation GraphQL (playground)

```graphql
mutation ScoreGame($frames: [[String!]!]!, $extensions: [String!]) {
  scoreGame(frames: $frames, extensions: $extensions) {
    total
    extensions
    frames {
      index
      score
      throws { value }
    }
  }
}
```

Variables — parfait (placeholder) :

```json
{
  "frames": [["X"], ["X"], ["X"], ["X"], ["X"]],
  "extensions": ["X", "X", "X"]
}
```

Variables — mixte (placeholder) :

```json
{
  "frames": [
    ["6", "/"],
    ["12", "-", "1"],
    ["-", "-", "/"],
    ["14", "-", "-"],
    ["X"]
  ],
  "extensions": ["-", "-", "/"]
}
```

`curl` (prod) :

```bash
curl -s https://backend-novity.dinagency.tech/graphql \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation($frames:[[String!]!]!,$extensions:[String!]){ scoreGame(frames:$frames,extensions:$extensions){ total frames{ index score } } }\",\"variables\":{\"frames\":[[\"X\"],[\"X\"],[\"X\"],[\"X\"],[\"X\"]],\"extensions\":[\"X\",\"X\",\"X\"]}}"
```

---

## Tester avec Docker (dev)

Stack front + back en hot-reload (volumes + commandes) :

```bash
# à la racine du repo
cp graphql-backend/.env.example graphql-backend/.env   # si besoin
docker compose -f docker-compose.dev.yml up
```

| Service | URL |
|---|---|
| UI | http://localhost:3000 |
| GraphQL | http://localhost:8003/graphql |

Arrêt :

```bash
docker compose -f docker-compose.dev.yml down
```

Backend seul (image build local, style déploiement) :

```bash
cd graphql-backend
cp .env.example .env
docker compose up --build
```

---

## Tester sans Docker

### 1. API GraphQL (Python + venv)

```bash
cd graphql-backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
# source .venv/bin/activate

pip install -r requirements-dev.txt
cp .env.example .env
```

Dans `.env` pour un run local **hors** Docker, utilise plutôt :

```env
DATABASE_URL=sqlite:///./bowling.db
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
APP_PORT=8003
```

Lancer l’API :

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8003
```

Tests unitaires (gate CI) :

```bash
pytest -q
```

Playground local : http://localhost:8003/graphql

### 2. UI Web (Next.js)

Dans un **autre** terminal :

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

`.env.local` attendu en local :

```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:8003/graphql
```

UI : http://localhost:3000

> En **prod Vercel**, `NEXT_PUBLIC_GRAPHQL_URL` doit être `https://backend-novity.dinagency.tech/graphql` (jamais `localhost`).

---

## Structure

```
bowling/
├── docker-compose.dev.yml      # front + back (mode dev)
├── Dockerfile.dokploy          # pull image GHCR (Dokploy)
├── frontend/                   # Next.js (Vercel)
└── graphql-backend/            # FastAPI + Strawberry
    ├── Dockerfile              # build image (CI / compose)
    ├── docker-compose.yml      # API seule
    ├── .env.example
    └── tests/
```

## Variables d’environnement

Tout passe par `.env` / `.env.local` / Vercel / Dokploy — **rien d’URL prod en dur dans le code**.

| Variable | Où | Rôle |
|---|---|---|
| `NEXT_PUBLIC_GRAPHQL_URL` | frontend | URL de l’API vue par le navigateur |
| `DATABASE_URL` | backend | SQLite (fichier ou volume `/data`) |
| `CORS_ORIGINS` | backend | Origines autorisées (UI local + prod) |
| `APP_PORT` | backend | Port d’écoute (défaut `8003`) |
