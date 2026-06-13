import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Mail, Users, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const emails = useQuery({ queryKey: ["emails"], queryFn: apiClient.listEmails });
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: apiClient.listContacts });

  const upcoming = (emails.data ?? [])
    .filter((e) => new Date(e.scheduled_time) > new Date())
    .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime())
    .slice(0, 5);

  const stats = [
    {
      label: "Scheduled emails",
      value: emails.data?.length ?? "—",
      icon: Mail,
      to: "/emails",
    },
    {
      label: "Contacts",
      value: contacts.data?.length ?? "—",
      icon: Users,
      to: "/contacts",
    },
    {
      label: "Upcoming sends",
      value: upcoming.length,
      icon: Calendar,
      to: "/emails",
    },
    {
      label: "Templates",
      value: "—",
      icon: FileText,
      to: "/templates",
    },
  ] as const;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your email activity." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} to={s.to}>
              <Card className="hover:border-foreground/20 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                      <p className="text-3xl font-semibold mt-2">{s.value}</p>
                    </div>
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Upcoming scheduled emails</CardTitle>
          <Link to="/emails">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {emails.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming emails scheduled.</p>
          ) : (
            <div className="divide-y">
              {upcoming.map((e) => (
                <div key={e.id} className="py-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{e.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.recipient_email}</p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(e.scheduled_time).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}