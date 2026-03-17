import React, { useState } from "react";
import { motion } from "framer-motion";
import { useFormik } from "formik";
import * as Yup from "yup";
import axios from "axios";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  MessageSquare,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MetaHelmet } from "@/components/MetaHelmet";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

// ─── Validation ───────────────────────────────────────────────────────────────

const validationSchema = Yup.object({
  name: Yup.string()
    .min(2, "At least 2 characters")
    .required("Name is required"),
  email: Yup.string()
    .email("Invalid email address")
    .required("Email is required"),
  phone: Yup.string()
    .matches(/^[\d\s\-().+]*$/, "Invalid phone number")
    .nullable(),
  subject: Yup.string()
    .min(3, "At least 3 characters")
    .required("Subject is required"),
  message: Yup.string()
    .min(10, "At least 10 characters")
    .required("Message is required"),
});

// ─── Page ─────────────────────────────────────────────────────────────────────

const Contact: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setSubmitError(null);
      try {
        await axios.post("/api/contact", {
          name: values.name.trim(),
          email: values.email.trim().toLowerCase(),
          phone: values.phone?.trim() || null,
          subject: values.subject.trim(),
          message: values.message.trim(),
        });
        setSubmitted(true);
        resetForm();
      } catch (err: any) {
        setSubmitError(
          err?.response?.data?.error ||
            "Something went wrong. Please try again or call us directly.",
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="flex flex-col">
      <MetaHelmet
        title="Contact Us | The Mortgage Professionals"
        description="Get in touch with The Mortgage Professionals. Call, email, or send us a message — our loan officers are ready to help you find the right mortgage."
        keywords="contact The Mortgage Professionals, mortgage banker, Whittier CA, (562) 337-0000, mortgage questions"
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-16 md:py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-10 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        </div>
        <div className="container relative z-10 text-center max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1.5">
              <MessageSquare className="mr-2 h-4 w-4" />
              Get In Touch
            </Badge>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl md:text-6xl mb-4">
              We're{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-red-600">
                Here to Help
              </span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              The biggest financial decision of your life deserves a real
              conversation. Reach out and one of our mortgage bankers will be in
              touch shortly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Contact info + Form */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-5">
            {/* Left: contact info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-2 space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold mb-1">Contact Info</h2>
                <p className="text-muted-foreground text-sm">
                  Multiple ways to reach our team.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Phone */}
                <Card className="h-full">
                  <CardContent className="pt-5 pb-5 flex flex-col gap-2 h-full">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        Phone
                      </p>
                      <a
                        href="tel:(562)337-0000"
                        className="text-base font-bold hover:text-primary transition-colors"
                      >
                        (562) 337-0000
                      </a>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Direct line to a loan officer
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Email */}
                <Card className="h-full">
                  <CardContent className="pt-5 pb-5 flex flex-col gap-2 h-full">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        Email
                      </p>
                      <a
                        href="mailto:info@themortgageprofessionals.net"
                        className="text-sm font-bold hover:text-primary transition-colors break-all"
                      >
                        info@themortgageprofessionals.net
                      </a>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        We reply within 1 business day
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Address */}
                <Card className="h-full">
                  <CardContent className="pt-5 pb-5 flex flex-col gap-2 h-full">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        Office
                      </p>
                      <p className="text-sm font-bold">15111 Whittier Blvd</p>
                      <p className="text-sm font-bold">Suite 101-B</p>
                      <p className="text-sm text-muted-foreground">
                        Whittier, CA 90603
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Hours */}
                <Card className="h-full">
                  <CardContent className="pt-5 pb-5 flex flex-col gap-2 h-full">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">
                        Hours
                      </p>
                      <p className="text-sm font-bold">Monday – Friday</p>
                      <p className="text-sm text-muted-foreground">
                        7:00 AM – 8:00 PM PST
                      </p>
                      <p className="text-sm font-bold mt-1">Saturday</p>
                      <p className="text-sm text-muted-foreground">
                        By appointment
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick apply CTA */}
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Ready to take the next step?
                </p>
                <Link to="/wizard">
                  <Button size="sm" className="w-full gap-2">
                    Apply Now <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Right: form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="lg:col-span-3"
            >
              <Card className="shadow-lg">
                <CardContent className="p-6 md:p-8">
                  {submitted ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-2xl font-bold">Message Sent!</h3>
                      <p className="text-muted-foreground max-w-sm">
                        Thank you for reaching out. One of our mortgage bankers
                        will contact you within 1 business day.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setSubmitted(false)}
                        className="mt-2"
                      >
                        Send Another Message
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="mb-6">
                        <h2 className="text-xl font-bold">Send Us a Message</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Fill out the form and we'll get back to you promptly.
                        </p>
                      </div>

                      <form
                        onSubmit={formik.handleSubmit}
                        className="space-y-5"
                      >
                        {/* Name + Email */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="name">
                              Full Name <span className="text-primary">*</span>
                            </Label>
                            <Input
                              id="name"
                              placeholder="John Smith"
                              {...formik.getFieldProps("name")}
                              className={cn(
                                formik.touched.name &&
                                  formik.errors.name &&
                                  "border-destructive",
                              )}
                            />
                            {formik.touched.name && formik.errors.name && (
                              <p className="text-xs text-destructive">
                                {formik.errors.name}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="email">
                              Email Address{" "}
                              <span className="text-primary">*</span>
                            </Label>
                            <Input
                              id="email"
                              type="email"
                              placeholder="john@example.com"
                              {...formik.getFieldProps("email")}
                              className={cn(
                                formik.touched.email &&
                                  formik.errors.email &&
                                  "border-destructive",
                              )}
                            />
                            {formik.touched.email && formik.errors.email && (
                              <p className="text-xs text-destructive">
                                {formik.errors.email}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Phone + Subject */}
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="(562) 000-0000"
                              {...formik.getFieldProps("phone")}
                              className={cn(
                                formik.touched.phone &&
                                  formik.errors.phone &&
                                  "border-destructive",
                              )}
                            />
                            {formik.touched.phone && formik.errors.phone && (
                              <p className="text-xs text-destructive">
                                {formik.errors.phone}
                              </p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="subject">
                              Subject <span className="text-primary">*</span>
                            </Label>
                            <Input
                              id="subject"
                              placeholder="e.g. FHA loan inquiry"
                              {...formik.getFieldProps("subject")}
                              className={cn(
                                formik.touched.subject &&
                                  formik.errors.subject &&
                                  "border-destructive",
                              )}
                            />
                            {formik.touched.subject &&
                              formik.errors.subject && (
                                <p className="text-xs text-destructive">
                                  {formik.errors.subject}
                                </p>
                              )}
                          </div>
                        </div>

                        {/* Message */}
                        <div className="space-y-1.5">
                          <Label htmlFor="message">
                            Message <span className="text-primary">*</span>
                          </Label>
                          <Textarea
                            id="message"
                            placeholder="Tell us how we can help you..."
                            rows={5}
                            {...formik.getFieldProps("message")}
                            className={cn(
                              "resize-none",
                              formik.touched.message &&
                                formik.errors.message &&
                                "border-destructive",
                            )}
                          />
                          {formik.touched.message && formik.errors.message && (
                            <p className="text-xs text-destructive">
                              {formik.errors.message}
                            </p>
                          )}
                        </div>

                        {/* Submit error */}
                        {submitError && (
                          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                            {submitError}
                          </div>
                        )}

                        <Button
                          type="submit"
                          disabled={formik.isSubmitting}
                          className="w-full gap-2"
                          size="lg"
                        >
                          {formik.isSubmitting ? (
                            <>Sending…</>
                          ) : (
                            <>
                              Send Message <Send className="h-4 w-4" />
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-muted-foreground text-center">
                          By submitting this form you agree to be contacted by
                          The Mortgage Professionals regarding your inquiry.
                        </p>
                      </form>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Map embed placeholder */}
      <section className="pb-16">
        <div className="container">
          <div className="rounded-2xl overflow-hidden border border-border h-64 bg-muted/40 flex items-center justify-center">
            <a
              href="https://maps.google.com/?q=15111+Whittier+Blvd+Suite+101-B+Whittier+CA+90603"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <MapPin className="h-8 w-8" />
              <span className="font-semibold">
                15111 Whittier Blvd Suite 101-B, Whittier CA 90603
              </span>
              <span className="text-xs underline">Open in Google Maps</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
