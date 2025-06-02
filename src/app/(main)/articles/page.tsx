import { BookOpen } from "lucide-react";
import { ArticleSuggestionForm } from "@/components/articles/ArticleSuggestionForm";

export default function ArticlesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-3xl font-bold">Articles</h1>
      </div>
      <ArticleSuggestionForm />
    </div>
  );
}
