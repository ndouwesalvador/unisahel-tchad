# Plan de Mise en Production - UniSahel

> **Objectif** : Transformer le prototype démo (85% UI, 15% backend) en application SaaS universitaire robuste, multi-tenant, prête pour la production en Afrique.

---

## 📊 ÉTAT INITIAL (Audit du 2026-06-07)

| Couche | Statut | Détail |
|--------|--------|--------|
| Schéma Prisma | ✅ Production Ready | 40+ modèles, multi-tenant complet |
| Base de données | ⚠️ SQLite dev only | Pas de migrations, pas de Postgres |
| API Routes | ⚠️ 3/15 réelles | `/api/grades`, `/api/students`, `/api/structure` |
| Authentification | ❌ FAKE | Login démo seulement, pas de JWT/session |
| Données Frontend | ❌ 100% Mock | `demoXxx = [...]` hardcodé partout |
| Tests | ❌ Aucun | Zero tests |
| CI/CD/Deploy | ❌ Aucun | Pas de Docker, pas de pipeline |

---

## 🚀 PHASES DU PLAN

### PHASE 1 : FONDEMENTS (Semaine 1-2) - CRITIQUE
| # | Tâche | Effort | Statut | Notes |
|---|-------|--------|--------|-------|
| 1.1 | Config NextAuth v5 + JWT + bcrypt | 2j | ⬜ | `@/lib/auth` nouveau |
| 1.2 | Middleware protection routes + RBAC | 1j | ⬜ | Dépend de 1.1 |
| 1.3 | Migration SQLite → PostgreSQL + Prisma Migrate | 1j | ⬜ | Docker/Postgres requis |
| 1.4 | Variables d'env production (.env.production) | 0.5j | ⬜ | - |
| 1.5 | Seed idempotent + données de test réalistes | 1j | ⬜ | - |
| 1.6 | TanStack Query Provider + QueryClient config | 0.5j | ⬜ | Déjà dans page.tsx, à compléter |
| 1.7 | Schémas Zod partagés (client/serveur) | 1j | ⬜ | Validation unifiée |

### PHASE 2 : API CRUD COMPLÈTES (Semaine 2-4) - CRITIQUE
| # | Endpoint | Modèles | Effort | Statut |
|---|----------|---------|--------|--------|
| 2.1 | `/api/auth/*` | User, Session | 3j | ⬜ |
| 2.2 | `/api/grades` POST/PUT/DELETE | Grade, GradingRule | 3j | ⬜ |
| 2.3 | `/api/students` POST/PUT/DELETE | Student, AdminRegistration | 2j | ⬜ |
| 2.4 | `/api/payments` (NOUVEAU) | FeeStructure, Payment | 3j | ⬜ |
| 2.5 | `/api/deliberation` (NOUVEAU) | Deliberation, Decision | 3j | ⬜ |
| 2.6 | `/api/documents` (NOUVEAU) | DocTemplate, OfficialDoc | 3j | ⬜ |
| 2.7 | `/api/scholarships` CRUD | Scholarship, Application | 2j | ⬜ |
| 2.8 | `/api/health` (NOUVEAU) | Hospital, Internship, GuardDuty | 2j | ⬜ |
| 2.9 | `/api/teachers` CRUD | Teacher, TeachingUnit | 2j | ⬜ |
| 2.10 | `/api/structure` POST/PUT/DELETE | Faculty, Dept, Program | 2j | ⬜ |

### PHASE 3 : CONNEXION FRONTEND → API (Semaine 3-5) - HAUTE
| # | Composant | Pattern | Effort | Statut |
|---|-----------|---------|--------|--------|
| 3.1 | Configuration TanStack Query global | QueryClient + DevTools | 0.5j | ⬜ |
| 3.2 | Module pilote : Grades (API + UI) | useQuery/useMutation | 2j | ⬜ |
| 3.3 | Module pilote : Students (API + UI) | useQuery/useMutation | 2j | ⬜ |
| 3.4 | Module pilote : Payments (API + UI) | useQuery/useMutation | 2j | ⬜ |
| 3.5 | Tous les 30+ composants restants | Remplacer demoXxx par hooks | 10j | ⬜ |
| 3.6 | Loading states + Skeletons | UI components | 2j | ⬜ |
| 3.7 | Error Boundaries + Error UI | React Error Boundary | 1j | ⬜ |
| 3.8 | Optimistic updates | onMutate/onError rollback | 2j | ⬜ |

