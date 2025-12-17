import { TriggerClient } from "@trigger.dev/sdk/v3";

export const client = new TriggerClient({
  id: "email-scrapper",
  apiKey: process.env.TRIGGER_API_KEY,
});
