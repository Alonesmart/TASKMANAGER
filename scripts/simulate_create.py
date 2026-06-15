import asyncio
import httpx

async def simulate_create_project():
    async with httpx.AsyncClient(base_url="http://localhost:8001") as client:
        try:
            # Try to login
            login_res = await client.post("/login", json={
                "email": "test@example.com",
                "motdepasse": "testpassword123"
            })
            if login_res.status_code != 200:
                print(f"Login failed: {login_res.text}")
                return
            
            token = login_res.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Simulate create project
            project_data = {
                "titre": "Projet de Test 500",
                "description": "Ceci est un test",
                "dateDebut": "2026-06-15",
                "dateFin": "2026-06-30",
                "statut": "actif",
                "priorite": "haute"
            }
            
            res = await client.post("/api/v1/core/projets", json=project_data, headers=headers)
            print(f"Project creation status: {res.status_code}")
            if res.status_code != 201:
                print(f"Error: {res.text}")
                return
            
            new_project = res.json()
            print(f"Project created: {new_project['id_projet']}")
            
            # Simulate create team
            team_data = {
                "nom": f"Équipe {project_data['titre']} {new_project['id_projet']}",
                "description": f"Équipe automatique pour le projet {project_data['titre']}",
                "id_projet": new_project["id_projet"]
            }
            res = await client.post("/api/v1/core/equipes", json=team_data, headers=headers)
            print(f"Team creation status: {res.status_code}")
            if res.status_code != 201:
                print(f"Error: {res.text}")
                
        except Exception as e:
            print(f"Exception: {e}")

if __name__ == "__main__":
    asyncio.run(simulate_create_project())
