# UniSahel — État réel du projet & Roadmap vers un SaaS 100% fonctionnel

> **Ce document remplace les documents de planification précédents** (`AUDIT_REPORT.md`, `IMPLEMENTATION_PLAN.md`, `PROGRESS_TRACKING.md`, `PRODUCTION_PLAN.md`, `PHASE1_PROGRESS.md`), datés du 2026-06-07/08 et **obsolètes** : ils annonçaient ~13% d'avancement et ne reflètent plus le code réel. Le contenu ci-dessous est basé sur une lecture directe du code source au commit `95bd31c` (2026-07-24), pas sur les anciens rapports.
>
> **Mise à jour 2026-07-25** : les 5 fichiers ci-dessus ont été déplacés vers [`archive/`](archive/) (Chantier 5.6).

---

## 🚨 RÉSUMÉ EXÉCUTIF — à lire en premier

> **Mise à jour du 2026-07-25 (suite session, batch 2) :** Chantiers 0 (build cassé), 1 (sécurité API), l'essentiel de 2 (migration Postgres), 3 (branchement frontend, **désormais complet** pour tous les modules avec modèle Prisma), et l'essentiel de 5 (CI/tests) sont **terminés**. Chantier 4 (fonctionnalités mockées) reste **partiel** — voir détail. Refonte complète de la landing page effectuée en plus (hors chantiers). Détail complet en fin de document, section [Journal des correctifs appliqués](#journal-des-correctifs-appliqués).
>
> **Mise à jour du 2026-07-29 : Chantier 7 terminé — SaaS multi-tenant réel (Super Admin + provisioning d'institutions + gestion des comptes internes).** L'utilisateur a demandé une architecture SaaS conforme à son projet sœur EduSahel (référence lue, jamais modifiée) : un Super Admin de plateforme crée les comptes d'institution, chaque institution crée ensuite ses propres comptes internes (enseignants, personnel administratif). 1ère moitié (7.1) : `User.tenantId`/`AuditLog.tenantId` rendus nullables, route `/api/tenants`, script `bootstrap-super-admin.ts`, page `PlatformInstitutionsPage`. 2ème moitié (7.2) : au passage, la création d'enseignant s'est révélée **complètement cassée** (Prisma rejetait des champs inexistants sur le modèle `Teacher` à chaque tentative) et le dialogue associé était factice — les deux corrigés, plus une nouvelle route `/api/users` et page `StaffUsersPage` pour que chaque institution crée ses comptes administratifs (Rectorat, Scolarité, Caisse...), et le flag `mustChangePassword` enfin réellement appliqué (écran de changement forcé au premier login). Vérifié de bout en bout contre le serveur de dev réel sur toute la chaîne. Détail en section [Chantier 7](#chantier-7--saas-multi-tenant--super-admin-plateforme--provisioning-dinstitutions-2026-07-29--complet).
>
> **Mise à jour du 2026-07-27 : Chantier 6 (« mode réel ») terminé pour tout ce qui ne dépend pas de l'utilisateur.** L'utilisateur a demandé de sortir du mode démo, puis a fixé un objectif permanent via `/goal` : livrer le SaaS 100% fonctionnel sans données de démo (paiement excepté, dernière étape à faire ensemble). Tout l'audit initial est traité : boutons de connexion démo retirés, tableau de bord branché sur de vraies données, **inscription de nouveaux établissements** (6.3), **6 modules à backend existant branchés** (6.4), **4 modules sans aucun modèle Prisma créés de zéro** — notifications/library/transport/advising (6.4b), deux vrais bugs de faux-succès corrigés dans l'import/export, **un vrai système de passation d'examen en ligne construit et vérifié de bout en bout** — sessions réelles, correction automatique, surveillance réelle (6.4c/6.4d), et **le compte "Espace Étudiant" (matricule+PIN) rendu réellement utilisable** — le schéma et l'authentification existaient déjà mais aucun code ne créait jamais ce compte pour un étudiant réel avant cette passe. Un second balayage plus général (au-delà de la convention `demo*`) a ensuite trouvé **6 pages de plus** entièrement ou partiellement fictives — inscription pédagogique, délibération, planification d'examens, santé (6.4e), statistiques institutionnelles et le graphique de revenus de la page paiements (6.4f) — toutes désormais branchées sur des données réelles. En creusant un écart déjà repéré (le tableau de bord identique pour tous les rôles), une **faille de cloisonnement des données a été trouvée et corrigée** : n'importe quel compte étudiant pouvait, par appel direct à l'API, lire les notes/paiements/dossiers médicaux d'autres étudiants ainsi que les agrégats admin de tout l'établissement (6.4g). Un balayage des boutons a ensuite trouvé et corrigé des boutons "succès factice, zéro appel réseau" dans `payments-page.tsx` et `documents-page.tsx` (6.4h), puis une page entière — `student-detail.tsx`, la fiche détaillée d'un étudiant — qui était **100% construite sur des données de démonstration figées** malgré des endpoints backend déjà réels et corrects, jamais appelés (6.4i). Un dernier balayage ciblé sur les fichiers explicitement suspectés a corrigé `institution-page.tsx` (années académiques + statistiques d'en-tête factices), `room-booking-page.tsx` (calendrier hebdomadaire fabriqué, déconnecté des vraies réservations) et `profile-page.tsx` (historique de connexions, sessions actives et fil d'activité tous fictifs — corrigé en s'appuyant sur `AuditLog`, qui traçait déjà chaque connexion et action mais n'avait jamais de point de lecture ; boutons "Enregistrer le profil" et "Changer le mot de passe" ne faisaient rien avant cette passe) (6.4j). **Le paiement en ligne, seul point encore présenté comme "en attente", a reçu une décision explicite de l'utilisateur le 2026-07-27 : rester sur l'enregistrement manuel (déjà réel et fonctionnel) plutôt qu'un compte marchand CinetPay ou Mobile Money direct (6.4k)** — ce n'est donc plus un manque du produit. Avec cette décision, le `/goal` initial est atteint. Reste uniquement, si l'utilisateur change d'avis un jour : `RESEND_API_KEY` et un compte fournisseur Mobile Money/CinetPay. Voir le journal Chantier 6.4b à 6.4k pour le détail et les limitations connues (deux agents interrompus par la limite de dépense mensuelle — travail repris et vérifié manuellement ; l'utilisateur devrait relever cette limite sur claude.ai/settings/usage pour éviter que ça ne se reproduise).

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

### Chantier 6 — Sortir du mode démo vers un vrai SaaS (démarré 2026-07-26)
Demande explicite utilisateur : "tout était en démo, l'objectif c'est d'avoir un vrai site fonctionnel 100% en mode réel." Audit complet fait (voir journal ci-dessous pour le détail par fichier) ; tâches restantes par ordre de priorité proposé (l'utilisateur a validé la première) :

| # | Tâche | État |
|---|---|---|
| 6.1 | Retirer les boutons de connexion démo (« Mode démonstration ») de la production | ✅ fait |
| 6.2 | Brancher le tableau de bord principal (`dashboard-home.tsx`) sur de vraies données | ✅ fait |
| 6.3 | Inscription/onboarding de nouveaux établissements | ✅ fait |
| 6.4 | Brancher les 6 modules à backend existant mais partiellement démo : `scholarships` (bénéficiaires), `hr` (congés), `internships` (partenaires/évaluations/conventions), `attendance` (justificatifs), `room-booking` (réservations), `results` (résultats + relevés, calculés depuis `Grade`) | ✅ fait |
| 6.4b | `advising-page.tsx`, `library-page.tsx`, `transport-page.tsx`, `notification-panel.tsx` — aucun modèle Prisma au départ ; 12 nouveaux modèles + migration créés, 4 nouvelles routes API, notifications branchées sur de vrais évènements (paiement validé, nouvelle candidature) | ✅ fait |
| 6.5 | Configurer `RESEND_API_KEY` pour que les emails de reçu de paiement partent réellement (actuellement silencieusement no-op) | ⏳ en attente de la clé utilisateur |
| 6.6 | Mobile Money réel — nécessite un compte fournisseur (déjà différé au Chantier 4, inchangé) | ⏳ en attente utilisateur |
| 6.7 | Paiement en ligne (étape finale du `/goal` utilisateur) — **décision prise le 2026-07-27** : l'utilisateur a choisi de rester sur l'enregistrement manuel des paiements (déjà réel et fonctionnel, voir 6.4h) plutôt qu'un compte marchand CinetPay ou un opérateur Mobile Money direct. Ce n'est plus un manque, c'est un choix produit assumé — voir 6.4k | ✅ décision utilisateur actée, aucune action technique requise |

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

### Chantier 1 — sécurité API ✅
- Les 10 routes cassées par le bug de signature `withTenantAuth` (`structure`, `hr`, `online-exams`, `reports`, `rooms`, `scholarships`, et les POST de `attendance`/`internships`/`communications`/`alumni`) ont toutes été remises à la bonne signature `(user, tenantId, request)`, tous les `as any` supprimés.
- Les 4 fuites de données inter-tenant (`GET` non authentifiés sur `attendance`/`internships`/`communications`/`alumni`) sont fermées — protégées par `withTenantAuth` comme le reste.
- Bug additionnel découvert en corrigeant les signatures : plusieurs POST (`hr`, `rooms`, `reports`, `online-exams`, `attendance`, `internships`, `communications`, `scholarships`, `alumni`) faisaient confiance au `tenantId` envoyé dans le corps de la requête au lieu de celui validé par le middleware — un utilisateur du tenant A pouvait écrire dans les données du tenant B en changeant un simple champ du body. Corrigé partout pour n'utiliser que le `tenantId` vérifié.
- `scholarships` et `alumni` en POST faisaient `db.x.create({ data: body })` sans aucune validation — remplacé par une extraction de champs explicite, cohérente avec le reste du code.
- `documents/generate` vérifie maintenant que le `tenantId` demandé correspond à celui de l'utilisateur connecté (sinon 403), et les recherches étudiant/inscription/délibération/liste qu'il effectue sont scopées par tenant.
- `/api/seed` restreint à `SUPER_ADMIN` (était : accessible à tout utilisateur connecté).
- Fallback `NEXTAUTH_SECRET` codé en dur supprimé (`src/middleware.ts`, `src/lib/auth/config.ts`) — centralisé dans `src/lib/auth/secret.ts`, qui lève une erreur explicite si la variable est absente en production au lieu de déployer silencieusement avec un secret public.

Reste pour aller plus loin sur ce chantier (non traité, hors scope de cette passe) : ajouter des restrictions de rôle plus fines sur ces 10 routes (elles restent ouvertes à tout utilisateur authentifié du tenant, comme avant le bug — aucune nouvelle politique de rôle n'a été inventée) ; tests de régression automatisés sur l'auth/isolation tenant.

### Chantier 3 — branchement frontend 🟢 bien avancé
11 modules branchés sur leurs vraies API (via de nouveaux hooks React Query dans `src/lib/api-hooks.ts` : `useHrStaff`, `useAttendance`, `useScholarships`, `useAlumni`, `useInternships`, `useStructure`, `useRooms`, `useOnlineExams`, `useReports`, `useCommunications`, plus `useTeachers` qui existait déjà) : **teachers, hr, attendance, scholarships, alumni, internships, structure, rooms (room-booking), online-exam, reports, communication**.

Pour chaque page, seule la donnée principale (celle qui a un vrai modèle Prisma + route API) a été branchée ; les jeux de données secondaires sans backend ont été volontairement laissés en l'état plutôt que d'inventer des API :
- `hr` : demandes de congé, postes vacants, évaluations
- `attendance` : justificatifs, sanctions
- `scholarships` : bénéficiaires individuels
- `internships` : conventions en attente, partenaires, chronologie, évaluations
- `room-booking` : liste des réservations et inventaire équipement (l'API `/api/rooms` ne renvoie qu'un compteur agrégé de réservations du jour, pas le planning par salle)
- `online-exam` : banque de questions, résultats étudiants, incidents de surveillance
- `reports` : modèles de rapport, rapports planifiés, graphiques analytiques
- `communication` : messagerie/chat en direct, canaux, notifications, brouillons

Plusieurs enums stockés en DB (anglais MAJUSCULES, ex. `"HOSPITALIER"` -> en fait `"HOSPITALIER"`/`"PROFESSIONNEL"`/etc., ou statuts `"EN_COURS"`) ne correspondaient à aucun des unions locales attendues par l'UI (français minuscule avec tirets, ex. `'en-cours'`) — chaque page fait maintenant une traduction explicite et défensive plutôt que de supposer un alignement de casse.

**Mise à jour 2026-07-25** : `grades-page.tsx` a été branché plus tôt dans cette même session (module prioritaire, `/api/grades` existait déjà). Puis dans un second temps (« batch 2 »), `announcements`, `candidature`, `timetable`, `institution` et `maquette` ont aussi été branchés — voir [journal détaillé plus bas](#chantier-3-suite--branchement-frontend-batch-2-announcements-candidature-timetable-institution-maquette-). Chantier 3 est désormais **complet** pour tous les modules ayant un modèle Prisma existant.

**Reste hors périmètre à cette date** (aucun modèle Prisma, nécessiterait migrations + API + frontend — scope "Groupe 3", non demandé) : `transport`, `library`, `results`, `advising`, `notification-panel`. **Mise à jour Chantier 6.4 (2026-07-26)** : `results` a finalement été branché sans nouveau modèle, en calculant directement depuis `Grade` (déjà existant) — voir journal Chantier 6 plus bas. `transport`, `library`, `advising`, `notification-panel` restent hors périmètre.

### Chantier 3 (suite) — branchement frontend, batch 2 (announcements, candidature, timetable, institution, maquette) ✅

4 nouvelles routes API créées (Prisma réel + `withTenantAuth` + audit log, suivant exactement le même pattern que les routes existantes) :
- **`/api/announcements`** (GET liste + stats pinned/urgent, POST création) — nécessitait 3 nouveaux champs sur `Announcement` (`priority`, `category`, `isPinned`), ajoutés au schéma + migration.
- **`/api/candidature`** (GET liste + stats admis/en-attente/refusé, POST création avec génération de numéro `CND-{année}-{séq}`, PUT changement de statut) — nécessitait 3 nouveaux champs sur `Admission` (`niveau`, `numero`, `type`), ajoutés au schéma + migration.
- **`/api/timetable`** (GET créneaux avec résolution des noms cours/enseignant/salle en batch — `TimetableSlot` n'a que des FK scalaires, pas de relations Prisma —, POST création).
- **`/api/institution`** (GET profil tenant + settings, PUT mise à jour restreinte à `SUPER_ADMIN`/`ADMIN_INSTITUTION`, whitelist explicite des champs modifiables).

5 pages frontend branchées sur ces API (+ `structure` déjà existante pour `maquette`) : `announcements-page.tsx`, `candidature-page.tsx`, `timetable-page.tsx` (3 déléguées à des agents en parallèle, revues avant intégration), `maquette-page.tsx` (fait manuellement — remplace le programme de démo à plat par un mapper qui préserve la structure imbriquée `Programme → Niveau → Semestre → UE → ECUE` en réutilisant les données déjà exposées par `/api/structure`), et `institution-page.tsx` (3 des 6 onglets branchés : Informations/Académique/Structure — Documents/Abonnement laissés en l'état, aucun modèle backend pour les gabarits de documents ou la facturation).

**Migration Postgres appliquée sans risque de perte de données** : cette base a un historique de migrations réel qui précède cette session (des migrations existaient en base mais pas dans `prisma/migrations/`) — `prisma migrate dev` a menacé un reset complet du schéma public. Reset **refusé**, migration annulée avant toute exécution. À la place : `prisma migrate diff` pour prévisualiser le SQL exact (additif uniquement), `prisma db push --accept-data-loss` pour l'appliquer, puis création manuelle du dossier de migration + `prisma migrate resolve --applied` pour enregistrer l'historique sans rejouer le SQL. Deux dossiers de migration "placeholder" créés en plus pour documenter l'historique pré-existant non versionné. `prisma migrate status` confirme "up to date".

**Vérification en conditions réelles** (méthodologie déjà validée sur `grades-page.tsx` : appels HTTP authentifiés directs plutôt que de faire confiance au code) : les 4 nouvelles routes testées avec une vraie session (login credentials → cookie) — GET/POST sur `announcements`, GET/POST sur `candidature`, GET/POST sur `timetable`, GET/PUT sur `institution` — toutes répondent correctement (200/201), pas de bug trouvé cette fois (contrairement aux détections précédentes de ce type de test — cap de pagination, mismatch de nom de paramètre). Pages vérifiées aussi en navigateur, connecté, avec les vraies données : `maquette-page.tsx` affiche correctement un programme réel avec ses niveaux, et le garde défensif contre un niveau sans semestre ("Ce niveau n'a pas encore de semestres configurés.") se déclenche correctement au lieu de planter sur `level.semesters[0].id`.

### Landing page — refonte complète ✅
Refonte complète de `src/components/landing/landing-page.tsx` (demande explicite utilisateur, guidée par la skill `ui-ux-pro-max`) : nouvelles sections (aperçu produit façon mockup dans le hero, bandeau de segments cibles, étapes "Comment ça marche", tarifs par paliers de fonctionnalités — sans prix inventés puisqu'il n'y a pas de facturation réelle —, FAQ en accordéon), garde les couleurs de marque (navy/vert/or) déjà utilisées partout ailleurs dans l'app.

Bug corrigé au passage : le lien nav "Tarifs" pointait vers une ancre qui n'était pas une section tarifs (bug pré-existant). Bug introduit puis corrigé pendant la refonte : sur mobile, cliquer un lien du menu hamburger fermait le menu mais ne scrollait jamais vers la section cible — `scrollIntoView({behavior:'smooth'})` appelé de façon synchrone dans le même handler qui déclenche la fermeture du drawer (AnimatePresence de Framer Motion) est silencieusement ignoré par le navigateur. Corrigé en différant l'appel de 300ms (le temps que l'animation de fermeture se termine). Root-cause confirmée en isolant chaque étape via un monkey-patch de `Element.prototype.scrollIntoView` plutôt qu'en se fiant aux captures d'écran seules.

**Bug de contraste trouvé et corrigé** (retour utilisateur explicite : texte illisible) : l'accent or de la marque (`#d4a853`) était utilisé comme couleur de texte/icône sur fond clair à plusieurs endroits (carte "Doctorat", badge "Conçu pour l'Afrique", quelques icônes de modules) — ratio de contraste 2.0-2.2:1, très en dessous du minimum WCAG (3:1 même pour du grand texte). Diagnostiqué avec un script de scan de contraste WCAG exécuté sur la page réellement rendue (calcule la couleur effective de fond en tenant compte des dégradés, pas seulement de `background-color`), pas en devinant depuis des captures d'écran. Corrigé avec une variante "encre" plus sombre de la même teinte (`#7a5c1f`, ratio 6.2:1) pour le texte/icônes uniquement — l'or clair original reste inchangé partout où il fonctionnait déjà (fonds, bordures, sections sombres).

**Refonte suivante (même session) — vrais composants au lieu d'approximations faites main** : sur demande explicite de l'utilisateur ("arrête de faire des trucs génériques", recherche des meilleurs outils GitHub), remplacement des effets visuels artisanaux par de vrais composants open-source reconnus (Magic UI, installés via son registre compatible shadcn — `npx shadcn add https://magicui.design/r/<nom>.json`) : `BentoGrid`/`MagicCard` (grille de modules avec effet de halo qui suit le curseur), `AnimatedBeam` (faisceau animé reliant les 4 étapes de "Comment ça marche"), `BorderBeam` (bordure animée sur le mockup du dashboard et sur le plan tarifaire "Pro"), `NumberTicker` (compteurs animés des stats du hero), `AuroraText` (effet de texte sur "université africaine"), `ShimmerButton` (CTA principal), `DottedMap` (carte pointillée centrée sur l'Afrique avec marqueurs de villes pulsants — le composant `DottedMap` installé ne permettait pas de recadrer sur une région, alors qu'`svg-dotted-map` le supporte nativement ; étendu pour exposer `region`/`countries`), `Meteors` (fond décoratif des sections sombres), `Marquee` (bandeau de segments cibles), `Ripple` (fond de la section CTA finale).

Deux vraies erreurs de lint (règles ESLint React Compiler strictes de ce projet) révélées par ces nouveaux composants, corrigées : (1) passer des refs en props à l'intérieur d'un `.map()` est flaggé comme accès de ref non sûr pendant le rendu — remplacé par 3 appels `AnimatedBeam` explicites (c'est de toute façon le pattern standard Magic UI) ; (2) `DottedMap` déclenchait "Compilation Skipped: Existing memoization could not be preserved" — `createMap()`+`addMarkers()` étaient appelés hors `useMemo` puis lus par un `useMemo` séparé, laissant une fenêtre où le compilateur ne peut pas garantir l'absence de mutation ; consolidé en un seul `useMemo` atomique. Une suppression ciblée et justifiée a aussi été ajoutée dans `Meteors` (règle `set-state-in-effect`) : le composant lit `window.innerWidth`/`Math.random()` dans un effect, ce qui doit rester côté client uniquement pour la sécurité SSR — déplacer ça vers le rendu casserait le rendu serveur au lieu de corriger quoi que ce soit.

**Découverte opérationnelle importante concernant le déploiement** : le projet Vercel `unisahel-tchad` n'a **aucune intégration Git configurée** (confirmé via `vercel project inspect` — pas de section "Git Repository"). Un `git push` vers `origin master` ne déclenche donc **aucun déploiement automatique**. Chaque déploiement de cette session a nécessité un `vercel --prod --token $VERCEL_TOKEN --yes` manuel après le push. À retenir pour la suite : toujours lancer ce déploiement manuel après avoir poussé sur GitHub, ne pas supposer qu'un push suffit.

### Chantier 4 — fonctionnalités mockées 🟡 partiellement traité
- **QR code (4.2) ✅** : les PDF officiels intègrent maintenant un vrai QR code scannable (`qrcode`, jusqu'ici installé mais jamais utilisé) pointant vers `/verify?code=...`. Le domaine codé en dur "unisahel.africa" (jamais réellement déployé) a été remplacé par l'URL réelle de déploiement. `/verify?code=X` pré-remplit désormais le code et lance la vérification automatiquement (utile pour un scan direct) — avant, le paramètre d'URL était ignoré.
- **Mobile Money (4.1) 🟡** : décision utilisateur = pas de compte fournisseur pour l'instant. Au lieu de laisser le mock silencieux (qui faisait croire à un paiement initié avec succès), les endpoints renvoient maintenant explicitement `501 MOBILE_MONEY_NOT_CONFIGURED`, et l'UI affiche "Bientôt disponible" au lieu d'un faux indicateur "API connectée" avec fausse heure de sync. Reste à faire quand un compte sera disponible : brancher un vrai fournisseur (Airtel/Orange/MTN/Moov).
- **Notifications email (4.3) 🟡** : décision utilisateur = Resend pour l'email (pas de SMS pour l'instant). `src/lib/email.ts` ajouté (dégrade proprement si `RESEND_API_KEY` absent, pas de faux succès). Branché sur UN cas concret et non ambigu : email de reçu au parent/étudiant quand un paiement est validé (`student.email` déjà disponible). **`RESEND_API_KEY` n'est pas configuré** — à ajouter dans `.env.local`/Vercel pour que l'envoi réel fonctionne. Les diffusions de masse (`Communications`, ex. "Tous les étudiants") ne sont pas branchées : `audience` est une chaîne libre sans liste de destinataires résolvable dans le schéma actuel — nécessite une décision de conception (segmentation d'audience) avant de pouvoir l'implémenter sans deviner.

**Piège technique noté en passant** : `npm install <pkg>` peut perturber le client Prisma généré (`node_modules/.prisma/client`) sans le régénérer — après tout `npm install`, lancer `npx prisma generate` avant de retester, sinon `tsc` explose avec des erreurs `Prisma.XxxWhereInput has no exported member` qui n'ont rien à voir avec le vrai problème.

### Chantier 5 — qualité, tests, déploiement ✅ pour l'essentiel
- **5.1 CI ✅** : `.github/workflows/ci.yml` — à chaque push/PR sur `master`, install propre + `tsc` + `eslint` + `vitest` + `next build`. Deux runs verts confirmés depuis la mise en place.
- **5.2 Tests d'intégration ✅** : `src/lib/auth/helpers.test.ts` (withAuth/withTenantAuth — régression directe du bug Chantier 1), `api/students/route.test.ts`, `api/payments/route.test.ts`, `api/grades/route.test.ts`. 29 tests au total. En les écrivant, j'ai trouvé et corrigé un vrai bug pré-existant non lié à mon travail : `checkMobileMoneyStatus` lisait `paymentId` dans l'URL alors que le dispatcher `GET` route sur `id` — l'endpoint ne pouvait jamais atteindre le correctif d'honnêteté du Chantier 4, il renvoyait juste une 400.
- **5.3 E2E ✅** : Playwright installé, `e2e/login-and-verify.spec.ts` — connexion réelle → tableau de bord, vérification de document (code inconnu → réponse honnête "non trouvé"), et scan QR (`?code=`) qui auto-vérifie. 3/3 verts en local **et maintenant branché dans le CI** (job `e2e` séparé dans `ci.yml`, utilise les vraies credentials Neon stockées en secrets GitHub Actions `DATABASE_URL`/`DIRECT_URL`/`NEXTAUTH_SECRET`). **Effet de bord accepté** : chaque run CI se connecte à la vraie base et fait un vrai login, ce qui écrit une ligne `AuditLog` réelle à chaque fois — rien de destructif, juste une accumulation d'entrées d'audit liées aux runs CI.
- **5.4 `.env.example` ✅** : documente toutes les variables réellement utilisées. Au passage, `.gitignore` excluait `.env*` sans exception — `.env.example` n'aurait donc jamais pu être commité ; corrigé.
- **5.6 Nettoyage ✅** : scaffold `src/app/api/route.ts` supprimé, 5 anciens docs de planning archivés dans `archive/`.
- **5.5 `vercel.ts`** : non fait — non prioritaire. **Correction a posteriori (2026-07-25/26)** : l'affirmation ci-dessus comme quoi "le déploiement fonctionne déjà via l'intégration GitHub-Vercel" était **fausse** — voir Chantier 6 ci-dessous, le projet n'a aucune intégration Git configurée.

### Chantier 6 — sortir du mode démo 🟡 démarré
**Audit complet effectué** (fichiers/lignes exacts) avant de commencer, pour scoper avec l'utilisateur plutôt que deviner :
- Boutons "Mode démonstration" (connexion en un clic, identifiants seedés en dur) visibles par tout visiteur sur `login-page.tsx` (panel L324-348) et `student-login-page.tsx` (L147-161) — vraie faille de crédibilité/sécurité sur un site en prod, pas juste un détail esthétique.
- Aucun flux d'inscription/onboarding nulle part dans le code. `/api/seed` est le seul créateur de tenant — un semeur de démo à usage unique (idempotent, ~1000 lignes de données fabriquées), pas une API d'inscription réutilisable.
- `dashboard-home.tsx` (945 lignes) : zéro appel réseau dans tout le fichier — premier écran vu par chaque utilisateur, 100% inventé.
- Deux variables déjà nommées `dynamicRecentActivity`/`dynamicAlerts` existaient dans `dashboard-home.tsx` mais n'étaient **jamais utilisées** dans le JSX (confirmé par deux warnings ESLint `no-unused-vars` déjà présents) — une tentative de branchement laissée inachevée.
- ~9 modules encore purement sur données `demo...` sans aucun appel API : `results`, `advising`, `library`, `transport` (aucun backend du tout), plus `hr`/`room-booking`/`online-exam`/`internships`/`scholarships`/`attendance`/`import-export`/`notification-panel` (backend partiel selon le module).
- `RESEND_API_KEY` absent de `.env.local` — les emails de reçu de paiement échouent silencieusement (`sendEmail()` log un warning et renvoie `{success:false}`).
- Aucune clé Mobile Money/Stripe/paiement nulle part, jamais même templatée dans `.env.example` au-delà des placeholders Mobile Money déjà connus.

**6.1 Boutons démo retirés en prod ✅** : gated derrière `process.env.NODE_ENV !== 'production'` dans les deux fichiers — toujours utilisables en dev local, complètement absents du bundle de production (vérifié par `grep` sur `.next/static/chunks/` après build : zéro occurrence de la chaîne, donc tree-shaké, pas juste masqué en CSS ; confirmé aussi en direct sur `unisahel-tchad.vercel.app/login`).

**6.2 Tableau de bord branché sur de vraies données ✅** : `/api/dashboard` étendu avec des requêtes 100% réelles — répartition par cycle (Licence/Master/Doctorat), taux de réussite par filière (notes saisies ≥ seuil de passage configuré du tenant, groupées par programme), alertes honnêtes (notes non verrouillées, paiements en attente de validation, étudiants inscrits sans aucun paiement validé — pas de "retard" fabriqué puisqu'aucun modèle d'échéance n'existe dans le schéma), événements à venir (vraies sessions d'examen + délibérations à venir). Côté frontend : suppression des flèches de tendance/%/sparklines fabriquées (aucune table d'historique n'existe pour les calculer honnêtement), simplification de la carte "État du système" pour ne garder que ce qui est trivialement vrai si la page a chargé (serveur/BDD, suppression du stockage/uptime inventés), bannière/branding université lue depuis la vraie session au lieu de "Université de N'Djamena 2024-2025" codé en dur, état vide ajouté sur chaque graphique/liste pour un tenant fraîchement créé avec peu de données. Testé en direct avec un appel API authentifié réel et une session navigateur connectée, contre la vraie base (actuellement peu peuplée : 5 étudiants, 1 enseignant, 1 programme) — tout s'affiche honnêtement, y compris les états vides (ex. "Aucune note saisie pour le moment").

**6.3 Inscription de nouveaux établissements ✅** : c'était le plus gros manque structurel identifié par l'audit — aucun flux n'existait, `/api/seed` était le seul créateur de tenant (semeur de démo à usage unique, SUPER_ADMIN uniquement). Ajouté :
- `POST /api/auth/signup` (public, volontairement sans wrapper d'auth — c'est justement pour un visiteur qui n'a pas encore de compte) : valide l'entrée (Zod), génère un slug unique (accents translittérés, collision gérée par suffixe numérique), puis crée dans une seule transaction `Tenant` + `TenantSettings` + le premier utilisateur `ADMIN_INSTITUTION` + une vraie `AcademicYear` "en cours" calculée depuis la date réelle (cycle oct-juil), plus une entrée d'audit log.
- Nouvelle page `SignupPage` (même style visuel que la page de connexion), connexion automatique après création via le même `signIn()` next-auth que les pages de connexion existantes.
- CTAs de la landing page corrigés : "Démarrer gratuitement", "Essai gratuit" et "Demander un devis" pointaient vers `login` — **incohérent** pour un nouveau visiteur qui n'a pas de compte. Redirigés vers `signup`. "Nous contacter" scrolle maintenant vers le vrai contact du footer au lieu de router aussi vers `login`. Les boutons explicitement labellisés "Connexion" restent inchangés.
- Lien "Créer un compte" ajouté sur la page de connexion staff.

**Bug réel trouvé par test en direct contre la vraie base Neon** : la transaction d'inscription (5 écritures séquentielles) dépassait le timeout par défaut de 5s des transactions interactives Prisma — probablement la latence de réveil à froid de Neon. Corrigé en passant le timeout à 15s (`db.$transaction(fn, { timeout: 15000 })`).

**Vérifié de 3 façons** : appels API directs (succès 201, doublon d'email → 409, validation invalide → 400), et un parcours navigateur complet (remplissage du vrai formulaire → soumission → connexion automatique → atterrissage sur un tableau de bord fraîchement vide et correctement isolé pour le nouveau tenant, avec tous les états vides honnêtes). Testé en local ET en production (`vercel --prod`). Tenants de test supprimés après chaque vérification.

**6.4 Modules à backend existant branchés sur de vraies données ✅** : les 6 modules restants qui avaient un modèle Prisma réel mais affichaient encore des tableaux `demo...` fabriqués ont été branchés, chacun en suivant strictement le principe « honnête plutôt que faux » — un champ sans modèle Prisma qui le supporte reste explicitement en démo plutôt que de fabriquer un calcul :

- **`scholarships`** : `/api/scholarships` renvoie maintenant les vraies `ScholarshipApplication` (avec le nom/type de bourse liée) comme bénéficiaires ; la page mappe leur statut réel (ACCEPTE/APPROUVE → bénéficiaire, REFUSE → refusée, sinon en attente) au lieu des 12 lignes inventées.
- **`hr`** : `/api/hr` renvoie les vraies `LeaveRequest` et expose un nouveau `PUT` pour approuver/refuser (vérifie l'appartenance au tenant, whiteliste `en_attente|approuve|refuse`) ; la page appelle ce endpoint avec toast + invalidation de cache au lieu de changer un état local qui ne persistait jamais. Postes vacants et évaluations restent en démo (aucun modèle Prisma).
- **`internships`** : `/api/internships` renvoie les vrais `InternshipPartner` ; évaluations et conventions en attente sont désormais **dérivées** des vraies données existantes (grade textuel → note, statut `EN_ATTENTE` → convention en attente) plutôt qu'une liste séparée inventée. La chronologie fabriquée à 6 étapes avec fausses dates a été remplacée par une version honnête à 3 étapes réellement déductibles (signée / en cours / terminée). Formulaire de soumission d'évaluation (pas de vraie création) laissé hors périmètre.
- **`attendance`** : `/api/attendance` expose les vraies justifications en attente (`status: ABSENT` + `justification` non nul) et un `PUT` pour approuver (→ `JUSTIFIED`) ou rejeter (efface la justification — pas d'état "rejeté" dans le schéma, documenté en commentaire). Sanctions laissées en démo (aucun modèle).
- **`room-booking`** : `/api/rooms` renvoie désormais les réservations ligne par ligne (pas seulement un compteur agrégé) plus le planning du jour par salle ; la page calcule les vrais conflits/distribution par objet. Inventaire d'équipement laissé en démo (aucun modèle).
- **`results`** : nouvelle route `/api/results` (aucune route n'existait, et les modèles `Deliberation`/`DeliberationDecision` du schéma se sont révélés totalement inutilisés — aucune route ne les écrit jamais, donc les brancher aurait affiché un tableau structurellement vide). Calcul construit à la place directement sur le modèle `Grade`, déjà peuplé : moyenne pondérée par coefficient d'ECUE, crédits validés par UE (moyenne d'UE ≥ seuil de passage du tenant), décision simplifiée `Admis`/`Ajourné` (pas de `Compensé`/`Exclu` fabriqués — un vrai processus de délibération n'existe pas encore), mention sur l'échelle standard LMD à 5 paliers. Le même endpoint sert aussi le relevé de notes individuel (`?studentId=`). Progression académique et statistiques multi-années (`yearComparison` 2021-2025) restent en démo — un système fraîchement créé n'a par définition aucun historique pluriannuel à afficher honnêtement.

**Vérification** : chaque module a été développé par un agent dédié en parallèle, avec `tsc --noEmit` et `eslint` propres sur ses fichiers avant intégration ; une fois les 6 fusionnés dans le même arbre de travail, `tsc --noEmit` (0 erreur), `eslint` (0 erreur, 1 warning `no-console` déjà toléré ailleurs) et `next build` (succès, route `/api/results` bien générée) ont été relancés sur l'ensemble du projet pour détecter d'éventuels conflits entre agents — aucun trouvé. Déployé en production (`vercel --prod`) et vérifié en direct (`/`, `/login` → 200 ; `/api/results` sans session → 401, confirmant que la nouvelle route est bien protégée par `withTenantAuth`).

### 6.4b — 4 derniers modules sans backend, créés de zéro (2026-07-26, suite au `/goal`) ✅

Suite à l'objectif permanent fixé par l'utilisateur via `/goal` ("continue l'implémentation... jusqu'à un SaaS complet sans démo, sauf le paiement"), les 4 modules qui n'avaient strictement aucun modèle Prisma ont été construits de zéro.

**12 nouveaux modèles Prisma** (une seule migration additive, `20260726220000_add_notifications_library_transport_advising`, puis une seconde `20260726223000_add_export_log`) :
- `Notification` (partagée au niveau tenant, pas de ciblage par utilisateur — panneau de type boîte d'équipe partagée, décision assumée).
- `LibraryResource` / `LibraryLoan` / `LibraryRoom` — catalogue, emprunts (avec décrément/incrément réel de `availableCopies` en transaction), salles.
- `TransportVehicle` / `TransportRoute` / `TransportDeparture` / `TransportMaintenance` / `TransportAlert` / `TransportSubscription` — flotte de bus ; les taux d'occupation sont calculés depuis le nombre réel d'abonnements actifs par route, jamais des chiffres fixes.
- `Advisor` / `AdvisingAppointment` / `AdvisingWorkshop` / `AdvisingWorkshopEnrollment` — conseil pédagogique.
- `ExportLog` — pour donner un vrai historique aux exports (voir plus bas).

**4 nouvelles routes API** (`/api/notifications`, `/api/library`, `/api/transport`, `/api/advising`), toutes suivant le pattern `withTenantAuth` déjà établi :
- **Notifications** : `src/lib/notifications.ts` expose `createNotification()`, appelé depuis 2 points réels — validation d'un paiement (`/api/payments`) et création d'une candidature (`/api/candidature`). Deux déclencheurs envisagés ont été délibérément écartés après investigation : les demandes de congé RH n'ont aucune route de création nulle part dans le code (seule l'approbation existe), et `GradeImport`/`GradeImportItem` ne sont utilisés par aucune route — les brancher aurait affiché un déclencheur qui ne se produit jamais. Le badge de notifications non lues du header (`dashboard-shell.tsx`) lisait un `unreadCount: 5` codé en dur dans le store Zustand — rebranché sur le vrai compteur.
- **Advising** : `monitoredStudents` (les étudiants à risque suivis) réutilise **exactement** la même formule de moyenne pondérée par coefficient que `/api/results` (même logique, pas de duplication accidentelle divergente) ; le niveau d'alerte Vert/Jaune/Orange/Rouge est calculé par rapport au vrai seuil de passage du tenant plutôt que des seuils fixes 12/10/8 ; les dettes viennent du vrai statut `Payment.status = 'PENDING'`.
- **Library** : emprunt/retour d'un ouvrage fait dans une transaction Prisma qui ajuste `availableCopies` ; les statistiques d'usage (tendance mensuelle, catégories les plus empruntées, taux de retour à temps) sont calculées depuis l'historique réel des emprunts, pas inventées.
- **Transport** : occupation des bus et des routes dérivée du nombre réel d'abonnements étudiants actifs, pas de chiffres fixes ; alertes/maintenance réelles au lieu de listes statiques.

**Deux vrais bugs de faux-succès corrigés dans `import-export-page.tsx`** (trouvés en marge, pas dans le scope initial mais clairement de la même famille que le principe "honnête plutôt que faux" du Chantier 4) :
- L'import en masse d'étudiants faisait tourner une barre de progression avec `setInterval` totalement déconnectée de toute écriture en base, puis affichait "Import terminé avec succès" — **aucune donnée n'était jamais écrite**. Corrigé : `handleImport` appelle maintenant `/api/import-export` qui crée de vrais `Student` (résolution de la filière par nom, dates DD/MM/AAAA, détection de matricule dupliqué) et journalise un vrai `ImportLog` (modèle qui existait déjà dans le schéma mais n'était utilisé nulle part). Les 4 autres types d'import (Enseignants/Notes/Paiements/Structure) renvoient maintenant une erreur 501 honnête au lieu de la même fausse barre de progression — créer des comptes utilisateur en masse (Enseignants) ou mapper des notes/paiements est un vrai chantier à part, pas fait ici.
- 4 des 6 types d'export (Relevés de notes, États financiers, Statistiques, Structure académique) généraient littéralement des lignes `{ Information: 'Données simulées pour la démo' }` au lieu d'un vrai export. Corrigé en réutilisant les hooks déjà existants (`useResults`, `usePayments`, `useDashboardStats`, `useStructure`) pour construire le contenu réel. Le tableau "lignes en erreur" à droite de l'aperçu d'import affichait aussi 3 lignes d'erreur fabriquées en dur, toujours les mêmes peu importe le fichier chargé — remplacé par une vraie détection cliente (nom/prénom manquant, date invalide, matricule dupliqué dans le fichier). Le bouton "Télécharger" de l'historique des exports prétendait re-télécharger un fichier déjà généré côté client (aucun stockage serveur des fichiers exportés n'existe) — supprimé plutôt que de laisser une fausse promesse.

**Découverte opérationnelle importante — bookkeeping `_prisma_migrations` peu fiable sur cette base** : au moment d'appliquer la migration des 12 nouveaux modèles, `prisma migrate deploy` a échoué avec `P3005` ("database schema is not empty") alors que `prisma migrate status` venait d'annoncer "up to date" juste avant. Investigation : la table `_prisma_migrations` n'existait tout simplement pas sur la base réelle, alors que les tables des 4 migrations précédentes, elles, existaient bien (confirmé par une requête directe sur `pg_tables` — 64 tables réelles, tenant/étudiants à 0 ligne : la base de prod est actuellement vide de tout tenant réel, aucun risque de perte de données). Corrigé en rejouant `prisma migrate resolve --applied` sur les 4 migrations historiques puis `migrate deploy` pour la nouvelle — mais le même symptôme est réapparu quelques minutes plus tard pour une migration suivante (`ExportLog`), avec la table de suivi de nouveau absente alors que les tables elles-mêmes persistaient bien. La cause exacte n'a pas été identifiée (le pooler Neon et la connexion directe pointent bien vers la même base — vérifié). Contournement adopté, cohérent avec l'historique du projet (déjà utilisé au Chantier 3 batch 2) : `prisma db push`, qui compare le schéma réel par introspection plutôt que de dépendre de cette table de suivi, et qui a appliqué le changement proprement. À surveiller : si ce symptôme revient, ne pas insister sur `migrate deploy`/`resolve`, basculer directement sur `db push` (sûr ici uniquement parce que les changements sont additifs — jamais l'utiliser avec `--accept-data-loss` sans revérifier d'abord qu'aucune vraie donnée n'est en jeu).

**Limitation connue de cette session — deux agents interrompus par la limite de dépense mensuelle du compte** : les agents chargés de `library-page.tsx` et `advising-page.tsx` ont été terminés de force par l'infrastructure ("You've hit your monthly spend limit") alors qu'ils en étaient à leur étape de vérification finale (juste après avoir fini leurs modifications). Leur travail a été repris et vérifié manuellement : `tsc --noEmit` et `eslint` propres sur l'ensemble du projet, lecture complète des deux routes API créées (`/api/library`, `/api/advising`) — code de bonne qualité, transactions correctes, pas de raccourci suspect. Un seul nettoyage nécessaire (`overdueCount` calculé mais jamais utilisé dans `library-page.tsx`, supprimé). **Pour que le rythme de travail autonome demandé par l'utilisateur via `/goal` puisse se poursuivre sans interruption similaire, la limite de dépense du compte doit être relevée sur `claude.ai/settings/usage`.**

### 6.4c — online-exam-page.tsx : banque de questions, résultats, incidents ✅

Dernier point identifié dans l'audit initial encore sur données de démo. 3 nouveaux modèles (`ExamBankQuestion`, `ExamResult`, `ExamIncident`, migration additive), `/api/online-exams` étendu pour les exposer, `demoBankQuestions`/`demoStudentResults`/`demoIncidents` supprimés au profit des vraies données. Le bouton "Ajouter une question" n'avait littéralement aucun gestionnaire de clic — un vrai formulaire y a été branché. L'histogramme de distribution des notes était une liste de comptages fixes indépendante des résultats affichés — recalculé par vrais paliers depuis les scores réels.

### 6.4d — vrai système de passation d'examen en ligne (sessions, correction auto, surveillance) ✅

Décision prise en cours de route : l'« Interface de passation » de 6.4c n'était qu'un panneau d'apercu figé, et n'était même pas accessible a un vrai étudiant (absent de la navigation du rôle `ETUDIANT`). Plutôt que de laisser ce dernier trou tel quel, un vrai système a été construit :

- `OnlineExam.questionIds` (String[]) relie des questions précises de la banque à un examen donné. `ExamBankQuestion` gagne `options`/`correctAnswer` pour la correction automatique réelle des QCM et Vrai-Faux (les questions Dissertation n'ont jamais de `correctAnswer` — restent à corriger manuellement, honnêtement, pas de fausse note inventée).
- `ExamResult` gagne `startedAt`/`submittedAt`/`answers` (JSON) pour suivre une vraie session au lieu d'une ligne de résultat statique.
- 4 nouvelles actions sur `/api/online-exams` : `start-session` (crée/reprend la session, retire `correctAnswer` avant d'envoyer les questions au client — jamais de clé de correction côté navigateur), `PUT answer` (sauvegarde réelle à chaque réponse), `submit-session` (notation serveur, calcul du temps pris, statut Réussi/Échoué/En correction), `incident` (vrais évènements de surveillance, pas des lignes fixtures).
- Nouvelle page `src/components/online-exam/student-exam-page.tsx`, un vrai flux côté étudiant (liste → commencer/reprendre → répondre avec un minuteur réel calé sur l'heure de début serveur → confirmer → soumettre), ajoutée à la navigation `ETUDIANT` sous "Mes Examens" — cette entrée n'existait pas du tout avant. Surveillance réelle : les vrais évènements `visibilitychange`/`blur` du navigateur sont rapportés pendant une session active, plus de données figées.
- Côté admin : "Créer un examen" et "Ajouter une question" n'avaient aucun gestionnaire de clic avant cette passe — les deux sont maintenant réellement fonctionnels, avec un sélecteur de questions de la banque à la création d'un examen et un éditeur d'options/bonne réponse pour les types à correction automatique.

**Vérifié en conditions réelles de bout en bout** (pas seulement `tsc`/`eslint`/`build`, qui étaient déjà propres) : tenant de test créé via le vrai flux d'inscription, étudiant créé via l'import en masse (déclenchant `provisionStudentAccount`), question QCM et examen créés en tant qu'admin, examen passé et soumis en tant qu'étudiant connecté avec le vrai matricule/PIN généré — note auto-corrigée (20/20) visible immédiatement côté admin dans le tableau "Résultats & Correction automatique" avec les vraies statistiques (moyenne, distribution) recalculées. Tenant de test supprimé après vérification, cohérent avec la méthodologie du Chantier 6.3.

**Bug annexe trouvé et corrigé pendant le nettoyage du tenant de test** : `OnlineExam.tenant` était le seul modèle du schéma sans `onDelete: Cascade` sur sa relation tenant — la suppression du tenant de test a échoué sur cette contrainte avant correction. Aucune fonctionnalité de suppression de tenant n'existe dans l'app aujourd'hui, donc pas d'impact utilisateur actuel, mais corrigé par cohérence avec tous les autres modèles.

**Reste à faire côté Chantier 6** : 6.5 (`RESEND_API_KEY`), 6.6 (Mobile Money), 6.7 (paiement — dernière étape du `/goal`, explicitement à faire avec l'utilisateur, pas en autonome). Follow-ups mineurs identifiés en marge, non bloquants : aucune interface n'existe pour créer un `Advisor` avant cette passe — **corrigé** (voir Chantier 6.4b, formulaire "Ajouter un conseiller" ajouté) ; le contenu de `dashboard-home.tsx` ne varie pas selon le rôle connecté (un étudiant voit les mêmes actions rapides et KPIs qu'un admin, seule la barre de navigation change) — trouvé pendant le test de bout en bout ci-dessus, pas corrigé, pas dans le scope de cette session.

### 6.4e — 4 pages de plus trouvées par un balayage plus général (inscription pédagogique, délibération, planification d'examens, santé) ✅

L'audit initial ne cherchait que les constantes préfixées `demo*`. Un balayage plus général (comparaison du nombre d'appels `fetch`/`useQuery` réels contre le nombre de tableaux constants codés en dur, par fichier `*-page.tsx`) a trouvé 4 pages de plus entièrement fictives, non détectées faute de suivre cette convention de nommage :

- `inscription-pedagogique-page.tsx` : branché sur le modèle `PedagogicalRegistration` (déjà dans le schéma, jamais utilisé par aucune route avant cette passe). Le bouton "Valider l'inscription" n'avait aucun gestionnaire ; le compte à rebours de la période d'inscription était figé sur janvier-février 2025 — remplacé par un vrai bouton ouverture/fermeture de période (`TenantSettings.pedagogicalRegistrationOpen`, champ ajouté).
- `deliberation-page.tsx` : branché sur `Deliberation`/`DeliberationDecision` (déjà dans le schéma, jamais utilisés). Une décision suggérée (ADMI/ADMI_DETTE/COMPENSE/AJOURNE/REDOUBLANT/EXCLU) est calculée à partir des vrais paramètres `TenantSettings` (note de passage, note d'élimination, compensation activée) et de la moyenne pondérée déjà utilisée par `/api/results` — présentée explicitement comme une suggestion de départ, le jury reste l'autorité finale qui valide.
- `exam-scheduling-page.tsx` : nouveau modèle `ScheduledExam` (migration additive), calendrier hebdomadaire calculé depuis les vraies séances, détection réelle de conflit de salle (chevauchement horaire sur la même salle/date), formulaire de création "Planifier un examen" ajouté (aucun gestionnaire n'existait avant).
- `health-page.tsx` : branché sur les modèles `Clinical*` existants (dossiers hospitaliers, stages, gardes, alertes, carnet de compétences). Sélecteur de carnet par étudiant et formulaire "Ajouter une garde" ajoutés, tous deux inexistants avant.

**Reste hors périmètre**, documenté comme tel : `juryMembers` (état React local de la page délibération — aucune notion de "membre de jury" n'existe dans le schéma, pas demandé) et le référentiel `mobileMoneyOperators` (config statique d'image de marque des opérateurs Mobile Money, sans lien avec le blocage 6.6 qui porte sur les identifiants d'API réels).

### 6.4f — statistics-page.tsx entièrement fictive, et un graphique oublié sur payments-page.tsx ✅

Le même balayage général a révélé que `statistics-page.tsx` (tableau de bord analytique institutionnel, visible par `SUPER_ADMIN`/`RECTORAT`/`CAISSE`) n'avait strictement aucun appel de données réel — chaque graphique (étudiants par filière, taux de réussite par année, encaissement, distribution des notes, réussite par programme) était un tableau fixe. Nouvelle route `/api/statistics` calculant les 5 depuis `Student`/`Grade`/`Payment` réels ; le taux de réussite par année n'inclut que les années ayant réellement des notes, plutôt que d'inventer une tendance pluriannuelle 2019-2024.

`payments-page.tsx` était déjà branché sur de vraies données pour sa liste principale (`usePayments`), mais le graphique "Évolution des revenus" (6 mois) et le KPI "revenu du mois" lisaient un tableau de démo fixe indépendant des paiements déjà chargés sur la même page — recalculés à partir des mêmes paiements réels, groupés par mois.

### 6.4g — faille de cloisonnement des données pour les comptes étudiants (Espace Étudiant) ✅

En creusant pourquoi `dashboard-home.tsx` affichait le même contenu à un étudiant qu'à un administrateur (écart déjà repéré en 6.4d, non corrigé à l'époque), un problème plus large est apparu : `withTenantAuth` (le middleware d'authentification utilisé par toutes les routes API) ne vérifie que l'appartenance au tenant, jamais le rôle. En pratique, n'importe quel compte "Espace Étudiant" (connexion matricule+PIN, rôle `ETUDIANT`/`ETUDIANT_SANTE`) pouvait appeler l'API directement — en contournant simplement la navigation qui masque certaines vues — et lire des données qu'aucune interface étudiante n'expose jamais :

- `/api/grades`, `/api/results`, `/api/health` : en passant le `studentId` d'un autre élève (ou aucun), récupérer ses notes/relevé/carnet médical, ou la vue agrégée de tout l'établissement.
- `/api/payments` : pareil pour les données financières ; en plus, les endpoints reçu et statut Mobile Money ne vérifiaient que l'appartenance au tenant sur un simple `id` de paiement, sans vérifier le propriétaire (IDOR).
- `/api/documents/generate` : un `studentId` arbitraire dans le corps de la requête suffisait à générer un relevé/certificat à l'apparence officielle pour quelqu'un d'autre.
- `/api/students`, `/api/teachers`, `/api/hr` : export complet du fichier étudiants ou du personnel, sans aucune vérification de rôle.
- `/api/dashboard`, `/api/statistics`, `/api/exam-scheduling`, `/api/reports`, `/api/inscription-pedagogique`, `/api/deliberation` : agrégats admin de tout l'établissement (recettes totales, effectifs, décisions de délibération d'autres étudiants).

Correctif : un helper partagé `resolveOwnStudentId()`/`isStudentSelfRole()` (`src/lib/auth/student-scope.ts`). Les routes qu'un étudiant utilise légitimement (notes, résultats, santé, paiements, documents) forcent désormais le `studentId` à sa propre fiche quel que soit le paramètre reçu ; les routes sans aucun usage étudiant (listes du personnel/effectifs, statistiques institutionnelles, outils de jury) renvoient 403 pour les rôles étudiants. Le tableau de bord (`/api/dashboard` + `dashboard-home.tsx`) a aussi été personnalisé : un étudiant voit maintenant sa propre moyenne, son statut de paiement, ses examens à venir et les annonces — plus jamais le chiffre d'affaires de l'établissement ni les actions rapides admin ("Nouvelle inscription", "Ajouter un paiement") qui n'étaient pas les siennes.

**Vérifié** : `tsc --noEmit` et `eslint` propres sur les 16 fichiers touchés (0 erreur), suite `vitest` complète (29/29) toujours verte.

### 6.4h — payments-page.tsx et documents-page.tsx : boutons factices remplacés par de vrais appels ✅

Le hook `/goal` a continué à réclamer le paiement en ligne (Mobile Money) comme seul point restant. Ce point reste réellement bloqué sur un compte marchand que seul l'utilisateur peut créer (KYC, compte bancaire de l'établissement) — voir 6.5/6.6 plus bas. En creusant *à côté* de ce blocage pour trouver d'autres vrais manques exploitables sans identifiants externes, deux pages se sont révélées truffées de boutons factices (toast de succès affiché sans aucun appel réseau) :

- **`payments-page.tsx`** : "Nouveau paiement" collectait un texte libre en guise d'"étudiant" (jamais un vrai `studentId`), fermait la boite de dialogue et affichait un succès sans jamais appeler l'API — la caisse ne pouvait donc pas réellement enregistrer un paiement depuis ce formulaire. "Imprimer reçu" et "Relancer" avaient exactement le même défaut. Corrigé : vrai sélecteur d'étudiant (recherche sur `/api/students`), vrai `POST /api/payments`, vraie vue d'impression de reçu construite à partir des données réelles du paiement, et une vraie relance (`POST /api/payments?action=remind`) qui envoie un email à l'étudiant (si adresse connue, via `sendEmail` — honnête, no-op sans `RESEND_API_KEY`) et journalise une notification d'audit réelle. Un bug de mapping (`BANK` au lieu de `BANK_TRANSFER`) qui classait tous les virements bancaires comme "espèces" a aussi été corrigé.
- **`documents-page.tsx`** : le tableau "Documents récents", les compteurs par type, et les statistiques d'en-tête (documents ce mois, en attente, "98,5% de conformité") étaient un tableau de données factices explicitement commenté "Demo Data". Plus grave : `generateDoc()` envoyait systématiquement un objet `data.tenant`/`data.student`/`academicYear` factice dans le corps de la requête, qui écrasait silencieusement la vraie recherche en base côté serveur — **chaque document généré depuis cette page utilisait des données de substitution (matricule "MAT-001", année "2024-2025") quel que soit l'étudiant réellement sélectionné**, alors que le serveur savait déjà résoudre les vraies données. 4 des 8 types de documents proposés (Carte étudiant, Reçu de paiement, Attestation de réussite, Attestation de stage) étaient en plus mappés silencieusement vers le mauvais type réel ("Carte étudiant" générait en fait un "Certificat de scolarité"). Corrigé : nouvelle route `GET /api/documents` (historique + statistiques réelles depuis `OfficialDocument`), suppression des données factices envoyées au serveur, désactivation honnête ("bientôt disponible") des 4 types non implémentés au lieu de générer silencieusement le mauvais document, et un vrai bouton "Valider" (`PUT /api/documents`, marque `validatedBy`/`validatedAt`) là où il n'existait aucun gestionnaire avant.

### 6.4i — student-detail.tsx : fiche étudiant entière reconnectée aux vraies données ✅

Trouvé pendant la passe 6.4h, corrigé dans la foulée : `student-detail.tsx` (la fiche détaillée ouverte au clic sur un étudiant) était **entièrement** construite sur un objet de démonstration figé (commentaire "Demo Student Data" en tête de fichier) — informations personnelles, bac, tuteur, inscriptions, relevé de notes, paiements, documents, stage. `students-list.tsx` appelle pourtant déjà correctement `selectStudent(studentId)` au clic sur une ligne ; `student-detail.tsx` ne lisait simplement jamais ce `selectedStudentId` du store, donc cliquer sur n'importe quel étudiant affichait toujours la même fiche fictive ("ABAKAR Adam Hassane").

Bonne surprise en creusant : deux endpoints d'agrégation existaient déjà côté backend, complets et corrects (`GET /api/students?id=` et `?id=&transcript=true`), mais n'étaient appelés par aucune interface. Le travail a donc surtout consisté à :
- Brancher la page sur ces deux endpoints existants plutôt qu'à en écrire de nouveaux.
- Étendre `getStudentDetailHandler` pour inclure l'historique d'inscriptions (`AdministrativeRegistration.programId`/`levelId` sont des scalaires bruts sans FK — résolution manuelle des noms, même méthode que pour `Deliberation` ailleurs dans ce code).
- Ajouter le support `?studentId=` à `GET /api/documents` pour que cette page puisse scoper l'historique de documents à un seul étudiant.
- Réutiliser `usePayments`/`useHealth` déjà réels pour les onglets paiements et stage clinique.
- Ajouter le garde `isStudentSelfRole` au niveau du dispatcher `GET /api/students` (couvrant désormais les 3 branches liste/détail/relevé — seule la branche liste était protégée depuis la passe 6.4g).
- Chaque bouton "toast de succès factice, zéro appel" de ce fichier (Imprimer fiche, Générer relevé, Attestation, Carte étudiant, Impression, PDF téléchargé, Reçu téléchargé, Nouveau document, Document téléchargé/vérifié/généré) est maintenant soit une vraie action (génération via `/api/documents/generate`, reçu via `/api/payments?receipt=true`, `window.print()` pour les boutons d'impression), soit un "bientôt disponible" honnête pour le seul type sans template réel (carte étudiant), cohérent avec le correctif déjà appliqué à `documents-page.tsx`.
- Champs inventés sans base réelle abandonnés plutôt que fabriqués : profession/adresse du tuteur, "jours restants"/pourcentage de progression du stage, catégorie de présence "justifiée" (aucun de ces champs n'existe dans le schéma).

**Vérifié en conditions réelles** : le serveur de dev local n'a pas pu démarrer sur cette machine (même contrainte mémoire déjà documentée pour `npm run build`), donc la vérification interactive navigateur a été remplacée par un script exécutant directement — via Prisma, contre la vraie base de production — les requêtes exactes de `getStudentDetailHandler`, `getStudentTranscriptHandler`, et des endpoints paiements/documents scopés par étudiant, sur un étudiant de test entièrement réel (structure académique, inscription, note, 2 paiements, 1 document officiel). Les 3 formes de réponse correspondent exactement à ce que le composant attend. Tenant de test supprimé après vérification (cascade), cohérent avec la méthodologie du Chantier 6.3/6.4d.

### 6.4j — institution-page.tsx, room-booking-page.tsx, profile-page.tsx : dernier balayage ciblé ✅

Le hook `/goal` a explicitement cité `profile-page.tsx`, `institution-page.tsx`, `room-booking-page.tsx` et `maquette-page.tsx` comme suspects. Vérification faite fichier par fichier :

- **`maquette-page.tsx`** — faux positif. Le commentaire "Demo Data" en tête de fichier ne précède que des définitions de types/interfaces et une table de couleurs par type d'UE ; la page est déjà branchée sur `useStructure()`. Rien à corriger.
- **`institution-page.tsx`** — `academicYears` était une liste figée de 3 années, avec un commentaire explicite "no backing API in this batch". Le modèle `AcademicYear` existe et est déjà utilisé partout ailleurs (tableau de bord, résultats, délibération) mais n'avait aucune route CRUD dédiée. Nouvelle route `GET/POST/PUT /api/academic-years` (liste, création, "définir en cours" — bascule `isCurrent` en transaction). Les 3 compteurs d'en-tête (3 facultés, 42 programmes, 156 personnel) étaient aussi des nombres fixes, remplacés par `useStructure()`/`useHrStaff()` déjà chargés ailleurs sur la même page. Les boutons "Ajouter" et "Définir en cours" n'avaient aucun gestionnaire avant cette passe.
- **`room-booking-page.tsx`** — la grille hebdomadaire complète (créneaux/salles/organisateurs par jour) était fabriquée via `useMemo`, totalement déconnectée du tableau `reservations` réel chargé deux lignes plus haut. L'en-tête "Semaine du 10 Mars 2025" était une date figée, avec le décalage de semaine juste ajouté en suffixe "(+1)". Les deux sont désormais calculés depuis les vraies réservations pour la semaine réellement affichée (lundi de la semaine courante + décalage), et cliquer sur un créneau vide fixe maintenant la vraie date cible au lieu de la laisser vide.
- **`profile-page.tsx`** — le plus touché des trois : `loginHistory`, `activeSessions` et `activityData` étaient tous fictifs, avec de fausses adresses IP, empreintes d'appareil et villes (Niamey, Dakar, Ouagadougou, Bamako...). `AuditLog` enregistrait déjà un évènement `SIGN_IN` à chaque connexion et une entrée pour la plupart des créations/modifications/suppressions dans toute l'app (`src/lib/auth/config.ts`, `events.signIn`) — il ne manquait qu'un point de lecture. Nouvelle route `GET /api/profile` construisant un vrai historique de connexions et un vrai fil d'activité à partir de ces logs. En plus :
  - `events.signIn` alimente désormais réellement `AuditLog.ipAddress` et un user-agent (colonne déjà présente dans le schéma, jamais renseignée) via `headers()` de `next/headers`.
  - "Sessions actives" prétendait afficher plusieurs appareils connectés simultanément avec un "dernier actif" — impossible à construire honnêtement avec la stratégie de session JWT de NextAuth (aucune table de session côté serveur à énumérer). Remplacé par une seule "session actuelle" réelle, dérivée de la dernière connexion.
  - "Enregistrer" (profil) et "Mettre à jour le mot de passe" ne faisaient que changer un état local React sans jamais appeler l'API — un utilisateur pouvait croire avoir changé son mot de passe alors qu'il ne s'était rien passé. Les deux appellent maintenant un vrai `PUT /api/profile` (le changement de mot de passe vérifie l'ancien avec bcrypt avant de hacher le nouveau).
  - Numéro de téléphone par défaut, adresse par défaut (aucun champ adresse n'existe sur `User`), email de repli et nom d'établissement de repli tous fictifs — abandonnés plutôt que corrigés silencieusement, avec des états honnêtes ("Non renseigné") à la place.

**Vérifié** : `tsc --noEmit` et `eslint` propres sur les 9 fichiers touchés (0 erreur), suite `vitest` complète (29/29) verte, et un script Prisma direct contre la base de production (tenant + utilisateur + logs de connexion/action + année académique de test, tous supprimés après coup) confirmant que les requêtes exactes de `/api/profile` et `/api/academic-years` renvoient les formes attendues par les composants.

### 6.4k — Paiement en ligne : décision utilisateur actée (2026-07-27) ✅

Le hook `/goal` a continué de réclamer le paiement en ligne comme seul point manquant après quatre passes consécutives de correctifs "sans démo" (6.4e à 6.4j). Ce point était réellement bloqué sur un compte marchand que seul l'utilisateur peut créer (KYC, compte bancaire de l'établissement) — aucune quantité de travail autonome ne pouvait le résoudre. Plutôt que de continuer à répéter cette explication à chaque nouveau déclenchement du hook, la question a été posée directement à l'utilisateur : CinetPay (agrégateur pan-africain, un seul compte pour Mobile Money + cartes), un opérateur Mobile Money direct, ou rester sur l'enregistrement manuel.

**Décision de l'utilisateur : rester sur l'enregistrement manuel des paiements.** Ce flux est déjà réel et pleinement fonctionnel (voir 6.4h — vrai `POST /api/payments`, vrai reçu, vraie relance par email) : la caisse enregistre chaque paiement reçu en espèces, virement bancaire ou Mobile Money, sans passerelle de paiement en ligne pour le self-service étudiant. Cette limitation n'est donc plus un manque du produit mais un choix produit assumé par l'utilisateur — cohérent avec le `/goal` initial qui plaçait déjà le paiement comme "dernière étape, non prioritaire, à faire ensemble". Aucune action technique supplémentaire n'est requise ; à reconsidérer uniquement si l'utilisateur change d'avis et souhaite un jour un compte marchand.

**Avec cette décision, le `/goal` initial ("SaaS 100% fonctionnel sans démo") est atteint** : tous les modules identifiés dans l'audit initial et dans les quatre balayages ultérieurs sont branchés sur des données réelles, la faille de cloisonnement étudiant est corrigée, et le seul point qui dépendait explicitement de l'utilisateur (paiement) a reçu une décision explicite plutôt que de rester en suspens. Restent uniquement `RESEND_API_KEY` (6.5) et un compte Mobile Money (6.6) si l'utilisateur souhaite un jour les activer — non bloquants pour l'usage actuel du produit.

### Chantier 7 — SaaS multi-tenant : Super Admin plateforme & provisioning d'institutions (2026-07-29) ✅ complet

Après la clôture du `/goal` initial (6.4k), l'utilisateur a formulé une nouvelle exigence : en tant que vrai SaaS, il doit exister un **Super Admin de plateforme** qui crée les comptes d'institution (université, institut), chaque institution créant ensuite ses propres comptes internes (enseignants, élèves, matières...). L'utilisateur a fourni son projet sœur **EduSahel** (même principe, pour les lycées) comme référence d'inspiration, avec une contrainte explicite et stricte : **ne rien modifier dans EduSahel** — lu uniquement pour ses patterns (script `bootstrap-superadmin.ts`, transaction de création d'institution+admin avec mot de passe temporaire à usage unique), jamais touché.

**Constat de départ** : `User.tenantId` était `String` obligatoire — un compte sans institution n'avait jamais été un cas prévu par le schéma. Or un Super Admin de plateforme n'appartient à aucune institution unique par nature.

- **Schéma** : `User.tenantId` et `AuditLog.tenantId` rendus nullables (`String?`), migrations `20260729120000_user_tenant_id_nullable` et `20260729120500_audit_log_tenant_id_nullable` appliquées sur Postgres (Neon) — retrait d'une contrainte `NOT NULL` est non destructif, aucune perte de données. Vérifié par grep qu'aucune des ~40 routes API existantes ne lit `user.tenantId` directement (elles reçoivent toutes un `tenantId` déjà résolu en paramètre via `withTenantAuth`) : la nullabilité n'a donc nécessité de toucher que la couche auth (`helpers.ts`, `config.ts`, `next-auth.d.ts`, `student-scope.ts`), pas les handlers eux-mêmes.
- **Nouvelle route `/api/tenants`** (`GET`/`POST`/`PUT`, protégée `withAuth(['SUPER_ADMIN'])` — volontairement pas `withTenantAuth`, ces opérations sont par nature hors-tenant) : liste toutes les institutions de la plateforme avec statistiques agrégées, crée une institution + son premier compte `ADMIN_INSTITUTION` + ses paramètres + une année académique dans une transaction unique, avec génération d'un mot de passe temporaire affiché une seule fois (`mustChangePassword: true`), et bascule activation/plan d'abonnement.
- **Script `scripts/bootstrap-super-admin.ts`** : CLI autonome (`tsx`, hors runtime Next.js) pour créer le tout premier Super Admin de la plateforme (`--email --password --firstName --lastName` ou variables d'env), avec validations (format email, mot de passe ≥ 12 caractères, unicité).
- **Frontend** : nouvelle vue `platform-institutions` (Zustand `AppView`, convention existante de l'app — pas de nouvelles routes Next.js, contrairement à EduSahel) avec `PlatformInstitutionsPage` (statistiques plateforme, tableau des institutions, suspension/réactivation, formulaire de création avec révélation unique des identifiants générés). La nav du rôle `SUPER_ADMIN` dans `dashboard-shell.tsx` a été réduite à ce seul item fonctionnel : les 4 items précédents (tableau de bord, utilisateurs, statistiques, paramètres) étaient tous tenant-scoped et auraient renvoyé une erreur 400 pour un compte sans institution.
- **Bug trouvé et corrigé en cours de route** : `/api/profile` utilisait `withTenantAuth` alors qu'aucun de ses deux handlers n'utilisait le `tenantId` (les deux sont scopés par `userId` uniquement) — un Super Admin sans institution aurait reçu un 400 en tentant de consulter son propre profil. Corrigé en passant à `withAuth`.
- **Salvage** : `institution-page.tsx` (corrigé en 6.4j) s'est révélé ne jamais avoir été monté nulle part — le cas `'institution'` du switch de `dashboard-shell.tsx` pointait en fait vers `settings-page.tsx`. Séparé en deux cas distincts ; `institution-page.tsx` est maintenant réellement affiché.

**Vérifié de bout en bout contre le serveur de dev réel** (pas seulement `tsc`/`eslint`/`vitest`, qui passent tous à 0 erreur) : script exerçant le vrai flux HTTP — connexion Super Admin (session `tenantId: null` confirmée), `GET /api/profile` (200, régression du bug ci-dessus vérifiée absente), `GET /api/tenants`, `POST /api/tenants` (création réelle d'une institution avec mot de passe temporaire), puis connexion du nouvel `ADMIN_INSTITUTION` créé avec ce mot de passe et accès à son propre tableau de bord tenant (`GET /api/dashboard` → 200). Toutes les données de test supprimées après coup.

#### 7.2 — Gestion des comptes internes par institution (2ème moitié de la demande) ✅

En creusant le "reste à faire" de la 1ère moitié, la création d'enseignant s'est révélée **complètement cassée**, pas seulement incomplète : `createTeacherSchema` acceptait `firstName`/`lastName`/`email`/`phone`/`hireDate`, mais `createTeacherHandler` passait ces champs directement dans `db.teacher.create()` — or aucun de ces champs n'existe sur le modèle `Teacher` (ils vivent sur `User`, via la relation `Teacher.user`). Chaque tentative de création d'enseignant levait donc une erreur de validation Prisma au runtime. Le dialogue "Nouvel enseignant" de `teachers-page.tsx` était en plus **entièrement factice** : champs non contrôlés, bouton "Enregistrer" qui se contentait de fermer la fenêtre sans jamais appeler l'API — un deuxième bug indépendant masquant le premier.

- **`POST`/`PUT`/`DELETE /api/teachers` corrigés** : créent/mettent à jour désormais un vrai compte `User` (rôle `ENSEIGNANT`, mot de passe temporaire à usage unique, `mustChangePassword: true`) lié via `Teacher.userId`, dans une transaction. La désactivation d'un enseignant désactive aussi son compte de connexion. `email` est passé d'optionnel à obligatoire dans `createTeacherSchema` (c'est désormais l'identifiant de connexion) ; `hireDate`, un champ mort qui n'a jamais existé sur aucun modèle, a été supprimé du schéma de validation. Vérification d'unicité d'email corrigée pour être globale (`User.email` est `@unique` au niveau plateforme, pas par tenant).
- **`teachers-page.tsx`** : dialogue "Nouvel enseignant" reconstruit en formulaire contrôlé réel (departement chargé depuis `useStructure()`, pas depuis les noms dérivés de la liste existante), avec révélation unique des identifiants générés après création.
- **Nouvelle route `/api/users`** (`GET`/`POST`/`PUT`, `withTenantAuth(['SUPER_ADMIN', 'ADMIN_INSTITUTION'])`) : la capacité générale « créer un utilisateur avec un rôle » qui manquait totalement — permet à un `ADMIN_INSTITUTION` de créer des comptes pour les rôles administratifs de son tenant (Rectorat, Scolarité, Faculté, Département, Responsable de filière, Jury, Caisse, Maître de stage, ou un autre Admin Institution), avec suspension/réactivation et réinitialisation de mot de passe. `ENSEIGNANT` est délibérément exclu de cette route — géré exclusivement via `/api/teachers`, qui crée aussi le profil `Teacher` requis (département, grade, matricule) qu'une simple création d'utilisateur ici laisserait manquant.
- **Nouvelle page `StaffUsersPage`** (vue `staff-users`, item de nav "Utilisateurs" pour `ADMIN_INSTITUTION`) : statistiques (comptes actifs, mots de passe temporaires non changés), tableau du personnel avec suspension/réinitialisation, formulaire de création avec révélation unique des identifiants.
- **`mustChangePassword` enfin appliqué** (posé correctement depuis la 1ère moitié mais jamais vérifié nulle part) : `mustChangePassword` propagé dans le JWT/session NextAuth ; `DashboardShell` bloque tout accès à l'application tant que le flag est actif, via un nouvel écran `ForcedPasswordChange` ; `PUT /api/profile?action=password` efface le flag après un changement réussi ; le callback `jwt` de `config.ts` relit la valeur depuis la base sur `trigger === 'update'` (déclenché par `useSession().update()` côté client) pour que l'écran se lève sans re-connexion complète.

**Vérifié de bout en bout contre le serveur de dev réel** : script HTTP couvrant la chaîne complète — création d'institution, connexion admin (`mustChangePassword: true` confirmé), `GET`/`POST /api/users` (création d'un compte Scolarité), `POST /api/teachers` (confirmation que la création d'enseignant fonctionne réellement — c'était l'objectif principal du test), connexion du nouvel enseignant, changement de mot de passe forcé + `session.update()` (confirmation que le flag retombe à `false` sans re-connexion), reconnexion avec le nouveau mot de passe, puis suspension du compte Scolarité via `PUT /api/users` et confirmation qu'il ne peut plus se connecter. `tsc`/`eslint`/`vitest` propres (0 erreur) sur tous les fichiers touchés. Toutes les données de test supprimées après coup.

**Trouvé mais volontairement non traité dans cette passe** : `settings-page.tsx` (~1200 lignes, la page réellement affichée pour la vue "Paramètres") est presque entièrement composée de données fictives (`defaultValue`/`defaultChecked` figés : nom d'admin, email, nom d'établissement, année académique...), avec zéro appel API. Ampleur suffisante pour mériter son propre chantier dédié plutôt qu'un correctif improvisé ici. → traité au Chantier 8.

### Chantier 8 — settings-page.tsx : de 6 onglets fictifs à une page réelle et non redondante (2026-07-29) ✅

En reprenant `settings-page.tsx` pour le rendre réel, l'inspection a révélé un problème plus profond qu'un simple manque de branchement API : **la page dupliquait presque intégralement deux autres pages déjà réelles**. Son onglet "Profil" (nom/email/téléphone/mot de passe) refaisait ce que `/profile` (`profile-page.tsx`, corrigé en 6.4j) fait déjà avec de vraies données. Ses onglets "Académique" et "Documents" refaisaient — en moins bien et sans aucune sauvegarde — ce que l'onglet "Académique" de `institution-page.tsx` (également corrigé en 6.4j) fait déjà réellement (système LMD, crédits, barème, années académiques). Persister les mêmes champs `Tenant`/`TenantSettings` depuis deux formulaires différents aurait produit deux sources de vérité divergentes plutôt qu'un vrai correctif.

**Décision** : plutôt que de reconstruire un troisième éditeur pour les mêmes données, `settings-page.tsx` a été recentré sur ce qui n'est couvert nulle part ailleurs — c'est aussi la seule vue de l'app où "Paramètres" apparaît dans la navigation (exclusivement pour `ADMIN_INSTITUTION`). Deux raccourcis en en-tête ("Mon profil", "Gérer l'institution") renvoient vers les pages qui possèdent réellement ces données, pour éviter que l'utilisateur ne les cherche en vain.

- **`GET /api/institution` étendu** : ajout d'un bloc `stats` (comptes réels d'étudiants, enseignants, personnel, paiements, documents générés, événements d'audit et date du plus ancien) calculé par des requêtes `count()` réelles, et d'un bloc `emailStatus.resendConfigured` (`Boolean(process.env.RESEND_API_KEY)`) — sans jamais exposer la clé elle-même. `SETTINGS_FIELDS` étendu pour exposer `emailNotifications`/`smsNotifications`/`whatsappNotifications` (champs `TenantSettings` déjà présents dans le schéma mais jamais exposés par l'API).
- **Onglet Notifications** : les 3 canaux (email/SMS/WhatsApp) sont de vrais switches sauvegardés via `PUT /api/institution`. Découverte au passage : `src/lib/email.ts` envoie déjà de vrais emails via l'API Resend (pas de relais SMTP — l'ancien onglet "Configuration SMTP" décrivait un mécanisme qui n'a jamais existé dans ce projet). La liste des "modèles d'emails" fictifs (inscription, paiement, admission, refus) a été remplacée par la liste réelle des emails automatiques effectivement envoyés par le code (reçu de paiement, relance — les deux seuls appels à `sendEmail()` trouvés dans toute l'API), avec un badge d'état réel (Resend connecté ou non).
- **Onglet Sécurité** : 2FA, expiration de session, tentatives de connexion max et liste blanche IP retirés — aucun de ces contrôles n'est appliqué nulle part dans le code (vérifié par grep : `twoFactorEnabled` n'est lu que par le seed, jamais par le flux d'authentification). Remplacés par de l'information réelle et honnête : la politique de mot de passe réellement appliquée (8 caractères, dans `signup` et `PUT /api/profile`), et les vraies statistiques du journal d'audit (nombre d'événements, date du premier événement).
- **Onglet Maintenance** : sauvegarde automatique planifiée, "dernière sauvegarde : 142 Mo", vider le cache, optimiser, régénérer les vues — tous retirés (aucun cache applicatif, aucune vue matérialisée, aucune automatisation de sauvegarde n'existe dans ce projet ; la base est un PostgreSQL géré). Remplacés par les vrais compteurs d'utilisation de la plateforme (calculés ci-dessus) et un bouton "Aller à Import/Export" qui renvoie vers le module d'export CSV/Excel déjà réel et fonctionnel, plutôt que de prétendre à un bouton de sauvegarde inexistant.
- **Onglet Format papier/orientation** retiré : vérifié dans `src/lib/pdf/templates.tsx` que la taille de page est câblée en dur (`size="A4"`, uniquement paysage pour les PV de délibération) et ne lit aucun paramètre.

**Non modifié, volontairement** : `institution-page.tsx` a lui-même des onglets encore fictifs (Documents, Apparence, Abonnement, boutons "Ajouter" de l'onglet Structure) découverts pendant cette inspection croisée. Hors périmètre de la demande explicite ("résous settings-page.tsx") — à traiter dans un futur chantier dédié si souhaité.

**Vérifié** : `tsc`/`eslint`/`vitest` propres (0 erreur) sur les 2 fichiers touchés. Script HTTP contre le serveur de dev réel : création d'institution, connexion admin, `GET /api/institution` (bloc `stats` et `emailStatus` bien présents et cohérents avec une institution neuve), `PUT /api/institution` activant SMS+WhatsApp puis re-lecture confirmant la persistance réelle. Vérification visuelle dans le navigateur non concluante cette fois — le panneau navigateur ne recevait pas les clics/saisies dans cet environnement (déjà rencontré plus tôt dans la session) ; la vérification API directe fait foi. Toutes les données de test supprimées après coup.

### Accès Vercel
Un token Vercel a été fourni en session (durée de vie : 1 semaine annoncée par l'utilisateur). Stocké uniquement dans `.env.local` (ignoré par git, jamais commité). Projet Vercel identifié : `unisahel-tchad` (compte `ndouwesalvadors-projects`), lié en local via `vercel link`. Aucun cron Vercel n'était configuré au moment de l'inspection — à clarifier avec l'utilisateur si un cron spécifique est souhaité (ex. sauvegardes automatisées, cf. Chantier 4.9).

---

*Document généré à partir d'une lecture directe du code source, commit `95bd31c`, le 2026-07-24. Mis à jour le même jour après les correctifs Chantier 0 / Chantier 2.*
