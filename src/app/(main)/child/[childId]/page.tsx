
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, UserCircle, Edit, Trash2, CalendarDays, Smile, Star, Zap, ShieldCheck, Brain, Palette, Clock, ChevronLeft, FilePlus2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface ChildProfile {
  id: string;
  name: string;
  nickname?: string;
  age: number;
  birthdate: string; // yyyy-MM-dd
  parentId: string;
  profile: {
    challenges?: string[];
    personality?: string[];
    preferredStyle?: string;
    favoriteTheme?: string[];
    routine?: string;
    energy?: string;
  };
  createdAt: Timestamp;
}

interface ProfileDetailProps {
  label: string;
  value?: string | string[];
  icon?: React.ElementType;
  isList?: boolean;
}

const ProfileDetailItem: React.FC<ProfileDetailProps> = ({ label, value, icon: Icon, isList }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  return (
    <div className="mb-3">
      <h4 className="text-sm font-semibold text-muted-foreground flex items-center">
        {Icon && <Icon className="h-4 w-4 mr-2 text-primary" />}
        {label}
      </h4>
      {isList && Array.isArray(value) ? (
        <div className="flex flex-wrap gap-2 mt-1">
          {value.map((item) => (
            <Badge key={item} variant="secondary">{item}</Badge>
          ))}
        </div>
      ) : (
        <p className="text-foreground">{typeof value === 'string' ? value : value?.join(', ')}</p>
      )}
    </div>
  );
};


export default function ChildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const childId = params.childId as string;

  const [child, setChild] = React.useState<ChildProfile | null>(null);
  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        router.replace("/login");
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  React.useEffect(() => {
    if (!authUser || !childId) {
      if (!childId) setError("Child ID is missing.");
      // Don't set loading to false here if authUser is null yet, wait for auth state
      if (authUser && !childId) setIsLoading(false);
      return;
    }

    const fetchChildData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const childDocRef = doc(db, "children", childId);
        const childDocSnap = await getDoc(childDocRef);

        if (childDocSnap.exists()) {
          const childData = { id: childDocSnap.id, ...childDocSnap.data() } as ChildProfile;
          // Security check: ensure the logged-in user is the parent
          if (childData.parentId !== authUser.uid) {
            setError("You do not have permission to view this profile.");
            setChild(null);
          } else {
            setChild(childData);
          }
        } else {
          setError("Child profile not found.");
          setChild(null);
        }
      } catch (e: any) {
        console.error("Error fetching child data:", e);
        setError("Failed to load child's profile. " + e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChildData();
  }, [authUser, childId, router]);

  if (isLoading || !authUser) { // Keep loading if authUser is not yet available or still loading data
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading child's profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error Loading Profile</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push("/my-children")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to My Children
        </Button>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4 text-center">
        <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Child Profile Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The requested child profile could not be located.
        </p>
        <Button onClick={() => router.push("/my-children")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to My Children
        </Button>
      </div>
    );
  }
  
  const birthDateObj = new Date(child.birthdate + 'T00:00:00'); // Ensure correct parsing by specifying time part

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button variant="default" size="sm" asChild>
          <Link href={`/child/${child.id}/log-behavior`}>
            <FilePlus2 className="mr-2 h-4 w-4" />
            Log Behavior
          </Link>
        </Button>
      </div>
      

      <Card className="shadow-lg">
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle className="font-headline text-3xl text-primary">{child.name}</CardTitle>
            {child.nickname && (
              <CardDescription className="text-lg">Also known as: {child.nickname}</CardDescription>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" disabled> {/* TODO: Implement Edit */}
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit Profile</span>
            </Button>
            <Button variant="outline" size="icon" disabled className="text-destructive hover:text-destructive hover:border-destructive/80"> {/* TODO: Implement Delete */}
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete Profile</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-x-8 gap-y-6">
          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3 border-b pb-2">Basic Information</h3>
            <ProfileDetailItem label="Full Name" value={child.name} icon={UserCircle} />
            {child.nickname && <ProfileDetailItem label="Nickname" value={child.nickname} icon={Smile} />}
             <p className="text-sm text-foreground mb-3">
                <strong>Birthdate:</strong> {new Date(child.birthdate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-sm text-foreground mb-3">
                <strong>Age:</strong> {child.age} {child.age === 1 ? "year" : "years"} old
            </p>
          </section>
          
          <section>
            <h3 className="text-xl font-semibold text-foreground mb-3 border-b pb-2">Profile Insights</h3>
            <ProfileDetailItem label="Challenges" value={child.profile.challenges} icon={ShieldCheck} isList />
            <ProfileDetailItem label="Personality Traits" value={child.profile.personality} icon={Star} isList />
            <ProfileDetailItem label="Preferred Learning Style" value={child.profile.preferredStyle} icon={Brain} />
            <ProfileDetailItem label="Favorite Themes" value={child.profile.favoriteTheme} icon={Palette} isList />
            <ProfileDetailItem label="Routine Type" value={child.profile.routine} icon={Clock} />
            <ProfileDetailItem label="Energy Level" value={child.profile.energy} icon={Zap} />
          </section>
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">Profile created on: {child.createdAt ? new Date(child.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}</p>
        </CardFooter>
      </Card>
    </div>
  );
}
