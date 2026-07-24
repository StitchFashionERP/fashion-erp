"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getStoredProducts, getColorArticleCode } from "@/lib/articles";
import { getCustomers, getColors, type Customer } from "@/lib/master-data";
import { getProductMedia } from "@/lib/product-media";
import { resolveSalesPrice } from "@/lib/price-lists";
import { createSalesOrder, type SalesOrderStatus } from "@/lib/sales";
import styles from "./new-sales-order.module.css";

type MatrixVariant = {
  productId: string; productName: string; productCode: string; color: string;
  colorCode: string; articleCode: string; imageUrl: string; variantId: string;
  sku: string; size: string; availableStock: number; unitPrice: number;
  recommendedRetailPrice: number;
};
type MatrixRow = { key: string; productId: string; productName: string; articleCode: string; color: string; imageUrl: string; variants: MatrixVariant[] };

const sizeOrder = ["XXS","XS","S","M","L","XL","XXL","3XL","32","34","36","38","40","42","44","46","48","50","52","OS"];
const rankSize = (value: string) => { const i=sizeOrder.indexOf(value.toUpperCase()); return i >= 0 ? i : 1000 + (Number(value) || 0); };

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [customers,setCustomers]=useState<Customer[]>([]); const [customerId,setCustomerId]=useState("");
  const [requestedDeliveryDate,setRequestedDeliveryDate]=useState(""); const [status,setStatus]=useState<SalesOrderStatus>("Concept");
  const [notes,setNotes]=useState(""); const [variants,setVariants]=useState<MatrixVariant[]>([]);
  const [quantities,setQuantities]=useState<Record<string,number>>({}); const [search,setSearch]=useState(""); const [error,setError]=useState("");

  useEffect(()=>{
    const customerValues=getCustomers().filter(c=>c.status==="Actief"); setCustomers(customerValues); setCustomerId(customerValues[0]?.id??"");
    const colors=getColors(); const colorMap=new Map(colors.map(c=>[c.name.toLowerCase(),c.code]));
    setVariants(getStoredProducts().flatMap(product=>{
      const media=getProductMedia(product.id); const primary=media.find(m=>m.isPrimary)??media[0];
      return product.variants.map(v=>{ const colorCode=colorMap.get(v.color.toLowerCase())??v.color.slice(0,3).toUpperCase(); return {
        productId:product.id, productName:product.name, productCode:product.code, color:v.color, colorCode,
        articleCode:getColorArticleCode(product.code,colorCode), imageUrl:primary?.dataUrl??"", variantId:v.id, sku:v.sku, size:v.size,
        availableStock:v.physicalStock-v.reservedStock, unitPrice:v.wholesalePrice, recommendedRetailPrice:v.recommendedRetailPrice||product.recommendedRetailPrice||0,
      }; });
    }));
  },[]);

  const customer=customers.find(c=>c.id===customerId);
  const rows=useMemo<MatrixRow[]>(()=>{ const q=search.trim().toLowerCase(); const map=new Map<string,MatrixRow>();
    variants.filter(v=>!q||[v.productName,v.articleCode,v.color,v.sku].join(" ").toLowerCase().includes(q)).forEach(v=>{
      const key=`${v.productId}__${v.color}`; const row=map.get(key)??{key,productId:v.productId,productName:v.productName,articleCode:v.articleCode,color:v.color,imageUrl:v.imageUrl,variants:[]}; row.variants.push(v); map.set(key,row);
    }); return [...map.values()].map(r=>({...r,variants:r.variants.sort((a,b)=>rankSize(a.size)-rankSize(b.size))}));
  },[variants,search]);
  const allSizes=useMemo(()=>[...new Set(rows.flatMap(r=>r.variants.map(v=>v.size)))].sort((a,b)=>rankSize(a)-rankSize(b)),[rows]);
  const selectedLines=variants.filter(v=>(quantities[v.variantId]??0)>0).map(v=>{ const quantity=quantities[v.variantId]??0; const price=resolveSalesPrice({basePrice:v.unitPrice,customerId:customer?.id||"",priceListId:customer?.priceListId||"price-list-standard",productId:v.productId,variantId:v.variantId,quantity}); return {...v,quantity,unitPrice:price.unitPrice}; });
  const totalQuantity=selectedLines.reduce((t,l)=>t+l.quantity,0); const subtotalBeforeDiscount=selectedLines.reduce((t,l)=>t+l.quantity*l.unitPrice,0); const discountPercentage=customer?.discountPercentage??0; const subtotal=subtotalBeforeDiscount*(1-discountPercentage/100);
  const setQuantity=(id:string,value:string)=>setQuantities(c=>({...c,[id]:Math.max(0,Number.parseInt(value||"0",10)||0)}));
  function handleSave(){ setError(""); if(!customer)return setError("Selecteer een klant."); if(!selectedLines.length)return setError("Vul bij minimaal één maat een aantal in.");
    try { const order=createSalesOrder({customerId:customer.id,customerNumber:customer.customerNumber,customerName:customer.companyName,contactPerson:customer.contactPerson,email:customer.email,city:customer.city,requestedDeliveryDate,status,paymentDays:customer.paymentDays,paymentDiscountPercentage:customer.paymentDiscountPercentage,paymentDiscountDays:customer.paymentDiscountDays,discountPercentage:customer.discountPercentage,notes,lines:selectedLines.map(l=>({productId:l.productId,productCode:l.articleCode,productName:l.productName,variantId:l.variantId,sku:l.sku,color:l.color,size:l.size,quantity:l.quantity,unitPrice:l.unitPrice,recommendedRetailPrice:l.recommendedRetailPrice,discountPercentage:customer.discountPercentage}))}); router.push(`/verkoop/${order.id}`); }
    catch(e){setError(e instanceof Error?e.message:"De verkooporder kon niet worden opgeslagen.");}
  }

  return <div>
    <div className={styles.breadcrumb}><Link href="/verkoop">Verkooporders</Link><span>›</span><span>Nieuwe verkooporder</span></div>
    <PageHeader eyebrow="Verkoop" title="Nieuwe verkooporder" description="Voer aantallen per kleur en maat horizontaal in." />
    <section className={styles.layout}><div className={styles.mainColumn}>
      <article className="content-card"><div className="content-card-header"><h2 className="content-card-title">Ordergegevens</h2></div><div className={styles.formGrid}>
        <label><span>Klant</span><select value={customerId} onChange={e=>setCustomerId(e.target.value)}>{customers.map(c=><option key={c.id} value={c.id}>{c.companyName}</option>)}</select></label>
        <label><span>Gewenste leverdatum</span><input type="date" value={requestedDeliveryDate} onChange={e=>setRequestedDeliveryDate(e.target.value)} /></label>
        <label><span>Status</span><select value={status} onChange={e=>setStatus(e.target.value as SalesOrderStatus)}><option>Concept</option><option>Bevestigd</option></select></label>
        <label><span>Betaaltermijn</span><input value={customer?`${customer.paymentDays} dagen netto`:""} disabled /></label>
        <label className={styles.fullWidth}><span>Interne notitie</span><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)} /></label>
      </div></article>
      <article className="content-card"><div className="content-card-toolbar"><div className="table-search"><span>⌕</span><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zoek op artikelnummer, naam of kleur..." /></div></div>
        <div className="table-wrapper"><table className="data-table"><thead><tr><th style={{width:70}}>Foto</th><th>Artikelnummer + kleur</th>{allSizes.map(s=><th key={s} className="table-number">{s}</th>)}<th className="table-number">Totaal</th></tr></thead><tbody>
          {rows.map(row=>{const bySize=new Map(row.variants.map(v=>[v.size,v])); const rowTotal=row.variants.reduce((t,v)=>t+(quantities[v.variantId]??0),0); return <tr key={row.key}>
            <td>{row.imageUrl?<img src={row.imageUrl} alt={row.productName} className={styles.orderImage} />:<div className={styles.imagePlaceholder}>Geen foto</div>}</td>
            <td><strong>{row.articleCode}</strong><div>{row.productName} · {row.color}</div></td>
            {allSizes.map(size=>{const v=bySize.get(size); return <td key={size} className="table-number">{v?<div><input aria-label={`${row.articleCode} maat ${size}`} className={styles.matrixInput} type="number" min="0" value={quantities[v.variantId]??0} onChange={e=>setQuantity(v.variantId,e.target.value)} /><small className={v.availableStock<=5?styles.stockLow:styles.stockHint}>vrij {v.availableStock}</small></div>:<span className={styles.notAvailable}>—</span>}</td>})}
            <td className="table-number"><strong>{rowTotal}</strong></td></tr>})}
        </tbody></table></div>
      </article>
    </div><aside className={styles.sideColumn}><article className="content-card"><div className="content-card-header"><h2 className="content-card-title">Ordersamenvatting</h2></div><dl className={styles.summaryList}><div><dt>Klant</dt><dd>{customer?.companyName??"—"}</dd></div><div><dt>Orderregels</dt><dd>{selectedLines.length}</dd></div><div><dt>Aantal stuks</dt><dd>{totalQuantity}</dd></div><div><dt>Subtotaal</dt><dd>€ {subtotalBeforeDiscount.toLocaleString("nl-NL",{minimumFractionDigits:2})}</dd></div><div><dt>Korting</dt><dd>{discountPercentage}%</dd></div><div><dt>Na korting</dt><dd>€ {subtotal.toLocaleString("nl-NL",{minimumFractionDigits:2})}</dd></div></dl></article></aside></section>
    {error&&<div className={styles.error}>{error}</div>}<div className={styles.actions}><Link href="/verkoop" className="button button-secondary">Annuleren</Link><button className="button button-primary" type="button" onClick={handleSave}>Verkooporder opslaan</button></div>
  </div>;
}
