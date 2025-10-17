import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderPlus, FilePlus, Folder, FileText, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Folder as FolderType, SharedDocument } from "@shared/schema";

export default function DocumentsPage() {
  const { toast } = useToast();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);

  const { data: folders = [] } = useQuery<FolderType[]>({
    queryKey: ["/api/folders", currentFolderId],
  });

  const { data: documents = [] } = useQuery<SharedDocument[]>({
    queryKey: ["/api/documents", currentFolderId],
  });

  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest("POST", "/api/folders", {
        name,
        parentFolderId: currentFolderId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/folders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            共有資料
          </h1>
          <p className="text-muted-foreground mt-2">
            チームの共有ドキュメントとファイルを管理します
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-folder">
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
          
          <Button variant="outline" data-testid="button-upload-file">
            <FilePlus className="w-4 h-4 mr-2" />
            ファイルアップロード
          </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteItemMutation.mutate({ type: "folder", id: folder.id });
                }}
                data-testid={`button-delete-folder-${folder.id}`}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
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
              <div className="flex gap-1">
                {doc.fileUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    asChild
                  >
                    <a href={doc.fileUrl} download>
                      <Download className="w-4 h-4" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteItemMutation.mutate({ type: "document", id: doc.id })}
                  data-testid={`button-delete-document-${doc.id}`}
                >
                  <Trash2 className="w-4 h-4" />
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
    </div>
  );
}
