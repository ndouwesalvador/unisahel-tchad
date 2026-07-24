# Phase 1 Progress Tracker

> **Démarré** : 2026-06-07
> **Phase** : Fondations (Auth + DB + Middleware + Config)

---

## ✅ Checklist Phase 1

| # | Tâche | Statut | Fichiers créés/modifiés | Notes |
|---|-------|--------|-------------------------|-------|
| 1.1 | NextAuth v5 + JWT + bcrypt | 🔄 En cours | - | `@/lib/auth` nouveau |
| 1.2 | Middleware protection routes + RBAC | ⬜ | - | Dépend de 1.1 |
| 1.3 | Migration SQLite → PostgreSQL + Prisma Migrate | ⬜ | - | Docker/Postgres requis |
| 1.4 | Variables d'env production (.env.production) | ⬜ | - | - |
| 1.5 | Seed idempotent + données de test réalistes | ⬜ | - | - |
| 1.6 | TanStack Query Provider + QueryClient config | ⬜ | - | Déjà dans page.tsx |
| 1.7 | Schémas Zod partagés (client/serveur) | ⬜ | - | Validation unifiée |

---

## 📝 Journal d'exécution

### 2026-06-07 - Début Phase 1
- [ ] Créer structure `@/lib/auth`
- [ ] Configurer NextAuth v5 avec providers credentials + JWT
- [ ] Ajouter bcrypt pour hash mots de passe
- [ ] Créer middleware.ts avec protection routes + RBAC
- [ ] Migrer schema.prisma vers PostgreSQL
- [ ] Créer docker-compose.yml pour dev
- [ ] Configurer .env.production template
- [ ] Améliorer seed script
- [ ] Configurer TanStack Query Provider complet
- [ ] Créer lib/validations (Zod schemas)

---

## 🎯 Prochaine action immédiate

**Créer `@/lib/auth` avec NextAuth v5**