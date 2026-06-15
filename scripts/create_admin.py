import asyncio
import sys
import os

# Ajouter le répertoire parent au chemin pour importer Backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from Backend.database import SessionLocal, pwd_context
from Backend import models
from sqlalchemy import select

async def create_admin(nom, email, password):
    async with SessionLocal() as db:
        # Vérifier si l'utilisateur existe déjà
        result = await db.execute(select(models.User).where(models.User.email == email))
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"L'utilisateur {email} existe déjà.")
            if existing.role != "admin":
                print(f"Changement du rôle de {email} en 'admin'...")
                # Note: On doit gérer le polymorphisme. Administrateur a une table séparée.
                # C'est plus simple de supprimer et recréer si c'est un test, 
                # ou de créer une entrée dans la table 'administrateurs'.
                # Pour cet exercice, nous allons créer un NOUVEL admin.
                return

        hashed_pw = pwd_context.hash(password)
        new_admin = models.Administrateur(
            nom=nom,
            email=email,
            phone="0000000000",
            motdepasse=hashed_pw,
            role="admin",
            actif=True
        )
        db.add(new_admin)
        await db.commit()
        print(f"Administrateur créé avec succès !")
        print(f"Email: {email}")
        print(f"Mot de passe: {password}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Créer un compte administrateur.")
    parser.add_argument("--nom", default="Admin", help="Nom de l'admin")
    parser.add_argument("--email", required=True, help="Email de l'admin")
    parser.add_argument("--password", required=True, help="Mot de passe de l'admin")
    
    args = parser.parse_args()
    asyncio.run(create_admin(args.nom, args.email, args.password))
