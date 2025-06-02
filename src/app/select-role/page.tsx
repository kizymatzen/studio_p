
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Briefcase, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock Firestore write
const mockSaveUserRole = async (uid: string, email: string, role: "parent" | "professional") => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      // In a real app, this writes to Firestore: collection "users", document uid
      // For mock, we use localStorage
      localStorage.setItem(`user_role_${uid}`, role);
      console.log(`Mock Firestore: Saved role '${role}' for user ${uid} (${email})`);
      resolve();
    }, 1500);
  });
};

export default function SelectRolePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState<"parent" | "professional" | null>(null);
  const [currentUser, setCurrentUser] = React.useState<{uid: string, email: string} | null>(null);

  React.useEffect(() => {
    const uid = localStorage.getItem("mock_current_user_id");
    const email = localStorage.getItem("mock_current_user_email");
    if (uid && email) {
      setCurrentUser({ uid, email });
    } else {
      // If no user info, likely direct navigation, redirect to login
      toast({
        variant: "destructive",
        title: "Error",
        description: "User information not found. Please log in or sign up.",
      });
      router.replace("/login");
    }
  }, [router, toast]);

  const handleRoleSelection = async (role: "parent" | "professional") => {
    if (!currentUser) {
        toast({ variant: "destructive", title: "Error", description: "User session not found." });
        return;
    }
    setIsLoading(role);
    try {
      await mockSaveUserRole(currentUser.uid, currentUser.email, role);
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

  if (!currentUser) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading user data...</p>
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
