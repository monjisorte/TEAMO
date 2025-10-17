import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CategorySelection from "@/components/player/CategorySelection";
import { Upload, User } from "lucide-react";

interface PlayerProfilePageProps {
  playerId: string;
}

interface PlayerProfile {
  id: string;
  name: string;
  email: string;
  teamId: string;
  schoolName?: string | null;
  birthDate?: string | null;
  photoUrl?: string | null;
}

const profileSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  schoolName: z.string().optional(),
  birthDate: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function PlayerProfilePage({ playerId }: PlayerProfilePageProps) {
  const { toast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Fetch player profile
  const { data: player, isLoading } = useQuery<PlayerProfile>({
    queryKey: [`/api/student/${playerId}`],
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      schoolName: "",
      birthDate: "",
    },
  });

  // Update form when player data is loaded
  useEffect(() => {
    if (player) {
      form.reset({
        name: player.name || "",
        schoolName: player.schoolName || "",
        birthDate: player.birthDate || "",
      });
      if (player.photoUrl) {
        setPhotoPreview(player.photoUrl);
      }
    }
  }, [player, form]);

  // Load saved categories
  useEffect(() => {
    const savedCategories = localStorage.getItem(`player_${playerId}_categories`);
    if (savedCategories) {
      setSelectedCategories(JSON.parse(savedCategories));
    }
  }, [playerId]);

  const handleCategoriesUpdated = (categoryIds: string[]) => {
    setSelectedCategories(categoryIds);
    localStorage.setItem(`player_${playerId}_categories`, JSON.stringify(categoryIds));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      // TODO: Upload photo to object storage if photoFile is set
      let photoUrl = player?.photoUrl;
      
      if (photoFile) {
        // For now, use base64 as a placeholder
        // In production, you should upload to object storage
        photoUrl = photoPreview;
      }

      const response = await apiRequest("PATCH", `/api/student/${playerId}`, {
        ...data,
        photoUrl,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/student/${playerId}`] });
      toast({
        title: "保存完了",
        description: "プロフィールを更新しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "プロフィールの更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photo Upload */}
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage src={photoPreview || undefined} />
              <AvatarFallback>
                <User className="h-12 w-12" />
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <label htmlFor="photo-upload">
                <Button variant="outline" size="sm" asChild>
                  <span className="cursor-pointer">
                    <Upload className="w-4 h-4 mr-2" />
                    写真を選択
                  </span>
                </Button>
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                data-testid="input-photo"
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG形式（最大5MB）
              </p>
            </div>
          </div>

          {/* Profile Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>名前</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="山田太郎" 
                        data-testid="input-name"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schoolName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>学校名</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="〇〇中学校" 
                        data-testid="input-school-name"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>生年月日</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        data-testid="input-birth-date"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? "保存中..." : "保存"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>カテゴリ設定</CardTitle>
        </CardHeader>
        <CardContent>
          <CategorySelection
            studentId={playerId}
            onCategoriesUpdated={handleCategoriesUpdated}
          />
        </CardContent>
      </Card>
    </div>
  );
}
