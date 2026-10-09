/**
 * Email sending. EmailSender is the port; Nodemailer over Hostinger SMTP is
 * the adapter. When SMTP env vars are absent (local dev before credentials
 * exist), a console implementation logs instead — order flow never breaks
 * because email isn't configured yet.
 *
 * Email failures must NEVER fail a webhook: the payment already happened.
 * sendOrderEmails catches and logs.
 */
import nodemailer from 'nodemailer';
import { env, smtpConfigured } from '../env';
import {
  orderCustomerEmail,
  orderTeamEmail,
  orderRefundedCustomerEmail,
  orderRefundedTeamEmail,
  inquiryTeamEmail,
} from './templates';
import type { OrderWithItems } from '../orders/orders';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

class SmtpSender implements EmailSender {
  private transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({ from: env.SMTP_USER, ...message });
  }
}

class ConsoleSender implements EmailSender {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[email:console] to=${message.to} subject="${message.subject}"\n${message.text}`);
  }
}

export const emailSender: EmailSender = smtpConfigured ? new SmtpSender() : new ConsoleSender();

export type { OrderWithItems };

/** One confirmation to the customer + one to the team, per Order — never per line item. Never throws. */
export async function sendOrderEmails(order: OrderWithItems): Promise<void> {
  const messages: EmailMessage[] = [orderCustomerEmail(order)];
  if (env.BOOKING_NOTIFY_EMAIL) {
    messages.push(orderTeamEmail(order, env.BOOKING_NOTIFY_EMAIL));
  }

  for (const message of messages) {
    try {
      await emailSender.send(message);
    } catch (err) {
      console.error(`[email] failed to send "${message.subject}" to ${message.to}:`, err);
    }
  }
}

/** Refund confirmation to the customer + notification to the team. Never throws. */
export async function sendRefundEmails(order: OrderWithItems): Promise<void> {
  const messages: EmailMessage[] = [orderRefundedCustomerEmail(order)];
  if (env.BOOKING_NOTIFY_EMAIL) {
    messages.push(orderRefundedTeamEmail(order, env.BOOKING_NOTIFY_EMAIL));
  }

  for (const message of messages) {
    try {
      await emailSender.send(message);
    } catch (err) {
      console.error(`[email] failed to send "${message.subject}" to ${message.to}:`, err);
    }
  }
}

/** Notification to the team about a new inquiry. Never throws. */
export async function sendInquiryEmail(inquiry: {
  name: string;
  email: string;
  phone?: string | null;
  travelers?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  originCountry?: string | null;
  message: string;
  context?: string | null;
}): Promise<void> {
  if (!env.BOOKING_NOTIFY_EMAIL) return;
  try {
    await emailSender.send(inquiryTeamEmail(inquiry, env.BOOKING_NOTIFY_EMAIL));
  } catch (err) {
    console.error('[email] failed to send inquiry notification:', err);
  }
}
