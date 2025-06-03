
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, setDoc, Timestamp, DocumentData, getDocs, writeBatch } from "firebase/firestore";
import { differenceInMonths, format, isValid } from "date-fns";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertTriangle, CheckSquare, ChevronLeft, UserCircle2, CheckCircle2, XCircle, CircleDashed, RefreshCcwIcon, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


interface ChildData {
  id: string;
  name: string;
  birthdate: Timestamp; 
  parentId: string;
}

interface MilestoneTemplate {
  id: string; 
  ageRange: string;
  category: string;
  description: string;
  minAgeMonths: number;
  maxAgeMonths: number;
}

type MilestoneStatus = "Not Started" | "In Progress" | "Achieved";

interface MilestoneProgress {
  id: string; 
  milestoneId: string; 
  status: MilestoneStatus;
  dateAchieved?: Timestamp | null;
  notes?: string;
}

interface CombinedMilestone extends MilestoneTemplate {
  currentStatus: MilestoneStatus;
  progressDocId?: string; 
  dateAchieved?: Timestamp | null;
}

interface GroupedMilestone {
  ageRange: string;
  milestones: CombinedMilestone[];
  groupStats: {
    achieved: number;
    inProgress: number;
    notStarted: number;
    total: number;
  };
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

const statusIcons: Record<MilestoneStatus, React.ElementType> = {
  "Achieved": CheckCircle2,
  "In Progress": RefreshCcwIcon,
  "Not Started": CircleDashed,
};

const statusColors: Record<MilestoneStatus, string> = {
    "Achieved": "text-green-600",
    "In Progress": "text-yellow-600",
    "Not Started": "text-muted-foreground",
};


export default function MilestonesPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;
  const { toast } = useToast();

  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [childData, setChildData] = React.useState<ChildData | null>(null);
  const [ageInMonths, setAgeInMonths] = React.useState<number | null>(null);
  
