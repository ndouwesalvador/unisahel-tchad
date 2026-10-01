# Audit administrateur — Université Polytechnique de Mongo

Ce registre distingue **navigation vérifiée** et **fonctionnement métier vérifié**. Une page qui s'ouvre n'est pas déclarée terminée. Les contrôles destructifs et les dossiers fictifs sont réservés à une base de test isolée ; aucune note, décision de jury ou transaction réelle n'est inventée en production.

## État constaté le 1er octobre 2026

- Session admin Mongo ouverte sur la production ; établissement, rôle et menu contrôlés. Le module Santé n'apparaît pas pour cette université technique.
- Les 31 entrées du menu institutionnel et Paramètres ont été ouvertes. Les écrans « Emploi du temps », « Personnel », « Transport » et « Paramètres » nécessitent plus de temps de chargement ; ils ne sont pas vides après stabilisation.
- Tableau de bord : 7 dossiers étudiants, dont 7 pré-inscrits ; le libellé « inscrits » était donc faux. Les 400 000 FCFA correspondent au total des paiements validés. La sélection d'année dans l'en-tête ne filtre pas cette synthèse, maintenant signalée comme cumulée.
- Rapports : l'ancien écran affichait des dates de 2025, facultés de médecine/droit et planifications inventées, et permettait de créer des enregistrements PENDING sans générateur. Remplacé par une synthèse réelle. CSV, Excel, actualisation, cinq liens métier et refus de création fantôme vérifiés en production.
- Personnel : trois tendances inventées retirées ; « taux d'occupation » renommé en part du personnel actif et « enseignants permanents » en contrats CDI, conformément aux calculs réels.

## Parcours systématique restant

| Écran | Contrôle déjà fait | Vérification métier à terminer |
| --- | --- | --- |
| Tableau de bord | Chargement, chiffres/API et libellés | Six actions rapides, alertes, événements et changement d'année |
| Étudiants | Liste et commandes visibles | Créer, modifier, matricule, statuts, filtres, imports, exports, isolation tenant |
| Enseignants | Liste et commandes visibles | Création, affectation aux matières, édition, export et droits sur notes |
| Utilisateurs | Page ouverte | Rôles, invitation, changement de mot de passe, désactivation, isolation tenant |
| Candidatures | Page ouverte | Création, pièces, décision, conversion en étudiant, exports |
| Structure | Faculté, département, programme, niveau, semestre, UE et EC visibles | CRUD complet, relations, suppression protégée, édition UE/EC/UC, conflits de codes |
| Programmes / Maquettes | Les deux ouvrent la même page | Clarifier la distinction ou fusionner les menus ; tester export et renvoi Structure |
| Notes | Page ouverte ; dossier incomplet signalé | Affectation enseignant, saisie, verrouillage, import, session et contrôle des droits |
| Délibérations | 12 notes manquantes déjà signalées pour le jury courant | Préparation, décision, verrouillage, export PV, refus si dossier incomplet |
| Documents | Centre ouvert | Chaque type, génération, identité, signatures, vérification QR et historique |
| Paiements | Page ouverte | Encaissement, validation, annulation, reçu, état étudiant et totaux |
| Stages | Page ouverte | Convention, partenaire, suivi, évaluation et export |
| Emploi du temps | Chargement stabilisé, zéro cours réel | Créer/modifier un créneau, conflits, vue semaine/jour, PDF |
| Examens | Page ouverte | Session, salle, conflit, génération planning, export |
| Annonces | Page ouverte | Brouillon, publication, audience, visibilité étudiante |
| Import/Export | Page ouverte | Modèles, prévisualisation, erreurs ligne par ligne, anti-doublon |
| Inscriptions pédagogiques | Page ouverte | Choix UE, validation, clôture, crédits et statuts |
| Bourses | Page ouverte | Programme, attribution, budget, bénéficiaires, export |
| Alumni | Page ouverte | Création, liaison étudiant, modification, export |
| Orientation | Page ouverte | Conseillers, rendez-vous, confidentialité, suivi |
| Bibliothèque | Page ouverte | Catalogue, exemplaires, prêts, retours et recherche |
| Présences | Page ouverte | Signalement, justification, filtres, rapport |
| Messages | Page ouverte | Destinataires réels, envoi, historique, pièces jointes |
| Examens en ligne | Page ouverte | Banque de questions, session, correction, résultats et sécurité |
| Rapports | Données réelles, exports et liens vérifiés | Créer ultérieurement un véritable moteur PDF/planification avant de réactiver ces commandes |
| Personnel | Données/API chargées | Création, statut, congés, exports ; contrôler chaque métrique après déploiement |
| Salles | Page ouverte | Capacité, réservation, conflits et annulation |
| Transport | Chargement stabilisé, aucune flotte enregistrée | Véhicules, trajets, réservations et filtres |
| Résultats | Page ouverte | Publication, crédits, recours, cohérence avec PV/relevés |
| Institution | Page ouverte | Paramètres institutionnels, année, logo/cachet, validations |
| Paramètres | Page ouverte ; email non configuré explicitement signalé | Sauvegarde préférences, sécurité, maintenance, liens profil/institution |

## Ordre de réalisation

1. **Chaîne académique bloquante** : Structure → Étudiants/Candidatures → inscriptions pédagogiques → affectations enseignant → Notes → Délibérations → PV/Documents. Chaque transition doit avoir un test d'API et un parcours navigateur sur base isolée.
2. **Fiabilité transversale** : année académique et filtres réellement appliqués, états d'erreur/chargement, contrôles d'accès par rôle/tenant, imports transactionnels, doublons et conservation des formulaires.
3. **Modules opérationnels** : paiements, emploi du temps, examens, annonces, présences, salles. Vérifier création, modification, filtres, export et refus des états incohérents.
4. **Modules secondaires et documents** : stages, bourses, alumni, orientation, bibliothèque, messages, examens en ligne, RH, transport, paramètres ; finaliser le design et les champs vérifiables des relevés, attestations, diplômes et PV.

Chaque lot majeur : diff relu, tests ciblés + suite complète, build, contrôle navigateur, puis un seul déploiement Git/Vercel et vérification de la version active. Aucune ligne du tableau n'est considérée « fonctionnelle » sur la seule base d'un chargement visuel.
