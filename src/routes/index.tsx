import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mailbase — Email automation" },
      { name: "description", content: "Schedule, broadcast, and manage email campaigns." },
    ],
  }),
  component: Index,
});

function Index() {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} />;
}
