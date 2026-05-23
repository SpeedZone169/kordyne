import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  heightClassName?: string;
  priority?: boolean;
  mode?: "auto" | "light" | "white";
};

export default function BrandLogo({
  className = "",
  heightClassName = "h-11",
  priority = false,
  mode = "auto",
}: BrandLogoProps) {
  if (mode === "white") {
    return (
      <Image
        src="/kordyne-logo-white.svg"
        alt="Kordyne"
        width={260}
        height={64}
        priority={priority}
        className={`${heightClassName} w-auto object-contain ${className}`}
      />
    );
  }

  if (mode === "light") {
    return (
      <Image
        src="/kordyne-logo.svg"
        alt="Kordyne"
        width={260}
        height={64}
        priority={priority}
        className={`${heightClassName} w-auto object-contain ${className}`}
      />
    );
  }

  return (
    <span className={`relative inline-flex ${heightClassName} ${className}`}>
      <Image
        src="/kordyne-logo.svg"
        alt="Kordyne"
        width={260}
        height={64}
        priority={priority}
        className="kordyne-logo-light h-full w-auto object-contain"
      />
      <Image
        src="/kordyne-logo-white.svg"
        alt=""
        width={260}
        height={64}
        aria-hidden="true"
        className="kordyne-logo-dark hidden h-full w-auto object-contain"
      />
    </span>
  );
}
