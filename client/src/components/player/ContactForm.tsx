import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail } from "lucide-react";

interface ContactFormProps {
  teamId: string;
  studentName: string;
  studentEmail: string;
}

const contactSchema = z.object({
  name: z.string().min(1, "名前を入力してください"),
  email: z.string().email("有効なメールアドレスを入力してください"),
  message: z.string().min(10, "メッセージは10文字以上入力してください"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactForm({ teamId, studentName, studentEmail }: ContactFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: studentName,
      email: studentEmail,
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    setIsLoading(true);
    try {
      const response = await apiRequest("POST", `/api/team/${teamId}/contact`, data);

      if (response.ok) {
        toast({
          title: "送信成功",
          description: "お問い合わせを送信しました",
        });
        form.reset({
          name: studentName,
          email: studentEmail,
          message: "",
        });
      } else {
        const result = await response.json();
        toast({
          title: "送信失敗",
          description: result.error || "送信中にエラーが発生しました",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "エラー",
        description: "送信中にエラーが発生しました",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          チームへのお問い合わせ
        </CardTitle>
        <CardDescription>
          チームの代表者にメッセージを送信できます
        </CardDescription>
      </CardHeader>
      <CardContent>
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
                      data-testid="input-contact-name"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メールアドレス</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="email@example.com" 
                      data-testid="input-contact-email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>メッセージ</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="お問い合わせ内容を入力してください..." 
                      rows={6}
                      data-testid="textarea-contact-message"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              disabled={isLoading}
              data-testid="button-submit-contact"
              className="w-full"
            >
              {isLoading ? "送信中..." : "送信"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
