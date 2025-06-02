import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LogOut } from "lucide-react";

export default function LogoutPage() {
  return (
    <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto bg-primary/20 text-primary rounded-full p-3 w-fit mb-4">
            <LogOut className="h-10 w-10" />
          </div>
          <CardTitle className="font-headline text-2xl">You have been logged out.</CardTitle>
          <CardDescription>
            Thank you for using Little Steps Companion. We hope to see you again soon!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/home">Return to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
