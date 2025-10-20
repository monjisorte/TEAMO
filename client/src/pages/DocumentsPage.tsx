import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderPlus, FilePlus, Folder, FileText, Trash2, Download, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import type { Folder as FolderType, SharedDocument } from "@shared/schema";

export default function DocumentsPage() {
  const { toast } = useToast();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<SharedDocument | null>(null);

  // Get teamId from localStorage
  const coachData = JSON.parse(localStorage.getItem("coachData") || "{}");
  const teamId = coachData.teamId;

  const { data: folders = [] } = useQuery<FolderType[]>({
    queryKey: ["/api/folders", currentFolderId, teamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentFolderId) {
        params.append("parentFolderId", currentFolderId);
      }
      if (teamId) {
        params.append("teamId", teamId);
      }
      const response = await fetch(`/api/folders?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch folders");
      return response.json();
    },
    enabled: !!teamId,
  });

  const { data: documents = [] } = useQuery<SharedDocument[]>({
    queryKey: ["/api/documents", currentFolderId, teamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentFolderId) {
        params.append("folderId", currentFolderId);
      }
      if (teamId) {
        params.append("teamId", teamId);
      }
      const response = await fetch(`/api/documents?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch documents");
      return response.json();
    },
    enabled: !!teamId,
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/folders", {
        name,
        parentFolderId: currentFolderId,
        teamId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders", currentFolderId, teamId] });
      setNewFolderName("");
      setIsCreateFolderOpen(false);
      toast({
        title: "フォルダ作成成功",
        description: "新しいフォルダを作成しました",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async ({ type, id }: { type: "folder" | "document"; id: string }) => {
      if (type === "folder") {
        return await apiRequest("DELETE", `/api/folders/${id}`, {});
      } else {
        return await apiRequest("DELETE", `/api/documents/${id}`, {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders", currentFolderId, teamId] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents", currentFolderId, teamId] });
      toast({
        title: "削除成功",
        description: "アイテムを削除しました",
      });
    },
  });

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolderMutation.mutate(newFolderName.trim());
    }
  };

  // File upload handlers
  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error("Failed to get upload URL");
    }
    
    const { uploadURL } = await response.json();
    return {
      method: "PUT" as const,
      url: uploadURL,
    };
  };

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      console.log("Upload complete result:", result);
      
      if (result.successful && result.successful.length > 0) {
        const file = result.successful[0];
        const uploadURL = file.uploadURL;
        const fileName = file.name;
        const fileSize = file.size?.toString();

        console.log("Saving document:", { fileName, uploadURL, fileSize, teamId, folderId: currentFolderId });

        // Save document to database
        const response = await apiRequest("POST", "/api/documents", {
          title: fileName,
          fileUrl: uploadURL,
          fileName,
          fileSize,
          teamId,
          folderId: currentFolderId,
        });

        console.log("Document saved response:", response);

        queryClient.invalidateQueries({ queryKey: ["/api/documents", currentFolderId, teamId] });
        
        toast({
          title: "アップロード成功",
          description: "ファイルをアップロードしました",
        });
      } else {
        console.error("No successful uploads:", result);
        toast({
          title: "エラー",
          description: "ファイルのアップロードに失敗しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "エラー",
        description: `ファイルのアップロードに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            共有資料
          </h1>
          <p className="text-muted-foreground mt-1">
            チームの共有ドキュメントとファイルを管理します
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl" data-testid="button-create-folder">
                <FolderPlus className="w-4 h-4 mr-2" />
                フォルダ作成
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>新しいフォルダ</DialogTitle>
                <DialogDescription>
                  フォルダ名を入力してください
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="フォルダ名"
                  data-testid="input-folder-name"
                />
                <Button
                  onClick={handleCreateFolder}
                  disabled={createFolderMutation.isPending}
                  className="w-full"
                  data-testid="button-confirm-create-folder"
                >
                  {createFolderMutation.isPending ? "作成中..." : "作成"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={52428800}
            onGetUploadParameters={handleGetUploadParameters}
            onComplete={handleUploadComplete}
            buttonClassName="rounded-xl"
          >
            <FilePlus className="w-4 h-4 mr-2" />
            ファイルアップロード
          </ObjectUploader>
        </div>
      </div>

      {currentFolderId && (
        <Button
          variant="ghost"
          onClick={() => setCurrentFolderId(null)}
          data-testid="button-back-to-root"
        >
          ← 戻る
        </Button>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {folders.map((folder) => (
          <Card
            key={folder.id}
            className="cursor-pointer hover-elevate active-elevate-2 border-0 shadow-lg"
            onClick={() => setCurrentFolderId(folder.id)}
            data-testid={`card-folder-${folder.id}`}
          >
            <CardContent className="flex items-center gap-3 p-3 relative">
              <Folder className="w-8 h-8 text-blue-500 shrink-0" />
              <p className="font-semibold text-sm flex-1 truncate">{folder.name}</p>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItemMutation.mutate({ type: "folder", id: folder.id });
                }}
                data-testid={`button-delete-folder-${folder.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </CardContent>
          </Card>
        ))}

        {documents.map((doc) => (
          <Card
            key={doc.id}
            className="hover-elevate cursor-pointer border-0 shadow-lg"
            data-testid={`card-document-${doc.id}`}
          >
            <CardContent className="p-3 relative">
              <div 
                className="flex items-start gap-3"
                onClick={() => setPreviewDocument(doc)}
              >
                <FileText className="w-8 h-8 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{doc.title}</p>
                  {doc.fileName && (
                    <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-1 mt-2 justify-end">
                {doc.fileUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    asChild
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`button-download-document-${doc.id}`}
                  >
                    <a href={doc.fileUrl} download>
                      <Download className="w-3 h-3" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItemMutation.mutate({ type: "document", id: doc.id });
                  }}
                  data-testid={`button-delete-document-${doc.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {folders.length === 0 && documents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>まだファイルやフォルダがありません</p>
            <p className="text-sm mt-2">上のボタンからフォルダやファイルを追加してください</p>
          </CardContent>
        </Card>
      )}

      {/* File Preview Dialog */}
      <Dialog open={!!previewDocument} onOpenChange={(open) => !open && setPreviewDocument(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{previewDocument?.title}</DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPreviewDocument(null)}
                data-testid="button-close-preview"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {previewDocument?.fileName && (
              <DialogDescription>{previewDocument.fileName}</DialogDescription>
            )}
          </DialogHeader>
          
          {previewDocument && (
            <div className="mt-4">
              {(() => {
                const fileName = previewDocument.fileName || previewDocument.title || '';
                const fileUrl = previewDocument.fileUrl || '';
                const extension = fileName.split('.').pop()?.toLowerCase() || '';
                
                // Image files
                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension)) {
                  return (
                    <div className="flex justify-center">
                      <img 
                        src={fileUrl} 
                        alt={previewDocument.title}
                        className="max-w-full h-auto rounded-lg"
                        data-testid="preview-image"
                      />
                    </div>
                  );
                }
                
                // PDF files
                if (extension === 'pdf') {
                  return (
                    <iframe
                      src={fileUrl}
                      className="w-full h-[600px] rounded-lg border"
                      title={previewDocument.title}
                      data-testid="preview-pdf"
                    />
                  );
                }
                
                // Video files
                if (['mp4', 'webm', 'ogg', 'mov'].includes(extension)) {
                  return (
                    <video
                      src={fileUrl}
                      controls
                      className="w-full rounded-lg"
                      data-testid="preview-video"
                    >
                      お使いのブラウザは動画タグをサポートしていません。
                    </video>
                  );
                }
                
                // Audio files
                if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
                  return (
                    <audio
                      src={fileUrl}
                      controls
                      className="w-full"
                      data-testid="preview-audio"
                    >
                      お使いのブラウザは音声タグをサポートしていません。
                    </audio>
                  );
                }
                
                // Text files
                if (['txt', 'md', 'json', 'csv', 'log'].includes(extension)) {
                  return (
                    <iframe
                      src={fileUrl}
                      className="w-full h-[600px] rounded-lg border"
                      title={previewDocument.title}
                      data-testid="preview-text"
                    />
                  );
                }
                
                // Unsupported file types
                return (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-muted-foreground mb-4">
                      このファイル形式はプレビューできません
                    </p>
                    <Button asChild>
                      <a href={fileUrl} download>
                        <Download className="w-4 h-4 mr-2" />
                        ダウンロード
                      </a>
                    </Button>
                  </div>
                );
              })()}
            </div>
          )}
          
          {previewDocument?.fileUrl && (
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button variant="outline" asChild>
                <a href={previewDocument.fileUrl} download>
                  <Download className="w-4 h-4 mr-2" />
                  ダウンロード
                </a>
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteItemMutation.mutate({ type: "document", id: previewDocument.id });
                  setPreviewDocument(null);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                削除
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
