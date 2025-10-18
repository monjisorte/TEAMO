import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Venue {
  id: string;
  teamId: string;
  name: string;
  address: string | null;
}

export function VenueManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [newVenue, setNewVenue] = useState({ name: "", address: "" });

  // Get teamId from localStorage
  const coachData = localStorage.getItem("coachData");
  const teamId = coachData ? JSON.parse(coachData).teamId : null;

  // Fetch venues
  const { data: venues = [], isLoading } = useQuery<Venue[]>({
    queryKey: ["/api/teams", teamId, "venues"],
    enabled: !!teamId,
  });

  // Add venue mutation
  const addVenueMutation = useMutation({
    mutationFn: async (data: { name: string; address: string }) => {
      return await apiRequest("POST", "/api/venues", { ...data, teamId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "venues"] });
      setNewVenue({ name: "", address: "" });
      setIsAddDialogOpen(false);
      toast({
        title: "成功",
        description: "活動場所を追加しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "活動場所の追加に失敗しました",
        variant: "destructive",
      });
    },
  });

  // Delete venue mutation
  const deleteVenueMutation = useMutation({
    mutationFn: async (venueId: string) => {
      return await apiRequest("DELETE", `/api/venues/${venueId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "venues"] });
      setIsDeleteDialogOpen(false);
      setSelectedVenue(null);
      toast({
        title: "成功",
        description: "活動場所を削除しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "活動場所の削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleAdd = () => {
    if (newVenue.name) {
      addVenueMutation.mutate(newVenue);
    }
  };

  const handleDeleteClick = (venue: Venue) => {
    setSelectedVenue(venue);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedVenue) {
      deleteVenueMutation.mutate(selectedVenue.id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">活動場所管理</h1>
          <p className="text-muted-foreground mt-2 text-lg">頻繁に使用する場所を登録</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 px-6 rounded-xl text-base" data-testid="button-add-venue">
              <Plus className="h-5 w-5 mr-2" />
              場所を追加
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しい活動場所を追加</DialogTitle>
              <DialogDescription>
                練習や試合でよく使う場所を登録してください
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="venue-name">場所名</Label>
                <Input
                  id="venue-name"
                  value={newVenue.name}
                  onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
                  placeholder="例: 中央グラウンド"
                  data-testid="input-venue-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="venue-address">住所（任意）</Label>
                <Input
                  id="venue-address"
                  value={newVenue.address}
                  onChange={(e) => setNewVenue({ ...newVenue, address: e.target.value })}
                  placeholder="例: 東京都..."
                  data-testid="input-venue-address"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} data-testid="button-cancel">
                キャンセル
              </Button>
              <Button 
                onClick={handleAdd}
                disabled={addVenueMutation.isPending}
                data-testid="button-save-venue"
              >
                {addVenueMutation.isPending ? "追加中..." : "追加"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => (
          <Card key={venue.id} className="border-0 shadow-lg hover-elevate transition-all" data-testid={`venue-card-${venue.id}`}>
            <CardHeader className="space-y-0 pb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="rounded-2xl bg-gradient-to-br from-primary to-purple-600 p-3">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-xl truncate">{venue.name}</CardTitle>
                    {venue.address && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{venue.address}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-xl"
                onClick={() => handleDeleteClick(venue)}
                data-testid={`button-delete-venue-${venue.id}`}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                削除
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedVenue?.name}を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">キャンセル</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              disabled={deleteVenueMutation.isPending}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteVenueMutation.isPending ? "削除中..." : "削除する"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
