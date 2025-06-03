
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, Timestamp, collection, query, where, orderBy, onSnapshot, DocumentData } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, UserCircle, Edit, Trash2, Smile, Star, Zap, ShieldCheck, Brain, Palette, Clock, ChevronLeft, FilePlus2, ListChecks, FileText, LineChart, CheckSquare } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { format, isValid } from "date-fns";

interface ChildProfile {
  id: string;
  name: string;
  nickname?: string;
  age: number;
  ageInMonths?: number;
  birthdate?: Timestamp; // Changed to optional Timestamp
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

interface BehaviorLog extends DocumentData {
  id: string;
  childId: string;
  parentId: string;
  type: string;
  mood?: string;
  notes?: string;
  location?: string;
  timestamp: Timestamp;
}

interface ProfileDetailProps {
  label: string;
  value?: string | string[] | Date;
  icon?: React.ElementType;
  isList?: boolean;
  isDate?: boolean;
}

const ProfileDetailItem: React.FC<ProfileDetailProps> = ({ label, value, icon: Icon, isList, isDate }) => {
  if (!value || (Array.isArray(value) && value.length === 0)) {
    return null;
  }

  let displayValue: React.ReactNode;
  if (isDate && value instanceof Date) {
    displayValue = format(value, "PPP");
  } else if (isDate && value instanceof Timestamp) { 
    displayValue = format(value.toDate(), "PPP");
  } else if (isList && Array.isArray(value)) {
    displayValue = (
      <div className="flex flex-wrap gap-2 mt-1">
        {value.map((item) => (
          <Badge key={item} variant="secondary">{item}</Badge>
        ))}
      </div>
    );
  } else {
    displayValue = typeof value === 'string' ? value : value?.toString();
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
         <p className="text-foreground">{displayValue}</p>
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

  const [behaviors, setBehaviors] = React.useState<BehaviorLog[]>([]);
  const [behaviorsLoading, setBehaviorsLoading] = React.useState(true);
  const [behaviorsError, setBehaviorsError] = React.useState<string | null>(null);


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
          const data = childDocSnap.data();
          
          let processedBirthdate: Timestamp | undefined = undefined;
          if (data.birthdate) {
            if (data.birthdate instanceof Timestamp) {
              processedBirthdate = data.birthdate;
            } else if (typeof data.birthdate === 'string') {
              const parsedDate = new Date(data.birthdate);
              if (isValid(parsedDate)) {
                processedBirthdate = Timestamp.fromDate(parsedDate);
              } else {
                console.warn(`Child ${childDocSnap.id} has invalid birthdate string: ${data.birthdate}`);
              }
            } else if (typeof data.birthdate === 'object' && data.birthdate.seconds !== undefined && data.birthdate.nanoseconds !== undefined) {
              // Handle plain object that might have been a Timestamp (e.g. after JSON stringify/parse)
              try {
                processedBirthdate = new Timestamp(data.birthdate.seconds, data.birthdate.nanoseconds);
              } catch (e) {
                 console.warn(`Child ${childDocSnap.id} has an object-like birthdate that could not be converted to Timestamp:`, data.birthdate, e);
              }
            } else {
              console.warn(`Child ${childDocSnap.id} has an unrecognized birthdate format:`, data.birthdate);
            }
          }

          const typedChildData: ChildProfile = {
            id: childDocSnap.id,
            name: data.name || "Unnamed Child",
            nickname: data.nickname,
            age: data.age,
            ageInMonths: data.ageInMonths,
            birthdate: processedBirthdate,
            parentId: data.parentId,
            profile: data.profile || {
              challenges: [],
              personality: [],
              favoriteTheme: [],
            },
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
          };
          
          if (typedChildData.parentId !== authUser.uid) {
            setError("You do not have permission to view this profile.");
            setChild(null);
          } else {
            setChild(typedChildData);
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
  }, [authUser, childId]);

  React.useEffect(() => {
    if (!authUser || !childId) {
      setBehaviorsLoading(false);
      return;
    }

    setBehaviorsLoading(true);
    setBehaviorsError(null);

    const behaviorsRef = collection(db, "behaviors");
    const q = query(
      behaviorsRef,
      where("childId", "==", childId),
      where("parentId", "==", authUser.uid),
      orderBy("timestamp", "desc")
    );

    const unsubscribeBehaviors = onSnapshot(q,
      (snapshot) => {
        const fetchedBehaviors: BehaviorLog[] = [];
        snapshot.forEach((docSnap) => {
          fetchedBehaviors.push({ id: docSnap.id, ...docSnap.data() } as BehaviorLog);
        });
        setBehaviors(fetchedBehaviors);
        setBehaviorsLoading(false);
      },
      (err) => {
        console.error("Error fetching behaviors:", err);
        setBehaviorsError("Failed to load behavior log. Please try again. " + err.message);
        setBehaviorsLoading(false);
      }
    );

    return () => unsubscribeBehaviors();
  }, [authUser, childId]);


  if (isLoading || !authUser) {
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
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2 flex-wrap">
          <Button variant="default" size="sm" asChild>
            <Link href={`/child/${child.id}/log-behavior`}>
              <FilePlus2 className="mr-2 h-4 w-4" />
              Log Behavior
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/child/${child.id}/progress`}>
              <LineChart className="mr-2 h-4 w-4" />
              View Progress
            </Link>
          </Button>
           <Button variant="outline" size="sm" asChild>
            <Link href={`/milestones/${child.id}`}>
              <CheckSquare className="mr-2 h-4 w-4" />
              View Milestones
            </Link>
          </Button>
        </div>
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
            {child.birthdate && (
                 <ProfileDetailItem label="Birthdate" value={child.birthdate.toDate()} icon={Clock} isDate />
            )}
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
          <p className="text-xs text-muted-foreground">Profile created on: {child.createdAt ? format(child.createdAt.toDate(), "PPP") : 'N/A'}</p>
        </CardFooter>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-primary" />
            Behavior Log
          </CardTitle>
          <CardDescription>Recent behaviors logged for {child.name}.</CardDescription>
        </CardHeader>
        <CardContent>
          {behaviorsLoading && (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-3 text-muted-foreground">Loading behavior log...</p>
            </div>
          )}
          {!behaviorsLoading && behaviorsError && (
            <div className="flex flex-col items-center justify-center py-6 text-destructive">
              <AlertTriangle className="h-8 w-8" />
              <p className="mt-3 font-semibold">Error Loading Behaviors</p>
              <p className="text-sm text-center">{behaviorsError}</p>
            </div>
          )}
          {!behaviorsLoading && !behaviorsError && behaviors.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-lg font-semibold text-foreground">No Behaviors Logged Yet</p>
              <p className="text-muted-foreground">
                Start by logging a behavior for {child.name}.
              </p>
              <Button variant="outline" size="sm" asChild className="mt-4">
                <Link href={`/child/${child.id}/log-behavior`}>
                  <FilePlus2 className="mr-2 h-4 w-4" />
                  Log First Behavior
                </Link>
              </Button>
            </div>
          )}
          {!behaviorsLoading && !behaviorsError && behaviors.length > 0 && (
            <ul className="space-y-4">
              {behaviors.map((log) => (
                <li key={log.id} className="p-4 border rounded-md shadow-sm bg-card/50">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={log.type.toLowerCase().includes("happy") || log.type.toLowerCase().includes("playful") ? "default" : "secondary"}>
                      {log.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {log.timestamp ? format(log.timestamp.toDate(), "MMM d, yyyy 'at' h:mm a") : "No date"}
                    </span>
                  </div>
                  {log.mood && <p className="text-sm text-foreground"><strong>Mood:</strong> {log.mood}</p>}
                  {log.notes && <p className="text-sm text-foreground mt-1 whitespace-pre-wrap"><strong>Notes:</strong> {log.notes}</p>}
                  {log.location && <p className="text-xs text-muted-foreground mt-2"><strong>Location:</strong> {log.location}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
