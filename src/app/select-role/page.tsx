
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";

export default function SelectRolePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<"parent" | "professional" | null>(null);
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        setAuthUser(null);
        toast({
          variant: "destructive",
          title: "Not Authenticated",
          description: "Please log in or sign up to select a role.",
        });
        router.replace("/login");
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router, toast]);

  const handleRoleSelection = async (role: "parent" | "professional") => {
    if (!authUser) {
        toast({ variant: "destructive", title: "Error", description: "User session not found. Please try logging in again." });
        return;
    }
    setIsLoading(role);
    try {
      await setDoc(doc(db, "users", authUser.uid), {
        uid: authUser.uid,
        email: authUser.email,
        role: role,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Role Selected",
        description: `You've selected the '${role}' role. Redirecting to home...`,
      });
      router.push("/home");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Saving Role",
        description: error.message || "Could not save your role. Please try again.",
      });
      setIsLoading(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying user session...</p>
      </div>
    );
  }

  if (!authUser) {
    // This case should ideally be handled by the redirect in useEffect,
    // but as a fallback, we can show a message or keep the loader.
    // For now, the redirect should handle it.
    return (
         <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">Choose Your Role</CardTitle>
          <CardDescription>Are you a Parent or a Professional?</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={() => handleRoleSelection("parent")}
            className="w-full h-16 text-lg"
            variant="outline"
            disabled={!!isLoading}
          >
            {isLoading === "parent" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Users className="mr-3 h-6 w-6" /> Parent
              </>
            )}
          </Button>
          <Button
            onClick={() => handleRoleSelection("professional")}
            className="w-full h-16 text-lg"
            variant="outline"
            disabled={!!isLoading}
          >
            {isLoading === "professional" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Briefcase className="mr-3 h-6 w-6" /> Professional
              </>
            )}
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground text-center w-full">
            This helps us tailor your experience in Little Steps Companion.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
