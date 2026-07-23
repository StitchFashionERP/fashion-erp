import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RequestBody = {
  question?: string;
  pathname?: string;
  snapshot?: unknown;
  helpContext?: unknown;
};

function extractOutputText(payload: any) {
  if (
    typeof payload?.output_text === "string"
  ) {
    return payload.output_text;
  }

  const parts: string[] = [];

  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (
        content?.type === "output_text" &&
        typeof content?.text === "string"
      ) {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

export async function POST(
  request: Request,
) {
  try {
    const body =
      (await request.json()) as RequestBody;
    const question =
      body.question?.trim();

    if (!question) {
      return NextResponse.json(
        {
          error:
            "Er is geen vraag ontvangen.",
        },
        { status: 400 },
      );
    }

    const apiKey =
      process.env.OPENAI_API_KEY;
    const model =
      process.env.OPENAI_MODEL;

    if (!apiKey || !model) {
      return NextResponse.json(
        {
          fallback: true,
          reason:
            "OPENAI_API_KEY of OPENAI_MODEL ontbreekt.",
        },
        { status: 200 },
      );
    }

    const systemPrompt = `
Je bent STITCH Assistant, de ingebouwde read-only assistent van STITCH Fashion ERP.

Regels:
- Antwoord in helder Nederlands.
- Beantwoord simpele vragen zonder neerbuigend te klinken.
- Gebruik uitsluitend de meegeleverde handleiding en STITCH-datasamenvatting.
- Verzin nooit cijfers, klanten, documenten of statussen.
- Benoem altijd of een data-antwoord is gebaseerd op actuele lokale STITCH-data.
- Geef compacte, concrete stappen.
- Je mag geen gegevens wijzigen, verwijderen, mailen, boeken of goedkeuren.
- Wanneer een vraag om een actie vraagt, leg uit waar de gebruiker die handmatig kan uitvoeren.
- Financiële bedragen zijn exclusief btw tenzij de data anders vermeldt.
- Noem bij cijfers de gebruikte periode indien beschikbaar.
- Geef maximaal drie relevante navigatielinks in dit formaat aan het einde:
  LINKS:
  - Label | /route
- Geef vóór LINKS alleen het normale antwoord.
`.trim();

    const context = JSON.stringify(
      {
        currentPage: body.pathname,
        helpContext: body.helpContext,
        stitchData: body.snapshot,
      },
      null,
      2,
    );

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type":
            "application/json",
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: systemPrompt,
                },
              ],
            },
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `Vraag:\n${question}\n\nContext:\n${context}`,
                },
              ],
            },
          ],
          max_output_tokens: 900,
        }),
      },
    );

    const payload =
      await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          fallback: true,
          reason:
            payload?.error?.message ||
            "OpenAI gaf een fout terug.",
        },
        { status: 200 },
      );
    }

    const text =
      extractOutputText(payload);

    if (!text) {
      return NextResponse.json({
        fallback: true,
        reason:
          "De AI gaf geen tekst terug.",
      });
    }

    const [answerPart, linksPart] =
      text.split(/\nLINKS:\s*/i);

    const links = (linksPart || "")
      .split("\n")
      .map((line: string) =>
        line.replace(/^\s*-\s*/, ""),
      )
      .map((line: string) => {
        const [label, href] =
          line.split("|").map(
            (value) => value.trim(),
          );

        return label &&
          href?.startsWith("/")
          ? { label, href }
          : null;
      })
      .filter(Boolean);

    return NextResponse.json({
      answer: answerPart.trim(),
      links,
      source:
        "STITCH Assistant met AI",
    });
  } catch (error) {
    return NextResponse.json(
      {
        fallback: true,
        reason:
          error instanceof Error
            ? error.message
            : "Onbekende fout.",
      },
      { status: 200 },
    );
  }
}
