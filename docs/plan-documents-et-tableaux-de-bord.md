# Plan de remise à niveau — documents et espaces étudiant/enseignant

## Constat

- Les attestations, relevés, diplômes et PV partagent une mise en page générique très clairsemée. Le pied de page met en avant la marque du SaaS au lieu de l'établissement émetteur. Le diplôme affiche la date de naissance brute ; le faux tampon « AUTHENTIQUE » n'est pas une signature.
- Le tableau de bord étudiant juxtapose des dégradés et de petits textes pâles. Sa « moyenne générale » mélange actuellement les années et des notes non publiées.
- Le rôle enseignant reçoit la synthèse institutionnelle plutôt qu'un tableau de bord limité à ses enseignements attribués.

## Lots et critères d'acceptation

1. **Identité documentaire commune** : en-tête propre à l'institution (nom, pays/ministère si renseignés, contact, référence), hiérarchie typographique, marges A4, zone de vérification QR et pied de page institutionnel. Le brouillon et le document validé sont visuellement distingués sans simuler un cachet ou une signature. Aucun renseignement absent n'est inventé.
2. **Documents essentiels** : attestation d'inscription, attestation de niveau, certificat de scolarité, relevé, diplôme et PV. Vérifier les dates, noms, programme, crédits, décisions, pagination et longues listes. Rendre des PDF synthétiques dans `tmp/pdfs/`, inspecter les images de chaque type et les pages de continuation, extraire le texte pour détecter omissions/chevauchements.
3. **Tableaux de bord lisibles** : fond clair, texte foncé, contrastes des badges et boutons, tailles minimales lisibles sur mobile. L'étudiant ne voit que ses notes publiées de l'année en cours ; l'enseignant voit uniquement ses matières affectées et ses indicateurs de saisie. Les boutons mènent aux vues autorisées.
4. **Validation puis production** : tests de scoping par rôle, suite de tests, lint, contrôle de types et build. Contrôle navigateur des deux rôles dans un environnement de test ; un déploiement Vercel par lot majeur après vérification, puis contrôle de la version active et des erreurs.

## Priorité académique maintenue

Après cette remise à niveau, poursuivre la chaîne Structure → Étudiants → inscriptions pédagogiques → affectations enseignant → Notes → Délibérations → documents officiels. Les PDF n'anticipent pas une décision du jury : les contrôles d'éligibilité existants restent obligatoires avant validation.
