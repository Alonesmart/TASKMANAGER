import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
} from "react-native";
import { ProgressBar } from "react-native-paper";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { documentService, type Document } from "../services/documentService";
import { useAppTheme } from "../theme";

interface DocumentSectionProps {
  idProjet?: number | null;
  idTache?: number | null;
  canUpload?: boolean;
  canDelete?: boolean;
}

export default function DocumentSection({
  idProjet = null,
  idTache = null,
  canUpload = true,
  canDelete = true,
}: DocumentSectionProps) {
  const { theme } = useAppTheme();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      let data: Document[] = [];
      if (idTache) {
        data = await documentService.getDocumentsByTask(idTache);
      } else if (idProjet) {
        data = await documentService.getDocumentsByProject(idProjet);
      }
      setDocuments(data);
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setLoading(false);
    }
  }, [idProjet, idTache]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handlePickAndUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setUploading(true);
      setUploadProgress(0);

      await documentService.uploadDocument(
        asset.uri,
        asset.name,
        asset.mimeType || "application/octet-stream",
        idProjet,
        idTache,
        (progress) => {
          setUploadProgress(progress / 100);
        }
      );

      Alert.alert("Succès", "Document importé avec succès.");
      fetchDocuments();
    } catch (error) {
      console.error("Error picking/uploading document:", error);
      Alert.alert("Erreur", "Impossible d'importer le fichier.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (doc: Document) => {
    const url = documentService.getDownloadUrl(doc.id);
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Erreur", "Impossible d'ouvrir le lien de téléchargement.");
    }
  };

  const handleDelete = (doc: Document) => {
    Alert.alert(
      "Suppression",
      `Voulez-vous supprimer le document "${doc.nom_original}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            try {
              await documentService.deleteDocument(doc.id);
              Alert.alert("Succès", "Document supprimé.");
              fetchDocuments();
            } catch (error) {
              console.error("Error deleting document:", error);
              Alert.alert("Erreur", "Impossible de supprimer le document.");
            }
          },
        },
      ]
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return "image-outline";
    }
    if (mimeType === "application/pdf") {
      return "document-text-outline";
    }
    if (
      mimeType.includes("word") ||
      mimeType.includes("excel") ||
      mimeType.includes("powerpoint") ||
      mimeType.includes("officedocument")
    ) {
      return "document-attach-outline";
    }
    return "document-outline";
  };

  const renderItem = ({ item }: { item: Document }) => {
    const isImage = item.type_mime.startsWith("image/");
    const downloadUrl = documentService.getDownloadUrl(item.id);

    return (
      <View style={[styles.docCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={styles.docHeader}>
          {isImage ? (
            <Image
              source={{ uri: downloadUrl }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.iconContainer, { backgroundColor: theme.activeBg }]}>
              <Ionicons name={getFileIcon(item.type_mime) as any} size={28} color={theme.accent} />
            </View>
          )}

          <View style={styles.docMeta}>
            <Text style={[styles.docName, { color: theme.textPrimary }]} numberOfLines={1}>
              {item.nom_original}
            </Text>
            <Text style={[styles.docSub, { color: theme.textSecondary }]}>
              {formatBytes(item.taille)} • {new Date(item.date_upload).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={() => handleDownload(item)} style={styles.actionBtn}>
              <Ionicons name="download-outline" size={18} color={theme.accent} />
            </TouchableOpacity>

            {canDelete && (
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color={theme.danger || "#ff6b6b"} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Documents</Text>
        {canUpload && (
          <TouchableOpacity
            onPress={handlePickAndUpload}
            disabled={uploading}
            style={[styles.uploadBtn, { backgroundColor: theme.accent }]}
            activeOpacity={0.8}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                <Text style={styles.uploadBtnText}>Ajouter</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {uploading && (
        <View style={styles.progressContainer}>
          <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
            Importation... {Math.round(uploadProgress * 100)}%
          </Text>
          <ProgressBar progress={uploadProgress} color={theme.accent} style={styles.progressBar} />
        </View>
      )}

      {loading ? (
        <ActivityIndicator size="small" color={theme.accent} style={styles.loader} />
      ) : documents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Aucun document attaché.
          </Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 15,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  uploadBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  progressContainer: {
    gap: 5,
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
  },
  loader: {
    marginVertical: 10,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
  },
  emptyText: {
    fontSize: 13,
  },
  list: {
    gap: 8,
  },
  docCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  docHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  docMeta: {
    flex: 1,
    gap: 2,
  },
  docName: {
    fontSize: 13,
    fontWeight: "600",
  },
  docSub: {
    fontSize: 11,
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
