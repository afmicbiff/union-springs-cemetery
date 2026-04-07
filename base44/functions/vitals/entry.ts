Deno.serve(async () => {
  return Response.json({ ok: true, deprecated: true, use: 'vitalsIngest' });
});