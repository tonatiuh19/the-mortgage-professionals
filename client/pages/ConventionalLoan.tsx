import React from "react";
import MortgageProgramPage from "@/components/MortgageProgramPage";

const ConventionalLoan: React.FC = () => {
  return (
    <MortgageProgramPage
      title="Conventional Loan"
      slug="conventional-loan"
      summary="Conventional mortgages are a great choice for many homeowners because they offer lower costs than some other popular loan types."
      descriptionParagraphs={[
        "A conventional mortgage is one that is not guaranteed or insured by the federal government.",
        "Most conventional mortgages are conforming, which means they meet the requirements to be sold to Fannie Mae or Freddie Mac. This allows lenders to free up funds and continue helping qualified buyers become homeowners.",
        "Doing your homework on mortgage basics early can set you up for success. Mortgages are not one-size-fits-all products, and understanding differences between options helps you choose what is best for your situation.",
      ]}
      highlights={[
        "Purchase or refinance options",
        "Cash-out opportunities available",
        "Great for first-time home buyers",
        "Competitive mortgage rates",
      ]}
    />
  );
};

export default ConventionalLoan;
