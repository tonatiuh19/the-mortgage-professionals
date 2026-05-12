import React from "react";
import { MetaHelmet } from "@/components/MetaHelmet";

const sections = [
  {
    title: "Information We Collect",
    points: [
      "Name, phone number, and email address.",
      "Loan application details and financial information.",
      "Any additional details submitted through forms or communication channels.",
    ],
  },
  {
    title: "How We Use Your Information",
    points: [
      "Process loan inquiries and applications.",
      "Provide account updates and customer support.",
      "Send marketing communications and relevant mortgage-related content.",
      "Ensure legal and regulatory compliance.",
    ],
  },
  {
    title: "SMS Communications",
    points: [
      "By opting in, you consent to receive SMS updates, reminders, and support messages.",
      "Reply STOP to opt out at any time.",
      "Reply HELP for assistance or contact 562-665-4132.",
      "Message frequency varies and message/data rates may apply.",
    ],
  },
  {
    title: "Your Rights",
    points: [
      "Opt out of SMS communications at any time.",
      "Request access, correction, or deletion of personal information where applicable.",
      "Contact us with questions regarding your data and privacy preferences.",
    ],
  },
];

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="flex flex-col">
      <MetaHelmet
        title="Privacy Policy | The Mortgage Professionals"
        description="Learn how The Mortgage Professionals collects, uses, and protects your personal information."
        keywords="privacy policy, SMS consent, mortgage data privacy, The Mortgage Professionals"
      />

      <section className="bg-gradient-to-b from-primary/5 to-background py-14 md:py-20">
        <div className="container max-w-4xl">
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-muted-foreground">
            Effective Date: February 12, 2025. The Mortgage Professionals
            respects your privacy and is committed to protecting your personal
            information.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="container max-w-4xl space-y-10">
          {sections.map((section) => (
            <article key={section.title}>
              <h2 className="text-2xl font-bold">{section.title}</h2>
              <ul className="mt-4 list-disc space-y-2 pl-6 text-foreground/90">
                {section.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </article>
          ))}

          <article>
            <h2 className="text-2xl font-bold">Contact Us</h2>
            <div className="mt-4 space-y-1 text-foreground/90">
              <p>Phone: 562-665-4132</p>
              <p>Email: raul@theosegueragroup.com</p>
              <p>
                Mailing Address: 16901 Bellflower Blvd, Bellflower, CA 90706
              </p>
            </div>
          </article>

          <article>
            <h2 className="text-2xl font-bold">Changes to This Policy</h2>
            <p className="mt-4 text-foreground/90">
              We may update this policy periodically. Any changes will be
              reflected on this page with an updated effective date.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
