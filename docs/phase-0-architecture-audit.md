# UniSahel — Audit architecture Phase 0

Date : 2026-09-24  
Objectif : consolider UniSahel comme SaaS universitaire multi-tenant robuste, sans reconstruire ni casser l'existant.

## 1. Architecture actuelle

UniSahel est une application Next.js 16 / React 19 avec Prisma/PostgreSQL, NextAuth, TanStack Query, Vitest et Playwright.

Le projet est déjà une application métier structurée, pas une démo :

- interface SaaS côté client avec un shell admin unique ;
- API routes Next.js dans `src/app/api/*` ;
- authentification Credentials/NextAuth ;
- modèle Prisma riche : tenants, utilisateurs, étudiants, enseignants, structure académique, notes, délibérations, paiements, documents, bibliothèque, transport, RH, stages, examens en ligne ;
- tests unitaires existants sur auth, étudiants, paiements, notes, PDF ;
- tests E2E Playwright existants.

Scripts vérifiés dans `package.json` :

- `npm test` : Vitest ;
- `npm run build` : build Next.js ;
- `npm run lint` : ESLint ;
- `npm run test:e2e` : Playwright ;
- `db:generate`, `db:migrate`, `db:push`, `db:reset` : Prisma.

Validation Prisma :

- `prisma generate` passe ;
- `prisma validate` passe si `DATABASE_URL` et `DIRECT_URL` sont définis ;
- l'échec sans `DIRECT_URL` est environnemental, pas structurel.

## 2. Pipeline universitaire actuel

Le pipeline existe déjà partiellement :

```text
Tenant
→ Faculty / Department / Program
→ Level
→ Semester
→ TeachingUnit
→ CourseElement
→ Student
→ AdministrativeRegistration / PedagogicalRegistration
→ Grade
→ Deliberation / DeliberationDecision
→ OfficialDocument
```

Correspondances confirmées :

- `TeachingUnit` représente l'UE ;
- `CourseElement` représente l'EC / ECUE / composant d'UE ;
- `AcademicYear` existe et est utilisé par inscriptions, notes, paiements, délibérations, documents ;
- `PedagogicalRegistration` relie étudiant, UE, année académique et statut ;
- `Grade` porte actuellement les notes CC/examen/TP/stage/oral/mémoire/projet ;
- `Deliberation` et `DeliberationDecision` existent ;
- `OfficialDocument` et `DocumentTemplate` existent.

Limite majeure : le versionnement des maquettes n'existe pas encore. Les UE/EC sont directement rattachées à Program → Level → Semester. Une modification de structure peut donc modifier indirectement l'interprétation historique si elle est faite sur les mêmes objets.

## 3. Architecture multi-tenant actuelle

Points solides :

- beaucoup de modèles possèdent `tenantId` ;
- la majorité des routes API utilisent `withTenantAuth` ;
- `withTenantAuth` résout le tenant côté serveur depuis la session et interdit le `tenantId` croisé pour les rôles non `SUPER_ADMIN` ;
- des tests existent déjà pour `withTenantAuth` ;
- plusieurs routes profondes vérifient l'appartenance via les parents, par exemple `structure` remonte `CourseElement → TeachingUnit → Semester → Level → Program → tenantId`.

Points à surveiller :

- `withTenantAuth` autorise `SUPER_ADMIN` à passer un `tenantId` par query param ; c'est voulu, mais les permissions fines du super admin ne sont pas encore formalisées ;
- certains endpoints ont une auth custom (`documents/generate`, `seed`, `profile`, `notifications`) et doivent être audités séparément ;
- certains modèles n'ont pas `tenantId` direct (`Level`, `Semester`, `TeachingUnit`, `CourseElement`, `ExamSession`) et nécessitent systématiquement une vérification par chaîne parent ;
- certains champs uniques sont globaux alors qu'ils pourraient devoir être tenant-local.

## 4. Risques critiques

1. Relations croisées entre tenants

   Risque : associer une ressource Tenant A à une ressource Tenant B si un handler vérifie seulement l'ID, pas la chaîne propriétaire complète.

   Zones prioritaires : notes, paiements, inscriptions, documents, enseignants, emplois du temps, examens en ligne, bibliothèque, transport.

2. Historique académique fragile

   Le modèle actuel n'a pas de `CurriculumVersion`. Les objets pédagogiques sont actifs mais non versionnés.

3. Documents officiels encore perfectibles

   `OfficialDocument.content` stocke un JSON de contenu, mais la génération de relevé peut encore récupérer les grades par `studentId` sans filtre complet `tenantId`/`academicYearId` dans certains chemins internes. La route vérifie le tenant en amont, mais les requêtes profondes doivent être durcies.

4. Montants en `Float`

   `FeeStructure.amount`, `Payment.amount`, `ScholarshipApplication.amount`, `TransportMaintenance.cost` utilisent `Float`. À long terme, les montants doivent migrer vers `Decimal`.

