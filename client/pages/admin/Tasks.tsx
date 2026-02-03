import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  File,
  FileText,
} from "lucide-react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { adminPageMeta } from "@/lib/seo-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchTasks,
  updateTaskStatus,
  deleteTask,
} from "@/store/slices/tasksSlice";
import TaskWizard from "@/components/TaskWizard";
import type { TaskTemplate } from "@shared/api";
import { toast } from "@/hooks/use-toast";

const Tasks = () => {
  const dispatch = useAppDispatch();
  const { tasks, isLoading: loading } = useAppSelector((state) => state.tasks);
  const [filter, setFilter] = useState<string>("all");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<TaskTemplate | null>(null);

  useEffect(() => {
    dispatch(fetchTasks());
  }, [dispatch]);

  const handleUpdateStatus = async (taskId: number, newStatus: string) => {
    await dispatch(updateTaskStatus({ taskId, status: newStatus }));
  };

  const handleTaskCreated = () => {
    setWizardOpen(false);
    setEditingTask(null);
    dispatch(fetchTasks());
  };

  const handleEditTask = (task: TaskTemplate) => {
    setEditingTask(task);
    setWizardOpen(true);
  };

  const handleDeleteClick = (task: TaskTemplate) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      try {
        await dispatch(deleteTask(taskToDelete.id)).unwrap();
        toast({
          title: "Task deleted",
          description: "The task has been deleted successfully.",
        });
        setDeleteDialogOpen(false);
        setTaskToDelete(null);
      } catch (error: any) {
        toast({
          title: "Cannot delete task",
          description:
            error ||
            "This task is linked to a loan application and cannot be deleted.",
          variant: "destructive",
        });
      }
    }
  };

  const handleWizardClose = () => {
    setWizardOpen(false);
    setEditingTask(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "pending":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "pending":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "low":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "active") return task.is_active;
    if (filter === "inactive") return !task.is_active;
    return true;
  });

  const taskStats = {
    total: tasks.length,
    active: tasks.filter((t) => t.is_active).length,
    inactive: tasks.filter((t) => !t.is_active).length,
    high_priority: tasks.filter(
      (t) => t.priority === "high" || t.priority === "urgent",
    ).length,
  };

  return (
    <>
      <MetaHelmet
        {...adminPageMeta(
          "Task Templates",
          "Manage task templates for loan workflows",
        )}
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
              Task Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage task templates used for loan workflows
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search tasks..." className="pl-9" />
            </div>
            <Button
              onClick={() => setWizardOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-600 gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Task</span>
            </Button>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </header>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading tasks...
          </div>
        ) : tasks.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create custom tasks to track loan-related activities
              </p>
              <Button
                onClick={() => setWizardOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Your First Task
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Task Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Templates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{taskStats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-500">
                    {taskStats.active}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Inactive
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-500">
                    {taskStats.inactive}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    High Priority
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {taskStats.high_priority}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tasks Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Tasks</CardTitle>
                <CardDescription>
                  Showing {filteredTasks.length} of {tasks.length} tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Mobile Card View */}
                <div className="block lg:hidden space-y-3">
                  {filteredTasks.map((task) => (
                    <Card key={task.id} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {task.title}
                            </h3>
                            {task.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {task.description}
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={task.is_active ? "default" : "secondary"}
                            className="text-xs flex-shrink-0"
                          >
                            {task.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline" className="text-xs">
                            Order: {task.order_index}
                          </Badge>
                          <Badge
                            className={cn(
                              "text-xs",
                              getPriorityColor(task.priority),
                            )}
                          >
                            {task.priority}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {task.task_type?.replace(/_/g, " ")}
                          </Badge>
                          {task.default_due_days && (
                            <Badge variant="outline" className="text-xs">
                              {task.default_due_days} days
                            </Badge>
                          )}
                        </div>

                        {(task.requires_documents || task.has_custom_form) && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {task.requires_documents && (
                              <Badge
                                variant="outline"
                                className="text-xs flex items-center gap-1"
                              >
                                <File className="h-3 w-3" />
                                Docs
                              </Badge>
                            )}
                            {task.has_custom_form && (
                              <Badge
                                variant="outline"
                                className="text-xs flex items-center gap-1"
                              >
                                <FileText className="h-3 w-3" />
                                Form
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-1 pt-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTask(task)}
                            className="gap-2"
                          >
                            <Edit2 className="h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                            onClick={() => handleDeleteClick(task)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[50px] whitespace-nowrap">
                          Order
                        </TableHead>
                        <TableHead className="min-w-[200px]">
                          Task Template
                        </TableHead>
                        <TableHead className="min-w-[120px] whitespace-nowrap">
                          Type
                        </TableHead>
                        <TableHead className="min-w-[100px] whitespace-nowrap">
                          Priority
                        </TableHead>
                        <TableHead className="min-w-[100px] whitespace-nowrap">
                          Due Days
                        </TableHead>
                        <TableHead className="min-w-[120px] whitespace-nowrap">
                          Requirements
                        </TableHead>
                        <TableHead className="min-w-[100px] whitespace-nowrap">
                          Active
                        </TableHead>
                        <TableHead className="min-w-[120px] text-right whitespace-nowrap">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell className="min-w-[50px] whitespace-nowrap">
                            <Badge variant="outline" className="text-xs">
                              {task.order_index}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-[200px] max-w-[300px]">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0">
                                <span className="font-medium block truncate">
                                  {task.title}
                                </span>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[120px] whitespace-nowrap">
                            <span className="text-sm">
                              {task.task_type?.replace(/_/g, " ")}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-[100px] whitespace-nowrap">
                            <Badge
                              className={cn(
                                "text-xs whitespace-nowrap",
                                getPriorityColor(task.priority),
                              )}
                            >
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-[100px] whitespace-nowrap">
                            <span className="text-sm">
                              {task.default_due_days
                                ? `${task.default_due_days} days`
                                : "No due date"}
                            </span>
                          </TableCell>
                          <TableCell className="min-w-[120px]">
                            <div className="flex items-center gap-1 flex-wrap">
                              {!!task.requires_documents && (
                                <Badge
                                  variant="outline"
                                  className="text-xs flex items-center gap-1"
                                >
                                  <File className="h-3 w-3" />
                                  Docs
                                </Badge>
                              )}
                              {!!task.has_custom_form && (
                                <Badge
                                  variant="outline"
                                  className="text-xs flex items-center gap-1"
                                >
                                  <FileText className="h-3 w-3" />
                                  Form
                                </Badge>
                              )}
                              {!task.requires_documents &&
                                !task.has_custom_form && (
                                  <span className="text-xs text-muted-foreground">
                                    -
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="min-w-[100px] whitespace-nowrap">
                            <Badge
                              variant={task.is_active ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {task.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="min-w-[120px] text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditTask(task)}
                                title="Edit template"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteClick(task)}
                                title="Delete template"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <TaskWizard
          open={wizardOpen}
          onClose={handleWizardClose}
          onTaskCreated={handleTaskCreated}
          editTask={editingTask}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task Template</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Are you sure you want to delete "{taskToDelete?.title}"? This
                  action cannot be undone.
                </p>
                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">
                    Deleting this template will not affect existing tasks
                    created from it.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
};

export default Tasks;
