export async function GET(/*{ params, request }*/) {
  const response = await fetch(
    `${import.meta.env.PUBLIC_API_URL}/dyn?did=${import.meta.env.PUBLIC_BOT_DID}&label=bot&url=yes`,
  );
  return new Response(await response.arrayBuffer());
}