5. Seed de démonstration encore présent

   `/api/seed` est protégé par `SUPER_ADMIN`, mais crée des données démo de N'Djaména. Sur une prod sérieuse, cette route doit être désactivable ou réservée aux environnements non-production.

6. Contraintes uniques globales

   Exemples : `Student.matricule @unique`, `User.email @unique`, `User.login @unique`, `Staff.email @unique`, `OfficialDocument.number @unique`.

   Certaines peuvent être volontairement globales, mais cela doit être décidé explicitement.

## 5. Problèmes importants

- Pas de service métier central pour les calculs académiques : plusieurs règles sont encore proches des routes ou composants.
- Le système d'évaluation est encore fondé sur des colonnes fixes dans `Grade`.
- `TenantSettings` contient des poids globaux (`ccWeight`, `examWeight`, etc.), utiles mais insuffisants pour les systèmes d'évaluation arbitraires par UE/EC/année.
- `Student.currentProgramId` et `Student.currentLevelId` servent de situation actuelle ; l'historique doit venir des inscriptions par année.
- `Institute` existe mais n'est pas intégré au même niveau que `Faculty` dans les relations `Department`/`Program`.
- Les logs d'audit existent, mais leur contenu est hétérogène et ne contient pas systématiquement `before`/`after`.
- Les tests multi-tenant existent pour certains cas, mais pas encore comme matrice systématique.

## 6. Améliorations non urgentes

- Remplacer progressivement les libellés métier codés en dur par une terminologie tenant-paramétrable.
- Ajouter plus d'indexes composites pour les listes fréquentes.
- Harmoniser les erreurs de validation : certaines erreurs Zod remontent encore en 500 au lieu de 400.
- Nettoyer les warnings ESLint historiques.
- Formaliser une stratégie de permissions par rôle au lieu de permissions dispersées par route.

## 7. Modèles Prisma à conserver

À conserver comme base :

- `Tenant`, `TenantSettings`
- `User`, `Student`, `Teacher`
- `Faculty`, `Department`, `Program`, `Level`, `Semester`
- `TeachingUnit`, `CourseElement`
- `AcademicYear`, `ExamSession`
- `Admission`, `AdministrativeRegistration`, `PedagogicalRegistration`
- `Grade`, `GradeChangeLog`, `GradeImport`
- `Deliberation`, `DeliberationDecision`
- `FeeStructure`, `Payment`
- `OfficialDocument`, `DocumentTemplate`
- `AuditLog`, `ImportLog`, `ExportLog`

Ces modèles sont utilisés et ne doivent pas être supprimés ni renommés brutalement.

## 8. Modèles à faire évoluer

- `CourseElement` : ajouter éventuellement `credits Int?` pour supporter les EC crédités.
- `TeachingUnit` : compléter si nécessaire avec coefficient, obligatoire/optionnel, note minimale, règles de compensation plus explicites.
- `Program` / `Level` / `Semester` / `TeachingUnit` / `CourseElement` : intégrer progressivement un versionnement de maquette.
- `Grade` : conserver en compatibilité, mais préparer la coexistence avec `Assessment` / `AssessmentScore`.
- `Payment`, `FeeStructure` : migrer les montants vers `Decimal` sans destruction.
- `OfficialDocument` : renforcer les snapshots et hash/validation.
- `AuditLog` : standardiser `before`, `after`, `reason`, IP, user agent.
- `Institute` : le rattacher correctement à l'organisation académique si les tenants utilisent école/institut plutôt que faculté.

## 9. Nouveaux modèles éventuellement nécessaires

À introduire seulement après tests de non-régression :

- `Curriculum`
- `CurriculumVersion`
- `Assessment`
- `AssessmentScore`
- `AcademicRuleSet` ou équivalent pour règles tenant/programme/niveau/année
- `StudentAcademicEnrollment` si l'historique d'inscription doit être séparé plus clairement de l'inscription administrative
- `DocumentSnapshot` ou enrichissement de `OfficialDocument.content`
- `PermissionPolicy` / `RolePermission` si les rôles doivent devenir configurables

## 10. Contraintes multi-tenant à renforcer

Priorité :

- empêcher toute écriture où `studentId`, `programId`, `levelId`, `teachingUnitId`, `courseElementId`, `teacherId`, `academicYearId` n'appartiennent pas au même tenant ;
- vérifier la chaîne parent pour les modèles sans `tenantId` direct ;
- ajouter des tests cross-tenant pour chaque API sensible ;
- décider pour chaque `@unique` si l'unicité doit rester globale ou devenir composite tenant-local ;
- ajouter des indexes composites utiles : par exemple `[tenantId, createdAt]`, `[tenantId, status]`, `[tenantId, academicYearId]` selon les modèles.

## 11. Routes/API impactées

