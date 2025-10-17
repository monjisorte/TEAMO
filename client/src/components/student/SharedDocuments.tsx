import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ExternalLink } from "lucide-react";
import type { SharedDocument } from "@shared/schema";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface SharedDocumentsProps {
  teamId: string;
}

export default function SharedDocuments({ teamId }: SharedDocumentsProps) {
  const { data: documents = [], isLoading } = useQuery<SharedDocument[]>({
    queryKey: [`/api/team/${teamId}/documents`],
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          読み込み中...
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          共有資料がありません
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {documents.map((doc) => (
        <Card key={doc.id} data-testid={`card-document-${doc.id}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {doc.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm whitespace-pre-wrap">{doc.content}</div>
            
            {doc.fileUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(doc.fileUrl!, "_blank")}
                data-testid={`button-view-file-${doc.id}`}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                ファイルを開く
              </Button>
            )}

            <div className="text-xs text-muted-foreground">
              更新日: {format(new Date(doc.updatedAt), "yyyy年M月d日 HH:mm", { locale: ja })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
