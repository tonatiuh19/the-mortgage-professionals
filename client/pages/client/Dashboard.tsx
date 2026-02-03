import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  CheckSquare,
  Clock,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Home as HomeIcon,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchClientApplications,
  fetchClientTasks,
  updateClientTask,
  selectClientApplications,
  selectClientTasks,
} from "@/store/slices/clientPortalSlice";
import { selectClient } from "@/store/slices/clientAuthSlice";
import { TaskCompletionModal } from "@/components/TaskCompletionModal";

const Dashboard = () => {
  const dispatch = useAppDispatch();
  const client = useAppSelector(selectClient);
  const applications = useAppSelector(selectClientApplications);
  const tasks = useAppSelector(selectClientTasks);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchClientApplications());
    dispatch(fetchClientTasks());
  }, [dispatch]);

  const activeApplications = applications.filter(
    (app) => !["closed", "denied", "cancelled"].includes(app.status),
  );

  const pendingTasks = tasks.filter((task) => task.status === "pending");
  const inProgressTasks = tasks.filter((task) => task.status === "in_progress");
  const completedTasks = tasks.filter((task) => task.status === "completed");

  const urgentTasks = tasks.filter(
    (task) =>
      task.priority === "urgent" &&
      !["completed", "cancelled"].includes(task.status),
  );

  const overallProgress =
    tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0;

  const handleStartTask = (taskId: number) => {
    // Update status to in_progress first
    dispatch(updateClientTask({ taskId, status: "in_progress" }));
    // Open the modal
    setSelectedTaskId(taskId);
  };

  const handleTaskModalClose = () => {
    setSelectedTaskId(null);
    // Refresh tasks to get updated status
    dispatch(fetchClientTasks());
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      under_review: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      approved: "bg-green-500/10 text-green-500 border-green-500/20",
      documents_pending:
        "bg-orange-500/10 text-orange-500 border-orange-500/20",
      denied: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return colors[status] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      urgent: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };
    return colors[priority] || "outline";
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/80 p-8 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-6 w-6" />
            <span className="text-sm font-semibold opacity-90">
              Welcome back!
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            Hi, {client?.first_name}! 👋
          </h1>
          <p className="text-lg opacity-90">
            Here's an overview of your loan applications and tasks
          </p>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Loans
              </CardTitle>
              <FileText className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {activeApplications.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {applications.length} total applications
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-transparent hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Tasks
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-500">
                {pendingTasks.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {inProgressTasks.length} in progress
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completed Tasks
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-500">
                {completedTasks.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {tasks.length} total tasks
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Overall Progress
              </CardTitle>
              <Trophy className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-500">
                {overallProgress.toFixed(0)}%
              </div>
              <Progress value={overallProgress} className="mt-2" />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Urgent Tasks */}
        {urgentTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  Urgent Tasks Require Attention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {urgentTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start justify-between rounded-lg border border-red-500/20 bg-red-500/5 p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive" className="text-xs">
                          URGENT
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {task.application_number}
                        </span>
                      </div>
                      <h4 className="font-semibold">{task.title}</h4>
                      {task.due_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button size="sm" onClick={() => handleStartTask(task.id)}>
                      {task.status === "pending" ? "Start Task" : "Continue"}
                    </Button>
                  </div>
                ))}
                <Link to="/portal/tasks">
                  <Button variant="outline" className="w-full">
                    View All Tasks
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Active Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HomeIcon className="h-5 w-5 text-primary" />
                Your Active Loans
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeApplications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No active loan applications
                </p>
              ) : (
                activeApplications.slice(0, 3).map((app) => (
                  <Link
                    key={app.id}
                    to={`/portal/loans`}
                    className="block rounded-lg border border-border bg-muted/30 p-4 transition-all hover:border-primary/50 hover:bg-muted/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge className={getStatusColor(app.status)}>
                          {app.status.replace("_", " ")}
                        </Badge>
                        <h4 className="font-semibold mt-2">
                          {app.application_number}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {app.loan_type} • ${app.loan_amount.toLocaleString()}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Progress
                        value={(app.completed_tasks / app.total_tasks) * 100}
                        className="flex-1"
                      />
                      <span className="text-xs text-muted-foreground">
                        {app.completed_tasks}/{app.total_tasks}
                      </span>
                    </div>
                  </Link>
                ))
              )}
              {activeApplications.length > 0 && (
                <Link to="/portal/loans">
                  <Button variant="outline" className="w-full mt-2">
                    View All Loans
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Tasks */}
        {urgentTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  Recent Tasks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tasks.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No tasks available
                  </p>
                ) : (
                  tasks.slice(0, 4).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {task.status === "completed" ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <Clock className="h-5 w-5 text-orange-500" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{task.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {task.application_number}
                          </p>
                        </div>
                      </div>
                      <Badge variant={getPriorityColor(task.priority) as any}>
                        {task.priority}
                      </Badge>
                    </div>
                  ))
                )}
                <Link to="/portal/tasks">
                  <Button variant="outline" className="w-full mt-2">
                    View All Tasks
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Task Completion Modal */}
      <TaskCompletionModal
        taskId={selectedTaskId}
        onClose={handleTaskModalClose}
      />
    </div>
  );
};

export default Dashboard;
