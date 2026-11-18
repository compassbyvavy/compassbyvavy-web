import { buildMimeMessage, type RenderedEmail } from "../../../lib/camps/watcher/email";

export type CampWatcherEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ALERT_EMAIL?: string;
  ALERT_FROM?: string;
  EMAIL?: {
    send(message: EmailMessage): Promise<void>;
  };
};

declare class EmailMessage {
  constructor(from: string, to: string, raw: string);
}

export const DEFAULT_ALERT_EMAIL = "hello@compassbyvavy.ca";

export async function sendRenderedEmail(env: CampWatcherEnv, message: RenderedEmail): Promise<{ sent: boolean; reason?: string }> {
  const to = env.ALERT_EMAIL || DEFAULT_ALERT_EMAIL;
  const from = env.ALERT_FROM || DEFAULT_ALERT_EMAIL;
  if (!env.EMAIL) {
    throw new Error("camp watcher email binding is not configured");
  }
  const raw = buildMimeMessage({ from, to, subject: message.subject, text: message.text, html: message.html });
  await env.EMAIL.send(new EmailMessage(from, to, raw));
  return { sent: true };
}
