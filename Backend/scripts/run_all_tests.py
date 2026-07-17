
import subprocess
import os
import sys

# Liste des tests à exécuter en séquence
test_scripts = [
    "test_auth.py",
    "test_project.py",
    "test_tasks.py",
    "test_teams.py",
    "test_reports.py",
    "test_messages.py",
    "test_dashboard.py",
    "test_documents.py",
    "test_invitations.py",
    "test_reunions.py",
    "test_ia.py",
    "test_scheduler.py",
    "test_task_dependencies.py",
    "test_task_filters.py",
    "test_tasks_validation.py",
    "test_reports_validation.py",
    "test_chat_notifications.py",
    "test_notifications.py",
    "test_messages_groups.py",
    "test_pdf_export.py",
    "test_phase9.py",
    "test_project_roles.py",
    "test_direct_conversations_dedup.py",
    "test_delete_conv_and_edit_msg.py",
]

def run_tests():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    python_path = os.path.join(script_dir, "../venv/bin/python")
    
    print(f"Début de l'exécution de la suite de tests ({len(test_scripts)} scripts)...")
    
    for script in test_scripts:
        script_path = os.path.join(script_dir, script)
        print(f"\n--- Exécution de : {script} ---")
        
        try:
            # On exécute le script avec le python du venv
            result = subprocess.run([python_path, script_path], capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"[OK] {script} a réussi.")
            else:
                print(f"[ERREUR] {script} a échoué.")
                print(f"Sortie standard:\n{result.stdout}")
                print(f"Erreur standard:\n{result.stderr}")
                # On arrête si un test échoue
                sys.exit(1)
        except Exception as e:
            print(f"[EXCEPTION] Erreur lors de l'exécution de {script}: {e}")
            sys.exit(1)
            
    print("\nTous les tests ont réussi avec succès !")

if __name__ == "__main__":
    run_tests()
