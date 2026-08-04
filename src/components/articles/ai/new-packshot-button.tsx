"use client";

import { useRouter } from "next/navigation";

type Props = {
  articleId: string;
};

export function NewPackshotButton({
  articleId,
}: Props) {
  const router = useRouter();

  return (
    <button
      type="button"
      className="button button-primary"
      onClick={() =>
        router.push(
          `/ai-studio/product-studio?article=${encodeURIComponent(
            articleId,
          )}`,
        )
      }
    >
      ✨ Nieuwe AI Packshot
    </button>
  );
}
