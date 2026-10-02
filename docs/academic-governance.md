# Gouvernance académique et chaîne de planification

## Source de vérité

Une institution possède des facultés, chaque faculté des départements, chaque département des programmes et chaque programme des niveaux. Un programme planifiable doit avoir un `departmentId` actif ; son département est **propriétaire** de son emploi du temps. Le niveau et la matière/EC appartiennent obligatoirement à ce même programme.

Un enseignant possède un département de rattachement (`Teacher.departmentId`), utilisé pour l'annuaire, le suivi de charge et son encadrement administratif. Ce rattachement ne détermine pas seul où il peut enseigner. Une affectation explicite à l'EC (`CourseElement.teacherId`) ou comme responsable de l'UE (`TeachingUnit.responsibleId`) autorise son intervention dans le programme d'un autre département. L'affectation est faite par l'administration dans la structure et reste distincte du pouvoir de modifier le programme. Un enseignement commun à plusieurs programmes doit être représenté par des EC de chaque programme avec la même ressource enseignante ; aucun droit implicite n'est déduit de l'intitulé « tronc commun ».

## Rôles et périmètres

| Rôle | Périmètre | Peut actuellement planifier | Peut affecter les matières |
| --- | --- | --- | --- |
| Administrateur institution | Toute son institution | Oui | Oui |
| Scolarité centrale | Toute son institution | Oui | Non |
| Doyen / direction de faculté (`FACULTE`) | Départements actifs de sa faculté | Oui | Non |
| Chef de département (`DEPARTEMENT`) | Son seul département actif | Oui | Non |
| Enseignant | EC/UE effectivement affectés | Lecture seule | Non |

Les comptes de direction existants sans périmètre sont bloqués jusqu'à affectation par l'administrateur. L'absence de périmètre ne donne jamais accès à toute l'institution. L'administration crée ou modifie le rôle et le périmètre dans **Utilisateurs** ; l'enseignant conserve un profil créé dans **Enseignants**. Les vues historiques de notes, présences et autres documents restent fermées aux directions locales tant que leur filtrage n'est pas implémenté. La **délibération** et son **PV** sont désormais accessibles au chef de département dans son département et au doyen dans les départements de sa faculté, avec contrôle du périmètre à chaque requête.

## Chaîne opérationnelle

1. **Structure** — l'administration crée la faculté, le département, le programme, le niveau, l'UE et l'EC. Chaque programme planifié a exactement un département propriétaire. Les paramètres de scolarité (année, salles) sont préparés centralement.
2. **Personnel** — l'administration crée le profil enseignant avec son département de rattachement ; elle crée les comptes de doyen et de chef avec leur périmètre nominatif. Tout changement de rôle et de périmètre est journalisé.
3. **Service pédagogique** — le département propriétaire demande un intervenant externe si nécessaire. L'administration vérifie la charge et l'accord du département de rattachement, puis attribue l'EC ou l'UE à cet enseignant. Dans la version actuelle, cette décision est matérialisée par l'affectation de l'EC/UE dans Structure ; le formulaire de demande et son approbation ne sont pas encore automatisés. Ne pas assimiler une sélection libre d'enseignant dans l'emploi du temps à une affectation.
4. **Planification** — le chef de département crée et corrige les créneaux de ses programmes ; le doyen supervise ceux de sa faculté. L'API vérifie le programme, le niveau, l'EC, l'enseignant affecté, la salle active, l'année et le format horaire. Elle refuse le chevauchement d'une salle, d'un enseignant ou d'un niveau dans l'institution. Une salle est une ressource partagée : son conflit est contrôlé à l'échelle de l'institution, même si le créneau d'origine n'est pas visible au chef. Modifier ou supprimer un créneau exige l'accès au programme d'origine ; chaque opération est journalisée dans la même transaction.
5. **Exécution** — l'enseignant lit son emploi du temps à partir de ses EC affectés, puis renseigne présences et notes uniquement pour ses attributions. Chaque département délibère sur ses propres inscrits administratifs de l'année courante et leurs inscriptions pédagogiques actives ; les notes manquantes des autres départements ne bloquent ni sa clôture ni son PV. Le jury est unique par département, année et session. Les décisions doivent couvrir exactement les inscrits du département au verrouillage et à la génération du PV. La composition nominative du jury est enregistrée lors du verrouillage et reprise depuis la base pour chaque export, sans faire confiance au navigateur. Le PV mentionne explicitement le département et prévoit la signature de son chef, sans signature obligatoire du rectorat. Une inscription administrative sans inscription pédagogique bloque la clôture au lieu de faire disparaître l'étudiant.
6. **Diffusion** — prochain lot : brouillon puis publication par année/période, motif de révision, validation du doyen ou de la scolarité selon la politique de l'institution, versions consultables et notification des enseignants/étudiants concernés. Le journal actuel trace les modifications/suppressions mais n'est pas encore un circuit de publication validé.

## Invariants à garder lors des prochaines évolutions

- Toute lecture/écriture départementale filtre sur l'institution **et** sur le périmètre en base, jamais sur le seul rôle ou sur un filtre fourni par le navigateur.
- Une intervention externe ne change pas le département de rattachement de l'enseignant et ne lui accorde aucun droit d'administration.
- Les créneaux partagés entre plusieurs cohortes devront avoir une entité de groupe explicite avant d'autoriser plusieurs niveaux simultanés. Le contrôle actuel refuse volontairement deux cours concurrents d'un même niveau.
- Les contraintes de conflits sont vérifiées dans une transaction sérialisable, avec une nouvelle tentative limitée en cas de collision concurrente. Les ressources sans modèle de groupe (TD/TP) restent volontairement conservatrices.
- Les anciennes lignes sans `programId`, sans `levelId` ou sans département propriétaire restent visibles au contrôle central mais ne sont pas attribuées arbitrairement à un département.

## Prochaines tranches prioritaires

1. Ajouter une demande d'intervention inter-départements avec accord du département d'origine et décision de l'administration, puis des charges prévisionnelles par année.
2. Ajouter brouillon, publication, motif de révision et historique des versions d'emplois du temps, avec notifications ciblées.
3. Étendre les filtres et les tests de sécurité par périmètre aux étudiants, notes, présences, examens et autres documents avant d'ouvrir ces menus aux directions locales.
4. Ajouter groupes, variantes de TD/TP, capacité de salle et indisponibilités, puis vérifier le parcours complet en navigateur avec les rôles réels.
