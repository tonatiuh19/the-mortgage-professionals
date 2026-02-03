import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckSquare,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Target,
  Zap,
  Sparkles,
  ArrowRight,
  PartyPopper,
  RotateCcw,
  FileQuestion,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchClientTasks,
  updateClientTask,
  selectClientTasks,
  selectTasksLoading,
} from "@/store/slices/clientPortalSlice";
import { useToast } from "@/hooks/use-toast";
import { TaskCompletionModal } from "@/components/TaskCompletionModal";

const Tasks = () => {
  const dispatch = useAppDispatch();
  const { toast } = useToast();
  const tasks = useAppSelector(selectClientTasks);
  const loading = useAppSelector(selectTasksLoading);
  const [celebrateTaskId, setCelebrateTaskId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchClientTasks());
  }, [dispatch]);

  const pendingTasks = tasks.filter(
    (t) => t.status === "pending" || t.status === "reopened",
  );
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress");
  const completedTasks = tasks.filter(
    (t) =>
      t.status === "completed" ||
      t.status === "pending_approval" ||
      t.status === "approved",
  );

  const approvedTasks = tasks.filter((t) => t.status === "approved");
  const completionRate =
    tasks.length > 0 ? (approvedTasks.length / tasks.length) * 100 : 0;

  const handleStartTask = async (taskId: number) => {
    try {
      console.log(`🚀 Starting task ${taskId}...`);
      // Update status to in_progress first and wait for it
      await dispatch(
        updateClientTask({ taskId, status: "in_progress" }),
      ).unwrap();
      console.log(`✅ Task ${taskId} status updated, opening modal...`);
      // Then open the modal
      setSelectedTaskId(taskId);
      toast({
        title: "Task Started! 🚀",
        description: "Great! Let's get this done!",
      });
    } catch (error) {
      console.error(`❌ Failed to start task ${taskId}:`, error);
      toast({
        title: "Error",
        description: "Failed to start task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTaskModalClose = () => {
    setSelectedTaskId(null);
    // Refresh tasks to get updated status
    dispatch(fetchClientTasks());
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: "border-red-500 bg-red-500/5",
      high: "border-orange-500 bg-orange-500/5",
      medium: "border-yellow-500 bg-yellow-500/5",
      low: "border-green-500 bg-green-500/5",
    };
    return (
      colors[priority as keyof typeof colors] || "border-border bg-muted/30"
    );
  };

  const getPriorityBadgeVariant = (priority: string) => {
    const variants = {
      urgent: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };
    return variants[priority as keyof typeof variants] || "outline";
  };

  const TaskCard = ({ task, showAction = true }: any) => {
    const isCompleting = celebrateTaskId === task.id;
    const isReopened = task.status === "reopened";
    const isPendingApproval =
      task.status === "pending_approval" || task.status === "completed";
    const isApproved = task.status === "approved";

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative"
      >
        {isCompleting && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="bg-green-500 text-white rounded-full p-2 shadow-lg">
              <PartyPopper className="h-6 w-6" />
            </div>
          </motion.div>
        )}

        <Card
          className={`${getPriorityColor(task.priority)} border-2 transition-all hover:shadow-lg ${isCompleting ? "scale-105 shadow-2xl border-green-500" : ""} ${isReopened ? "border-amber-500 bg-amber-50/50" : ""}`}
        >
          <CardContent className="p-6">
            {/* Reopened Alert */}
            {isReopened && task.reopen_reason && (
              <Alert className="mb-4 border-amber-500 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900 font-semibold">
                  Task Needs Revision
                </AlertTitle>
                <AlertDescription className="text-amber-800 text-sm mt-2">
                  {task.reopen_reason}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {isApproved ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : isPendingApproval ? (
                      <FileQuestion className="h-5 w-5 text-blue-500" />
                    ) : isReopened ? (
                      <RotateCcw className="h-5 w-5 text-amber-500" />
                    ) : task.status === "in_progress" ? (
                      <Play className="h-5 w-5 text-orange-500" />
                    ) : (
                      <Clock className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2">{task.title}</h3>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-3">
                  <Badge
                    variant={getPriorityBadgeVariant(task.priority) as any}
                    className="font-semibold"
                  >
                    {task.priority.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {task.application_number}
                  </Badge>
                  {/* Status Badge */}
                  {isApproved && (
                    <Badge className="bg-green-500 text-white">
                      ✓ Approved
                    </Badge>
                  )}
                  {isPendingApproval && !isApproved && (
                    <Badge className="bg-blue-500 text-white">
                      Pending Review
                    </Badge>
                  )}
                  {isReopened && (
                    <Badge className="bg-amber-500 text-white">
                      Needs Revision
                    </Badge>
                  )}
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </div>
                  )}
                  {task.completed_at && !isReopened && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed:{" "}
                      {new Date(task.completed_at).toLocaleDateString()}
                    </div>
                  )}
                  {task.approved_at && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="h-3 w-3" />
                      Approved:{" "}
                      {new Date(task.approved_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {showAction && !isApproved && !isPendingApproval && (
                <div>
                  {task.status === "pending" || isReopened ? (
                    <Button
                      onClick={() => handleStartTask(task.id)}
                      className={`gap-2 shadow-lg hover:scale-105 transition-transform ${isReopened ? "bg-amber-500 hover:bg-amber-600" : ""}`}
                    >
                      {isReopened ? (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          Revise Task
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Start Task
                        </>
                      )}
                    </Button>
                  ) : task.status === "in_progress" ? (
                    <Button
                      onClick={() => setSelectedTaskId(task.id)}
                      variant="default"
                      className="gap-2 shadow-lg hover:scale-105 transition-transform"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Continue
                    </Button>
                  ) : null}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  if (loading && tasks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Gamification */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-8 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

        <div className="relative grid gap-6 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5" />
              <span className="text-sm font-semibold opacity-90">
                Your Progress
              </span>
            </div>
            <h1 className="text-4xl font-bold mb-2">
              {completionRate.toFixed(0)}%
            </h1>
            <Progress value={completionRate} className="h-2 bg-white/20" />
            <p className="text-sm opacity-90 mt-2">
              {approvedTasks.length} of {tasks.length} tasks approved
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <Target className="h-8 w-8" />
            </div>
            <div>
              <p className="text-3xl font-bold">{inProgressTasks.length}</p>
              <p className="text-sm opacity-90">In Progress</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/10 backdrop-blur-sm">
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <p className="text-3xl font-bold">{pendingTasks.length}</p>
              <p className="text-sm opacity-90">To Do</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Motivation Message */}
      {pendingTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="p-3 rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  Keep up the great work! 🚀
                </h3>
                <p className="text-sm text-muted-foreground">
                  Complete your tasks to move closer to your dream home!
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tasks Tabs */}
      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            To Do ({pendingTasks.length})
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="gap-2">
            <Play className="h-4 w-4" />
            In Progress ({inProgressTasks.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Done ({completedTasks.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  All caught up! 🎉
                </h3>
                <p className="text-muted-foreground text-center">
                  No pending tasks. Great job!
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingTasks.map((task) => <TaskCard key={task.id} task={task} />)
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          {inProgressTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Play className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  No tasks in progress
                </h3>
                <p className="text-muted-foreground text-center">
                  Start a task from your To Do list!
                </p>
              </CardContent>
            </Card>
          ) : (
            inProgressTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedTasks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Target className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-semibold mb-2">
                  No completed tasks yet
                </h3>
                <p className="text-muted-foreground text-center">
                  Complete tasks to see them here!
                </p>
              </CardContent>
            </Card>
          ) : (
            completedTasks.map((task) => (
              <TaskCard key={task.id} task={task} showAction={false} />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Task Completion Modal */}
      <TaskCompletionModal
        taskId={selectedTaskId}
        onClose={handleTaskModalClose}
      />
    </div>
  );
};

export default Tasks;