Priorité haute :

- `/api/grades`
- `/api/deliberation`
- `/api/documents/generate`
- `/api/students`
- `/api/payments`
- `/api/inscription-pedagogique`
- `/api/structure`
- `/api/teachers`
- `/api/users`
- `/api/timetable`
- `/api/exam-scheduling`
- `/api/online-exams`

Priorité moyenne :

- `/api/import-export`
- `/api/library`
- `/api/transport`
- `/api/hr`
- `/api/reports`
- `/api/communications`
- `/api/advising`
- `/api/scholarships`

Routes spéciales :

- `/api/auth/*` : public/auth ;
- `/api/documents/verify/[code]` : public par design ;
- `/api/seed` : à garder hors production ou strictement contrôlé.

## 12. Tests à ajouter avant modification

Tests minimum avant migrations :

- Tenant A ne peut pas lire un étudiant Tenant B ;
- Tenant A ne peut pas modifier un étudiant Tenant B ;
- Tenant A ne peut pas créer une note avec étudiant Tenant A et UE Tenant B ;
- Tenant A ne peut pas créer un paiement pour étudiant Tenant B ;
- un enseignant ne peut pas saisir les notes d'un EC non affecté ;
- un étudiant ne peut générer/consulter que ses propres documents ;
- une délibération ne peut pas inclure des étudiants hors tenant ;
- un document officiel généré conserve un snapshot stable ;
- une route `SUPER_ADMIN` nécessite explicitement un périmètre tenant ou plateforme.

Tests métier à ajouter progressivement :

- création structure complète ;
- inscription pédagogique ;
- import notes ;
- verrouillage notes ;
- délibération bloquée si notes incomplètes ;
- PV généré uniquement après verrouillage complet ;
- paiement validé et reçu/document associé ;
- historique étudiant par année académique.

## 13. Plan de migration par phase

### Phase 1 — Tests de non-régression

- Ajouter tests cross-tenant sur `students`, `grades`, `payments`, `documents/generate`, `structure`.
- Documenter les comportements actuels à préserver.
- Ne pas modifier le schéma.

### Phase 2 — Isolation multi-tenant

- Créer des helpers de propriété : `assertStudentTenant`, `assertCourseElementTenant`, `assertAcademicYearTenant`, etc.
- Les utiliser dans routes critiques.
- Standardiser les erreurs 403/404.

### Phase 3 — Intégrité base de données

- Auditer `@unique`.
- Ajouter indexes composites non destructifs.
- Préparer migration `Float → Decimal` avec étape ADD/COPY/VERIFY/SWITCH.

### Phase 4 — Maquettes versionnées

- Ajouter `Curriculum` et `CurriculumVersion` sans supprimer les champs actuels.
- Introduire une association version → structure pédagogique.
- Garder compatibilité avec la structure actuelle pendant migration.

### Phase 5 — Évaluations flexibles

- Ajouter `Assessment` et `AssessmentScore`.
- Lire les anciennes notes `Grade` tant que toutes les pages ne sont pas migrées.
- Ajouter adaptateur de calcul compatible.

### Phase 6 — Pipeline académique complet

- Formaliser transitions candidature → admission → inscription administrative → paiement → inscription pédagogique → notes → crédits → jury → documents.
- Centraliser les règles dans services métier.

### Phase 7 — Nettoyage

- Supprimer anciens chemins seulement après migration, tests et vérification de données.

## 14. Risques de régression par phase

- Phase 1 : faible, tests uniquement.
- Phase 2 : moyen, peut bloquer des flows si une relation existante est incohérente.
- Phase 3 : élevé si contraintes ajoutées sans audit de données.
- Phase 4 : élevé, touche le cœur académique et l'historique.
- Phase 5 : élevé, touche saisie/calcul/validation des notes.
- Phase 6 : moyen à élevé, touche de nombreux écrans métier.
- Phase 7 : élevé si suppression trop tôt.

## 15. Critères d'acceptation

Pour chaque phase :

- `npm test` passe ;
- `npm run build` passe ;
- `npm run lint` sans erreurs bloquantes ;
- `prisma validate` passe avec env requis ;
- `prisma generate` passe ;
- E2E concernés passent ;
- aucune migration destructive non approuvée ;
- routes critiques vérifiées en navigateur lorsque pertinent ;
- PR petite et lisible ;
- déploiement production après grande étape fonctionnelle.

## Conclusion

Le prompt externe est pertinent sur le fond. Il a raison sur les priorités :

1. ne pas reconstruire UniSahel ;
2. consolider progressivement ;
3. prioriser isolation tenant, historique académique, traçabilité et tests ;
4. éviter toute migration destructive.

La prochaine action concrète recommandée est Phase 1 : ajouter une première série de tests multi-tenant de non-régression sur les APIs critiques, en commençant par `grades`, `payments`, `students` et `documents/generate`.
