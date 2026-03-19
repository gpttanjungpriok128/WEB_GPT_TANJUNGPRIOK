import { useState } from "react";
import logoImage from "../img/logo1.png";

function BrandLogo({ className = "h-11 w-11" }) {
  const [hasError, setHasError] = useState(false);

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] dark:border-zinc-800 dark:bg-zinc-950 ${className}`}
    >
      {hasError ? (
        <span className="text-sm font-bold tracking-[0.08em] text-emerald-700 dark:text-emerald-300">
          GT
        </span>
      ) : (
        <img
          src={logoImage}
          alt="GPT Tanjung Priok"
          width="44"
          height="44"
          decoding="async"
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      )}
    </div>
  );
}

export default BrandLogo;
