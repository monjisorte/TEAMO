import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import CategorySelection from "@/components/player/CategorySelection";
import { Upload, User, Mail, Lock } from "lucide-react";

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
  jerseyNumber?: number | null;
  lastName?: string | null;
  firstName?: string | null;
  lastNameKana?: string | null;
  firstNameKana?: string | null;
}

const profileSchema = z.object({
  lastName: z.string().min(1, "苗字を入力してください"),
  firstName: z.string().min(1, "名前を入力してください"),
  lastNameKana: z.string().optional(),
  firstNameKana: z.string().optional(),
  schoolName: z.string().optional(),
  birthDate: z.string().optional(),
  jerseyNumber: z.string().optional(),
});

const emailSchema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください"),
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "新しいパスワードは6文字以上である必要があります"),
  confirmPassword: z.string().min(1, "確認用パスワードを入力してください"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

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
      lastName: "",
      firstName: "",
      lastNameKana: "",
      firstNameKana: "",
      schoolName: "",
      birthDate: "",
      jerseyNumber: "",
    },
  });

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
      currentPassword: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update form when player data is loaded
  useEffect(() => {
    if (player) {
      form.reset({
        lastName: player.lastName || "",
        firstName: player.firstName || "",
        lastNameKana: player.lastNameKana || "",
        firstNameKana: player.firstNameKana || "",
        schoolName: player.schoolName || "",
        birthDate: player.birthDate || "",
        jerseyNumber: player.jerseyNumber?.toString() || "",
      });
      emailForm.reset({
        email: player.email || "",
        currentPassword: "",
      });
      if (player.photoUrl) {
        setPhotoPreview(player.photoUrl);
      }
    }
  }, [player, form, emailForm]);

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
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "ファイルサイズエラー",
          description: "画像ファイルは5MB以下にしてください",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Resize image to max 800x800 while maintaining aspect ratio
          const maxSize = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxSize) {
              height = (height * maxSize) / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width = (width * maxSize) / height;
              height = maxSize;
            }
          }

          // Create canvas and resize
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Convert to base64 with quality 0.8 (80%)
            const resizedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            setPhotoPreview(resizedBase64);
            setPhotoFile(file);
          }
        };
        img.src = event.target?.result as string;
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
        jerseyNumber: data.jerseyNumber ? parseInt(data.jerseyNumber) : null,
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
        lastName: player.lastName || "",
        firstName: player.firstName || "",
        lastNameKana: player.lastNameKana || "",
        firstNameKana: player.firstNameKana || "",
        schoolName: player.schoolName || "",
        birthDate: player.birthDate || "",
        jerseyNumber: player.jerseyNumber?.toString() || "",
      });
      if (player.photoUrl) {
        setPhotoPreview(player.photoUrl);
      }
      setPhotoFile(null);
    }
  };

  // Email change mutation
  const changeEmailMutation = useMutation({
    mutationFn: async (data: EmailFormValues) => {
      const response = await apiRequest("PUT", `/api/student/${playerId}/email`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change email");
      }
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/student/${playerId}`] });
      emailForm.reset({ email: "", currentPassword: "" });
      
      // Update localStorage with new email
      const playerData = JSON.parse(localStorage.getItem("playerData") || "{}");
      playerData.email = data.email;
      localStorage.setItem("playerData", JSON.stringify(playerData));
      
      toast({
        title: "メールアドレス変更完了",
        description: "メールアドレスを更新しました。次回から新しいメールアドレスでログインしてください。",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormValues) => {
      const response = await apiRequest("PUT", `/api/student/${playerId}/password`, {
        newPassword: data.newPassword,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to change password");
      }
      return await response.json();
    },
    onSuccess: () => {
      passwordForm.reset({ newPassword: "", confirmPassword: "" });
      toast({
        title: "パスワード変更完了",
        description: "パスワードを更新しました。次回から新しいパスワードでログインしてください。",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onEmailSubmit = (data: EmailFormValues) => {
    changeEmailMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormValues) => {
    changePasswordMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="p-1 space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          プロフィール管理
        </h1>
      </div>

      <Card className="border-0 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <CardTitle className="text-xl font-bold">基本情報</CardTitle>
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
        <CardContent className="space-y-3 p-3">
          {/* Photo Upload */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-2 ring-blue-50 shadow-lg">
                <AvatarImage src={photoPreview || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600">
                  <User className="h-10 w-10 text-white" />
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-1.5 shadow-lg">
                  <Upload className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            {isEditing && (
              <div className="space-y-2">
                <label htmlFor="photo-upload">
                  <Button variant="outline" size="sm" asChild className="font-semibold">
                    <span className="cursor-pointer">
                      <Upload className="w-3 h-3 mr-2" />
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
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>苗字</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="山田" 
                          data-testid="input-last-name"
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
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名前</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="太郎" 
                          data-testid="input-first-name"
                          disabled={!isEditing}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="lastNameKana"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>苗字（かな）</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="やまだ" 
                          data-testid="input-last-name-kana"
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
                  name="firstNameKana"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>名前（かな）</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="たろう" 
                          data-testid="input-first-name-kana"
                          disabled={!isEditing}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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

              <FormField
                control={form.control}
                name="jerseyNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>背番号</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="10"
                        data-testid="input-jersey-number"
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
        <CardHeader className="pb-3">
          <CardTitle className="text-xl font-bold">カテゴリ設定</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <CategorySelection
            studentId={playerId}
            teamId={teamId}
            onCategoriesUpdated={handleCategoriesUpdated}
          />
        </CardContent>
      </Card>

      {/* Email Change Card */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl font-bold">メールアドレス変更</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Form {...emailForm}>
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
              <FormField
                control={emailForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>新しいメールアドレス</FormLabel>
                    <FormControl>
                      <Input 
                        type="email"
                        placeholder="example@example.com" 
                        data-testid="input-new-email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={emailForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>現在のパスワード</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="現在のパスワードを入力" 
                        data-testid="input-current-password-email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={changeEmailMutation.isPending}
                data-testid="button-change-email"
              >
                {changeEmailMutation.isPending ? "変更中..." : "メールアドレスを変更"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Password Change Card */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl font-bold">パスワード変更</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>新しいパスワード</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="新しいパスワード（6文字以上）" 
                        data-testid="input-new-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>新しいパスワード（確認）</FormLabel>
                    <FormControl>
                      <Input 
                        type="password"
                        placeholder="新しいパスワードを再入力" 
                        data-testid="input-confirm-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={changePasswordMutation.isPending}
                data-testid="button-change-password"
              >
                {changePasswordMutation.isPending ? "変更中..." : "パスワードを変更"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
