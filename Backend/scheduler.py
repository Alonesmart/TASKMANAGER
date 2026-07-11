import logging
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from Backend import models
from Backend.database import SessionLocal
from Backend.modules.messages.routes import manager

# Configure logger
logger = logging.getLogger("taskmanager.scheduler")

scheduler = AsyncIOScheduler()

async def check_task_deadlines():
    logger.info("[SCHEDULER] Running check_task_deadlines...")
    async with SessionLocal() as db:
        try:
            today = datetime.utcnow().date()
            
            # Fetch all active tasks with deadline that are not completed
            result = await db.execute(
                select(models.Tache)
                .options(selectinload(models.Tache.assignations))
                .where(
                    models.Tache.etat == "active",
                    models.Tache.statut != "terminees",
                    models.Tache.echeance.is_not(None)
                )
            )
            tasks = result.scalars().all()
            logger.info(f"[SCHEDULER] Found {len(tasks)} active tasks to check.")
            
            for task in tasks:
                # Check 48h and 24h
                for days, hours in [(2, 48), (1, 24)]:
                    target_date = today + timedelta(days=days)
                    if task.echeance == target_date:
                        logger.info(f"[SCHEDULER] Task {task.id_tache} '{task.titre}' has deadline {task.echeance} which is {hours}h away.")
                        for assignation in task.assignations:
                            user_id = assignation.id_utilisateur
                            message_text = f"La tâche '{task.titre}' arrive à échéance dans {hours} heures ({task.echeance})."
                            
                            # Check if already notified
                            notif_check = await db.execute(
                                select(models.Notification)
                                .where(
                                    models.Notification.id_tache == task.id_tache,
                                    models.Notification.id_utilisateur == user_id,
                                    models.Notification.message.like(f"%{hours} heures%")
                                )
                            )
                            if notif_check.scalar_one_or_none() is not None:
                                logger.info(f"[SCHEDULER] User {user_id} already notified for task {task.id_tache} at {hours}h.")
                                continue
                                
                            # Create notification
                            new_notif = models.Notification(
                                message=message_text,
                                id_utilisateur=user_id,
                                id_tache=task.id_tache,
                                date_envoi=datetime.utcnow(),
                                lu=False
                            )
                            db.add(new_notif)
                            await db.flush()
                            logger.info(f"[SCHEDULER] Created notification {new_notif.id_notification} for user {user_id}.")
                            
                            # WebSocket send
                            notif_payload = {
                                "type": "NEW_NOTIFICATION",
                                "id_notification": new_notif.id_notification,
                                "message": new_notif.message,
                                "lu": new_notif.lu,
                                "date_envoi": new_notif.date_envoi.isoformat(),
                                "id_utilisateur": new_notif.id_utilisateur,
                                "id_tache": new_notif.id_tache
                            }
                            await manager.send_personal_message(notif_payload, user_id)
            
            await db.commit()
            logger.info("[SCHEDULER] check_task_deadlines completed successfully.")
        except Exception as e:
            await db.rollback()
            logger.error(f"[SCHEDULER] Error in check_task_deadlines: {e}", exc_info=True)

def start_scheduler():
    # Schedule to check deadlines every hour
    scheduler.add_job(check_task_deadlines, "interval", hours=1, id="check_task_deadlines")
    scheduler.start()
    logger.info("[SCHEDULER] Scheduler started.")

def stop_scheduler():
    scheduler.shutdown()
    logger.info("[SCHEDULER] Scheduler stopped.")
