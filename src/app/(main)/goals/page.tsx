import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target } from "lucide-react";

export default function GoalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Target className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-3xl font-bold">Your Goals</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>My Parenting Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is where you can set, track, and manage your parenting and child development goals. 
            Stay tuned for more features!
          </p>
          <ul className="mt-4 list-disc list-inside space-y-2">
            <li>Goal 1: Read a bedtime story every night.</li>
            <li>Goal 2: Introduce one new vegetable each week.</li>
            <li>Goal 3: Practice patience during tantrums.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
