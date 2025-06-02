import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="text-center py-8">
        <h1 className="font-headline text-4xl font-bold text-primary mb-2">
          Welcome to Little Steps Companion!
        </h1>
        <p className="text-lg text-muted-foreground">
          Guiding you through the journey of parenthood, one little step at a time.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Track Milestones</CardTitle>
            <CardDescription>Log and celebrate your child's developmental achievements.</CardDescription>
          </CardHeader>
          <CardContent>
            <Image 
              src="https://placehold.co/600x400.png" 
              alt="Child playing with blocks" 
              width={600} 
              height={400} 
              className="rounded-md object-cover"
              data-ai-hint="child development" 
            />
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Set Goals</CardTitle>
            <CardDescription>Define and work towards parenting and child development goals.</CardDescription>
          </CardHeader>
          <CardContent>
             <Image 
              src="https://placehold.co/600x400.png" 
              alt="Parent helping child walk" 
              width={600} 
              height={400} 
              className="rounded-md object-cover"
              data-ai-hint="parenting goals"
            />
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline text-primary">Expert Articles</CardTitle>
            <CardDescription>Access AI-suggested articles tailored to your needs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Image 
              src="https://placehold.co/600x400.png" 
              alt="Person reading on a tablet" 
              width={600} 
              height={400} 
              className="rounded-md object-cover"
              data-ai-hint="reading articles"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
