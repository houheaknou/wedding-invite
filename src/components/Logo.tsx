import Image from "next/image";
import Link from "next/link";

export function Logo({ name, href = "/" }: { name: string; href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5">
      {/* Gold Khmer monogram; public/logo.png is 109x192 with a transparent background */}
      <Image
        src="/logo.png"
        alt=""
        width={23}
        height={40}
        priority
        className="h-10 w-auto drop-shadow-sm transition group-hover:rotate-[-6deg]"
      />
      <span className="text-lg font-bold tracking-tight text-brand-600">{name}</span>
    </Link>
  );
}
