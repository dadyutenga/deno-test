import { logger } from "../logger/mod.ts";

export interface MessagePayload {
  to: string;
  subject?: string;
  body: string;
}

export interface MessageAdapter {
  send(message: MessagePayload): Promise<void>;
}

class ConsoleAdapter implements MessageAdapter {
  async send(message: MessagePayload): Promise<void> {
    logger.info("message dispatched", { channel: "console", to: message.to, subject: message.subject, body: message.body });
  }
}

export const emailAdapter: MessageAdapter = new ConsoleAdapter();
export const smsAdapter: MessageAdapter = new ConsoleAdapter();
