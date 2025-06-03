
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { LogIn, Lock, Mail, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword, type UserCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const loginUser = async (email: string, password: string) => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // Firebase handles session, no need to manually store in localStorage here
    // However, for the mock role system, we'll temporarily keep this until Firestore is fully integrated.
    localStorage.setItem("mock_current_user_id", user.uid);
    localStorage.setItem("mock_current_user_email", user.email || "");
    return { uid: user.uid, email: user.email };
  } catch (error: any) {
    let errorMessage = "Login failed. Please check your credentials.";
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
      errorMessage = "Invalid email or password.";
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = "Invalid email format.";
    } else if (error.code) {
      errorMessage = error.code.replace('auth/', '').replace(/-/g, ' ') + '.';
      errorMessage = errorMessage.charAt(0).toUpperCase() + errorMessage.slice(1);
    } else {
      errorMessage = error.message || "An unexpected error occurred during login.";
    }
    throw new Error(errorMessage);
  }
};


export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      await loginUser(data.email, data.password);
      toast({
        title: "Login Successful",
        description: "Redirecting...",
      });
      router.push("/role-check");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: error.message || "An unexpected error occurred.",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogIn className="h-8 w-8" />
          </div>
          <CardTitle className="font-headline text-3xl">Welcome Back!</CardTitle>
          <CardDescription>Sign in to continue to Little Steps Companion.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                      Email Address
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center">
                      <Lock className="mr-2 h-4 w-4 text-muted-foreground" />
                      Password
                    </FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <LogIn className="mr-2" /> Log In
                  </>
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Button variant="link" asChild className="p-0 h-auto font-semibold text-primary">
                  <Link href="/signup">Sign up</Link>
                </Button>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
