export function GET() {
  return Response.json({
    ok: true,
    service: "global-power-game",
    phase: "0",
  });
}
