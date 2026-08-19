"use client";

import { useEffect, useState } from "react";

type Movement = {
  id: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
};

export function InventoryMovements({
  variantId,
}: {
  variantId: string;
}) {
  const [movements, setMovements] =
    useState<Movement[]>([]);

  useEffect(() => {
    async function load() {
      const response =
        await fetch(
          `/api/inventory/${variantId}/movements`,
        );

      const data =
        await response.json();

      setMovements(
        Array.isArray(data)
          ? data
          : [],
      );
    }

    load();
  }, [variantId]);

  if (movements.length === 0) {
    return (
      <div>
        Geen voorraadmutaties gevonden.
      </div>
    );
  }

  return (
    <div>
      {movements.map((movement) => (
        <div key={movement.id}>
          <div>
            {movement.movement_type}
          </div>

          <div>
            {movement.quantity > 0 ? "+" : ""}
            {movement.quantity}
          </div>

          <div>
            {new Intl.DateTimeFormat(
              "nl-NL",
            ).format(
              new Date(
                movement.created_at,
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
