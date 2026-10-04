// Netlify entry point for /.netlify/functions/claude, in the Functions v2 format.
//
// v2 matters here: the rate-limit counters need strong-consistency reads from
// Netlify Blobs, which require the `uncachedEdgeURL` that Netlify's v2 runtime
// provides. Lambda-compatibility handlers only receive the cached edge URL via
// connectLambda(), so strong reads fail there with BlobsConsistencyError.
import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import core from "./core.js";

const { createHandler, fetchMember } = core;

export const rateLimitStore = () => getStore({ name: "claude-function", consistency: "strong" });

// Adapts the core handler, which takes { httpMethod, headers, body } and returns
// { statusCode, headers, body }, to the v2 Request/Response interface.
export function toV2(handler) {
  return async (req, context) => {
    const headers = Object.fromEntries(req.headers);
    if (!headers["x-nf-client-connection-ip"] && context?.ip) headers["x-nf-client-connection-ip"] = context.ip;
    const res = await handler({ httpMethod: req.method, headers, body: await req.text() });
    return new Response(res.body || null, { status: res.statusCode, headers: res.headers });
  };
}

let client;
export default toV2(createHandler({
  anthropic: () => (client ||= new Anthropic({ timeout: 9000, maxRetries: 0 })),
  fetchMember,
  storeFor: rateLimitStore,
  now: () => Date.now(),
}));
