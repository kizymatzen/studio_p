import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersRound } from "lucide-react";

export default function ManageUsersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <UsersRound className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-3xl font-bold">Manage Users</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This feature is intended for administrative purposes and is currently under development.
            Here you would manage user accounts, roles, and permissions if applicable to your app.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
