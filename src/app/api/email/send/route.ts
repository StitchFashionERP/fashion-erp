import { NextResponse } from "next/server";

type EmailAttachment = {
  filename: string;
  content: string;
  contentType?: string;
};

type SendEmailRequest = {
  to: string[];
  cc?: string[];
  bcc?: string[];

  subject: string;
  message: string;

  attachment?: EmailAttachment;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderEmailHtml(message: string) {
  const content = escapeHtml(message).replaceAll(
    "\n",
    "<br />",
  );

  return `
    <!doctype html>
    <html lang="nl">
      <head>
        <meta charset="utf-8" />
      </head>

      <body
        style="
          margin:0;
          background:#f3f5f7;
          color:#25313e;
          font-family:Arial,Helvetica,sans-serif;
        "
      >
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          role="presentation"
        >
          <tr>
            <td align="center" style="padding:30px 15px">
              <table
                width="620"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
                style="
                  max-width:100%;
                  background:#ffffff;
                  border:1px solid #dce2e7;
                "
              >
                <tr>
                  <td
                    style="
                      border-bottom:3px solid #0875c1;
                      padding:22px 26px;
                      color:#0875c1;
                      font-size:20px;
                      font-weight:700;
                    "
                  >
                    FASHION ERP
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:28px 26px;
                      font-size:14px;
                      line-height:1.65;
                    "
                  >
                    ${content}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      border-top:1px solid #e2e6ea;
                      padding:16px 26px;
                      color:#7d8791;
                      font-size:10px;
                    "
                  >
                    Deze e-mail is verzonden vanuit Fashion ERP.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function POST(
  request: Request,
) {
  try {
    const apiKey =
      process.env.RESEND_API_KEY;

    const fromAddress =
      process.env.EMAIL_FROM;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "RESEND_API_KEY ontbreekt in .env.",
        },
        {
          status: 500,
        },
      );
    }

    if (!fromAddress) {
      return NextResponse.json(
        {
          success: false,
          error:
            "EMAIL_FROM ontbreekt in .env.",
        },
        {
          status: 500,
        },
      );
    }

    const body =
      (await request.json()) as SendEmailRequest;

    const recipients = Array.isArray(
      body.to,
    )
      ? body.to.filter(Boolean)
      : [];

    if (recipients.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Vul minimaal één ontvanger in.",
        },
        {
          status: 400,
        },
      );
    }

    if (!body.subject?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Het onderwerp is verplicht.",
        },
        {
          status: 400,
        },
      );
    }

    const attachments =
      body.attachment?.filename &&
      body.attachment.content
        ? [
            {
              filename:
                body.attachment.filename,
              content:
                body.attachment.content,
              content_type:
                body.attachment
                  .contentType,
            },
          ]
        : undefined;

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: recipients,

          cc:
            body.cc &&
            body.cc.length > 0
              ? body.cc
              : undefined,

          bcc:
            body.bcc &&
            body.bcc.length > 0
              ? body.bcc
              : undefined,

          subject: body.subject.trim(),

          text: body.message,
          html: renderEmailHtml(
            body.message,
          ),

          attachments,
        }),
      },
    );

    const resendPayload =
      (await resendResponse.json()) as {
        id?: string;
        message?: string;
        name?: string;
      };

    if (!resendResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error:
            resendPayload.message ||
            resendPayload.name ||
            "Resend heeft de e-mail geweigerd.",
        },
        {
          status: resendResponse.status,
        },
      );
    }

    return NextResponse.json({
      success: true,
      id: resendPayload.id ?? "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "E-mail versturen is niet gelukt.",
      },
      {
        status: 500,
      },
    );
  }
}