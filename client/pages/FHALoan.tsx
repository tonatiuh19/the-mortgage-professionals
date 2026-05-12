import React from "react";
import MortgageProgramPage from "@/components/MortgageProgramPage";

const FHALoan: React.FC = () => {
  return (
    <MortgageProgramPage
      title="FHA Loan"
      slug="fha-loan"
      summary="An FHA loan is a type of government-backed mortgage that can allow you to buy a home with looser financial requirements."
      descriptionParagraphs={[
        "FHA loans are backed by the Federal Housing Administration, an agency under the Department of Housing and Urban Development.",
        "Because the loan is insured by the FHA, lenders have added protection in the event of default, which can make financing more accessible for borrowers with lower down payments or lower credit scores.",
        "FHA programs can be a strong fit for buyers who want a practical path to homeownership while keeping upfront costs manageable.",
      ]}
      highlights={[
        "Low down payment options",
        "Flexible credit qualification",
        "Purchase or refinance support",
        "Expert guidance through each step",
      ]}
    />
  );
};

export default FHALoan;
