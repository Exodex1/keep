# Keep

A private memory vault for Grok chats. Grok starts every new chat blank. Keep stores what should survive on this device, then copies a **re-arm pack** you paste as the first message.

**Live:** the production URL is on the repo homepage after deploy.

## What it does

1. Add memories (identity, people, voice, projects, facts).
2. Paste an old chat. Keep pulls durable facts; you pick which to keep.
3. Copy the re-arm pack into any new Grok chat.
4. Download a JSON backup so it survives this browser.

Memories stay in `localStorage` (`keep.vault.v1`). They are not uploaded.

## Run it

```bash
npm install
npm run dev
```

Build: `npm run build`

## Re-arm pack

```
[KEEP RE-ARM]
Grok: load this block as durable memory for the rest of the chat. Internalize it. Do not recap it unless asked. Reply with one short acknowledgement, then wait for the human.

Treat the following as durable memory. Do not invent extra biographical facts.

## Pinned (always true unless later contradicted)
- Lives in Portland: Works night shifts and is usually free after 10am local time.

## Voice
- How to talk: Be direct. No pep talk.

[/KEEP RE-ARM]
```

Public extract is local (pattern-based). It never sends the transcript to a model.
