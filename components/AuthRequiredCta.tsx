"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  isLoggedIn: boolean;
  href: string;
  message: string;
  children: React.ReactNode;
  className?: string;
};

/** 로그인 시 링크, 비로그인 시 클릭하면 안내 후 로그인 페이지로( next=href ) */
export default function AuthRequiredCta({
  isLoggedIn,
  href,
  message,
  children,
  className,
}: Props) {
  const router = useRouter();

  if (isLoggedIn) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        alert(message);
        router.push(`/login?next=${encodeURIComponent(href)}`);
      }}
      className={className}
    >
      {children}
    </button>
  );
}
