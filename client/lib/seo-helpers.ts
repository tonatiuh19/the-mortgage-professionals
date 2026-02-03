/**
 * SEO Helpers and Presets for MetaHelmet Component
 * Provides common configurations for different page types
 */

interface MetaPreset {
  title?: string;
  description?: string;
  keywords?: string;
  type?: "website" | "article" | "profile" | "product";
  noIndex?: boolean;
  noFollow?: boolean;
  image?: string;
  imageAlt?: string;
}

/**
 * Admin Dashboard Page Meta
 */
export const adminPageMeta = (
  title: string,
  description?: string,
): MetaPreset => ({
  title,
  description: description || `Admin: ${title}`,
  keywords: "admin, dashboard, management, broker, loan, CRM",
  noIndex: true, // Admin pages should not be indexed
  noFollow: true,
  type: "website",
});

/**
 * Client Portal Page Meta
 */
export const clientPageMeta = (
  title: string,
  description?: string,
): MetaPreset => ({
  title,
  description: description || `${title} - Loan Application Portal`,
  keywords: "loan application, mortgage, client portal, track application",
  noIndex: false,
  type: "website",
});

/**
 * Public Landing Page Meta
 */
export const landingPageMeta = (
  title: string,
  description: string,
): MetaPreset => ({
  title,
  description,
  keywords:
    "loan, mortgage, broker, real estate, finance, home loan, refinancing",
  type: "website",
  image: "/og-image.jpg",
  imageAlt: "Loan Broker Management Platform",
});

/**
 * Auth Page Meta (Login, Register, etc.)
 */
export const authPageMeta = (title: string): MetaPreset => ({
  title,
  description: "Secure access to your loan management account",
  keywords: "login, sign in, authentication, broker portal, client portal",
  noIndex: true, // Auth pages should not be indexed
  type: "website",
});

/**
 * Application/Form Page Meta
 */
export const applicationPageMeta = (title: string): MetaPreset => ({
  title,
  description: "Complete your loan application with our secure online form",
  keywords: "loan application, mortgage application, apply online, secure form",
  noIndex: false,
  type: "website",
});

/**
 * Generate structured data for Organization
 */
export const generateOrganizationStructuredData = (config: {
  name: string;
  url: string;
  logo?: string;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}) => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: config.name,
  url: config.url,
  logo: config.logo,
  description: config.description,
  email: config.contactEmail,
  telephone: config.contactPhone,
  address: config.address
    ? {
        "@type": "PostalAddress",
        streetAddress: config.address.street,
        addressLocality: config.address.city,
        addressRegion: config.address.state,
        postalCode: config.address.postalCode,
        addressCountry: config.address.country,
      }
    : undefined,
});

/**
 * Generate structured data for WebPage
 */
export const generateWebPageStructuredData = (config: {
  name: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: config.name,
  description: config.description,
  url: config.url,
  image: config.image,
  datePublished: config.datePublished,
  dateModified: config.dateModified,
});

/**
 * Generate structured data for Article
 */
export const generateArticleStructuredData = (config: {
  headline: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified?: string;
  author: {
    name: string;
    url?: string;
  };
  publisher: {
    name: string;
    logo: string;
  };
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: config.headline,
  description: config.description,
  image: config.image,
  datePublished: config.datePublished,
  dateModified: config.dateModified || config.datePublished,
  author: {
    "@type": "Person",
    name: config.author.name,
    url: config.author.url,
  },
  publisher: {
    "@type": "Organization",
    name: config.publisher.name,
    logo: {
      "@type": "ImageObject",
      url: config.publisher.logo,
    },
  },
});

/**
 * Generate structured data for Breadcrumb
 */
export const generateBreadcrumbStructuredData = (
  items: Array<{ name: string; url: string }>,
) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

/**
 * Generate structured data for FAQPage
 */
export const generateFAQStructuredData = (
  faqs: Array<{ question: string; answer: string }>,
) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

/**
 * Generate full URL from path
 */
export const getFullUrl = (path: string): string => {
  if (typeof window === "undefined") return path;
  const origin = window.location.origin;
  return path.startsWith("http") ? path : `${origin}${path}`;
};

/**
 * Generate canonical URL for current page
 */
export const getCanonicalUrl = (): string => {
  if (typeof window === "undefined") return "";
  return window.location.origin + window.location.pathname;
};
