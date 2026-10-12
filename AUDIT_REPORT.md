# Audit et améliorations — plateforme Caftan

**Dépôt :** [souiria/Caftan](https://github.com/souiria/Caftan)
**Branche de travail :** `dev` — [ouvrir la branche distante](https://github.com/souiria/Caftan/tree/dev)
**Commit local :** `d6eaea48d6843a48f5f0eb8b3544af6d4519218b` — `fix: sécuriser les sessions et transactions`
**État :** commit créé localement sur `dev`; pas encore poussé.

## 1. Résumé de l’architecture

- Application de bureau Electron, avec renderer React 18 et TypeScript, bundlé par Vite.
- Processus principal Electron en TypeScript; échanges renderer/main via `contextBridge` et `ipcRenderer.invoke`.
- SQLite embarqué, accès ORM Prisma 5.21.1, schéma dans `prisma/schema.prisma`.
- Parcours présents : connexion/utilisateurs, catalogue et variantes, inventaire par article/code-barres, caisse/ventes, réservations et retours de location, clients, rapports et configuration de l’entreprise.
- Ce dépôt est un outil de gestion/caisse de bureau, et non une boutique e-commerce web avec paiement en ligne. Aucun fournisseur de paiement n’est configuré.
- Le dépôt suit aussi une base SQLite de développement et des images téléversées; `package.json` embarque la base dans l’application distribuée.

## 2. État Git observé

- Le brief parle de `master`, mais le dépôt distant observé n’a **pas** de branche `master`. Les seules branches distantes étaient `main` et `dev`, toutes deux à `19652ebc7dcebde6ca4150e14d8753df5fc36b1d` au moment de l’inspection.
- J’ai créé la branche locale `dev` depuis `origin/dev`; aucun commit existant de cette branche n’a été écrasé.
- `main` est restée inchangée. Aucun push ni déploiement n’a été effectué.
- Le push n’a pas été exécuté, car l’autorisation GitHub n’a pas été activée pour cette tâche. Le commit `d6eaea4` est uniquement dans le clone local.

## 3. Constats d’audit priorisés

### Critiques / élevées

1. **Authentification contournable :** le processus principal acceptait un identifiant/mot de passe administrateur codé en dur, indépendamment des comptes enregistrés.
2. **Privilèges non vérifiés côté backend :** les rôles étaient surtout masqués dans l’interface; les handlers IPC n’exigeaient pas de session et faisaient confiance aux identifiants/rôles transmis par le renderer.
3. **Hashes de mots de passe faibles :** les nouveaux hashes reposaient sur SHA-256 non salé.
4. **Réservations concurrentes :** la disponibilité était contrôlée dans l’écran de sélection, mais `create-rental` ne revalidait pas le chevauchement des réservations.
5. **Caisse manipulable côté renderer :** montant total, prix et statuts d’articles provenaient des valeurs envoyées par le renderer, sans recalcul complet à partir du stock et des tarifs en base.
6. **Configuration Electron permissive :** `webSecurity` était désactivé; le sandbox n’était pas activé et la navigation externe n’était pas refusée.
7. **Secrets d’amorçage :** certains parcours créaient à la volée des comptes administrateur avec mot de passe connu (`123456`) si la base était vide.

### Importantes

- Les retours de location ne vérifiaient pas suffisamment que l’article appartenait à la réservation ciblée; une action pouvait libérer un article sans lien correct.
- Un frais automatique de retard de 50 DH/jour était calculé par l’interface alors que le dépôt ne définit aucune politique correspondante.
- Les prix d’achat, prévus comme masqués aux utilisateurs ordinaires, étaient quand même renvoyés par le handler catalogue.
- La branche distante `dev` existait déjà; elle n’a donc pas été recréée.
- Aucun script de test automatisé ni suite de tests n’est fourni.

### Dette et limites constatées

- `README.md` est encore le README générique de Vite, et ne documente pas l’application.
- Pas de migrations Prisma versionnées visibles; le projet utilise `prisma db push`.
- La base `prisma/dev.db` est suivie dans Git et embarquée au packaging, avec des utilisateurs et données applicatives. Il faut confirmer si ces données sont des fixtures ou des données opérationnelles avant de modifier le processus d’amorçage ou de distribution.
- `npm audit` sur l’arbre complet relève **27 vulnérabilités** : 1 critique, 21 élevées, 5 modérées. Les mises à jour proposées impliquent des versions majeures de composants de build et d’Electron; elles n’ont pas été appliquées sans migration et tests de compatibilité. `npm audit --omit=dev` n’a trouvé aucune vulnérabilité dans les dépendances de production répertoriées, mais Electron est en `devDependencies` tout en étant livré dans le binaire.

## 4. Changements effectués

- **`electron/main.ts`**
  - Retrait du compte admin codé en dur et des créations de comptes de secours.
  - Mise en place de sessions liées à l’identifiant de la fenêtre Electron, de contrôles d’authentification sur les handlers IPC, d’un canal de déconnexion, et de vérification du statut/rôle du compte depuis la base à chaque appel protégé.
  - Autorisation administrateur côté processus principal pour la gestion des utilisateurs, produits/prix/stock, rapports, listes, profil d’entreprise et changements de statut des ventes.
  - Passage à PBKDF2 salé (310 000 itérations); les anciens hashes SHA-256 restent vérifiables et sont migrés vers le nouveau format après une connexion valide.
  - Masquage de `purchasePrice` dans la réponse catalogue destinée aux rôles non-administrateurs; exclusion des hashes des réponses CRUD utilisateur.
  - Validation de la période, des montants, de l’article et des chevauchements de réservation côté serveur; création dans une transaction SQLite sérialisable, avec numéros de réservation non prévisibles.
  - Retours locatifs liés à la réservation/article correspondants, anti-double-clôture et préservation d’une prochaine réservation future.
  - Recalcul serveur des ventes à partir des tarifs et statuts réels en base; validation remises, modes de paiement, avances et client; mise à jour conditionnelle du stock dans une transaction sérialisable.
  - Refus de modifier une vente qui n’est pas en attente de livraison.
  - `webSecurity` et sandbox Electron activés; fenêtres externes refusées et navigation principale limitée à l’origine de développement ou à la page locale attendue.
- **`electron/preload.ts`** : ajout de l’API de déconnexion.
- **`src/App.tsx`** : une identité conservée dans `sessionStorage` ne restaure plus une session privilégiée; déconnexion propagée au processus principal.
- **`src/screens/RentalsScreen.tsx`** : suppression du frais automatique non documenté; le frais reste à zéro tant qu’un montant explicite n’est pas saisi.
- **`index.html`** : langue déclarée `fr`, suppression du favicon Vite et ajout d’une description française.

## 5. Base de données et règles métier

- **Aucun changement de schéma ni migration**; compatibilité des tables existantes préservée.
- Aucun produit, tarif, utilisateur ou stock fictif n’a été ajouté.
- La disponibilité exclut les périodes qui se chevauchent selon les bornes existantes (`startDate < fin` et `endDate > début`).
- Les montants de location restent fournis par le parcours existant : le dépôt ne définit pas de règle tarifaire liée au nombre de jours, de dépôt, de pénalité, d’annulation ou de paiement. Ces politiques restent à confirmer par l’entreprise.

## 6. Vérifications exécutées

| Vérification | Résultat |
|---|---|
| `npm ci` | Réussi; avertissements de dépendances obsolètes, 27 vulnérabilités relevées par npm audit complet. |
| `npx tsc --noEmit` | Réussi après les changements. |
| `npx prisma validate` | Réussi. |
| Transaction SQLite `Serializable` et requête relationnelle de chevauchement sur une copie de `dev.db` | Réussies; aucun changement à la base source. |
| `npm run build` (TypeScript, Vite, packaging Electron Linux x64) | Compilation renderer et processus principal réussie; packaging Linux généré dans `release/linux-unpacked`. |
| `npx eslint electron/main.ts electron/preload.ts src/App.tsx src/screens/RentalsScreen.tsx` | Échec : 57 erreurs actuelles, principalement `any` explicites et règles `prefer-const`; le dépôt n’a pas de script lint ni de suite de tests. |
| Tests GUI / parcours bout-en-bout | Non exécutés dans cet environnement; aucun test automatisé n’est fourni. |
| Git | Diff vérifié (`git diff --check`); fichiers générés Prisma exclus du commit. `main` intacte. |

Le test SQLite a été exécuté sur `/tmp/caftan-runtime-test.db`, copie temporaire de la base du dépôt, et non sur une base de production.

## 7. Points restant à traiter

1. Autoriser l’accès GitHub puis pousser le commit local `d6eaea4` sur `origin/dev`; le lien distant de la branche ne montrera pas encore ces changements tant que le push n’a pas eu lieu.
2. Ajouter des tests automatisés sur les ventes, les conflits de location, les rôles et les retours, y compris un essai concurrent multi-requête.
3. Remplacer progressivement les types `any` et corriger le lint; examiner ensuite l’actualisation majeure d’Electron/Vite et des outils de packaging à partir des avis npm.
4. Clarifier les politiques de location et le traitement des données présentes dans `prisma/dev.db`; concevoir l’onboarding initial avant de retirer cette base embarquée.
5. Valider le chargement d’images locales avec `webSecurity` activé sur Windows/macOS : le build Linux passe, mais le parcours image n’a pas été vérifié visuellement.

## 8. Lancer localement

Depuis la racine du dépôt :

```bash
npm ci
npm run db:generate
npm run dev
```

Le mode développement lance Vite et le processus Electron configuré par le plugin. Pour empaqueter la version Linux x64 :

```bash
npm run build
```

Utiliser un compte déjà provisionné dans la base locale; aucun mot de passe par défaut ou accès administrateur de secours n’est désormais créé par le code.

## 9. Publication différée

Après autorisation GitHub et vérification qu’`origin/dev` n’a pas avancé :

```bash
git fetch origin
git log --oneline origin/dev..dev
git push origin dev
```

Ne pas fusionner dans `main` (ni dans `master`, branche absente) sans autorisation distincte.
