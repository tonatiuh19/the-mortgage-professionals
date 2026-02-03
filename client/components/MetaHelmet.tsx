import { Helmet } from "react-helmet-async";

interface MetaHelmetProps {
  // Basic Meta
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;

  // URL and Canonical
  url?: string;
  canonical?: string;

  // Social Media
  image?: string;
  imageAlt?: string;
  imageWidth?: string;
  imageHeight?: string;
  type?: "website" | "article" | "profile" | "product";

  // Twitter Specific
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  twitterSite?: string;
  twitterCreator?: string;

  // Article Meta (for blog posts)
  publishedTime?: string;
  modifiedTime?: string;
  articleSection?: string;
  articleTags?: string[];

  // SEO Control
  robots?: string;
  noIndex?: boolean;
  noFollow?: boolean;

  // Structured Data (JSON-LD)
  structuredData?: Record<string, any>;

  // App Specific
  siteName?: string;
  locale?: string;
  alternateLocales?: string[];

  // Mobile
  themeColor?: string;
  appleTouchIcon?: string;

  // Additional
  favicon?: string;
}

const defaultMeta = {
  title: "Loan Broker Management Platform",
  description:
    "Streamline your loan application process with our comprehensive broker management platform. Manage leads, applications, and client communications efficiently.",
  keywords:
    "loan, broker, mortgage, real estate, finance, application, CRM, lead management",
  image: "/og-image.jpg",
  imageAlt: "Loan Broker Management Platform",
  type: "website" as const,
  author: "Loan Broker Platform",
  siteName: "Loan Broker Platform",
  locale: "en_US",
  twitterCard: "summary_large_image" as const,
  themeColor: "#9333ea",
  robots: "index, follow",
};

export function MetaHelmet({
  title,
  description,
  keywords,
  author,
  url,
  canonical,
  image,
  imageAlt,
  imageWidth,
  imageHeight,
  type,
  twitterCard,
  twitterSite,
  twitterCreator,
  publishedTime,
  modifiedTime,
  articleSection,
  articleTags,
  robots,
  noIndex,
  noFollow,
  structuredData,
  siteName,
  locale,
  alternateLocales,
  themeColor,
  appleTouchIcon,
  favicon,
}: MetaHelmetProps) {
  // Construct values
  const pageTitle = title
    ? `${title} | ${defaultMeta.title}`
    : defaultMeta.title;
  const pageDescription = description || defaultMeta.description;
  const pageKeywords = keywords || defaultMeta.keywords;
  const pageImage = image || defaultMeta.image;
  const pageImageAlt = imageAlt || defaultMeta.imageAlt;
  const pageType = type || defaultMeta.type;
  const pageAuthor = author || defaultMeta.author;
  const pageSiteName = siteName || defaultMeta.siteName;
  const pageLocale = locale || defaultMeta.locale;
  const pageThemeColor = themeColor || defaultMeta.themeColor;
  const pageTwitterCard = twitterCard || defaultMeta.twitterCard;

  // Get current URL
  const pageUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");

  // Construct robots meta
  let robotsContent = robots || defaultMeta.robots;
  if (noIndex || noFollow) {
    const parts = [];
    if (noIndex) parts.push("noindex");
    if (noFollow) parts.push("nofollow");
    robotsContent = parts.join(", ");
  }

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{pageTitle}</title>
      <meta name="title" content={pageTitle} />
      <meta name="description" content={pageDescription} />
      <meta name="keywords" content={pageKeywords} />
      <meta name="author" content={pageAuthor} />

      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Favicon */}
      {favicon && <link rel="icon" type="image/x-icon" href={favicon} />}

      {/* Mobile */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="theme-color" content={pageThemeColor} />
      <meta name="mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      {appleTouchIcon && <link rel="apple-touch-icon" href={appleTouchIcon} />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={pageType} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:image:alt" content={pageImageAlt} />
      {imageWidth && <meta property="og:image:width" content={imageWidth} />}
      {imageHeight && <meta property="og:image:height" content={imageHeight} />}
      <meta property="og:site_name" content={pageSiteName} />
      <meta property="og:locale" content={pageLocale} />
      {alternateLocales?.map((altLocale) => (
        <meta
          key={altLocale}
          property="og:locale:alternate"
          content={altLocale}
        />
      ))}

      {/* Article Meta (if type is article) */}
      {pageType === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {pageType === "article" && modifiedTime && (
        <meta property="article:modified_time" content={modifiedTime} />
      )}
      {pageType === "article" && articleSection && (
        <meta property="article:section" content={articleSection} />
      )}
      {pageType === "article" &&
        articleTags?.map((tag) => (
          <meta key={tag} property="article:tag" content={tag} />
        ))}

      {/* Twitter */}
      <meta name="twitter:card" content={pageTwitterCard} />
      <meta name="twitter:url" content={pageUrl} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={pageImage} />
      <meta name="twitter:image:alt" content={pageImageAlt} />
      {twitterSite && <meta name="twitter:site" content={twitterSite} />}
      {twitterCreator && (
        <meta name="twitter:creator" content={twitterCreator} />
      )}

      {/* SEO and Crawlers */}
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="rating" content="general" />
      <meta name="distribution" content="global" />

      {/* Security */}
      <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
      <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
      <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />

      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
}
