
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, PlusCircle, Loader2, AlertTriangle, Smile } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, type Timestamp, orderBy } from "firebase/firestore";
import { onAuthStateChanged, type User } from "firebase/auth";
import Link from "next/link";

interface ChildProfile {
  id: string;
  name: string;
  nickname?: string;
  age: number;
  birthdate: string; // Assuming "yyyy-MM-dd"
  profile?: {
    challenges?: string[];
    personality?: string[];
    preferredStyle?: string;
    favoriteTheme?: string[];
    routine?: string;
    energy?: string;
  };
  createdAt: Timestamp;
}

export default function MyChildrenPage() {
  const router = useRouter();
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [children, setChildren] = React.useState<ChildProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("/login"); // Redirect if not logged in
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  React.useEffect(() => {
    if (!authUser) {
      setIsLoading(false); // Stop loading if no authenticated user
      return;
    }

    setIsLoading(true);
    setError(null);

    const childrenRef = collection(db, "children");
    const q = query(childrenRef, where("parentId", "==", authUser.uid), orderBy("createdAt", "desc"));

    const unsubscribeFirestore = onSnapshot(q, 
      (snapshot) => {
        const fetchedChildren: ChildProfile[] = [];
        snapshot.forEach((doc) => {
          fetchedChildren.push({ id: doc.id, ...doc.data() } as ChildProfile);
        });
        setChildren(fetchedChildren);
        setIsLoading(false);
      },
      (err) => {
        console.error("Error fetching children:", err);
        setError("Failed to load children's profiles. Please try again.");
        setIsLoading(false);
      }
    );

    return () => unsubscribeFirestore();
  }, [authUser]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="font-headline text-3xl font-bold">My Children</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/add-child">
            <PlusCircle className="mr-2 h-4 w-4" /> Add Child
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Manage Your Children's Profiles</CardTitle>
          <CardDescription>
            Here are the profiles you've created for your children.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Loading children's profiles...</p>
            </div>
          )}

          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-10 text-destructive">
              <AlertTriangle className="h-12 w-12" />
              <p className="mt-4 font-semibold">Error Loading Profiles</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!isLoading && !error && children.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Smile className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold text-foreground">No Children Added Yet</p>
              <p className="text-muted-foreground mb-6">
                It looks like you haven't added any child profiles.
              </p>
              <Button asChild>
                <Link href="/add-child">
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Your First Child
                </Link>
              </Button>
            </div>
          )}

          {!isLoading && !error && children.length > 0 && (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {children.map((child) => (
                <Card key={child.id} className="shadow-md hover:shadow-lg transition-shadow duration-200">
                  <CardHeader>
                    <CardTitle className="text-xl text-primary">{child.name}</CardTitle>
                    {child.nickname && (
                      <CardDescription>Also known as: {child.nickname}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground">
                      <strong>Age:</strong> {child.age} {child.age === 1 ? "year" : "years"} old
                    </p>
                    {/* You can add more details here later, e.g., from child.profile */}
                    <Button variant="link" className="p-0 h-auto mt-2 text-sm" asChild>
                        <Link href={`/child/${child.id}`}>View Details</Link> 
                        {/* TODO: Implement child detail page */}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
