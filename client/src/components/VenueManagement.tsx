import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Plus, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// TODO: remove mock data
const MOCK_VENUES = [
  { id: 1, name: "中央グラウンド", address: "東京都渋谷区中央1-1-1" },
  { id: 2, name: "市民体育館", address: "東京都渋谷区西2-2-2" },
  { id: 3, name: "県立スタジアム", address: "東京都新宿区東3-3-3" },
  { id: 4, name: "第一小学校グラウンド", address: "東京都渋谷区南4-4-4" },
];

export function VenueManagement() {
  const [venues, setVenues] = useState(MOCK_VENUES);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newVenue, setNewVenue] = useState({ name: "", address: "" });

  const handleAdd = () => {
    if (newVenue.name && newVenue.address) {
      setVenues([...venues, { id: Date.now(), ...newVenue }]);
      setNewVenue({ name: "", address: "" });
      setIsDialogOpen(false);
      console.log('場所を追加:', newVenue);
    }
  };

  const handleDelete = (id: number) => {
    setVenues(venues.filter(v => v.id !== id));
    console.log('場所を削除:', id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">活動場所管理</h1>
          <p className="text-muted-foreground">頻繁に使用する場所を登録</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-venue">
              <Plus className="h-4 w-4 mr-2" />
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
                <Label htmlFor="venue-address">住所</Label>
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
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} data-testid="button-cancel">
                キャンセル
              </Button>
              <Button onClick={handleAdd} data-testid="button-save-venue">
                追加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {venues.map((venue) => (
          <Card key={venue.id} className="hover-elevate" data-testid={`venue-card-${venue.id}`}>
            <CardHeader className="space-y-0 pb-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="rounded-full bg-primary/10 p-2">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{venue.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{venue.address}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-venue-${venue.id}`}>
                <Edit className="h-3 w-3 mr-1" />
                編集
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(venue.id)}
                data-testid={`button-delete-venue-${venue.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
