# n8n-nodes-charm-hyper

An [n8n](https://n8n.io/) community node package for **[Charm Hyper](https://hyper.charm.land)**, the fast, cost-effective inference API for agentic coding.

Hyper speaks both OpenAI and Anthropic wire formats, so this package exposes all three inference surfaces plus account endpoints behind a single credential.

## Install

### In n8n (GUI)

1. Go to **Settings → Community Nodes → Install**.
2. Enter `n8n-nodes-charm-hyper` and confirm.

### Manually

```bash
cd ~/.n8n
npm install n8n-nodes-charm-hyper
```

Then restart n8n.

## Credentials

Create a **Charm Hyper API** credential:

| Field        | Description                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| **API Key**  | A key from the [Hyper dashboard](https://hyper.charm.land), starting with `sk-hyper-`. Sent as `Authorization: Bearer …`. |
| **Base URL** | Defaults to `https://hyper.charm.land/v1`. Only change this for a proxy or gateway.                                       |

Credential testing calls `GET /v1/credits`, so a saved credential with a green check is a working key.

## Operations

| Resource            | Operation | Endpoint                                 |
| ------------------- | --------- | ---------------------------------------- |
| Chat Completion     | Complete  | `POST /v1/chat/completions` (OpenAI)     |
| Response (OpenAI)   | Create    | `POST /v1/responses` (OpenAI Responses)  |
| Message (Anthropic) | Create    | `POST /v1/messages` (Anthropic Messages) |
| Model               | List      | `GET /v1/models` (public)                |
| Credit Balance      | Get       | `GET /v1/credits`                        |

### Chat Completion

The standard OpenAI chat endpoint. Add a **Model**, build a **Messages** list, and optionally tune behaviour under **Options** (temperature, penalties, response format, stop sequences, max output tokens).

Extra OpenAI parameters that are not exposed in the UI can be passed through **Additional Body Parameters** as JSON. That object is merged into the request body last, so it can also override any field above:

```json
{ "seed": 7, "logit_bias": { "50256": -100 } }
```

### Response (OpenAI)

The newer Responses API. Choose **Text** for a single prompt or **Messages** for a full conversation, and optionally supply **Instructions** as a system-level directive.

### Message (Anthropic)

The Anthropic Messages format. `max_tokens` is required by that API and is exposed as **Max Tokens**. Use **System** for the system prompt and **Top K** / **Top P** for sampling.

> **Note:** reasoning models may return a `thinking` content block before the text block. Increase **Max Tokens** if a response comes back with `stop_reason: max_tokens` and no visible text.

### Model / Credit Balance

**Model: List** returns the full catalogue including per-model context windows and pricing. It is a public endpoint and needs no authentication. **Credit Balance: Get** returns your remaining Hypercredits.

## Output

Each operation returns the raw API response on the item's `json`, unmodified. For chat completions that includes Hyper's cost extensions:

```json
{
	"id": "chatcmpl-…",
	"choices": [{ "message": { "role": "assistant", "content": "pong" }, "finish_reason": "stop" }],
	"usage": {
		"prompt_tokens": 38,
		"completion_tokens": 18,
		"total_tokens": 56,
		"cost": { "usd": 0.0001, "hypercredits": 0.002 },
		"remaining": { "hypercredits": 119.5788448 }
	}
}
```

Read a reply with an expression such as:

```text
{{ $json.choices[0].message.content }}
```

## Using it as a tool

The node sets `usableAsTool`, so it can be attached directly to an n8n AI Agent as a callable tool.

## Development

```bash
npm install
npm run build     # compile TypeScript to dist/
npm run dev       # live-reload into a local n8n
npm run lint      # lint against the n8n community node rules
npm run lint:fix
```

Source layout:

```text
credentials/CharmHyperApi.credentials.ts   # API key + base URL, Bearer auth, /credits test
nodes/CharmHyper/
  CharmHyper.node.ts                       # node definition + execute loop
  descriptions.ts                          # resource/operation parameter definitions
  actions.ts                               # per-operation request building
  GenericFunctions.ts                      # HTTP transport, model loadOptions, helpers
  CharmHyper.node.json                     # n8n codex metadata
icons/                                     # light + dark node icons
```

## Links

- [Hyper documentation](https://hyper.charm.land/docs/)
- [Hyper API authentication](https://hyper.charm.land/docs/api/authentication.html)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE.md)
