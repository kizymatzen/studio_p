
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Mock Firestore read
const mockGetUserRole = async (uid: string) => {
  return new Promise<{ role: string } | null>((resolve) => {
    setTimeout(() => {
      // In a real app, this reads from Firestore: collection "users", document uid
      const role = localStorage.getItem(`user_role_${uid}`);
      if (role) {
        resolve({ role });
      } else {
        resolve(null); // No role found in mock storage
      }
    }, 1000);
  });
};

export default function RoleCheckPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = React.useState("Checking role...");

  React.useEffect(() => {
    const checkUserRole = async () => {
      const uid = localStorage.getItem("mock_current_user_id");

      if (!uid) {
        setStatus("No user session found. Redirecting to login...");
        toast({
          variant: "destructive",
          title: "Not Authenticated",
          description: "Please log in to continue.",
        });
        router.replace("/login");
        return;
      }

      try {
        setStatus("Fetching user role from mock database...");
        const userRoleData = await mockGetUserRole(uid);

        if (userRoleData && userRoleData.role) {
          setStatus(`Role '${userRoleData.role}' found. Redirecting to home...`);
          toast({
            title: "Role Confirmed",
            description: "Welcome back!",
          });
          router.replace("/home");
        } else {
          setStatus("No role selected. Redirecting to role selection...");
          toast({
            title: "Role Selection Needed",
            description: "Please select your role to continue.",
          });
          router.replace("/select-role");
        }
      } catch (error: any) {
        setStatus("Error checking role. Redirecting to login...");
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not verify your role. Please try logging in again.",
        });
        router.replace("/login");
      }
    };

    checkUserRole();
  }, [router, toast]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="text-lg font-semibold text-foreground">{status}</p>
      <p className="text-sm text-muted-foreground">Please wait...</p>
    </div>
  );
}
