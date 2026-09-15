# Keep

A private memory vault for Grok chats. Grok starts every new chat blank. Keep stores what should survive on this device, then copies a **re-arm pack** you paste as the first message.

## What it does

1. Add memories (identity, people, voice, projects, facts).
2. Paste an old chat. Keep pulls durable facts; you pick which to keep.
3. Copy the re-arm pack into any new Grok chat.
4. Download a JSON backup so it survives this browser.

Memories stay in `localStorage` (`keep.vault.v1`). They are not uploaded.

**Source is public.** Anyone can use the app; each visitor’s vault stays in their own browser.

## Run it

```bash
npm install
npm run dev
```

Build: `npm run build`

Public extract is local (pattern-based). It never sends the transcript to a model.
