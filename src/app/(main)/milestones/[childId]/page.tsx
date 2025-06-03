
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, setDoc, serverTimestamp, Timestamp, DocumentData, getDocs } from "firebase/firestore";
import { differenceInMonths, format, isValid } from "date-fns";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, CheckSquare, ChevronLeft, UserCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";


interface ChildData {
  id: string;
  name: string;
  birthdate: Timestamp; // Expecting a valid Timestamp after processing
  parentId: string;
}

interface MilestoneTemplate {
  id: string; // Document ID from milestoneTemplates collection
  ageRange: string;
  category: string;
  description: string;
  minAgeMonths: number;
  maxAgeMonths: number;
}

type MilestoneStatus = "Not Started" | "In Progress" | "Achieved";

interface MilestoneProgress {
  id: string; // Document ID of the progress entry in the subcollection
  milestoneId: string; // Corresponds to MilestoneTemplate.id
  status: MilestoneStatus;
  dateAchieved?: Timestamp | null;
  notes?: string;
}

interface CombinedMilestone extends MilestoneTemplate {
  currentStatus: MilestoneStatus;
  progressDocId?: string; 
  dateAchieved?: Timestamp | null;
}

function getAgeInMonths(birthDateTimestamp: Timestamp): number {
  if (!birthDateTimestamp || typeof birthDateTimestamp.toDate !== 'function') {
    console.error("Invalid birthDateTimestamp provided to getAgeInMonths");
    return 0;
  }
  const birthDate = birthDateTimestamp.toDate();
  const now = new Date();
  return differenceInMonths(now, birthDate);
}

const statusOptions: MilestoneStatus[] = ["Not Started", "In Progress", "Achieved"];


