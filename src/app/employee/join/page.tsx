"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function EmployeeJoinRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      router.replace(`/staff/join?token=${encodeURIComponent(token)}`);
    } else {
      router.replace("/staff/join");
    }
  }, [router, token]);

  return <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white flex items-center justify-center text-xs">Redirecting to /staff/join...</div>;
}

export default function EmployeeJoinRedirectPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white flex items-center justify-center text-xs">Redirecting...</div>}>
      <EmployeeJoinRedirectContent />
    </Suspense>
  );
}
