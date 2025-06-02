"use client";

import { useState, useTransition } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { suggestArticles, SuggestArticlesInput, SuggestArticlesOutput } from '@/ai/flows/suggest-articles';

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Lightbulb } from "lucide-react";

const formSchema = z.object({
  userGoals: z.string().min(10, "Please describe your goals in more detail (min 10 characters)."),
  articleTopics: z.string().min(5, "Please provide some article topics (min 5 characters). Example: potty training, sleep schedules, healthy eating")
});

type FormData = z.infer<typeof formSchema>;

const predefinedArticleTopics = [
  "Potty Training Techniques",
  "Improving Child Sleep Schedules",
  "Introducing Solid Foods to Babies",
  "Managing Toddler Tantrums",
  "Early Childhood Education at Home",
  "Benefits of Play for Development",
  "Screen Time Guidelines for Kids",
  "Building Strong Parent-Child Bonds",
  "Nutritious Meal Ideas for Picky Eaters",
  "Child Safety Indoors and Outdoors"
];


export function ArticleSuggestionForm() {
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<SuggestArticlesOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userGoals: "",
      articleTopics: predefinedArticleTopics.join(', '),
    },
  });

  async function onSubmit(values: FormData) {
    setError(null);
    setSuggestions(null);
    startTransition(async () => {
      try {
        const input: SuggestArticlesInput = {
          userGoals: values.userGoals,
          articleTopics: values.articleTopics,
        };
        const result = await suggestArticles(input);
        setSuggestions(result);
      } catch (e) {
        console.error("Error suggesting articles:", e);
        setError("Failed to get article suggestions. Please try again.");
      }
    });
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-accent" />
          Find Relevant Articles
        </CardTitle>
        <CardDescription>
          Tell us your goals, and we'll suggest articles from our library to help you.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="userGoals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What are your current parenting goals or challenges?</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'I want to help my toddler learn to share toys with siblings.' or 'Struggling with picky eating habits.'"
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
              name="articleTopics"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Available Article Topics (comma-separated)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Potty Training, Sleep Schedules, Healthy Eating"
                      className="resize-none"
                      rows={3}
                      {...field}
                      disabled // Keep this field disabled as it's pre-filled
                    />
                  </FormControl>
                   <p className="text-xs text-muted-foreground pt-1">
                    These are the topics our AI will search within. Currently pre-filled.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting Suggestions...
                </>
              ) : (
                "Suggest Articles"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>

      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {suggestions && (
        <CardContent className="mt-6">
          <h3 className="font-headline text-xl font-semibold mb-3">Suggested Articles For You:</h3>
          {suggestions.suggestedArticles.length > 0 ? (
            <ul className="list-disc space-y-2 pl-5">
              {suggestions.suggestedArticles.map((article, index) => (
                <li key={index} className="text-foreground">
                  {article}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              No specific articles found matching your goals from the available topics. Try rephrasing your goals.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
