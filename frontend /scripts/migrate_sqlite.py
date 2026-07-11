import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[1] / "taskmanager.db"

USER_COLUMNS = {
    "actif": "ALTER TABLE users ADD COLUMN actif BOOLEAN NOT NULL DEFAULT 1",
    "tentatives": "ALTER TABLE users ADD COLUMN tentatives INTEGER NOT NULL DEFAULT 0",
}


def main():
    with sqlite3.connect(DB_PATH) as conn:
        columns = {row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()}

        for column, statement in USER_COLUMNS.items():
            if column not in columns:
                print(f"Adding missing users.{column} column...")
                conn.execute(statement)

        admin = conn.execute("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1").fetchone()
        if admin:
            admin_id = admin[0]
            invalid_projects = conn.execute(
                """
                SELECT p.id_projet
                FROM projets p
                LEFT JOIN users u ON u.id = p.id_administrateur
                WHERE u.id IS NULL OR u.role != 'admin'
                """
            ).fetchall()
            if invalid_projects:
                print(f"Reassigning {len(invalid_projects)} project(s) to admin user {admin_id}...")
                conn.execute(
                    """
                    UPDATE projets
                    SET id_administrateur = ?
                    WHERE id_administrateur NOT IN (
                        SELECT id FROM users WHERE role = 'admin'
                    )
                    """,
                    (admin_id,),
                )

        conn.commit()

        updated_columns = [row[1] for row in conn.execute("PRAGMA table_info(users)").fetchall()]
        print("users columns:", ", ".join(updated_columns))


if __name__ == "__main__":
    main()
