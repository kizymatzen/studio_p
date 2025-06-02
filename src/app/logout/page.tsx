
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogOut, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LogoutPage() {
  const router = useRouter();
  const { toast } = useToast();

  React.useEffect(() => {
    // Clear mock user session
    localStorage.removeItem("mock_current_user_id");
    localStorage.removeItem("mock_current_user_email");
    // In a real app, you would also clear any actual Firebase auth state.
    // For example, firebase.auth().signOut();

    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  }, [toast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md text-center shadow-xl">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogOut className="h-8 w-8" />
          </div>
          <CardTitle className="font-headline text-3xl">You've Been Logged Out</CardTitle>
          <CardDescription>
            Thank you for using Little Steps Companion.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full" size="lg">
            <Link href="/login">
              <LogIn className="mr-2" /> Go to Login
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
