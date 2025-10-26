import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, Folder, Download, X } from "lucide-react";
import type { SharedDocument, Folder as FolderType } from "@shared/schema";

interface SharedDocumentsProps {
  teamId: string;
}

export default function SharedDocuments({ teamId }: SharedDocumentsProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<SharedDocument | null>(null);

  const { data: folders = [], isLoading: foldersLoading } = useQuery<FolderType[]>({
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

  const { data: documents = [], isLoading: documentsLoading } = useQuery<SharedDocument[]>({
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

  // Get team info for storage usage
  const { data: team } = useQuery<{ id: string; storageUsed: number; subscriptionPlan: string }>({
    queryKey: [`/api/teams/${teamId}`],
    enabled: !!teamId,
  });

  const isLoading = foldersLoading || documentsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          読み込み中...
        </CardContent>
      </Card>
    );
  }

  const storageUsedMB = team?.storageUsed ? (team.storageUsed / (1024 * 1024)).toFixed(2) : '0.00';
  const maxStorageMB = team?.subscriptionPlan === 'free' ? '10.00' : '∞';
  const storagePercentage = team?.subscriptionPlan === 'free' ? (team.storageUsed / (10 * 1024 * 1024) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            共有資料
          </h1>
          <div className="mt-2 text-sm text-muted-foreground" data-testid="text-storage-usage">
            ストレージ使用量: <span className="font-semibold">{storageUsedMB} MB</span> / {maxStorageMB} MB
            {team?.subscriptionPlan === 'free' && (
              <span className="ml-2 text-xs">({storagePercentage}%)</span>
            )}
          </div>
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

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {folders.map((folder) => (
          <Card
            key={folder.id}
            className="cursor-pointer hover-elevate active-elevate-2"
            onClick={() => setCurrentFolderId(folder.id)}
            data-testid={`card-folder-${folder.id}`}
          >
            <CardContent className="flex items-center gap-3 p-3">
              <Folder className="w-8 h-8 text-blue-500 shrink-0" />
              <p className="font-semibold text-sm">{folder.name}</p>
            </CardContent>
          </Card>
        ))}

        {documents.map((doc) => (
          <Card
            key={doc.id}
            className="hover-elevate cursor-pointer"
            data-testid={`card-document-${doc.id}`}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
              <div 
                className="flex flex-col items-center space-y-2 w-full"
                onClick={() => setPreviewDocument(doc)}
              >
                <FileText className="w-12 h-12 text-green-500" />
                <p className="font-semibold text-center text-sm">{doc.title}</p>
                {doc.fileName && (
                  <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                )}
              </div>
              {doc.fileUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`button-download-document-${doc.id}`}
                >
                  <a href={doc.fileUrl} download>
                    <Download className="w-4 h-4 mr-2" />
                    ダウンロード
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {folders.length === 0 && documents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p>まだファイルやフォルダがありません</p>
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
                      className="w-full rounded-lg border"
                      style={{ height: 'calc(90vh - 200px)', minHeight: '600px' }}
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
                      className="w-full rounded-lg border"
                      style={{ height: 'calc(90vh - 200px)', minHeight: '600px' }}
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
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
