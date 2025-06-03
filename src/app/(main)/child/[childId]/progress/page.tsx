
"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import { format as formatDateFns, parseISO } from "date-fns";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc, collection, query, where, orderBy, onSnapshot, Timestamp, DocumentData } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ChartConfig, ChartContainer } from "@/components/ui/chart"; // ChartTooltipContent removed as we define a custom one
import { Loader2, AlertTriangle, ChevronLeft, BarChart2, Target, BookOpen, Award, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ChildData {
  id: string;
  name: string;
  parentId: string;
}

interface BehaviorLog {
  id: string;
  type: string;
  timestamp: Timestamp;
  // other fields if needed for chart
}

const behaviorTypesForChart = [
  "Tantrum", "Happy Moment", "Mealtime Behavior", "Sleep Related", 
  "Social Interaction", "Learning Activity", "Aggression", 
  "Anxiety/Fear", "Self-Regulation", "Refused Food", "Overstimulated", "Playful", "Focused", "Irritable", "Other"
] as const;


const chartColors: Record<string, string> = {
  "Tantrum": "hsl(var(--chart-1))",
  "Happy Moment": "hsl(var(--chart-2))",
  "Mealtime Behavior": "hsl(var(--chart-3))",
  "Sleep Related": "hsl(var(--chart-4))",
  "Social Interaction": "hsl(var(--chart-5))",
  "Learning Activity": "hsl(var(--chart-1))", // Re-using colors for simplicity
  "Aggression": "hsl(var(--chart-2))",
  "Anxiety/Fear": "hsl(var(--chart-3))",
  "Self-Regulation": "hsl(var(--chart-4))",
  "Refused Food": "hsl(var(--chart-5))",
  "Overstimulated": "hsl(var(--chart-1))",
  "Playful": "hsl(var(--chart-2))",
  "Focused": "hsl(var(--chart-3))",
  "Irritable": "hsl(var(--chart-4))",
  "Other": "hsl(var(--chart-5))",
};

const initialChartConfig: ChartConfig = behaviorTypesForChart.reduce((acc, type) => {
  acc[type] = {
    label: type,
    color: chartColors[type] || "hsl(var(--muted))",
  };
  return acc;
}, {} as ChartConfig);


// Custom Tooltip Content Component
const CustomBehaviorChartTooltipContent = ({ active, payload, label, config }: { active?: boolean; payload?: any[]; label?: string | number; config: ChartConfig }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const filteredPayload = payload.filter((pItem: any) => pItem.value !== undefined && pItem.value > 0);

  if (filteredPayload.length === 0) {
    return null;
  }

  return (
    <div className="grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      {label && <div className={cn("font-medium")}>{label}</div>}
      <div className="grid gap-1.5">
        {filteredPayload.map((item: any, index: number) => {
          const itemConfig = config && item.name && config[item.name] ? config[item.name] : { label: item.name };
          const indicatorColor = item.color || item.payload?.fill || (itemConfig?.color as string);

          return (
            <div
              key={`tooltip-item-${index}-${item.name}`}
              className={cn(
                "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                  "h-2.5 w-2.5" // indicator === "dot"
                )}
                style={
                  {
                    "--color-bg": indicatorColor,
                    "--color-border": indicatorColor,
                  } as React.CSSProperties
                }
              />
              <div
                className={cn(
                  "flex flex-1 justify-between leading-none",
                  "items-center" 
                )}
              >
                <span className="text-muted-foreground">
                  {itemConfig?.label || item.name}
                </span>
                {item.value !== undefined && (
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {item.value.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


export default function ChildProgressPage() {
  const router = useRouter();
  const params = useParams();
  const childId = params.childId as string;
  const { toast } = useToast();

  const [authUser, setAuthUser] = React.useState<User | null>(null);
  const [childData, setChildData] = React.useState<ChildData | null>(null);
  const [pageLoading, setPageLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [behaviors, setBehaviors] = React.useState<BehaviorLog[]>([]);
  const [behaviorsLoading, setBehaviorsLoading] = React.useState(true);
  const [behaviorsError, setBehaviorsError] = React.useState<string | null>(null);
  const [chartData, setChartData] = React.useState<any[]>([]);
  // chartConfig state is not strictly needed if initialChartConfig is constant
  // but if it were dynamic (e.g. user toggles visibility of series), it would be useful
  const [chartConfig] = React.useState<ChartConfig>(initialChartConfig);


  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUser(user);
      } else {
        toast({ variant: "destructive", title: "Not Authenticated", description: "Please log in." });
        router.replace("/login");
      }
    });
    return () => unsubscribeAuth();
  }, [router, toast]);

  React.useEffect(() => {
    if (!authUser || !childId) {
      if (authUser && !childId) {
        setError("Child ID is missing.");
        setPageLoading(false);
      }
      return;
    }

    const fetchChildInfo = async () => {
      setPageLoading(true);
      setError(null);
      try {
        const childDocRef = doc(db, "children", childId);
        const childDocSnap = await getDoc(childDocRef);

        if (childDocSnap.exists()) {
          const data = childDocSnap.data() as Omit<ChildData, 'id'>;
          if (data.parentId !== authUser.uid) {
            setError("You do not have permission to view progress for this child.");
            setChildData(null);
          } else {
            setChildData({ id: childDocSnap.id, ...data });
          }
        } else {
          setError("Child profile not found.");
          setChildData(null);
        }
      } catch (e: any) {
        console.error("Error fetching child data:", e);
        setError("Failed to load child's information. " + e.message);
      } finally {
        setPageLoading(false);
      }
    };
    fetchChildInfo();
  }, [authUser, childId, router]);

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
      orderBy("timestamp", "asc") 
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const fetchedBehaviors: BehaviorLog[] = [];
        snapshot.forEach((docSnap) => {
          fetchedBehaviors.push({ id: docSnap.id, ...docSnap.data() } as BehaviorLog);
        });
        setBehaviors(fetchedBehaviors);
        setBehaviorsLoading(false);
        setBehaviorsError(null);
      },
      (err: any) => {
        console.error("Error fetching behaviors:", err);
        if (err.code === 'failed-precondition') {
          const detailedIndexErrorMessage = "The behavior chart requires a Firestore index. Please check your browser's developer console (usually F12) for a link from Firebase to create it. This link will set up the index with fields: 1. childId (Ascending), 2. parentId (Ascending), 3. timestamp (Ascending). If the Firebase console states an index 'already exists' but is not identical to this (including field order and direction), it may cause this error. After creating/correcting, it may take a few minutes for the index to build.";
          setBehaviorsError(detailedIndexErrorMessage);
          toast({
            variant: "destructive",
            title: "Missing Or Incorrect Firestore Index",
            description: detailedIndexErrorMessage,
            duration: 30000, 
          });
        } else {
          setBehaviorsError("Failed to load behavior data. " + err.message);
        }
        setBehaviorsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [authUser, childId, toast]);

  React.useEffect(() => {
    if (behaviors.length > 0) {
      const processedData: { [date: string]: { date: string } & { [type: string]: number } } = {};

      behaviors.forEach(log => {
        // Ensure timestamp is valid and has toDate method
        if (log.timestamp && typeof log.timestamp.toDate === 'function') { 
          const dateStr = formatDateFns(log.timestamp.toDate(), "yyyy-MM-dd");
          if (!processedData[dateStr]) {
            processedData[dateStr] = { date: formatDateFns(log.timestamp.toDate(), "MMM d") }; 
            behaviorTypesForChart.forEach(type => {
              processedData[dateStr][type] = 0;
            });
          }
          // Check if log.type is one of the defined behavior types
          if (behaviorTypesForChart.includes(log.type as typeof behaviorTypesForChart[number])) {
            processedData[dateStr][log.type] = (processedData[dateStr][log.type] || 0) + 1;
          } else {
             processedData[dateStr]["Other"] = (processedData[dateStr]["Other"] || 0) + 1;
          }
        } else {
          console.warn("Skipping behavior log due to invalid or missing timestamp:", log);
        }
      });
      
      const dataArray = Object.values(processedData).sort((a, b) => {
          // Find the original yyyy-MM-dd keys to sort by actual date
          const dateAKey = Object.keys(processedData).find(key => processedData[key] === a);
          const dateBKey = Object.keys(processedData).find(key => processedData[key] === b);
          if (dateAKey && dateBKey) {
            return parseISO(dateAKey).getTime() - parseISO(dateBKey).getTime();
          }
          return 0;
        }
      );
      setChartData(dataArray);
    } else {
      setChartData([]);
    }
  }, [behaviors]);


  if (pageLoading && !authUser) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying user session...</p>
      </div>
    );
  }
  
  if (pageLoading) {
     return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading child information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => router.push("/my-children")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to My Children
        </Button>
      </div>
    );
  }
  
  if (!childData) {
     return (
      <div className="flex min-h-[calc(100vh-12rem)] flex-col items-center justify-center p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
        <p className="text-muted-foreground mb-6">Could not load child information. Please try again.</p>
        <Button onClick={() => router.push("/my-children")}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to My Children
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" onClick={() => router.back()} className="mb-4">
        <ChevronLeft className="mr-2 h-4 w-4" />
        Back to {childData.name}'s Profile
      </Button>
      <div className="flex items-center gap-3">
        <BarChart2 className="h-8 w-8 text-primary" />
        <h1 className="font-headline text-3xl font-bold">Progress for {childData.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Behavior Trends</CardTitle>
          <CardDescription>Daily counts of logged behaviors.</CardDescription>
        </CardHeader>
        <CardContent>
          {behaviorsLoading && (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-2 text-muted-foreground">Loading behavior data...</p>
            </div>
          )}
          {!behaviorsLoading && behaviorsError && (
            <div className="text-destructive flex flex-col items-center justify-center h-64 p-4 text-center">
              <AlertTriangle className="h-8 w-8 mb-2" />
              <p className="font-semibold">Error loading behavior data</p>
              <p className="text-sm">{behaviorsError}</p>
            </div>
          )}
          {!behaviorsLoading && !behaviorsError && chartData.length === 0 && (
            <div className="text-center text-muted-foreground py-10">
              <Info className="mx-auto h-10 w-10 mb-2" />
              No behavior data logged yet to display trends.
            </div>
          )}
          {!behaviorsLoading && !behaviorsError && chartData.length > 0 && (
            <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
              <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value} 
                />
                <YAxis allowDecimals={false} />
                <RechartsTooltip 
                  cursor={false}
                  content={({ active, payload, label }) => (
                    <CustomBehaviorChartTooltipContent
                      active={active}
                      payload={payload}
                      label={label}
                      config={chartConfig}
                    />
                  )}
                />
                {behaviorTypesForChart.map((type) => (
                  <Bar
                    key={type}
                    dataKey={type}
                    fill={chartConfig[type]?.color as string || "hsl(var(--muted))"}
                    radius={4}
                    stackId="a" 
                  />
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Goal Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground">Current Goal: <span className="font-semibold text-foreground">Be more patient during tantrums.</span></p>
          <Progress value={60} aria-label="Goal progress 60%" />
          <p className="text-xs text-muted-foreground">Started: May 15, 2024</p>
          <p className="text-sm text-muted-foreground mt-4">Goal tracking features are under construction.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Stories & Tips Used</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This section will show helpful content you've engaged with. Feature under construction.</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>✅ Used: Tip - "Belly Breathing" (May 20)</li>
            <li>✅ Used: Story - "The Sharing Squirrel" (May 18)</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Award className="h-5 w-5" /> Milestone Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">10 of 20 milestones completed.</p>
          <Button variant="outline" size="sm" className="mt-2" disabled>View All Milestones</Button>
           <p className="text-sm text-muted-foreground mt-4">Milestone tracking features are under construction.</p>
        </CardContent>
      </Card>

    </div>
  );
}

