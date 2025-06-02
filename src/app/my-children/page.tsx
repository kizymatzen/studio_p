import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function MyChildrenPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-3xl font-bold">My Children</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Manage Your Children's Profiles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This section is under development. Soon, you'll be able to add and manage profiles for your children, 
            track their milestones, and personalize their experience.
          </p>
          {/* Placeholder content */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card className="bg-secondary/50">
              <CardHeader><CardTitle className="text-lg">Child 1 (Coming Soon)</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Age, milestones, etc.</p></CardContent>
            </Card>
            <Card className="bg-secondary/50">
              <CardHeader><CardTitle className="text-lg">Child 2 (Coming Soon)</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground">Age, milestones, etc.</p></CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
