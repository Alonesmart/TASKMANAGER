import os
import sys
import sqlite3

def migrate():
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'taskmanager.db'))
    print(f"Connecting to database at {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # 1. Ajouter les colonnes à la table taches si elles n'existent pas
    columns_to_add = [
        ("preuve_texte", "TEXT"),
        ("id_document_preuve", "INTEGER"),
        ("commentaire_rejet", "TEXT")
    ]
    
    # Récupérer les colonnes actuelles de la table taches
    cursor.execute("PRAGMA table_info(taches)")
    existing_cols = {col[1] for col in cursor.fetchall()}
    
    for col_name, col_type in columns_to_add:
        if col_name not in existing_cols:
            print(f"Adding column '{col_name}' to table 'taches'...")
            cursor.execute(f"ALTER TABLE taches ADD COLUMN {col_name} {col_type}")

    # 2. Créer la table historique_validation_taches si elle n'existe pas
    print("Creating table 'historique_validation_taches' if it doesn't exist...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS historique_validation_taches (
        id_historique INTEGER PRIMARY KEY AUTOINCREMENT,
        id_tache INTEGER NOT NULL,
        ancien_statut VARCHAR(50) NOT NULL,
        nouveau_statut VARCHAR(50) NOT NULL,
        id_acteur INTEGER NOT NULL,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        commentaire TEXT,
        FOREIGN KEY (id_tache) REFERENCES taches(id_tache) ON DELETE CASCADE,
        FOREIGN KEY (id_acteur) REFERENCES users(id)
    )
    """)
    
    # Créer un index sur id_tache pour de meilleures performances
    cursor.execute("CREATE INDEX IF NOT EXISTS ix_historique_validation_taches_id_tache ON historique_validation_taches (id_tache)")

    conn.commit()
    conn.close()
    print("Migration completed successfully!")

if __name__ == "__main__":
    migrate()