export default function MilestonesPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;
  const { toast } = useToast();

  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [childData, setChildData] = React.useState<ChildData | null>(null);
  const [ageInMonths, setAgeInMonths] = React.useState<number | null>(null);
  
  const [combinedMilestones, setCombinedMilestones] = React.useState<CombinedMilestone[]>([]);
  const [milestoneStats, setMilestoneStats] = React.useState({ achieved: 0, inProgress: 0, notStarted: 0, total: 0 });

  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) setAuthUser(user);
      else router.replace("/login");
    });
    return () => unsubscribeAuth();
  }, [router]);

  React.useEffect(() => {
    if (!authUser || !childId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const fetchChildAndMilestones = async () => {
      try {
        // 1. Fetch Child Data
        const childDocRef = doc(db, "children", childId);
        const childDocSnap = await getDoc(childDocRef);

        if (!childDocSnap.exists() || childDocSnap.data()?.parentId !== authUser.uid) {
          setError("Child not found or unauthorized.");
          setChildData(null);
          setIsLoading(false);
          return;
        }
        
        const rawData = childDocSnap.data();
        let processedBirthdate: Timestamp | undefined = undefined;

        if (rawData?.birthdate) {
          if (rawData.birthdate instanceof Timestamp) {
            processedBirthdate = rawData.birthdate;
          } else if (typeof rawData.birthdate === 'string') {
            const parsedDate = new Date(rawData.birthdate);
            if (isValid(parsedDate)) {
              processedBirthdate = Timestamp.fromDate(parsedDate);
            } else {
              console.warn(`Child ${childDocSnap.id} on MilestonesPage has invalid birthdate string: ${rawData.birthdate}`);
            }
          } else if (typeof rawData.birthdate === 'object' && rawData.birthdate.seconds !== undefined && rawData.birthdate.nanoseconds !== undefined) {
            try {
              processedBirthdate = new Timestamp(rawData.birthdate.seconds, rawData.birthdate.nanoseconds);
            } catch (e) {
               console.warn(`Child ${childDocSnap.id} on MilestonesPage has an object-like birthdate that could not be converted to Timestamp:`, rawData.birthdate, e);
            }
          } else {
            console.warn(`Child ${childDocSnap.id} on MilestonesPage has an unrecognized birthdate format:`, rawData.birthdate);
          }
        }
        
        // Cast to ChildData; birthdate could still be undefined if processing failed
        const fetchedChildData = { 
            id: childDocSnap.id, 
            name: rawData?.name || "Unnamed Child",
            birthdate: processedBirthdate as Timestamp, // Will be checked below
            parentId: rawData?.parentId || ""
        } as ChildData;
        
        setChildData(fetchedChildData);
        
        if (!fetchedChildData.birthdate || typeof fetchedChildData.birthdate.toDate !== 'function') {
          setError("Child birthdate is missing or invalid, cannot calculate age for milestones.");
          setIsLoading(false);
          return;
        }
        const currentAgeInMonths = getAgeInMonths(fetchedChildData.birthdate);
        setAgeInMonths(currentAgeInMonths);

        // 2. Fetch Milestone Templates from Firestore
        const templatesColRef = collection(db, "milestoneTemplates");
        const templatesQuery = query(
          templatesColRef,
          where("minAgeMonths", "<=", currentAgeInMonths),
          // where("maxAgeMonths", ">=", currentAgeInMonths) // Can enable for stricter age range
        );
        const templatesSnapshot = await getDocs(templatesQuery);
        const templates: MilestoneTemplate[] = templatesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as MilestoneTemplate));

        if (templates.length === 0) {
            console.log("No milestone templates found for age:", currentAgeInMonths);
        }

        // 3. Fetch Milestone Progress (Listen for real-time updates)
        const progressColRef = collection(db, "children", childId, "milestoneProgress");
        const unsubscribeProgress = onSnapshot(progressColRef, (snapshot) => {
          const progressData: MilestoneProgress[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as MilestoneProgress);
          
          const combined = templates.map(template => {
            const progress = progressData.find(p => p.milestoneId === template.id);
            return {
              ...template,
              currentStatus: progress?.status || "Not Started",
              progressDocId: progress?.id,
              dateAchieved: progress?.dateAchieved,
            };
          }).sort((a,b) => a.minAgeMonths - b.minAgeMonths || a.description.localeCompare(b.description));
          
          setCombinedMilestones(combined);

          let achieved = 0, inProgress = 0, notStarted = 0;
          combined.forEach(m => {
            if (m.currentStatus === "Achieved") achieved++;
            else if (m.currentStatus === "In Progress") inProgress++;
            else notStarted++;
          });
          setMilestoneStats({ achieved, inProgress, notStarted, total: combined.length });
          setIsLoading(false);
        }, (err) => {
          console.error("Error fetching milestone progress:", err);
          if (err.code === 'failed-precondition') {
             setError("Failed to load milestone progress. A Firestore index might be required. Please check the browser console for a link to create it.");
             toast({
                variant: "destructive",
                title: "Firestore Index Required",
                description: "Loading milestone progress failed. Check the browser console for a Firebase link to create the necessary index.",
                duration: 15000,
             });
          } else {
            setError("Failed to load milestone progress. " + err.message);
          }
          setIsLoading(false);
        });
        return unsubscribeProgress;

      } catch (e: any) {
        console.error("Error fetching data:", e);
         if (e.code === 'failed-precondition' && e.message.toLowerCase().includes("index")) {
            setError("Failed to load milestone templates. A Firestore index might be required. Please check the browser console for a link to create it.");
            toast({
                variant: "destructive",
                title: "Firestore Index Required for Templates",
                description: "Loading milestone templates failed. Check the browser console for a Firebase link to create the necessary index (likely on 'milestoneTemplates' for 'minAgeMonths' and/or 'maxAgeMonths').",
                duration: 15000,
            });
        } else {
            setError("Failed to load page data. " + e.message);
        }
        setIsLoading(false);
      }
    };
    
    let unsubscribe: (() => void) | undefined;
    fetchChildAndMilestones().then(unsub => unsubscribe = unsub);
    
    return () => {
      if (unsubscribe) unsubscribe();
    };

  }, [authUser, childId, toast]);

  const handleStatusChange = async (milestoneId: string, newStatus: MilestoneStatus) => {
    if (!authUser || !childId) return;

    const progressDocRef = doc(db, "children", childId, "milestoneProgress", milestoneId);

    try {
      const progressDataUpdate: Partial<Omit<MilestoneProgress, 'id'>> = { 
        milestoneId: milestoneId,
        status: newStatus,
      };
      if (newStatus === "Achieved") {
        progressDataUpdate.dateAchieved = Timestamp.now();
      } else {
        progressDataUpdate.dateAchieved = null; 
      }
      
      await setDoc(progressDocRef, progressDataUpdate, { merge: true });
      toast({ title: "Milestone Updated", description: `Status set to ${newStatus}.` });
    } catch (error: any) {
      console.error("Error updating milestone status:", error);
      toast({ variant: "destructive", title: "Update Failed", description: error.message });
    }
  };


  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading milestones...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
        <p className="text-muted-foreground mb-6 whitespace-pre-line">{error}</p>
        <Button onClick={() => router.push(`/child/${childId}`)}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Child Profile
        </Button>
      </div>
    );
  }
  
  if (!childData) {
     return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4 text-center">
        <UserCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Child Not Found</h2>
        <p className="text-muted-foreground mb-6">Could not load child information for milestones.</p>
         <Button onClick={() => router.push("/my-children")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to My Children
        </Button>
      </div>
    );
  }

  const { achieved, inProgress, notStarted, total } = milestoneStats;

  return (
    <div className="space-y-6">
       <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      <div className="flex items-center gap-3 mb-6">
        <CheckSquare className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-3xl font-bold">Milestone Progress</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">{childData.name}</CardTitle>
            <CardDescription>Age: {ageInMonths !== null ? `${Math.floor(ageInMonths / 12)} years, ${ageInMonths % 12} months` : 'Loading...'}</CardDescription>
          </CardHeader>
        </Card>

        <Card className="md:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Milestone Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Achieved</span>
                <span>{achieved} / {total}</span>
              </div>
              <Progress value={total > 0 ? (achieved / total) * 100 : 0} className="h-3 [&>div]:bg-green-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>In Progress</span>
                <span>{inProgress} / {total}</span>
              </div>
              <Progress value={total > 0 ? (inProgress / total) * 100 : 0} className="h-3 [&>div]:bg-yellow-500" />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Not Started</span>
                <span>{notStarted} / {total}</span>
              </div>
              <Progress value={total > 0 ? (notStarted / total) * 100 : 0} className="h-3 [&>div]:bg-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 mt-6">
        {combinedMilestones.length === 0 && !isLoading && (
            <Card className="shadow-lg">
                <CardContent className="pt-6 text-center text-muted-foreground">
                    No relevant milestones found for this child's age, or milestone templates are not yet set up in Firestore.
                </CardContent>
            </Card>
        )}
        {combinedMilestones.map((milestone) => (
          <Card key={milestone.id} className="shadow-md">
            <CardContent className="pt-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex-1">
                <p className="font-semibold text-foreground">{milestone.description}</p>
                <p className="text-sm text-muted-foreground">
                  {milestone.category} - Relevant for: {milestone.ageRange}
                </p>
                {milestone.currentStatus === "Achieved" && milestone.dateAchieved && (
                   <p className="text-xs text-green-600">Achieved on: {format(milestone.dateAchieved.toDate(), "PP")}</p>
                )}
              </div>
              <div className="w-full md:w-48 mt-2 md:mt-0">
                <Select
                  value={milestone.currentStatus}
                  onValueChange={(newStatus: MilestoneStatus) => handleStatusChange(milestone.id, newStatus)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(status => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

    
