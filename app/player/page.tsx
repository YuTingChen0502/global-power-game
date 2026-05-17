import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PlayerPage() {
  return (
    <main className="min-h-screen px-4 py-6">
      <section className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">Player</h1>
            <p className="text-sm text-muted-foreground">Phase 0 shell. Map and orders arrive in later phases.</p>
          </div>
          <Badge>Disconnected</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Strategic Map</CardTitle>
            <CardDescription>Reserved surface for the interactive map.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex aspect-[4/3] items-center justify-center rounded-md border border-dashed bg-muted text-sm text-muted-foreground">
              Map placeholder
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="orders">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="report">Report</TabsTrigger>
            <TabsTrigger value="effects">Effects</TabsTrigger>
          </TabsList>
          <TabsContent value="orders">Order composer is out of scope for Phase 0.</TabsContent>
          <TabsContent value="report">Battle reports are out of scope for Phase 0.</TabsContent>
          <TabsContent value="effects">Status effects are out of scope for Phase 0.</TabsContent>
        </Tabs>
      </section>
    </main>
  );
}
