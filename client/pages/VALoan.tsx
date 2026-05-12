import React from "react";
import MortgageProgramPage from "@/components/MortgageProgramPage";

const VALoan: React.FC = () => {
  return (
    <MortgageProgramPage
      title="VA Loan"
      slug="va-loan"
      summary="VA loans, backed by the Department of Veterans Affairs, are designed to help veterans, active duty servicemembers, and qualifying spouses access affordable mortgages and housing."
      descriptionParagraphs={[
        "A VA loan is issued by a private lender and backed by the federal government through the Department of Veterans Affairs.",
        "That federal backing often allows qualified borrowers to access favorable terms, including lower upfront costs compared to many other loan options.",
        "If you have served our country, this benefit may help you purchase or refinance with a mortgage strategy that supports your long-term goals.",
      ]}
      highlights={[
        "Built for veterans and active-duty service members",
        "Often lower upfront investment required",
        "Competitive terms for qualified borrowers",
        "Support from a team that understands VA lending",
      ]}
    />
  );
};

export default VALoan;
