
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, ChevronLeft, FilePlus2, SmilePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const behaviorTypes = [
  "Tantrum", "Happy Moment", "Mealtime Behavior", "Sleep Related", 
  "Social Interaction", "Learning Activity", "Aggression", 
  "Anxiety/Fear", "Self-Regulation", "Refused Food", "Overstimulated", "Playful", "Focused", "Irritable", "Other"
] as const;

const locations = [
  "Home", "School/Daycare", "Playground/Park", "Store/Public Place", 
  "Relative's Home", "Car", "Other"
] as const;

const logBehaviorSchema = z.object({
  type: z.enum(behaviorTypes, { required_error: "Please select a behavior type." }),
  mood: z.string().max(50, "Mood/emoji should be 50 characters or less.").optional().default(""),
  notes: z.string().max(500, "Notes should be 500 characters or less.").optional().default(""),
  location: z.enum(locations).optional(),
});

type LogBehaviorFormValues = z.infer<typeof logBehaviorSchema>;

interface ChildData {
  id: string;
  name: string;
  parentId: string;
}

export default function LogBehaviorPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;
  const { toast } = useToast();

  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [childData, setChildData] = React.useState<ChildData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pageLoading, setPageLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<LogBehaviorFormValues>({
    resolver: zodResolver(logBehaviorSchema),
    defaultValues: {
      type: undefined,
      mood: "",
      notes: "",
      location: undefined,
    },
  });

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in." });
        router.replace("/login");
      }
    });
    return () => unsubscribeAuth();
  }, [router, toast]);

  React.useEffect(() => {
    if (!authUser || !childId) {
      if(authUser && !childId) { // only set page loading to false if authUser is present but no childId
          setError("Child ID is missing.");
          setPageLoading(false);
      }
      return;
    }

    const fetchChildInfo = async () => {
      setPageLoading(true);
      setError(null);
      try {
        const childDocRef = doc(db, "children", childId);
        const childDocSnap = await getDoc(childDocRef);

        if (childDocSnap.exists()) {
          const data = childDocSnap.data() as Omit<ChildData, 'id'>;
          if (data.parentId !== authUser.uid) {
            setError("You do not have permission to log behavior for this child.");
            setChildData(null);
          } else {
            setChildData({ id: childDocSnap.id, ...data });
          }
        } else {
          setError("Child profile not found.");
          setChildData(null);
        }
      } catch (e: any) {
        console.error("Error fetching child data:", e);
        setError("Failed to load child's information. " + e.message);
      } finally {
        setPageLoading(false);
      }
    };

    fetchChildInfo();
  }, [authUser, childId, router]);

  const onSubmit = async (values: LogBehaviorFormValues) => {
    if (!authUser || !childData) {
      toast({ variant: "destructive", title: "Error", description: "Cannot log behavior. User or child data missing." });
      return;
    }
    setIsLoading(true);
    try {
      await addDoc(collection(db, "behaviors"), {
        childId: childData.id,
        parentId: authUser.uid,
        type: values.type,
        mood: values.mood || "",
        notes: values.notes || "",
        location: values.location || "",
        timestamp: serverTimestamp(),
      });
      toast({
        title: "Behavior Logged",
        description: `Behavior for ${childData.name} has been successfully logged.`,
      });
      router.push(`/child/${childData.id}`);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Logging Behavior",
        description: error.message || "Could not save behavior log. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (pageLoading && !authUser) { // Still waiting for authUser
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying user session...</p>
      </div>
    );
  }
  
  if (pageLoading) {
     return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading child information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push("/my-children")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to My Children
        </Button>
      </div>
    );
  }

  if (!childData) {
     return ( // Fallback in case childData is somehow null after loading and no error (e.g. auth changed)
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
        <p className="text-muted-foreground mb-6">Could not load child information. Please try again.</p>
        <Button onClick={() => router.push("/my-children")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to My Children
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to {childData.name}'s Profile
      </Button>
      <div className="flex items-center gap-3">
        <FilePlus2 className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-3xl font-bold">Log Behavior for {childData.name}</h1>
      </div>
      <Card className="w-full max-w-xl mx-auto shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>New Behavior Entry</CardTitle>
              <CardDescription>Record a specific behavior or mood observed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Behavior Type*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a behavior type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {behaviorTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mood/Emoji (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 😊, Frustrated, Calm" {...field} />
                    </FormControl>
                    <FormDescription>Enter an emoji or a short word to describe the mood.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Had a meltdown after nap when asked to share a toy."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a location (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full md:w-auto ml-auto" disabled={isLoading || pageLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging...
                  </>
                ) : (
                  <>
                    <SmilePlus className="mr-2 h-4 w-4" /> Log Behavior
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
