import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Meeti web is fully client-rendered (data via axios to https://api.meeti.org.uk),
// so no R2 incremental cache / image binding is required.
export default defineCloudflareConfig({});
