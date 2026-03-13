import { useState } from "react";
import logoImage from "../img/logo.jpg";

function BrandLogo() {
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl overflow-hidden bg-primary text-white shadow-sm group-hover:shadow-glow transition-shadow duration-300">
      {hasError ? (
        <span className="text-sm font-bold tracking-tight">GT</span>
      ) : (
        <img
          src={logoImage}
          alt="GPT Tanjung Priok"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}

export default BrandLogo;
