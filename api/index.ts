import { createApp } from '../src/app';

// Vercel serverless entry point. An Express app instance is itself a valid
// (req, res) handler, so we can export it directly. The store is selected by
// createApp -> createStore based on the environment (Upstash/Vercel KV when
// credentials are present, otherwise in-memory).
export default createApp();
