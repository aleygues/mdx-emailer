import Mailjet from "node-mailjet";
import { debug, error, info, warn } from "./logger";
import { RenderedEmailType } from "./renderer";

type AttachmentType = {
  mimetype: string;
  filename: string;
  b64: string;
};
type SendEmailArgs = {
  to: string | string[];
  attachments: AttachmentType[];
  email: RenderedEmailType;
  fromEmail: string;
  fromName: string;
};

const instance =
  process.env.TESTING === "true" ||
  !process.env.MAILJET_API ||
  !process.env.MAILJET_SECRET
    ? null
    : Mailjet.apiConnect(
        process.env.MAILJET_API as string,
        process.env.MAILJET_SECRET as string
      );

export async function sendEmail(args: SendEmailArgs) {
  // TODO: should not skip render
  if (instance === null) {
    error("🔴 cannot send email because mailjet env vars are not set");
    return;
  }

  const to = typeof args.to === "string" ? [args.to] : args.to;

  const emailData = {
    FromEmail: args.fromEmail,
    FromName: args.fromName,
    Subject: args.email.subject,
    "Text-part": args.email.text,
    "Html-part": args.email.html,
    Recipients: to.map((e) => ({ Email: e })),
    Attachments: (args.attachments ?? []).map((entry) => ({
      "Content-type": entry.mimetype,
      Filename: entry.filename,
      content: entry.b64,
    })),
  };

  if (instance === null) {
    debug("not sending email");
  } else {
    const sendEmail = instance.post("send");
    const result = await sendEmail.request<{ Sent: { Email: string }[] }>(
      emailData
    );
    try {
      info(
        `✅ ${
          result.response.data.Sent.length
        } messages sent to ${result.response.data.Sent.map(
          (entry) => entry.Email
        ).join(", ")}`
      );
    } catch {
      warn(`⚠️ has been sent, but logs are missing`);
    }
  }
}
