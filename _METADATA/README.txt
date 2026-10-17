========================================================================
  CHEFUNITPLUS V1 - BACKUP
========================================================================

Date           : 2026-10-16 08:39:47
Backup         : ChefUnitPlus_BACKUP_20261016_083944
Source         : C:\Users\asdf\chefunitplus_scout

------------------------------------------------------------------------
  STRUCTURE
------------------------------------------------------------------------
  /frontend     -> Application Flutter (chefunitplus_v1)
  /backend      -> Backend Node.js (chefunitplus_backend)
  /_METADATA    -> Ce fichier

------------------------------------------------------------------------
  EXCLUSIONS (non copiees)
------------------------------------------------------------------------
  - node_modules (npm install a refaire)
  - build/ (flutter build a refaire)
  - .dart_tool/ (flutter pub get a refaire)
  - .git/ (git init a refaire)
  - .idea/, .vscode/ (config IDE)
  - backups internes (SAVE_*, backups_*)
  - uploads/* (fichiers utilisateurs)
  - *.bak_*, *.log

------------------------------------------------------------------------
  POUR REPRENDRE EN LOCAL
------------------------------------------------------------------------
  Frontend :
    cd frontend
    flutter pub get
    flutter run -d chrome

  Backend :
    cd backend
    npm install
    npm run init-db      (si base a recreer)
    npm start

------------------------------------------------------------------------
  POUR DEPLOYER SUR RENDER
------------------------------------------------------------------------
  1. git init (dans chaque dossier)
  2. Creer un repo sur GitHub
  3. git remote add origin ...
  4. git add -A
  5. git commit -m "backup initial"
  6. git push -u origin main
  7. Sur Render : connecter le repo

========================================================================
