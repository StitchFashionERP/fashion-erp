"use client";

import { useParams } from "next/navigation";
import { SalesOrderForm } from "@/components/sales-orders/SalesOrderForm";

export default function EditSalesOrderPage() {
  const params = useParams();

  return (
    <SalesOrderForm
      mode="edit"
      orderId={String(params.id)}
    />
  );
}
