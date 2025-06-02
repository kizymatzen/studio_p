import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-3xl font-bold">Chat</h1>
      </div>
      <Card className="h-[calc(100vh-200px)] md:h-[calc(100vh-160px)] flex flex-col">
        <CardHeader>
          <CardTitle>Community Chat</CardTitle>
          <CardDescription>Connect with other parents. This feature is under construction.</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/30 rounded-md">
          {/* Placeholder chat messages */}
          <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground p-3 rounded-lg max-w-xs shadow">
              Hello everyone! Any tips for teething babies?
            </div>
          </div>
          <div className="flex justify-end">
            <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-xs shadow">
              Hi! We found cold teething rings worked wonders.
            </div>
          </div>
           <div className="flex justify-start">
            <div className="bg-secondary text-secondary-foreground p-3 rounded-lg max-w-xs shadow">
              Thanks, I'll try that!
            </div>
          </div>
        </CardContent>
        <div className="border-t p-4">
          <form className="flex gap-2">
            <Input type="text" placeholder="Type your message..." className="flex-1" disabled />
            <Button type="submit" variant="default" disabled>
              <Send className="h-5 w-5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
