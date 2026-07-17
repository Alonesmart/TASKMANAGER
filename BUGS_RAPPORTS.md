# Écarts constatés sur le module Rapports (Phase R0)

1. **Statuts inconsistants** :
   * Actuels (Frontend/Backend) : `pending`, `sent`, `validated`, `archived`.
   * Cibles (Roadmap) : `brouillon`, `soumis`, `en_revision`, `valide`, `rejete`.
2. **Circuit de validation absent** :
   * Pas de distinction entre sauvegarde en brouillon et soumission.
   * Pas de possibilité pour le validateur d'ajouter un commentaire de rejet ou de révision.
3. **Traçabilité manquante** :
   * Pas de table d'historique pour savoir qui a changé le statut et quand.
4. **Export PDF incomplet** :
   * Le PDF généré n'inclut pas le circuit ou l'historique des validations.
5. **Absence de notifications** :
   * Aucun signalement lors de la soumission, validation ou du rejet d'un rapport.
