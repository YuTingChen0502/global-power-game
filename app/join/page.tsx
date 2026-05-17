import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function JoinPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Game</CardTitle>
          <CardDescription>Baseline shell only. Join validation begins in Phase 2.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input aria-label="Game code" placeholder="Game code" disabled />
          <Input aria-label="Country invite code" placeholder="Country invite code" disabled />
          <Button className="w-full" disabled>
            Join
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
