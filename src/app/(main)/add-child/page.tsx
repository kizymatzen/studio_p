
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { differenceInYears, isValid, getDaysInMonth as getDaysInMonthFns, differenceInMonths } from "date-fns";
import { Timestamp } from "firebase/firestore";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus, Baby } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";

const profileSchema = z.object({
  challenges: z.array(z.string()).optional().default([]),
  personality: z.array(z.string()).optional().default([]),
  preferredStyle: z.string().optional().default(""),
  favoriteTheme: z.array(z.string()).optional().default([]),
  routine: z.string().optional().default(""),
  energy: z.string().optional().default(""),
});

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => (currentYear - i).toString());
const months = Array.from({ length: 12 }, (_, i) => ({
  value: (i + 1).toString(),
  label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }),
}));

const addChildSchema = z.object({
  name: z.string().min(1, "Child's name is required."),
  nickname: z.string().optional(),
  birthYear: z.string().min(1, "Year is required."),
  birthMonth: z.string().min(1, "Month is required."),
  birthDay: z.string().min(1, "Day is required."),
  profile: profileSchema,
}).refine(data => {
  const year = parseInt(data.birthYear, 10);
  const month = parseInt(data.birthMonth, 10);
  const day = parseInt(data.birthDay, 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
  const date = new Date(year, month - 1, day);
  return isValid(date) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}, {
  message: "Invalid birthdate. Please check day, month, and year.",
  path: ["birthDay"],
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
  const [calculatedAge, setCalculatedAge] = React.useState<number | null>(null);
  const [daysInSelectedMonth, setDaysInSelectedMonth] = React.useState<string[]>(
    Array.from({ length: 31 }, (_, i) => (i + 1).toString())
  );

  const form = useForm<AddChildFormValues>({
    resolver: zodResolver(addChildSchema),
    defaultValues: {
      name: "",
      nickname: "",
      birthYear: "",
      birthMonth: "",
      birthDay: "",
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

  const watchedYear = form.watch("birthYear");
  const watchedMonth = form.watch("birthMonth");
  const watchedDay = form.watch("birthDay");

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

  React.useEffect(() => {
    if (watchedYear && watchedMonth) {
      const yearNum = parseInt(watchedYear, 10);
      const monthNum = parseInt(watchedMonth, 10);
      if (!isNaN(yearNum) && !isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        const numDays = getDaysInMonthFns(new Date(yearNum, monthNum - 1));
        setDaysInSelectedMonth(Array.from({ length: numDays }, (_, i) => (i + 1).toString()));
        const currentDay = parseInt(form.getValues("birthDay"), 10);
        if (currentDay > numDays) {
          form.setValue("birthDay", "");
        }
      }
    }
  }, [watchedYear, watchedMonth, form]);

  React.useEffect(() => {
    if (watchedYear && watchedMonth && watchedDay) {
      const yearNum = parseInt(watchedYear, 10);
      const monthNum = parseInt(watchedMonth, 10);
      const dayNum = parseInt(watchedDay, 10);

      if (!isNaN(yearNum) && !isNaN(monthNum) && !isNaN(dayNum)) {
        const birthDate = new Date(yearNum, monthNum - 1, dayNum);
        if (isValid(birthDate) && birthDate.getFullYear() === yearNum && birthDate.getMonth() === monthNum - 1 && birthDate.getDate() === dayNum) {
          setCalculatedAge(differenceInYears(new Date(), birthDate));
        } else {
          setCalculatedAge(null);
        }
      } else {
        setCalculatedAge(null);
      }
    } else {
      setCalculatedAge(null);
    }
  }, [watchedYear, watchedMonth, watchedDay]);

  const onSubmit = async (data: AddChildFormValues) => {
    if (!authUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "User not found. Please log in again." });
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    const year = parseInt(data.birthYear, 10);
    const month = parseInt(data.birthMonth, 10);
    const day = parseInt(data.birthDay, 10);
    
    const birthDateObject = new Date(year, month - 1, day);

    if (!isValid(birthDateObject) || birthDateObject.getFullYear() !== year || birthDateObject.getMonth() !== month - 1 || birthDateObject.getDate() !== day) {
       toast({ variant: "destructive", title: "Invalid Date", description: "The selected date is not valid." });
       setIsLoading(false);
       return;
    }
    
    const age = differenceInYears(new Date(), birthDateObject);
    const ageInMonths = differenceInMonths(new Date(), birthDateObject);

    try {
      const childData = {
        name: data.name,
        nickname: data.nickname || "",
        birthdate: Timestamp.fromDate(birthDateObject), // Store as Firestore Timestamp
        age,
        ageInMonths, // Store age in months for milestone logic
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
    } finally {
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
                
                <FormLabel>Birthdate</FormLabel>
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="birthMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Month</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {months.map((m) => (
                              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthDay"
                    render={({ field }) => (
                      <FormItem>
                         <FormLabel className="text-xs">Day</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {daysInSelectedMonth.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="birthYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Year</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {years.map((y) => (
                              <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {calculatedAge !== null && (
                  <p className="text-sm text-muted-foreground pt-2">
                    🎉 Your child is {calculatedAge} {calculatedAge === 1 ? "year" : "years"} old!
                  </p>
                )}
                <FormMessage>{form.formState.errors.birthDay?.message}</FormMessage>


              </section>

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

    