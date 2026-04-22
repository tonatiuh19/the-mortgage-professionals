import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { MetaHelmet } from "@/components/MetaHelmet";
import { logger } from "@/lib/logger";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  return (
    <>
      <MetaHelmet
        title="Page Not Found"
        description="The page you are looking for does not exist"
        noIndex={true}
        noFollow={true}
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
          <a href="/" className="text-primary hover:text-primary/80 underline">
            Return to Home
          </a>
        </div>
      </div>
    </>
  );
};

export default NotFound;
