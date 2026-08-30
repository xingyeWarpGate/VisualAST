import casesData from '../../data/cases.json';

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const shuffled = <T,>(items: T[]) => items.map((value) => ({ value, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ value }) => value);

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      const cases = shuffled([...casesData.cases]);
      send('session', { total: cases.length, generatedAt: casesData.generatedAt });
      for (let index = 0; index < cases.length; index += 1) {
        const item = cases[index];
        send('case-start', { id: item.id, title: item.title, index, intent: item.intent, audit: item.audit, visualReview: item.visualReview });
        await pause(220);
        const chunks = item.renderIntent.prompt.match(/.{1,58}(?:\s|$)|.{1,58}/g) ?? [item.renderIntent.prompt];
        for (const chunk of chunks) { send('prompt-chunk', { id: item.id, chunk }); await pause(55); }
        send('structure', { id: item.id, semanticProposal: item.semanticProposal, contract: item.contract, aestheticPlan: item.aestheticPlan, renderIntent: item.renderIntent });
        await pause(180);
        send('image', { id: item.id, image: item.image });
        await pause(520);
        send('case-complete', { id: item.id, index });
      }
      send('complete', { total: cases.length });
      controller.close();
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' } });
}
