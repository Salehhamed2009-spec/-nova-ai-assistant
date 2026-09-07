import { query } from '@anthropic-ai/claude-agent-sdk';

const agent = query({
  prompt: 'Antworte auf Deutsch: Sag mir kurz, dass NOVA erfolgreich mit dem Claude Agent SDK verbunden ist.',
  options: {
    allowedTools: [],
    settingSources: []
  }
});

for await (const message of agent) {
  if (message.type === 'result') {
    console.log(message.result);
  }
}