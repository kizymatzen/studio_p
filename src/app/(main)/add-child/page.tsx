
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInYears } from "date-fns";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Loader2, UserPlus, Baby } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  challenges: z.array(z.string()).optional().default([]),
  personality: z.array(z.string()).optional().default([]),
  preferredStyle: z.string().optional().default(""),
  favoriteTheme: z.array(z.string()).optional().default([]),
  routine: z.string().optional().default(""),
  energy: z.string().optional().default(""),
});

const addChildSchema = z.object({
  name: z.string().min(1, "Child's name is required."),
  nickname: z.string().optional(),
  birthdate: z.date({ required_error: "Birthdate is required." }),
  profile: profileSchema,
});

type AddChildFormValues = z.infer<typeof addChildSchema>;

const challengeOptions = ["Tantrums", "Not listening", "Anxiety", "Sensory overload"];
const personalityOptions = ["Shy", "Sensitive", "Energetic", "Strong-willed"];
const learningStyleOptions = ["Visual", "Auditory", "Hands-on", "Routine-based"];
const themeOptions = ["Animals", "Superheroes", "Princesses", "Vehicles"];
const routineOptions = ["Structured", "Flexible", "No routine"];
const energyOptions = ["Low", "Moderate", "High"];

export default function AddChildPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);
  const currentYear = new Date().getFullYear();

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in to add a child." });
        router.replace("/login");
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router, toast]);

  const form = useForm<AddChildFormValues>({
    resolver: zodResolver(addChildSchema),
    defaultValues: {
      name: "",
      nickname: "",
      birthdate: undefined,
      profile: {
        challenges: [],
        personality: [],
        preferredStyle: "",
        favoriteTheme: [],
        routine: "",
        energy: "",
      },
    },
  });

  const calculateAge = (birthdate: Date): number => {
    return differenceInYears(new Date(), birthdate);
  };

  const onSubmit = async (data: AddChildFormValues) => {
    if (!authUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "User not found. Please log in again." });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    try {
      const age = calculateAge(data.birthdate);
      const childData = {
        name: data.name,
        nickname: data.nickname || "",
        birthdate: format(data.birthdate, "yyyy-MM-dd"),
        age,
        parentId: authUser.uid,
        profile: data.profile,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "children"), childData);

      toast({
        title: "Child Added",
        description: `${data.name} has been successfully added to your profile.`,
      });
      router.push("/my-children");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error Adding Child",
        description: error.message || "Could not save child's profile. Please try again.",
      });
      setIsLoading(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Baby className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-3xl font-bold">Add New Child</h1>
      </div>
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Child's Information</CardTitle>
              <CardDescription>Tell us a bit about your child.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Section 1: Basic Info */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-primary border-b pb-2">Basic Information</h3>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Child's Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Emma Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="nickname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nickname (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Emmy" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthdate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Birthdate</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            captionLayout="dropdown-buttons"
                            fromYear={1900}
                            toYear={currentYear}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              {/* Section 2: Smart Questions */}
              <section className="space-y-6">
                <h3 className="text-lg font-semibold text-primary border-b pb-2">Child's Profile Insights</h3>
                
                <FormField
                  control={form.control}
                  name="profile.challenges"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base">What challenges is your child facing?</FormLabel>
                      <FormDescription>Select all that apply.</FormDescription>
                      {challengeOptions.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="profile.challenges"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (value) => value !== item
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profile.personality"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base">What’s their personality like?</FormLabel>
                       <FormDescription>Select all that apply.</FormDescription>
                      {personalityOptions.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="profile.personality"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (value) => value !== item
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="profile.preferredStyle"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base">Preferred learning style?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          {learningStyleOptions.map(option => (
                            <FormItem key={option} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={option} />
                              </FormControl>
                              <FormLabel className="font-normal">{option}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profile.favoriteTheme"
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-base">What themes do they love?</FormLabel>
                      <FormDescription>Select all that apply.</FormDescription>
                      {themeOptions.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="profile.favoriteTheme"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item])
                                        : field.onChange(
                                            (field.value || []).filter(
                                              (value) => value !== item
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {item}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profile.routine"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base">What kind of routine do they have?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          {routineOptions.map(option => (
                            <FormItem key={option} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={option} />
                              </FormControl>
                              <FormLabel className="font-normal">{option}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="profile.energy"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="text-base">Energy level?</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          {energyOptions.map(option => (
                            <FormItem key={option} className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={option} />
                              </FormControl>
                              <FormLabel className="font-normal">{option}</FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full md:w-auto ml-auto" disabled={isLoading || authLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Child...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" /> Add Child
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

