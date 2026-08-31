"use client";

import { useParams } from "next/navigation";
import { useRequireAuth } from "@/components/require-auth";
import { ThreadPanel } from "@/components/thread-panel";

export default function ChatThreadPage() {
  const { user, loading } = useRequireAuth();
  const params = useParams<{ id: string }>();

  if (loading || !user) return null;

  return (
    <div className="max-w-xl">
      <ThreadPanel threadId={params.id} />
    </div>
  );
}