### PHASE 4 : FONCTIONNALITÉS MANQUANTES (Semaine 4-6) - MOYENNE
| # | Fonction | Effort | Statut |
|---|----------|--------|--------|
| 4.1 | Upload fichiers (S3/MinIO) | 2j | ⬜ |
| 4.2 | Génération PDF réel (relevés, attestations, PV) | 3j | ⬜ |
| 4.3 | QR Code anti-fraude + page vérification publique | 2j | ⬜ |
| 4.4 | Email/SMS notifications (Brevo/Twilio) | 2j | ⬜ |
| 4.5 | WebSocket temps réel (notifications, chat) | 3j | ⬜ |
| 4.6 | Import Excel robuste (notes, étudiants, paiements) | 3j | ⬜ |
| 4.7 | Export PDF/Excel avancé | 2j | ⬜ |
| 4.8 | Audit logs complets (toutes mutations) | 1j | ⬜ |
| 4.9 | Sauvegarde/restauration BDD automatisée | 1j | ⬜ |

### PHASE 5 : PRODUCTION HARDENING (Semaine 5-7) - MOYENNE
| # | Tâche | Effort | Statut |
|---|-------|--------|--------|
| 5.1 | Tests unitaires (Vitest) + intégration + E2E (Playwright) | 5j | ⬜ |
| 5.2 | CI/CD GitHub Actions (lint, typecheck, test, build, deploy) | 2j | ⬜ |
| 5.3 | Docker multi-stage + docker-compose prod | 1j | ⬜ |
| 5.4 | Monitoring (Sentry, LogRocket) + alerting | 1j | ⬜ |
| 5.5 | Rate limiting, CSP headers, security audit | 2j | ⬜ |
| 5.6 | Documentation API (OpenAPI/Swagger) | 1j | ⬜ |
| 5.7 | Runbook ops (backup, rollback, scaling) | 1j | ⬜ |

---

## 📈 PROGRESSION GLOBALE

```
Phase 1 : ░░░░░░░░░░  0/7  (0%)
Phase 2 : ░░░░░░░░░░  0/10 (0%)
Phase 3 : ░░░░░░░░░░  0/8  (0%)
Phase 4 : ░░░░░░░░░░  0/9  (0%)
Phase 5 : ░░░░░░░░░░  0/7  (0%)
Total   : ░░░░░░░░░░  0/41 (0%)
```

---

## ⚠️ RISQUES IDENTIFIÉS

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Auth inexistante bloque tout | Élevée | Bloquant | **Commencer par Phase 1.1** |
| Refactor frontend massif (30+ composants) | Élevée | Retard | Module pilote d'abord (3.2-3.4) |
| SQLite → Postgres migrations complexes | Moyenne | Bloquant | Docker compose dev dès Phase 1.3 |
| Multi-tenant pas appliqué dans API | Élevée | Sécurité | Middleware tenantId obligatoire Phase 1.2 |
| `ignoreBuildErrors: true` masque bugs | Certaine | Qualité | Retirer dès Phase 1, corriger TS |

---

## 🎯 MODULE PILOTE RECOMMANDÉ

**Grades** (`/api/grades` + `grades-page.tsx`)
- API GET existe déjà avec Prisma
- UI complète avec calculs réels
- Boutons : Import, Export, Save, Validate, Lock
- Permet de valider le pattern `useQuery`/`useMutation` avant généralisation

---

## 📝 DÉCISIONS ARCHITECTURALES

| Décision | Justification |
|----------|---------------|
| NextAuth v5 (beta) | App Router natif, edge compatible, JWT stateless |
| TanStack Query v5 | Déjà installé, cache serveur, optimistic updates |
| Zod pour validation | Partageable client/serveur, TypeScript-first |
| PostgreSQL + Prisma Migrate | Production standard, migrations versionnées |
| Docker Compose dev | Parité dev/prod, Windows/Linux/Mac compatible |
| Middleware Next.js | Protection routes au niveau edge, performance |
| RBAC basé sur `user.role` (Prisma) | Schéma existant, 13 rôles définis |

---

*Dernière mise à jour : 2026-06-07*
*Prochaine action : Phase 1.1 - NextAuth v5 Setup*