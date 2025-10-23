import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, User, Camera } from "lucide-react";
import type { Coach, Category, CoachCategory } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";

const profileSchema = z.object({
  lastName: z.string().optional(),
  firstName: z.string().optional(),
  lastNameKana: z.string().optional(),
  firstNameKana: z.string().optional(),
  position: z.string().optional(),
  bio: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
  newPassword: z.string().min(6, "パスワードは6文字以上で入力してください"),
  confirmPassword: z.string().min(1, "確認用パスワードを入力してください"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "パスワードが一致しません",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

const emailSchema = z.object({
  newEmail: z.string().email("有効なメールアドレスを入力してください"),
  currentPassword: z.string().min(1, "パスワードを入力してください"),
});

type EmailFormData = z.infer<typeof emailSchema>;

export default function CoachProfilePage() {
  const { toast } = useToast();
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const coachData = localStorage.getItem("coachData");
  const coachId = coachData ? JSON.parse(coachData).id : null;
  const teamId = coachData ? JSON.parse(coachData).teamId : null;

  const { data: coach, isLoading } = useQuery<Coach>({
    queryKey: ["/api/coach", coachId],
    enabled: !!coachId,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories", teamId],
    enabled: !!teamId,
  });

  const { data: coachCategories = [] } = useQuery<CoachCategory[]>({
    queryKey: ["/api/coach-categories", coachId],
    queryFn: async () => {
      const response = await fetch(`/api/coach-categories/${coachId}`);
      if (!response.ok) throw new Error("Failed to fetch coach categories");
      return response.json();
    },
    enabled: !!coachId,
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: {
      lastName: coach?.lastName || "",
      firstName: coach?.firstName || "",
      lastNameKana: coach?.lastNameKana || "",
      firstNameKana: coach?.firstNameKana || "",
      position: coach?.position || "",
      bio: coach?.bio || "",
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      newEmail: "",
      currentPassword: "",
    },
  });

  useEffect(() => {
    if (coach?.photoUrl) {
      setPhotoPreview(coach.photoUrl);
    }
  }, [coach?.photoUrl]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                setPhotoFile(resizedFile);
                setPhotoPreview(canvas.toDataURL('image/jpeg', 0.8));
              }
            }, 'image/jpeg', 0.8);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      let photoUrl = coach?.photoUrl;
      
      if (photoFile) {
        const uploadRes = await fetch("/api/objects/upload-public", {
          method: "POST",
          credentials: "include",
        });
        const { uploadURL } = await uploadRes.json();
        
        await fetch(uploadURL, {
          method: "PUT",
          body: photoFile,
          headers: {
            "Content-Type": "image/jpeg",
          },
        });
        
        photoUrl = uploadURL.split("?")[0];
      }

      const res = await apiRequest("PUT", `/api/coach/${coachId}`, {
        ...data,
        photoUrl,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach", coachId] });
      setPhotoFile(null);
      toast({
        title: "保存しました",
        description: "プロフィール情報を更新しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "プロフィール更新に失敗しました",
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: PasswordFormData) => {
      const res = await apiRequest("PUT", `/api/coach/${coachId}/password`, {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({
        title: "パスワードを変更しました",
        description: "新しいパスワードでログインできます",
      });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "パスワード変更に失敗しました",
        variant: "destructive",
      });
    },
  });

  const changeEmailMutation = useMutation({
    mutationFn: async (data: EmailFormData) => {
      const res = await apiRequest("PUT", `/api/coach/${coachId}/email`, {
        newEmail: data.newEmail,
        currentPassword: data.currentPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      emailForm.reset();
      toast({
        title: "メールアドレスを変更しました",
        description: "次回ログインから新しいメールアドレスを使用してください",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/coach", coachId] });
    },
    onError: (error: any) => {
      toast({
        title: "エラー",
        description: error.message || "メールアドレス変更に失敗しました",
        variant: "destructive",
      });
    },
  });

  const addCoachCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      return await apiRequest("POST", "/api/coach-categories", {
        coachId,
        categoryId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-categories", coachId] });
      toast({
        title: "カテゴリを追加しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "カテゴリの追加に失敗しました",
        variant: "destructive",
      });
    },
  });

  const removeCoachCategoryMutation = useMutation({
    mutationFn: async (coachCategoryId: string) => {
      return await apiRequest("DELETE", `/api/coach-categories/${coachCategoryId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coach-categories", coachId] });
      toast({
        title: "カテゴリを削除しました",
      });
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "カテゴリの削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleCategoryToggle = (categoryId: string) => {
    const existingRelation = coachCategories.find(cc => cc.categoryId === categoryId);
    if (existingRelation) {
      removeCoachCategoryMutation.mutate(existingRelation.id);
    } else {
      addCoachCategoryMutation.mutate(categoryId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const fullName = coach?.lastName && coach?.firstName
    ? `${coach.lastName} ${coach.firstName}`
    : "コーチ";
  
  const fullNameKana = coach?.lastNameKana && coach?.firstNameKana
    ? `${coach.lastNameKana} ${coach.firstNameKana}`
    : "";

  return (
    <div className="container max-w-3xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          プロフィール設定
        </h1>
        <p className="text-muted-foreground mt-2">
          コーチプロフィール情報を管理
        </p>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
          <CardDescription>氏名、プロフィール、写真を変更できます</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={profileForm.handleSubmit((data) => updateProfileMutation.mutate(data))}
            className="space-y-6"
          >
            {/* Profile Photo */}
            <div className="flex flex-col items-center gap-4 pb-6 border-b">
              <Label className="text-sm font-semibold">プロフィール写真</Label>
              <label
                htmlFor="photo-upload"
                className="relative group cursor-pointer"
                data-testid="button-change-photo"
              >
                <Avatar className="h-32 w-32">
                  <AvatarImage src={photoPreview || coach?.photoUrl || ""} alt={fullName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-white text-3xl">
                    <User className="h-16 w-16" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="h-8 w-8 text-white" />
                </div>
              </label>
              <input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
                data-testid="input-photo"
              />
              <p className="text-sm text-muted-foreground text-center">
                写真をクリックして変更
                {photoFile && (
                  <span className="block text-primary font-medium mt-1">
                    新しい写真が選択されています
                  </span>
                )}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lastName">性</Label>
                <Input
                  id="lastName"
                  {...profileForm.register("lastName")}
                  placeholder="山田"
                  data-testid="input-lastName"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">名</Label>
                <Input
                  id="firstName"
                  {...profileForm.register("firstName")}
                  placeholder="太郎"
                  data-testid="input-firstName"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lastNameKana">性（かな）</Label>
                <Input
                  id="lastNameKana"
                  {...profileForm.register("lastNameKana")}
                  placeholder="やまだ"
                  data-testid="input-lastNameKana"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstNameKana">名（かな）</Label>
                <Input
                  id="firstNameKana"
                  {...profileForm.register("firstNameKana")}
                  placeholder="たろう"
                  data-testid="input-firstNameKana"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">役職</Label>
              <Input
                id="position"
                {...profileForm.register("position")}
                placeholder="代表、ヘッドコーチ、U-8担当など"
                data-testid="input-position"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">プロフィール / 自己紹介</Label>
              <Textarea
                id="bio"
                {...profileForm.register("bio")}
                placeholder="経歴、指導方針、メッセージなどを入力してください"
                rows={6}
                data-testid="input-bio"
              />
            </div>

            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="w-full"
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              保存する
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email Change */}
      <Card>
        <CardHeader>
          <CardTitle>メールアドレス変更</CardTitle>
          <CardDescription>
            ログイン時に使用するメールアドレスを変更します（現在: {coach?.email}）
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={emailForm.handleSubmit((data) => changeEmailMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="newEmail">新しいメールアドレス</Label>
              <Input
                id="newEmail"
                type="email"
                {...emailForm.register("newEmail")}
                placeholder="new-email@example.com"
                data-testid="input-newEmail"
              />
              {emailForm.formState.errors.newEmail && (
                <p className="text-sm text-destructive">
                  {emailForm.formState.errors.newEmail.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailCurrentPassword">現在のパスワード（確認用）</Label>
              <Input
                id="emailCurrentPassword"
                type="password"
                {...emailForm.register("currentPassword")}
                data-testid="input-emailCurrentPassword"
              />
              {emailForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {emailForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={changeEmailMutation.isPending}
              className="w-full"
              data-testid="button-change-email"
            >
              {changeEmailMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              メールアドレスを変更する
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle>担当カテゴリ</CardTitle>
          <CardDescription>指導するカテゴリを選択してください</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">カテゴリがありません</p>
            ) : (
              categories.map((category) => {
                const isSelected = coachCategories.some(cc => cc.categoryId === category.id);
                return (
                  <div
                    key={category.id}
                    className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30 hover-elevate"
                    data-testid={`category-item-${category.id}`}
                  >
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={isSelected}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                      data-testid={`checkbox-category-${category.id}`}
                    />
                    <label
                      htmlFor={`category-${category.id}`}
                      className="flex-1 text-sm font-medium cursor-pointer"
                    >
                      {category.name}
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle>パスワード変更</CardTitle>
          <CardDescription>新しいパスワードを設定します</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit((data) => changePasswordMutation.mutate(data))}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="currentPassword">現在のパスワード</Label>
              <Input
                id="currentPassword"
                type="password"
                {...passwordForm.register("currentPassword")}
                data-testid="input-currentPassword"
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新しいパスワード</Label>
              <Input
                id="newPassword"
                type="password"
                {...passwordForm.register("newPassword")}
                data-testid="input-newPassword"
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
              <Input
                id="confirmPassword"
                type="password"
                {...passwordForm.register("confirmPassword")}
                data-testid="input-confirmPassword"
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="w-full"
              data-testid="button-change-password"
            >
              {changePasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              パスワードを変更する
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
