import type { Inquiry } from "@/types/inquiry";
import { getPhoneDisplay, getSiteUrl } from "@/lib/site-config";
import type { EmailMessage } from "@/services/email/email-provider";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildOwnerNotificationEmail(inquiry: Inquiry): EmailMessage {
  const adminUrl = `${getSiteUrl()}/admin/inquiries/${inquiry.id}`;
  const rows: Array<[string, string]> = [
    ["Reference", inquiry.reference_code],
    ["Guest name", inquiry.full_name],
    ["Mobile", inquiry.mobile_number],
    ["Email", inquiry.email ?? "(not supplied)"],
    ["Check-in", formatDate(inquiry.check_in_date)],
    ["Check-out", formatDate(inquiry.check_out_date)],
    ["Adults", String(inquiry.adults)],
    ["Children", String(inquiry.children)],
    ["Day visitors", String(inquiry.day_visitors)],
    ["Vehicles", String(inquiry.vehicles)],
    ["Purpose of stay", inquiry.purpose_of_stay ?? "(not supplied)"],
    ["Source", inquiry.source],
  ];

  const textRows = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#66736D;">${escapeHtml(label)}</td><td style="padding:4px 0;color:#17241F;">${escapeHtml(value)}</td></tr>`
    )
    .join("");

  return {
    to: process.env.INQUIRY_NOTIFICATION_TO || "bookings@ten29holidayhomes.com",
    subject: `New enquiry ${inquiry.reference_code} — ${inquiry.full_name}`,
    text: `New TEN29 booking enquiry\n\n${textRows}\n\nMessage: ${inquiry.message ?? "(none)"}\n\nReview: ${adminUrl}`,
    html: `
      <div style="font-family:sans-serif;color:#17241F;">
        <h1 style="color:#0E3A2F;font-size:20px;">New booking enquiry</h1>
        <table>${htmlRows}</table>
        <p><strong>Message:</strong><br>${escapeHtml(inquiry.message ?? "(none)")}</p>
        <p><a href="${adminUrl}" style="color:#B88A2F;">Review in the admin dashboard</a></p>
      </div>
    `.trim(),
  };
}

export function buildGuestAcknowledgementEmail(inquiry: Inquiry): EmailMessage {
  if (!inquiry.email) {
    throw new Error("buildGuestAcknowledgementEmail requires an inquiry with an email address");
  }

  const phone = getPhoneDisplay();
  const text = `Hi ${inquiry.full_name},

Thank you for your enquiry with TEN29 Holiday Homes. Your reference code is ${inquiry.reference_code}.

Requested dates: ${formatDate(inquiry.check_in_date)} to ${formatDate(inquiry.check_out_date)}

This is a request, not a reservation. TEN29 will reply with verified availability, price, and payment instructions. Please do not send any payment until TEN29 has confirmed these details with you directly.

Questions in the meantime? Call or text ${phone}.

— TEN29 Holiday Homes`;

  const html = `
    <div style="font-family:sans-serif;color:#17241F;">
      <h1 style="color:#0E3A2F;font-size:20px;">Thank you for your enquiry</h1>
      <p>Hi ${escapeHtml(inquiry.full_name)},</p>
      <p>Your reference code is <strong>${escapeHtml(inquiry.reference_code)}</strong>.</p>
      <p>Requested dates: <strong>${formatDate(inquiry.check_in_date)}</strong> to <strong>${formatDate(inquiry.check_out_date)}</strong></p>
      <p style="background:#ECE4D4;padding:12px;border-radius:2px;">
        This is a request, not a reservation. TEN29 will reply with verified availability, price,
        and payment instructions. Please do not send any payment until TEN29 has confirmed these
        details with you directly.
      </p>
      <p>Questions in the meantime? Call or text ${escapeHtml(phone)}.</p>
      <p>— TEN29 Holiday Homes</p>
    </div>
  `.trim();

  return {
    to: inquiry.email,
    subject: `Your TEN29 enquiry ${inquiry.reference_code} was received`,
    text,
    html,
  };
}
