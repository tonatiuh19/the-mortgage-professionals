import React, { useEffect } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  Home,
  DollarSign,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchClientApplications,
  selectClientApplications,
  selectPortalLoading,
} from "@/store/slices/clientPortalSlice";

const Loans = () => {
  const dispatch = useAppDispatch();
  const applications = useAppSelector(selectClientApplications);
  const loading = useAppSelector(selectPortalLoading);

  useEffect(() => {
    dispatch(fetchClientApplications());
  }, [dispatch]);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      submitted: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      under_review: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      documents_pending:
        "bg-orange-500/10 text-orange-500 border-orange-500/20",
      underwriting: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      conditional_approval:
        "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      approved: "bg-green-500/10 text-green-500 border-green-500/20",
      closed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
      denied: "bg-red-500/10 text-red-500 border-red-500/20",
      cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
    };
    return colors[status] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };

  const getStatusIcon = (status: string) => {
    if (status === "approved" || status === "closed") {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (status === "denied" || status === "cancelled") {
      return <Clock className="h-5 w-5 text-red-500" />;
    }
    return <Clock className="h-5 w-5 text-orange-500" />;
  };

  if (loading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground">Loading your loans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            My Loan Applications
          </h1>
          <p className="text-muted-foreground mt-2">
            Track the progress of all your loan applications
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {applications.length} Total
        </Badge>
      </motion.div>

      {/* Applications List */}
      {applications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Loan Applications</h3>
            <p className="text-muted-foreground text-center max-w-md">
              You don't have any loan applications yet. Contact your broker to
              get started on your journey to homeownership!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {applications.map((app, index) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all hover:shadow-lg">
                {/* Card Header */}
                <CardHeader className="bg-gradient-to-br from-muted/50 to-transparent">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(app.status)}>
                          {getStatusIcon(app.status)}
                          <span className="ml-2">
                            {app.status.replace(/_/g, " ").toUpperCase()}
                          </span>
                        </Badge>
                        <Badge variant="outline">{app.loan_type}</Badge>
                      </div>
                      <CardTitle className="text-2xl">
                        {app.application_number}
                      </CardTitle>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary">
                        ${app.loan_amount.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Loan Amount
                      </p>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-6">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Application Progress</span>
                      <span className="text-muted-foreground">
                        {app.completed_tasks}/{app.total_tasks} tasks completed
                      </span>
                    </div>
                    <Progress
                      value={(app.completed_tasks / app.total_tasks) * 100}
                      className="h-3"
                    />
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>
                        {Math.round(
                          (app.completed_tasks / app.total_tasks) * 100,
                        )}
                        % Complete
                      </span>
                    </div>
                  </div>

                  <Separator />

                  {/* Property Details */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Home className="h-4 w-4 text-primary" />
                        Property Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        {app.property_address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p>{app.property_address}</p>
                              <p className="text-muted-foreground">
                                {app.property_city}, {app.property_state}
                              </p>
                            </div>
                          </div>
                        )}
                        {app.estimated_close_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-muted-foreground">
                                Est. Close Date
                              </p>
                              <p className="font-medium">
                                {new Date(
                                  app.estimated_close_date,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Broker Information */}
                    <div className="space-y-3">
                      <h4 className="font-semibold flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Your Loan Officer
                      </h4>
                      <div className="space-y-2 text-sm">
                        {app.broker_first_name && (
                          <p className="font-medium text-base">
                            {app.broker_first_name} {app.broker_last_name}
                          </p>
                        )}
                        {app.broker_phone && (
                          <a
                            href={`tel:${app.broker_phone}`}
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            <Phone className="h-4 w-4" />
                            {app.broker_phone}
                          </a>
                        )}
                        {app.broker_email && (
                          <a
                            href={`mailto:${app.broker_email}`}
                            className="flex items-center gap-2 text-primary hover:underline"
                          >
                            <Mail className="h-4 w-4" />
                            {app.broker_email}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Timeline */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Submitted:{" "}
                        {app.submitted_at
                          ? new Date(app.submitted_at).toLocaleDateString()
                          : "Pending"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>
                        Created: {new Date(app.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Loans;
