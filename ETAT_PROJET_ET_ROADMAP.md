# UniSahel — État réel du projet & Roadmap vers un SaaS 100% fonctionnel

> **Ce document remplace les documents de planification précédents** (`AUDIT_REPORT.md`, `IMPLEMENTATION_PLAN.md`, `PROGRESS_TRACKING.md`, `PRODUCTION_PLAN.md`, `PHASE1_PROGRESS.md`), datés du 2026-06-07/08 et **obsolètes** : ils annonçaient ~13% d'avancement et ne reflètent plus le code réel. Le contenu ci-dessous est basé sur une lecture directe du code source au commit `95bd31c` (2026-07-24), pas sur les anciens rapports.
>
> **Recommandation** : une fois ce document validé, archiver ou supprimer les 5 fichiers ci-dessus pour éviter toute confusion future (je ne les ai pas touchés — à confirmer avec toi).

---

## 🚨 RÉSUMÉ EXÉCUTIF — à lire en premier

> **Mise à jour du 2026-07-24 (suite session) :** Chantier 0 (build cassé) et l'essentiel de Chantier 2 (migration Postgres) sont **terminés**. Détail en fin de document, section [Journal des correctifs appliqués](#journal-des-correctifs-appliqués).

**Diagnostic initial** (avant correctifs) : le build était cassé. Le commit `95bd31c` (export xlsx) avait corrompu **12 fichiers `.tsx`** avec une édition automatique ratée (ligne d'import dupliquée 14 à 34 fois, texte français mal encodé). Résultat à l'époque :
- `npx tsc --noEmit` → **232 erreurs**
- `npx eslint .` → **12 erreurs de parsing + 98 warnings**
- `next build` (donc tout déploiement Vercel) **échouait**

C'était le **blocage n°0**. Voir [Chantier 0](#chantier-0--durgence-débloquer-le-build-jour-0) — **maintenant réglé**, voir le journal en bas de page.

En dehors de ça, le projet est **plus avancé que ce que suggéraient les anciens rapports**, mais avec un écart caractéristique : **le backend est souvent réel, le branchement au frontend ou à l'auth est cassé silencieusement**. C'est le piège principal — plusieurs modules "ont l'air" fonctionnels (Prisma réel, validation réelle) mais renvoient un 500 sur chaque appel à cause d'un bug de signature de fonction (voir Chantier 1).

| Dimension | État réel | Détail |
|---|---|---|
| Build / compilation | 🔴 **Cassé** | 12 fichiers corrompus, commit `95bd31c` |
| Schéma Prisma | ✅ Solide | 64 modèles, multi-tenant |
| Auth (NextAuth + middleware) | ✅ Réel | JWT validé, bcrypt, audit log au login |
| RBAC serveur | 🟠 Partiel | Bien fait sur 5 routes, cassé sur 10, absent sur 4 |
| API routes (21 fichiers) | 🟠 Mitigé | 5 fonctionnelles, 10 cassées (bug signature), 4 ouvertes sans auth, 2 hors périmètre |
| Frontend ↔ API | 🔴 Faible | 3 hooks React Query seulement ; 21 pages encore 100% données de démo |
| Génération PDF | 🟠 Partiel | PDF réel (react-pdf), mais QR code jamais généré malgré la dépendance installée |
| Paiements | 🟠 Mocké | CRUD réel, mais Mobile Money (Airtel/Orange/MTN/Moov) 100% simulé |
| Base de données | 🔴 Risque archi | SQLite copié en `/tmp` en prod = **données non persistantes** entre cold starts |
| Migrations DB | 🔴 Absent | Aucune, `db push` uniquement |
| Tests | 🔴 Quasi nul | 2 fichiers, fonctions utilitaires seulement |
| CI/CD | 🔴 Absent | Aucun GitHub Actions, aucun garde-fou |
| Variables d'env | 🟠 Non documenté | 5 variables utilisées, aucun `.env.example` |

---

## 1. Architecture actuelle

**Stack** : Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 + shadcn/ui · Prisma 6 + SQLite · NextAuth v4 (JWT) · TanStack Query v5 · Zustand · Framer Motion · `@react-pdf/renderer` · `xlsx`.

```
src/
├── app/
│   ├── api/                    # 21 route.ts — voir tableau §3
│   ├── layout.tsx / page.tsx   # Router principal (44 vues via Zustand)
├── components/                 # 92 .tsx dans ~37 modules métier
├── lib/
│   ├── auth/{config.ts,helpers.ts}  # NextAuth + requireAuth/requireRole/withTenantAuth
│   ├── db.ts                   # Client Prisma (+ hack /tmp en prod, voir §6)
│   ├── api-hooks.ts             # 3 hooks React Query seulement
│   ├── pdf/                     # Templates react-pdf réels
│   ├── export.ts                # Export xlsx réel
│   └── validations/api.ts       # Schémas Zod (students, grades, payments)
├── middleware.ts                # Valide un vrai JWT NextAuth (getToken)
└── prisma/schema.prisma         # 64 modèles, SQLite
```

Pas de `.env.example`, pas de `Dockerfile`, pas de `vercel.json`/`vercel.ts`, pas de `.github/workflows/`. Un `Caddyfile` existe mais sert seulement de proxy pour l'environnement de preview/sandbox, pas de la prod réelle.

---

## 2. Ce qui marche vraiment aujourd'hui

- **Auth** : `src/lib/auth/config.ts` — Credentials provider, Zod, `bcrypt.compare`, `PrismaAdapter`, JWT, audit log réel sur connexion.
- **Middleware** : `src/middleware.ts` — valide un token via `getToken()`, redirige vers `/login` si absent, matcher correct.
- **Helpers RBAC** : `src/lib/auth/helpers.ts` — `requireAuth`, `requireRole`, `withAuth`, `withTenantAuth` (isolation tenant réelle : 403 si `tenantId` ne correspond pas à la session, sauf `SUPER_ADMIN`).
- **5 routes API solides** (Prisma réel + Zod + RBAC correct + audit log) : `dashboard`, `grades`, `payments`, `students`, `teachers`.
- **Génération PDF réelle** : `documents/generate/route.ts` produit de vrais PDF (`@react-pdf/renderer`) pour 6 types de documents, avec code de vérification stocké en DB et lisible via `documents/verify/[code]`.
- **Export Excel réel** : `src/lib/export.ts` + boutons connectés sur toute l'app (commit récent).
- **Seed réaliste** : `src/app/api/seed/route.ts` (1346 lignes) — jeu de données cohérent (1 tenant, facultés, départements, programmes, 16 enseignants, 32 étudiants, notes, paiements, hôpital...), idempotent.
- **3 pages réellement branchées à l'API** via React Query : `students-list.tsx`, `payments-page.tsx`, `dashboard-home.tsx`.

---

## 3. Détail des 21 routes API

| Route | Méthodes | Prisma réel | Validation | Auth/rôles | État |
|---|---|---|---|---|---|
| `dashboard` | GET | ✅ | — | `withTenantAuth` correct | ✅ **OK** |
| `grades` | GET/POST/PUT | ✅ | Zod | `withTenantAuth` correct | ✅ **OK** |
| `payments` | GET/POST/PUT/DELETE | ✅ | Zod | `withTenantAuth` correct | ✅ **OK** (Mobile Money mocké, §5) |
| `students` | GET/POST/PUT/DELETE | ✅ | Zod | `withTenantAuth` correct | ✅ **OK** |
| `teachers` | GET/POST/PUT/DELETE | ✅ | Zod | `withTenantAuth` correct | ✅ **OK** |
| `structure` | GET | ✅ | — | wrapped mais **cassé** | 🔴 500 systématique |
| `hr` | GET/POST | ✅ | manuelle | wrapped mais **cassé** | 🔴 500 systématique |
| `online-exams` | GET/POST | ✅ | manuelle | wrapped mais **cassé** | 🔴 500 systématique |
| `reports` | GET/POST | ✅ | manuelle | wrapped mais **cassé** | 🔴 500 systématique |
| `rooms` | GET/POST | ✅ | manuelle | wrapped mais **cassé** | 🔴 500 systématique |
| `scholarships` | GET/POST | ✅ | — | wrapped mais **cassé** | 🔴 500 systématique |
| `attendance` | GET/POST | ✅ | manuelle | GET **sans auth**, POST cassé | 🔴 faille + 500 |
| `internships` | GET/POST | ✅ | manuelle | GET **sans auth**, POST cassé | 🔴 faille + 500 |
| `communications` | GET/POST | ✅ | manuelle | GET **sans auth**, POST cassé | 🔴 faille + 500 |
| `alumni` | GET/POST | ✅ | — | GET **sans auth**, POST cassé | 🔴 faille + 500 |
| `documents/generate` | POST | ✅ | manuelle | session seule, **pas de vérif tenant** | 🟠 faille cross-tenant |
| `documents/types` | GET | — | — | correct (0-arg) | ✅ OK |
| `documents/verify/[code]` | GET | ✅ | — | public volontairement | ✅ OK |
| `seed` | GET | ✅ | — | session seule, pas de rôle | 🟠 à restreindre |
| `auth/[...nextauth]` | GET/POST | via NextAuth | Zod | N/A | ✅ OK |
| `route.ts` (racine `/api`) | GET | — | — | — | 🟡 scaffold "Hello, world!" à supprimer |

**Cause racine du bug à 500** : `withTenantAuth` appelle toujours `handler(sessionUser, tenantId, request)` (3 arguments) — `src/lib/auth/helpers.ts:157`. Plusieurs routes récentes ont été écrites avec une signature à un seul argument (`async function handleGet(request: NextRequest)`) et forcées avec `as any` pour faire taire TypeScript. À l'exécution, `request` à l'intérieur de ces handlers est en réalité l'objet `sessionUser`, pas la vraie requête → `request.url` est `undefined` → `new URL(undefined)` lève une exception → le `try/catch` de la route la transforme en 500. **La logique métier derrière est réelle et correcte, seul le branchement est cassé.**

---

## 4. Frontend ↔ backend — le vrai goulot d'étranglement

- React Query est bien configuré (`src/components/providers.tsx`) mais seulement **3 hooks existent** (`useDashboardStats`, `useStudents`, `usePayments`).
- **21 pages tournent encore à 100% sur des tableaux `const demo... = [...]` codés en dur**, sans un seul `fetch()` : `grades-page.tsx`, `teachers-page.tsx`, `timetable-page.tsx`, `scholarships-page.tsx`, `online-exam-page.tsx`, `results-page.tsx`, `room-booking-page.tsx`, `notification-panel.tsx`, `maquette-page.tsx`, `library-page.tsx`, `institution-page.tsx`, `internships-page.tsx`, `hr-page.tsx`, `import-export-page.tsx`, `candidature-page.tsx`, `attendance-page.tsx`, `advising-page.tsx`, `alumni-page.tsx`, `announcements-page.tsx`, `transport-page.tsx`.
- Cas frappant : `teachers-page.tsx`, `hr-page.tsx`, `attendance-page.tsx`, `scholarships-page.tsx`, `alumni-page.tsx` ont un **backend qui existe déjà** (voir §3) mais la page ne l'appelle jamais. Le fossé est purement côté frontend, pas une absence de backend.
- `documents-page.tsx` et `deliberation-page.tsx` appellent l'API en `fetch()` direct (pas via React Query) pour télécharger de vrais PDF — fonctionnel mais pas mis en cache/optimisé.

---

## 5. Paiements & Mobile Money

CRUD réel et solide (`payments/route.ts`). Mais :
- `initiateMobileMoneyPayment` — commentaire explicite dans le code : *"In production, here you would call the actual Mobile Money API / For now, return mock response"*. Aucun appel HTTP vers Airtel/Orange/MTN/Moov.
- `checkMobileMoneyStatus` — même chose, renvoie toujours `PENDING` en dur.
- Aucun dossier `src/lib/payments` ou `src/lib/mobile-money`, aucune clé API dans `process.env`.
- Le webhook handler existe et *fonctionnerait* si un vrai provider appelait, mais rien ne déclenche jamais ce flux.

---

## 6. Base de données — risque architectural le plus grave après le build

- `prisma/schema.prisma` : toujours SQLite (`env("DATABASE_URL")`).
- **Aucun dossier `prisma/migrations/`** — tout est fait en `db push`, aucun historique de schéma versionné.
- `src/lib/db.ts` (lignes 7-24) : en production, copie le fichier SQLite embarqué vers `/tmp/custom.db` (contournement du filesystem read-only de Vercel). **Conséquence : toute écriture en production est perdue au prochain cold start / redéploiement.** C'est un problème fondamental pour un SaaS multi-tenant réel, pas un détail cosmétique — inscriptions, notes, paiements saisis en prod peuvent disparaître.
- Aucun `.env`/`.env.local` commité (normal, gitignore), mais aucun `.env.example` non plus pour un nouvel arrivant.

---

## 7. Tests, qualité, déploiement

- **Tests** : 2 fichiers (`src/lib/pdf/utils.test.ts`, `validation.test.ts`), 8 tests, uniquement des fonctions utilitaires. 0 test de route API, 0 test de composant, 0 E2E.
- **Lint** : `npx eslint .` → 12 erreurs de parsing (fichiers corrompus) + 98 warnings.
- **TypeScript** : `npx tsc --noEmit` → 232 erreurs, toutes liées aux mêmes 12 fichiers.
- **CI/CD** : aucun `.github/workflows/`. Rien ne bloque un commit cassé avant qu'il n'atteigne la branche principale — c'est très probablement comme ça que la corruption du build est passée inaperçue.
- **Déploiement** : pas de `Dockerfile`, pas de `vercel.json`/`vercel.ts`.

---

## 8. Variables d'environnement (aucun `.env.example` actuellement)

| Variable | Utilisée dans | Remarque |
|---|---|---|
| `DATABASE_URL` | `src/lib/db.ts:5` | SQLite aujourd'hui |
| `NODE_ENV` | `src/lib/db.ts` | déclenche le hack `/tmp` en prod |
| `NEXTAUTH_SECRET` | `middleware.ts`, `lib/auth/config.ts` | ⚠️ fallback codé en dur `"dev-secret-change-in-production-min-32-chars"` si absent — **danger** si jamais déployé sans variable définie |
| `NEXTAUTH_URL` | `api/auth/[...nextauth]/route.ts` | dérivé de `VERCEL_URL` |
| `VERCEL_URL` | idem | auto sur Vercel |

Aucune clé Mobile Money, email ou SMS nulle part — cohérent avec le fait que ces intégrations sont encore mockées.

---

## 9. Roadmap vers "100% fonctionnel et robuste"

### Chantier 0 — 🚨 Urgence : débloquer le build (Jour 0)
| # | Tâche | Détail |
|---|---|---|
| 0.1 | Réparer les 12 fichiers corrompus | Retirer les imports `exportToExcel` dupliqués/mal insérés, corriger l'encodage mojibake (`PrÃ©nom` etc.) dans `import-export-page.tsx` |
| 0.2 | Revalider | `tsc --noEmit` → 0 erreur, `eslint .` → 0 erreur de parsing, `next build` → succès |
| 0.3 | Ajouter un garde-fou immédiat | Au minimum un script `precommit` ou une Action GitHub qui lance `tsc`/`eslint`/`vitest` sur chaque push, pour ne plus jamais laisser ça arriver silencieusement |

**Rien d'autre ne doit être fait avant que ce chantier soit vert.**

### Chantier 1 — Sécurité & branchement backend (Semaine 1)
| # | Tâche |
|---|---|
| 1.1 | Corriger `withTenantAuth` ou les 10 handlers à signature incompatible (`structure`, `hr`, `online-exams`, `reports`, `rooms`, `scholarships`, et les POST de `attendance`/`internships`/`communications`/`alumni`) — choisir une convention unique et l'appliquer partout, supprimer les `as any` |
| 1.2 | Ajouter `withTenantAuth` sur les GET actuellement ouverts (`attendance`, `internships`, `communications`, `alumni`) — faille de fuite de données inter-tenant |
| 1.3 | Ajouter une vérification `tenantId` sur `documents/generate` (actuellement : n'importe quel utilisateur connecté peut générer un document pour n'importe quel tenant) |
| 1.4 | Restreindre `seed` à `SUPER_ADMIN` uniquement (ou le supprimer/désactiver hors dev) |
| 1.5 | Supprimer le fallback `NEXTAUTH_SECRET` codé en dur, échouer explicitement au démarrage si absent en production |
| 1.6 | Tests de régression sur ces 10+ routes pour garantir qu'elles répondent 200 et respectent l'isolation tenant |

### Chantier 2 — Persistance des données (Semaine 1-2) — bloquant pour toute prod réelle
| # | Tâche |
|---|---|
| 2.1 | Migrer vers PostgreSQL managé (Neon/Supabase/Vercel Postgres via Marketplace) — le hack SQLite `/tmp` n'est pas viable pour un SaaS multi-tenant en production |
| 2.2 | Initialiser `prisma migrate` avec un historique propre (remplacer `db push`) |
| 2.3 | Mettre à jour `src/lib/db.ts` (supprimer le hack de copie `/tmp`) |
| 2.4 | Adapter le seed pour Postgres, vérifier idempotence |

### Chantier 3 — Brancher le frontend restant (Semaine 2-4)
| # | Tâche |
|---|---|
| 3.1 | Créer les hooks React Query manquants (au moins 1 par module listé en §4) |
| 3.2 | Prioriser les modules dont le backend existe déjà mais n'est pas appelé : `teachers`, `hr`, `attendance`, `scholarships`, `alumni`, `internships`, `structure`, `rooms`, `online-exams`, `reports`, `communications` |
| 3.3 | Remplacer les `const demo... = [...]` par les hooks, garder loading/error/empty states |
| 3.4 | Généraliser le pattern déjà validé sur `students-list.tsx`/`payments-page.tsx`/`dashboard-home.tsx` |

### Chantier 4 — Fonctionnalités annoncées mais mockées (Semaine 3-5)
| # | Tâche |
|---|---|
| 4.1 | Intégration Mobile Money réelle (Airtel/Orange/MTN/Moov) — sandbox d'abord, ou état "à venir" explicite dans l'UI si non prioritaire |
| 4.2 | Génération de vrais QR codes (le package `qrcode` est installé mais jamais utilisé) pour la vérification de documents |
| 4.3 | Notifications email/SMS (aucune intégration actuellement, aucune clé configurée) |

### Chantier 5 — Qualité, tests, déploiement (Semaine 4-6)
| # | Tâche |
|---|---|
| 5.1 | Pipeline CI (GitHub Actions) : lint + typecheck + test + build sur chaque PR — **priorité haute**, aurait empêché le Chantier 0 |
| 5.2 | Tests d'intégration sur les routes API critiques (auth, students, grades, payments) |
| 5.3 | Au moins un test E2E du parcours critique (login → action → vérification) |
| 5.4 | `.env.example` documenté avec toutes les variables (§8 + celles ajoutées en Chantier 4) |
| 5.5 | Config de déploiement Vercel propre (`vercel.ts`, cf. skill `vercel:deployment-expert` disponible) |
| 5.6 | Nettoyage : supprimer `src/app/api/route.ts` (scaffold), consolider/archiver les 5 anciens docs de planning |

---

## 10. Définition de "100% fonctionnel et robuste"

- [ ] `next build` réussit sans erreur, `tsc --noEmit` et `eslint` propres
- [ ] Toutes les routes API protégées par auth + RBAC + isolation tenant vérifiées, aucune fuite de données
- [ ] Base de données persistante en production (Postgres géré), migrations versionnées
- [ ] Chaque module métier listé en §4 branché sur une vraie API (plus de `const demo...`)
- [ ] Paiements Mobile Money et notifications réels ou explicitement marqués "à venir" dans l'UI (pas de faux-semblant silencieux)
- [ ] QR code de vérification réellement scannable
- [ ] CI bloque tout commit qui casse build/lint/tests
- [ ] `.env.example` à jour, aucun secret par défaut codé en dur
- [ ] Couverture de tests significative sur l'auth et les modules critiques (étudiants, notes, paiements, documents)

---

## Journal des correctifs appliqués (2026-07-24, suite session)

### Chantier 0 — build débloqué ✅
- Les 12 fichiers `.tsx` corrompus ont été reconstruits : imports dédupliqués, encodage mojibake inversé (les caractères français corrompus provenaient d'un double encodage UTF-8 → CP1252 → UTF-8, réparé par transformation inverse).
- Bug annexe découvert et corrigé : `import-export-page.tsx` référençait des champs (`s.students`/`s.teachers`) inexistants dans le store Zustand — code jamais fonctionnel. Rebranché sur les vraies API via un nouveau hook `useTeachers` dans `src/lib/api-hooks.ts`, et le `select` Prisma de `/api/teachers` corrigé (prénom/nom manquants).
- Client Prisma régénéré (il était désynchronisé du schéma, ce qui cassait `prisma/seed.ts` et `/api/hr`).
- `npx tsc --noEmit`, `npx eslint .`, `npx vitest run` et `next build` sont tous propres.

### Chantier 2 — migration Postgres ✅ (en grande partie)
Découverte en cours de route : une base **Neon Postgres était déjà provisionnée sur Vercel** (projet `unisahel-tchad`) depuis 4 jours, mais `schema.prisma` pointait encore vers SQLite — la prod tournait donc sur le hack `/tmp` (lui-même cassé, cf. ci-dessous), complètement déconnectée de cette vraie base.

- `prisma/schema.prisma` : datasource basculée vers `postgresql`, avec `directUrl` (recommandé pour Neon : pooled pour le runtime, direct pour les migrations).
- Base introspectée avant toute action : elle contenait déjà le tenant de démo (`Université de N'Djaména`, 5 utilisateurs, 5 étudiants, 1 enseignant) — donc pas une base vierge. Vérifié qu'aucune donnée réelle ne serait perdue avant de synchroniser.
- `prisma db push --accept-data-loss` : synchronise la structure (quelques colonnes obsolètes supprimées sur `Tenant`/`TenantSettings`, une table `contact_requests` vide supprimée — rien de significatif). Données existantes vérifiées intactes après coup.
- **Historique de migrations initialisé** (`prisma/migrations/20260607000000_init/`) — le projet tournait en `db push`-only sans aucune trace versionnée ; c'est maintenant en place, `prisma migrate status` est propre.
- `src/lib/db.ts` simplifié : suppression totale du hack `/tmp` (devenu mort maintenant que `DATABASE_URL` pointe toujours vers Postgres, dans tous les environnements Vercel — dev/preview/prod l'ont déjà). Fichier SQLite embarqué `prisma/db/custom.db` (712 Ko) supprimé, ainsi que la référence dans `next.config.ts`.
- **Important — bug corrigé en amont** : avant cette session, `src/lib/db.ts` ignorait `DATABASE_URL` même quand il était configuré (le hack `/tmp` s'appliquait inconditionnellement en production). Autrement dit, même une fois Postgres branché, l'app n'aurait jamais réellement écrit dedans sans ce correctif.

**Reste à faire côté Chantier 2** : rien de bloquant. Pour aller plus loin : envisager de réensemencer une base de démo plus riche (`/api/seed` complet) si utile pour les tests, et vérifier qu'un vrai flux de déploiement (push → build Vercel) fonctionne de bout en bout avec la nouvelle configuration — pas encore testé en conditions réelles de déploiement.

### Accès Vercel
Un token Vercel a été fourni en session (durée de vie : 1 semaine annoncée par l'utilisateur). Stocké uniquement dans `.env.local` (ignoré par git, jamais commité). Projet Vercel identifié : `unisahel-tchad` (compte `ndouwesalvadors-projects`), lié en local via `vercel link`. Aucun cron Vercel n'était configuré au moment de l'inspection — à clarifier avec l'utilisateur si un cron spécifique est souhaité (ex. sauvegardes automatisées, cf. Chantier 4.9).

---

*Document généré à partir d'une lecture directe du code source, commit `95bd31c`, le 2026-07-24. Mis à jour le même jour après les correctifs Chantier 0 / Chantier 2.*
