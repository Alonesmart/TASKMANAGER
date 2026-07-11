import asyncio
import os
from fastapi import HTTPException, BackgroundTasks
from sqlalchemy import text
from Backend.database import SessionLocal
from Backend.modules.auth.routes import register, login, forgot_password, reset_password
from Backend.Schemas import UserRegister, UserLogin, ForgotPasswordRequest, ResetPasswordRequest

# Force DEBUG=true pour obtenir le token de reset directement dans la réponse API
os.environ["DEBUG"] = "true"

TEST_EMAIL = "test_audit_auth@taskmanager.com"
TEST_PASSWORD = "Password123!"
NEW_PASSWORD = "NewPassword123!"

async def clean_db(db):
    # 1. Trouver l'ID de l'utilisateur de test s'il existe encore
    result = await db.execute(text("SELECT id FROM users WHERE email = :email"), {"email": TEST_EMAIL})
    user_id = result.scalar()
    if user_id:
        await db.execute(text("DELETE FROM reset_tokens WHERE user_id = :user_id"), {"user_id": user_id})
        await db.execute(text("DELETE FROM personnels WHERE id = :user_id"), {"user_id": user_id})
        await db.execute(text("DELETE FROM administrateurs WHERE id = :user_id"), {"user_id": user_id})
        await db.execute(text("DELETE FROM users WHERE id = :user_id"), {"user_id": user_id})
    
    # 2. Nettoyage de sécurité de tous les orphelins restants de sessions précédentes
    await db.execute(text("DELETE FROM reset_tokens WHERE user_id NOT IN (SELECT id FROM users)"))
    await db.execute(text("DELETE FROM personnels WHERE id NOT IN (SELECT id FROM users)"))
    await db.execute(text("DELETE FROM administrateurs WHERE id NOT IN (SELECT id FROM users)"))
    await db.commit()

async def test_auth_flow():
    async with SessionLocal() as db:
        print("1. Nettoyage de la base de données...")
        await clean_db(db)

        # --- TEST 1: Inscription ---
        print("2. Test de l'inscription...")
        reg_schema = UserRegister(
            nom="Test User",
            email=TEST_EMAIL,
            phone="0102030405",
            motdepasse=TEST_PASSWORD,
            confirm_motdepasse=TEST_PASSWORD
        )
        response = await register(user_data=reg_schema, db=db)
        assert response["token_type"] == "bearer"
        print("   [OK] Inscription réussie.")

        # Test doublon
        try:
            await register(user_data=reg_schema, db=db)
            raise AssertionError("L'inscription doublon aurait dû échouer.")
        except HTTPException as e:
            assert e.status_code == 409
            print("   [OK] Inscription doublon rejetée avec HTTP 409.")

        # --- TEST 2: Connexion ---
        print("3. Test de la connexion...")
        login_schema = UserLogin(email=TEST_EMAIL, motdepasse=TEST_PASSWORD)
        response = await login(credentials=login_schema, db=db)
        assert response["token_type"] == "bearer"
        print("   [OK] Connexion réussie avec bon mot de passe.")

        # Test mot de passe incorrect (incrémentation tentatives)
        wrong_login_schema = UserLogin(email=TEST_EMAIL, motdepasse="WrongPassword!")
        for i in range(1, 11):
            try:
                await login(credentials=wrong_login_schema, db=db)
                raise AssertionError("La connexion avec mauvais mot de passe aurait dû échouer.")
            except HTTPException as e:
                assert e.status_code == 401
                remaining = 10 - i
                expected_detail = f"Email ou mot de passe incorrect. {remaining} tentative(s) restante(s)." if remaining > 0 else "Email ou mot de passe incorrect. Compte bloqué."
                assert expected_detail in e.detail
                print(f"   [OK] Tentative incorrecte {i}/10 bloquée (restant : {remaining}).")

        # 11ème tentative : compte bloqué
        try:
            await login(credentials=wrong_login_schema, db=db)
            raise AssertionError("Le compte aurait dû être bloqué.")
        except HTTPException as e:
            assert e.status_code == 429
            assert "Compte bloqué après" in e.detail
            print("   [OK] 11ème tentative bloquée avec HTTP 429 (compte verrouillé).")

        # Connexion avec bon mot de passe sur compte bloqué
        try:
            await login(credentials=login_schema, db=db)
            raise AssertionError("La connexion sur compte bloqué aurait dû être refusée.")
        except HTTPException as e:
            assert e.status_code == 429
            print("   [OK] Connexion avec bon mot de passe refusée sur compte bloqué.")

        # --- TEST 3: Réinitialisation du mot de passe ---
        print("4. Test de forgot-password...")
        bg_tasks = BackgroundTasks()
        forgot_req = ForgotPasswordRequest(email=TEST_EMAIL)
        forgot_resp = await forgot_password(request=forgot_req, background_tasks=bg_tasks, db=db)
        reset_token = forgot_resp.get("reset_token")
        assert reset_token is not None
        print(f"   [OK] forgot-password a généré le token : {reset_token}")

        # Test mot de passe trop court (bloqué par Pydantic)
        from pydantic import ValidationError
        try:
            ResetPasswordRequest(
                token=reset_token,
                new_motdepasse="short",
                confirm_motdepasse="short"
            )
            raise AssertionError("La validation Pydantic aurait dû échouer pour un mot de passe trop court.")
        except ValidationError as e:
            print("   [OK] Réinitialisation avec mot de passe trop court rejetée par la validation Pydantic.")

        # Test confirmation de mot de passe différente (bloqué par le routeur)
        try:
            reset_req_mismatch = ResetPasswordRequest(
                token=reset_token,
                new_motdepasse=NEW_PASSWORD,
                confirm_motdepasse="DifferentPassword123!"
            )
            await reset_password(request=reset_req_mismatch, db=db)
            raise AssertionError("La réinitialisation avec des mots de passe non identiques aurait dû échouer.")
        except HTTPException as e:
            assert e.status_code == 400
            assert "ne correspondent pas" in e.detail
            print("   [OK] Réinitialisation avec mots de passe non identiques rejetée par le routeur.")

        # Test réinitialisation réussie
        reset_req = ResetPasswordRequest(
            token=reset_token,
            new_motdepasse=NEW_PASSWORD,
            confirm_motdepasse=NEW_PASSWORD
        )
        reset_resp = await reset_password(request=reset_req, db=db)
        assert "réinitialisé avec succès" in reset_resp["message"]
        print("   [OK] Mot de passe réinitialisé avec succès.")

        # Connexion avec le nouveau mot de passe (déverrouille le compte)
        print("5. Test de la connexion avec le nouveau mot de passe...")
        login_schema_new = UserLogin(email=TEST_EMAIL, motdepasse=NEW_PASSWORD)
        response_new = await login(credentials=login_schema_new, db=db)
        assert response_new["token_type"] == "bearer"
        print("   [OK] Connexion réussie et compte déverrouillé.")

        # --- NETTOYAGE FINAL ---
        print("6. Nettoyage final...")
        await clean_db(db)
        print("Tous les tests d'authentification ont réussi avec succès !")

if __name__ == "__main__":
    asyncio.run(test_auth_flow())
