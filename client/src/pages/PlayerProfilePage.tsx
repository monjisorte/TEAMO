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
import { Upload, User, Mail, Lock, Users, Check, X, Send, AlertTriangle, ChevronDown, Settings } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

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

const siblingSchema = z.object({
  siblingEmail: z.string().email("有効なメールアドレスを入力してください"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type EmailFormValues = z.infer<typeof emailSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type SiblingFormValues = z.infer<typeof siblingSchema>;

interface SiblingLink {
  id: string;
  studentId1: string;
  studentId2: string;
  status: string;
  requestedBy: string;
  createdAt: string;
  approvedAt: string | null;
  otherStudent: {
    id: string;
    lastName: string;
    firstName: string;
    email: string;
  } | null;
  isPendingApproval: boolean;
  isSentRequest: boolean;
}

export default function PlayerProfilePage({ playerId, teamId }: PlayerProfilePageProps) {
  const { toast } = useToast();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isEmailChangeOpen, setIsEmailChangeOpen] = useState(false);
  const [isPasswordChangeOpen, setIsPasswordChangeOpen] = useState(false);
  const [isSiblingManagementOpen, setIsSiblingManagementOpen] = useState(false);

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

  const siblingForm = useForm<SiblingFormValues>({
    resolver: zodResolver(siblingSchema),
    defaultValues: {
      siblingEmail: "",
    },
  });

  // Fetch sibling links
  const { data: siblingLinks = [], refetch: refetchSiblingLinks } = useQuery<SiblingLink[]>({
    queryKey: [`/api/sibling-links/${playerId}`],
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

  // Check for sibling request notification from email link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('sibling_request') === 'true') {
      toast({
        title: "兄弟アカウント連携リクエスト",
        description: "兄弟アカウント連携のリクエストが届いています。下の「兄弟アカウント管理」セクションで承認または拒否してください。",
        duration: 8000,
      });
      // Clear the query parameter from URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);

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

  // Send sibling link request
  const sendSiblingRequestMutation = useMutation({
    mutationFn: async (data: SiblingFormValues) => {
      const response = await apiRequest("POST", "/api/sibling-links", {
        studentId: playerId,
        siblingEmail: data.siblingEmail,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send sibling request");
      }
      return await response.json();
    },
    onSuccess: () => {
      refetchSiblingLinks();
      siblingForm.reset();
      toast({
        title: "送信完了",
        description: "兄弟アカウント連携リクエストを送信しました",
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

  // Approve sibling link
  const approveSiblingLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const response = await apiRequest("PUT", `/api/sibling-links/${linkId}/approve`, {
        studentId: playerId,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to approve sibling link");
      }
      return await response.json();
    },
    onSuccess: () => {
      refetchSiblingLinks();
      toast({
        title: "承認完了",
        description: "兄弟アカウント連携を承認しました",
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

  // Delete/reject sibling link
  const deleteSiblingLinkMutation = useMutation({
    mutationFn: async (linkId: string) => {
      const response = await apiRequest("DELETE", `/api/sibling-links/${linkId}`, {
        studentId: playerId,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete sibling link");
      }
      return await response.json();
    },
    onSuccess: () => {
      refetchSiblingLinks();
      toast({
        title: "削除完了",
        description: "兄弟アカウント連携を削除しました",
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

  // Withdraw (delete account)
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/students/${playerId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "退会完了",
        description: "退会処理が完了しました",
      });
      // Clear localStorage and redirect to login
      localStorage.removeItem("playerData");
      localStorage.removeItem("selectedCategoryIds");
      window.location.href = "/player/login";
    },
    onError: () => {
      toast({
        title: "エラー",
        description: "退会処理に失敗しました",
        variant: "destructive",
      });
    },
  });

  const onSiblingSubmit = (data: SiblingFormValues) => {
    sendSiblingRequestMutation.mutate(data);
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

      {/* Account Settings Card */}
      <Card className="border-0 shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-xl font-bold">アカウント設定</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-2">
          {/* Email Change Collapsible */}
          <Collapsible open={isEmailChangeOpen} onOpenChange={setIsEmailChangeOpen}>
            <Card>
              <CollapsibleTrigger className="w-full" data-testid="toggle-email-change">
                <div className="flex items-center justify-between p-3 hover-elevate">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-sm">メールアドレス変更</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isEmailChangeOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 pt-1 border-t">
                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4 mt-3">
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
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Password Change Collapsible */}
          <Collapsible open={isPasswordChangeOpen} onOpenChange={setIsPasswordChangeOpen}>
            <Card>
              <CollapsibleTrigger className="w-full" data-testid="toggle-password-change">
                <div className="flex items-center justify-between p-3 hover-elevate">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-blue-600" />
                    <span className="font-semibold text-sm">パスワード変更</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isPasswordChangeOpen ? 'rotate-180' : ''}`} />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3 pt-1 border-t">
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4 mt-3">
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
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Sibling Account Management Card */}
      <Collapsible open={isSiblingManagementOpen} onOpenChange={setIsSiblingManagementOpen}>
        <Card className="border-0 shadow-xl">
          <CollapsibleTrigger className="w-full" data-testid="toggle-sibling-management">
            <CardHeader className="pb-3 hover-elevate">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-xl font-bold">兄弟アカウント管理</CardTitle>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isSiblingManagementOpen ? 'rotate-180' : ''}`} />
              </div>
              <CardDescription className="text-sm text-left">
                兄弟姉妹のアカウントを連携すると、ヘッダーメニューから簡単にアカウントを切り替えることができます
              </CardDescription>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="p-3 pt-0 space-y-4 border-t">
              {/* Add Sibling Form */}
              <div className="pt-3">
                <h3 className="text-sm font-semibold mb-2">兄弟姉妹を追加</h3>
                <Form {...siblingForm}>
                  <form onSubmit={siblingForm.handleSubmit(onSiblingSubmit)} className="flex gap-2">
                    <FormField
                      control={siblingForm.control}
                      name="siblingEmail"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input 
                              type="email"
                              placeholder="兄弟姉妹のメールアドレス" 
                              data-testid="input-sibling-email"
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={sendSiblingRequestMutation.isPending}
                      data-testid="button-send-sibling-request"
                      size="sm"
                    >
                      <Send className="w-4 h-4 mr-1" />
                      {sendSiblingRequestMutation.isPending ? "送信中..." : "送信"}
                    </Button>
                  </form>
                </Form>
              </div>

              {/* Sibling Links List */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">連携中の兄弟姉妹</h3>
                {siblingLinks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">まだ兄弟姉妹のアカウントが連携されていません</p>
                ) : (
                  <div className="space-y-2">
                    {siblingLinks.map((link) => (
                      <Card key={link.id} className="p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate" data-testid={`text-sibling-name-${link.id}`}>
                              {link.otherStudent ? `${link.otherStudent.lastName} ${link.otherStudent.firstName}` : "不明"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {link.otherStudent?.email}
                            </p>
                            {link.isPendingApproval && (
                              <p className="text-xs text-blue-600 font-medium mt-1">承認待ち</p>
                            )}
                            {link.isSentRequest && (
                              <p className="text-xs text-muted-foreground mt-1">申請中</p>
                            )}
                            {link.status === "approved" && (
                              <p className="text-xs text-green-600 font-medium mt-1">承認済み</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            {link.isPendingApproval && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => approveSiblingLinkMutation.mutate(link.id)}
                                disabled={approveSiblingLinkMutation.isPending}
                                data-testid={`button-approve-${link.id}`}
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={deleteSiblingLinkMutation.isPending}
                                  data-testid={`button-delete-${link.id}`}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>兄弟アカウント連携を解除しますか？</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {link.otherStudent ? `${link.otherStudent.lastName} ${link.otherStudent.firstName}` : "この"} との連携を解除します。この操作は取り消せません。
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel data-testid={`button-cancel-delete-${link.id}`}>
                                    キャンセル
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteSiblingLinkMutation.mutate(link.id)}
                                    className="bg-destructive hover:bg-destructive/90"
                                    data-testid={`button-confirm-delete-${link.id}`}
                                  >
                                    解除する
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 退会セクション */}
      <Card className="border-0 shadow-xl border-destructive/20">
        <CardHeader>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            退会
          </CardTitle>
          <CardDescription>
            アカウントを削除します。この操作は取り消せません。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
                data-testid="button-withdraw"
              >
                退会する
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>本当に退会しますか？</AlertDialogTitle>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-semibold text-destructive">
                    退会は取り消せません。退会するとすべてのデータが削除されます。
                  </p>
                  <p>
                    この操作を実行すると、以下のデータが完全に削除されます：
                  </p>
                  <ul className="list-disc list-inside">
                    <li>プロフィール情報</li>
                    <li>出席記録</li>
                    <li>月謝支払い履歴</li>
                    <li>兄弟アカウント連携</li>
                  </ul>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-withdraw">
                  キャンセル
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => withdrawMutation.mutate()}
                  disabled={withdrawMutation.isPending}
                  className="bg-destructive hover:bg-destructive/90"
                  data-testid="button-confirm-withdraw"
                >
                  {withdrawMutation.isPending ? "処理中..." : "退会する"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
