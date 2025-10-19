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
  teamId: string;
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

export default function PlayerProfilePage({ playerId, teamId }: PlayerProfilePageProps) {
  const { toast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

      const requestData = {
        ...data,
        photoUrl,
      };
      
      console.log("Sending profile update:", requestData);

      const response = await apiRequest("PATCH", `/api/student/${playerId}`, requestData);
      const result = await response.json();
      console.log("Profile update response:", result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/student/${playerId}`] });
      setIsEditing(false);
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

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (player) {
      form.reset({
        name: player.name || "",
        schoolName: player.schoolName || "",
        birthDate: player.birthDate || "",
      });
      if (player.photoUrl) {
        setPhotoPreview(player.photoUrl);
      }
      setPhotoFile(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          プロフィール管理
        </h1>
        <p className="text-muted-foreground text-lg">
          あなたの基本情報とカテゴリ設定を管理します
        </p>
      </div>

      <Card className="border-0 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-6">
          <CardTitle className="text-2xl font-bold">基本情報</CardTitle>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              className="font-semibold"
              onClick={() => setIsEditing(true)}
              data-testid="button-edit-profile"
            >
              編集
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-8 p-8">
          {/* Photo Upload */}
          <div className="flex items-center gap-8">
            <div className="relative">
              <Avatar className="h-28 w-28 ring-4 ring-blue-50 shadow-lg">
                <AvatarImage src={photoPreview || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                  <User className="h-14 w-14 text-white" />
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <div className="absolute -bottom-2 -right-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-2 shadow-lg">
                  <Upload className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            {isEditing && (
              <div className="space-y-3">
                <label htmlFor="photo-upload">
                  <Button variant="outline" size="sm" asChild className="font-semibold">
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
                <p className="text-xs text-muted-foreground font-medium">
                  JPG, PNG形式（最大5MB）
                </p>
              </div>
            )}
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
                        disabled={!isEditing}
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
                        disabled={!isEditing}
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
                        disabled={!isEditing}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateProfileMutation.isPending ? "保存中..." : "保存"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={updateProfileMutation.isPending}
                    data-testid="button-cancel-edit"
                  >
                    キャンセル
                  </Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-bold">カテゴリ設定</CardTitle>
        </CardHeader>
        <CardContent className="p-8 pt-0">
          <CategorySelection
            studentId={playerId}
            teamId={teamId}
            onCategoriesUpdated={handleCategoriesUpdated}
          />
        </CardContent>
      </Card>
    </div>
  );
}
