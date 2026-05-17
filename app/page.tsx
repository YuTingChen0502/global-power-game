import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const destinations = [
  { href: "/join", label: "Join", description: "Player entry shell" },
  { href: "/player", label: "Player", description: "Mobile player shell" },
  { href: "/admin", label: "Admin", description: "Admin workspace shell" },
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <section className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="space-y-4">
          <Badge variant="secondary">Phase 0</Badge>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-normal sm:text-5xl">Global Power Game</h1>
            <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
              Architecture shell for the classroom strategy PWA. Game data, rules, and production flows start in later phases.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {destinations.map((destination) => (
            <Card key={destination.href}>
              <CardHeader>
                <CardTitle>{destination.label}</CardTitle>
                <CardDescription>{destination.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href={destination.href}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
