import os
import sys
import sqlite3

def migrate():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'taskmanager.db'))
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Ajouter les colonnes à la table rapports si elles n'existent pas
    columns_to_add = [
        ("date_soumission", "DATETIME"),
        ("date_validation", "DATETIME"),
        ("commentaire_validation", "TEXT")
    ]
    
    # Récupérer les colonnes actuelles de la table rapports
    cursor.execute("PRAGMA table_info(rapports)")
    existing_cols = {col[1] for col in cursor.fetchall()}
    
    for col_name, col_type in columns_to_add:
        if col_name not in existing_cols:
            print(f"Adding column '{col_name}' to table 'rapports'...")
            cursor.execute(f"ALTER TABLE rapports ADD COLUMN {col_name} {col_type}")
            
    # Mettre à jour les lignes existantes pour statut = 'brouillon' si c'est 'pending'
    print("Updating existing reports statuses...")
    cursor.execute("UPDATE rapports SET statut = 'brouillon' WHERE statut = 'pending'")

    # 2. Créer la table historique_rapports si elle n'existe pas
    print("Creating table 'historique_rapports' if it doesn't exist...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historique_rapports (
        id_historique INTEGER PRIMARY KEY AUTOINCREMENT,
        id_rapport INTEGER NOT NULL,
        ancien_statut VARCHAR(50) NOT NULL,
        nouveau_statut VARCHAR(50) NOT NULL,
        id_acteur INTEGER NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        commentaire TEXT,
        FOREIGN KEY (id_rapport) REFERENCES rapports (id_rapport) ON DELETE CASCADE,
        FOREIGN KEY (id_acteur) REFERENCES users (id)
    )
    """)
    
    # Créer un index sur id_rapport pour de meilleures performances
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_historique_rapports_id_rapport ON historique_rapports (id_rapport)")

    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
