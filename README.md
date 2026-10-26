# pratikBhor_Resume

Personal portfolio of Pratik Bhor, Backend Developer (Java · Spring Boot).

- `index.html`: the whole site. It includes an interactive Three.js 3D stack scene, 3D tilt cards, a LeetCode stats section, a print-ready resume (the **resume.pdf** button), and an "ask my AI" chat assistant.
- `chat-worker/`: a Cloudflare Worker that connects the chat to OpenAI without exposing the API key. It also serves live LeetCode stats at `GET /leetcode`.
- `linkedin/`: a LinkedIn banner (`banner.png`, made from `banner.html`) and a profile photo.

## LeetCode stats

The LeetCode section uses a snapshot built into `index.html` (`LEETCODE_SNAPSHOT`). Once the worker is deployed and `CHAT_ENDPOINT` is set, the page fetches live numbers from `<worker>/leetcode`, which the worker caches for an hour. The label then changes from "snapshot" to "live". Browsers can't call LeetCode's API directly because of CORS, which is why the worker sits in between.

## AI assistant setup

The chat works right away with built-in offline answers. To switch it to ChatGPT:

```bash
npm install -g wrangler
cd chat-worker
wrangler login
wrangler secret put OPENAI_API_KEY      # paste your OpenAI key
wrangler deploy                          # prints https://pratik-portfolio-chat.<you>.workers.dev
```

1. In `index.html`, set `const CHAT_ENDPOINT = 'https://pratik-portfolio-chat.<you>.workers.dev';`
2. In `chat-worker/wrangler.toml`, set `ALLOWED_ORIGIN` to the live site URL (for example `https://pratikbhor2004.github.io`), then run `wrangler deploy` again.
3. Put a monthly usage limit on the OpenAI account.

If the worker is down or slow, the chat falls back to the offline answers automatically.

**Never put the OpenAI key in `index.html`.** Anyone can read it there.

When the resume changes, update both `PROFILE` in `chat-worker/worker.js` and the `KB` answers in `index.html`.
