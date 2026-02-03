# Guide de Déploiement - Technician Wiki

## 1. Prépartion du Serveur

Sur votre serveur (Ubuntu/Debian recommandé), installez les outils nécessaires :

```bash
# 1. Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# 2. Installer Git, Curl et MariaDB (Base de données)
sudo apt install -y git curl mariadb-server

# 3. Installer Node.js (Version 18 LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Vérifier les versions
node -v
npm -v
mysql --version
```

### Configuration de la Base de Données

Vous n'avez **PAS** besoin de créer les tables manuellement. Il faut juste un accès "root" ou un utilisateur avec tous les droits.

Par défaut sur MariaDB/Linux, le compte `root` n'a pas de mot de passe (connexion via unix_socket) ou un mot de passe vide.
Pour sécuriser et préparer l'installation :

```bash
# Lancer l'outil de sécurisation (Optionnel mais recommandé)
sudo mysql_secure_installation

# OU Créer un utilisateur pour le site (Recommandé)
sudo mysql -u root
```
Dans l'invite SQL tapez :
```sql
CREATE USER 'wiki_user'@'localhost' IDENTIFIED BY 'mon_mot_de_passe_securise';
GRANT ALL PRIVILEGES ON *.* TO 'wiki_user'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
EXIT;
```

---

## 2. Installation via GitHub (Méthode Recommandée)

C'est la méthode la plus simple pour récupérer "que les données utiles" (le code).

1.  **Cloner le projet** dans le dossier de votre choix (ex: `/var/www/wiki`) :
    ```bash
    cd /var/www
    sudo git clone https://github.com/VOTRE_PSEUDO/wiki_verrier.git wiki
    cd wiki
    ```

    > *Astuce : Si votre repo est privé, Git vous demandera votre utilisateur/token.*

2.  **Créer le dossier d'uploads** (Git ne le copie pas s'il est vide) :
    ```bash
    mkdir uploads
    chmod 777 uploads
    ```
    *Cela permet au site d'enregistrer les images et PDF.*

3.  **Installer les dépendances** :
    ```bash
    sudo npm install
    ```
    *Cela va télécharger proprements les librairies (node_modules) adaptées au serveur.*

3.  **Lancer le serveur** :
    ```bash
    npm start
    ```
    Le serveur doit dire : `Server running at http://0.0.0.0:3000`

---

## 3. Configuration Finale (Installation)

Maintenant que le serveur tourne, il faut configurer le site.

1.  Ouvrez votre navigateur sur `http://IP_DE_VOTRE_SERVEUR:3000/install.html`.
2.  Remplissez le formulaire :
    *   **Hôte** : `localhost`
    *   **Utilisateur** : `wiki_user` (celui créé à l'étape 1)
    *   **Mot de passe** : `mon_mot_de_passe_securise`
    *   **Nom de la BDD** : `technician_wiki` (ou autre)
3.  Cliquez sur **"Lancer l'installation"**.

🚀 **Magie !** Le script va :
*   Créer la base de données.
*   Créer toutes les tables.
*   Créer le compte admin par défaut.
*   Générer le fichier `.env` sur le serveur.

> [!IMPORTANT]
> Une fois l'installation finie : revenez sur votre terminal (serveur), faites `CTRL+C` pour couper, et relancez `npm start`. Le site est maintenant en ligne !

---

## 4. (Bonus) Garder le site allumé tout le temps

Si vous fermez le terminal, le site se coupe. Pour le garder allumé, utilisez **PM2** :

```bash
sudo npm install -g pm2
pm2 start server.js --name "wiki"
pm2 save
pm2 startup
```
