# Création des utilisateurs (Auth)

1. Va sur **Supabase Dashboard → Authentication → Users → Add User**
2. Crée ces utilisateurs avec le mot de passe `password123` :

| Email | Password |
|---|---|
| `admin@sga.com` | `password123` |
| `jean.dupont@sga.com` | `password123` |
| `marie.martin@sga.com` | `password123` |
| `alice.student@sga.com` | `password123` |
| `bob.student@sga.com` | `password123` |
| `charlie.student@sga.com` | `password123` |
| `diana.student@sga.com` | `password123` |
| `eve.student@sga.com` | `password123` |
| `frank.student@sga.com` | `password123` |

3. Après création, note les UUIDs générés dans **Authentication → Users**. Remplace-les dans `003_sessions_data.sql` (recherche `TODO_USER_ID`).

4. Exécute ensuite `003_sessions_data.sql` dans le SQL Editor.