  const [groupedMilestones, setGroupedMilestones] = React.useState<GroupedMilestone[]>([]);
  const [milestoneStats, setMilestoneStats] = React.useState({ achieved: 0, inProgress: 0, notStarted: 0, total: 0 });

  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdatingGroup, setIsUpdatingGroup] = React.useState<string | null>(null);
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
            }
          } else if (typeof rawData.birthdate === 'object' && rawData.birthdate.seconds !== undefined && rawData.birthdate.nanoseconds !== undefined) {
            try {
              processedBirthdate = new Timestamp(rawData.birthdate.seconds, rawData.birthdate.nanoseconds);
            } catch (e) {
               console.warn(`Child ${childDocSnap.id} on MilestonesPage (robust handling) has an object-like birthdate that could not be converted to Timestamp:`, rawData.birthdate, e);
            }
          }
        }
        
        if (!processedBirthdate) {
           setError("Child birthdate is missing or invalid, cannot calculate age for milestones.");
           setIsLoading(false);
           return;
        }

        const fetchedChildData = { 
            id: childDocSnap.id, 
            name: rawData?.name || "Unnamed Child",
            birthdate: processedBirthdate as Timestamp, 
            parentId: rawData?.parentId || ""
        } as ChildData;
        
        setChildData(fetchedChildData);
        
        const currentAgeInMonths = getAgeInMonths(fetchedChildData.birthdate);
        setAgeInMonths(currentAgeInMonths);

        const templatesColRef = collection(db, "milestoneTemplates");
        const templatesQuery = query(
          templatesColRef,
          where("minAgeMonths", "<=", currentAgeInMonths), // Show milestones up to current age
          orderBy("minAgeMonths", "asc"),
          orderBy("description", "asc")
        );
        const templatesSnapshot = await getDocs(templatesQuery);
        const templates: MilestoneTemplate[] = templatesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as MilestoneTemplate));

        if (templates.length === 0) {
            console.log("No milestone templates found relevant up to age:", currentAgeInMonths);
        }

        const progressColRef = collection(db, "children", childId, "milestoneProgress");
        const unsubscribeProgress = onSnapshot(progressColRef, (snapshot) => {
          const progressData: MilestoneProgress[] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as MilestoneProgress);
          
          const combined: CombinedMilestone[] = templates.map(template => {
            const progress = progressData.find(p => p.milestoneId === template.id);
            return {
              ...template,
              currentStatus: progress?.status || "Not Started",
              progressDocId: progress?.id, // This is template.id, so use it directly for doc ID
              dateAchieved: progress?.dateAchieved,
            };
          });
          
          const groupsMap: Record<string, { milestones: CombinedMilestone[], groupStats: GroupedMilestone['groupStats'] }> = {};
          combined.forEach(cm => {
            const ageGroupKey = cm.ageRange || `Age ${cm.minAgeMonths}-${cm.maxAgeMonths} months`;
            if (!groupsMap[ageGroupKey]) {
              groupsMap[ageGroupKey] = { milestones: [], groupStats: { achieved: 0, inProgress: 0, notStarted: 0, total: 0 } };
            }
            groupsMap[ageGroupKey].milestones.push(cm);
            groupsMap[ageGroupKey].groupStats.total++;
            if (cm.currentStatus === "Achieved") groupsMap[ageGroupKey].groupStats.achieved++;
            else if (cm.currentStatus === "In Progress") groupsMap[ageGroupKey].groupStats.inProgress++;
            else groupsMap[ageGroupKey].groupStats.notStarted++;
          });

          const groupedResult: GroupedMilestone[] = Object.entries(groupsMap).map(([ageRange, data]) => ({
            ageRange,
            milestones: data.milestones.sort((a,b) => a.description.localeCompare(b.description)),
            groupStats: data.groupStats
          })).sort((a,b) => {
             const getMinAgeFromRange = (rangeStr: string) => {
                const match = rangeStr.match(/^(\d+)-?(\d+)?\s*months?$/i) || rangeStr.match(/^Age\s*(\d+)-?(\d+)?\s*months?$/i) || rangeStr.match(/^Baby\s*at\s*(\d+)\s*months?$/i);
                return match && match[1] ? parseInt(match[1], 10) : 9999; // Default for sorting if unparseable
             };
             const minAgeA = a.milestones[0]?.minAgeMonths ?? getMinAgeFromRange(a.ageRange);
             const minAgeB = b.milestones[0]?.minAgeMonths ?? getMinAgeFromRange(b.ageRange);
             return minAgeA - minAgeB;
          });
          
          setGroupedMilestones(groupedResult);

          let totalAchieved = 0, totalInProgress = 0, totalNotStarted = 0;
          combined.forEach(m => {
            if (m.currentStatus === "Achieved") totalAchieved++;
            else if (m.currentStatus === "In Progress") totalInProgress++;
            else totalNotStarted++;
          });
          setMilestoneStats({ achieved: totalAchieved, inProgress: totalInProgress, notStarted: totalNotStarted, total: combined.length });
          setIsLoading(false);
        }, (err) => {
          console.error("Error fetching milestone progress:", err);
          if (err.code === 'failed-precondition') {
             setError("Failed to load milestone progress. A Firestore index might be required. Please check the browser console for a link to create it for the 'milestoneProgress' subcollection. The index usually needs to cover fields used in 'where' clauses or 'orderBy'.");
          } else {
            setError("Failed to load milestone progress. " + err.message);
          }
          setIsLoading(false);
        });
        return unsubscribeProgress;

      } catch (e: any) {
        console.error("Error fetching data:", e);
         if (e.code === 'failed-precondition' && e.message.toLowerCase().includes("index")) {
            setError("Failed to load milestone templates. A Firestore index might be required. Please check the browser console for a link to create it (likely on 'milestoneTemplates' for 'minAgeMonths' and 'description' (or 'maxAgeMonths' if you re-enable that filter), or similar based on the exact error message).");
        } else {
            setError("Failed to load page data. " + e.message);
        }
        setIsLoading(false);
      }
    };
    
    let unsubscribePromise = fetchChildAndMilestones();
    
    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };

  }, [authUser, childId, toast]);

  const handleStatusChange = async (milestoneTemplateId: string, newStatus: MilestoneStatus) => {
    if (!authUser || !childId) return;

    // The document ID in milestoneProgress is the milestoneTemplateId
    const progressDocRef = doc(db, "children", childId, "milestoneProgress", milestoneTemplateId);

    try {
      const progressDataUpdate: Partial<Omit<MilestoneProgress, 'id'>> = { 
        milestoneId: milestoneTemplateId, 
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

  const handleMarkGroupAchieved = async (group: GroupedMilestone) => {
    if (!authUser || !childId || !group || group.milestones.length === 0) return;

    setIsUpdatingGroup(group.ageRange);
    const batch = writeBatch(db);
    const now = Timestamp.now();
    let updatesMade = 0;

    group.milestones.forEach(milestone => {
      if (milestone.currentStatus !== "Achieved") {
        const progressDocRef = doc(db, "children", childId, "milestoneProgress", milestone.id);
        batch.set(progressDocRef, {
          milestoneId: milestone.id,
          status: "Achieved",
          dateAchieved: now,
        }, { merge: true });
        updatesMade++;
      }
    });

    if (updatesMade === 0) {
      toast({ title: "No Changes", description: `All milestones in "${group.ageRange}" were already achieved.` });
      setIsUpdatingGroup(null);
      return;
    }

    try {
      await batch.commit();
      toast({ title: "Group Updated", description: `All unachieved milestones in "${group.ageRange}" marked as Achieved.` });
    } catch (error: any) {
      console.error("Error updating group milestones:", error);
      toast({ variant: "destructive", title: "Group Update Failed", description: error.message });
    } finally {
      setIsUpdatingGroup(null);
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
  const defaultAccordionOpen = groupedMilestones.length > 0 ? [groupedMilestones[0].ageRange] : [];


  return (
    <TooltipProvider>
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
              <div className="flex justify-between text-sm mb-1 items-center">
                <span className="flex items-center"><CheckCircle2 className="h-4 w-4 mr-2 text-green-500"/>Achieved</span>
                <span>{achieved} / {total}</span>
              </div>
              <Progress value={total > 0 ? (achieved / total) * 100 : 0} className="h-3 [&>div]:bg-green-500" aria-label={`${achieved} of ${total} milestones achieved`} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1 items-center">
                 <span className="flex items-center"><RefreshCcwIcon className="h-4 w-4 mr-2 text-yellow-500"/>In Progress</span>
                <span>{inProgress} / {total}</span>
              </div>
              <Progress value={total > 0 ? (inProgress / total) * 100 : 0} className="h-3 [&>div]:bg-yellow-500" aria-label={`${inProgress} of ${total} milestones in progress`} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1 items-center">
                 <span className="flex items-center"><CircleDashed className="h-4 w-4 mr-2 text-gray-400"/>Not Started</span>
                <span>{notStarted} / {total}</span>
              </div>
              <Progress value={total > 0 ? (notStarted / total) * 100 : 0} className="h-3 [&>div]:bg-gray-400" aria-label={`${notStarted} of ${total} milestones not started`} />
            </div>
             {/* Placeholder for "View Milestone Journey by Age" button */}
            <div className="pt-4 text-right">
                <Button variant="outline" size="sm" disabled>
                    <TrendingUp className="mr-2 h-4 w-4" /> View Milestone Journey (Coming Soon)
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        {isLoading && <div className="text-center p-6"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /> <p className="mt-2 text-muted-foreground">Loading milestones...</p></div>}
        
        {!isLoading && !error && groupedMilestones.length === 0 && (
            <Card className="shadow-lg">
                <CardContent className="pt-6 text-center text-muted-foreground">
                    No relevant milestones found for this child's age based on current templates, or milestone templates are not yet set up in Firestore.
                </CardContent>
            </Card>
        )}

        {!isLoading && !error && groupedMilestones.length > 0 && (
          <Accordion type="multiple" className="w-full space-y-3" defaultValue={defaultAccordionOpen}>
            {groupedMilestones.map((group) => {
              const allInGroupAchieved = group.groupStats.achieved === group.groupStats.total && group.groupStats.total > 0;
              const groupStatusKey: MilestoneStatus = allInGroupAchieved ? "Achieved" : group.groupStats.inProgress > 0 || group.groupStats.achieved > 0 ? "In Progress" : "Not Started";
              const Icon = statusIcons[groupStatusKey];
              const iconColor = statusColors[groupStatusKey];
              const isCurrentlyUpdatingThisGroup = isUpdatingGroup === group.ageRange;
              
              return (
                <AccordionItem value={group.ageRange} key={group.ageRange} className="border rounded-lg shadow-sm bg-card overflow-hidden">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline text-left">
                    <div className="flex justify-between w-full items-center">
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation(); // Prevent accordion toggle
                                if (!allInGroupAchieved && !isCurrentlyUpdatingThisGroup) {
                                  handleMarkGroupAchieved(group);
                                }
                              }}
                              disabled={allInGroupAchieved || isCurrentlyUpdatingThisGroup}
                              className={`p-0.5 rounded-full ${allInGroupAchieved ? 'cursor-default' : 'hover:bg-accent'}`}
                              aria-label={allInGroupAchieved ? "All achieved in this group" : "Mark all in this group as achieved"}
                            >
                              {isCurrentlyUpdatingThisGroup ? <Loader2 className={`h-5 w-5 animate-spin ${iconColor}`} /> : <Icon className={`h-5 w-5 ${iconColor}`} />}
                            </button>
                          </TooltipTrigger>
                          {!allInGroupAchieved && (
                            <TooltipContent>
                              <p>Mark all in "{group.ageRange}" as Achieved</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                        <span className="font-semibold text-lg text-primary">
                          {group.ageRange}
                        </span>
                      </div>
                      <Badge variant={allInGroupAchieved ? "default" : "secondary"}>
                        {group.groupStats.achieved} / {group.groupStats.total} Achieved
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-1 pt-0">
                    <div className="divide-y">
                      {group.milestones.map((milestone) => {
                        const MilestoneStatusIcon = statusIcons[milestone.currentStatus];
                        const milestoneIconColor = statusColors[milestone.currentStatus];
                        return (
                          <div key={milestone.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-3">
                            <div className="flex-1">
                              <p className="font-medium text-foreground flex items-start">
                                <MilestoneStatusIcon className={`h-4 w-4 mr-2 mt-0.5 shrink-0 ${milestoneIconColor}`} />
                                <span>{milestone.description}</span>
                              </p>
                              <p className="text-xs text-muted-foreground ml-6">{milestone.category}</p>
                              {milestone.currentStatus === "Achieved" && milestone.dateAchieved && (
                                <p className="text-xs ml-6 ${statusColors['Achieved']}">Achieved on: {format(milestone.dateAchieved.toDate(), "PP")}</p>
                              )}
                            </div>
                            <div className="w-full sm:w-44 mt-2 sm:mt-0 self-stretch sm:self-center">
                              <Select
                                value={milestone.currentStatus}
                                onValueChange={(newStatus: MilestoneStatus) => handleStatusChange(milestone.id, newStatus as MilestoneStatus)}
                                disabled={isCurrentlyUpdatingThisGroup}
                              >
                                <SelectTrigger className="h-9">
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
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
    </TooltipProvider>
  );
}
