import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Folder, Download } from "lucide-react";
import type { SharedDocument, Folder as FolderType } from "@shared/schema";

interface SharedDocumentsProps {
  teamId: string;
}

export default function SharedDocuments({ teamId }: SharedDocumentsProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            共有資料
          </h1>
          <p className="text-muted-foreground mt-2">
            チームの共有ドキュメントとファイルを閲覧できます
          </p>
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
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
              <Folder className="w-12 h-12 text-blue-500" />
              <p className="font-semibold text-center">{folder.name}</p>
            </CardContent>
          </Card>
        ))}

        {documents.map((doc) => (
          <Card
            key={doc.id}
            className="hover-elevate"
            data-testid={`card-document-${doc.id}`}
          >
            <CardContent className="flex flex-col items-center justify-center p-6 space-y-2">
              <FileText className="w-12 h-12 text-green-500" />
              <p className="font-semibold text-center text-sm">{doc.title}</p>
              {doc.fileName && (
                <p className="text-xs text-muted-foreground">{doc.fileName}</p>
              )}
              {doc.fileUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
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
    </div>
  );
}
