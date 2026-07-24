"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { AppIcon } from "@/components/ui/app-icon";
import { PageHeader } from "@/components/ui/page-header";
import { addProduct, getStoredProducts, type ProductInput } from "@/lib/articles";
import { getPricingDefaults } from "@/lib/company-settings";
import { calculatePricing } from "@/lib/pricing-engine";
import { parseCsv, parseXlsx } from "./xlsx-parser";
import styles from "./article-import.module.css";

type Row = Record<string, string | number>;
type Step = 1 | 2 | 3 | 4;
type ImportResult = { added: number; skipped: number; warnings: number; errors: string[] };

const fields = [
  ["productName","Productnaam",true,["productnaam","product name","naam"]],
  ["brand","Merk",false,["merk","brand"]],
  ["collection","Collectie",false,["collectie","collection"]],
  ["color","Kleur",true,["kleur","color","colour"]],
  ["colorCode","Kleurcode",false,["kleurcode","color code"]],
  ["size","Maat",true,["maat","size"]],
  ["supplier","Leverancier",false,["leverancier","supplier"]],
  ["supplierSku","Leveranciersartikelnummer",false,["leveranciersartikelnummer","supplier sku"]],
  ["purchasePrice","Inkoopprijs",false,["inkoopprijs","purchase price","cost"]],
  ["salesPrice","Verkoopprijs",false,["verkoopprijs","sales price"]],
  ["markup","Markup",false,["markup","factor"]],
  ["vat","BTW-percentage",false,["btw-percentage","btw","vat"]],
  ["ean","EAN",false,["ean","barcode","gtin"]],
  ["stock","Voorraad",false,["voorraad","stock"]],
  ["stockLocation","Voorraadlocatie",false,["voorraadlocatie","location"]],
  ["active","Actief",false,["actief","active","status"]],
  ["description","Omschrijving",false,["omschrijving","description"]],
  ["imageUrl","Afbeeldings-URL",false,["afbeeldings-url","image url","afbeelding"]],
] as const;

const norm=(value:string)=>value.toLowerCase().replace(/\*/g,"").replace(/[_-]+/g," ").replace(/\s+/g," ").trim();
const text=(row:Row, mapping:Record<string,string>, key:string)=>String(row[mapping[key]]??"").trim();
const numberValue=(value:string)=>{const parsed=Number(value.replace(/\./g,"").replace(",","."));return Number.isFinite(parsed)?parsed:0;};
const truthy=(value:string)=>!["nee","no","false","0","inactief"].includes(norm(value));

function nextImportCode(existingCodes:Set<string>, index:number){
  let sequence=index+1;
  let code=`IMP${String(sequence).padStart(7,"0")}`;
  while(existingCodes.has(code)){sequence+=1;code=`IMP${String(sequence).padStart(7,"0")}`;}
  existingCodes.add(code);
  return code;
}

export default function ArticleImportPage(){
  const inputRef=useRef<HTMLInputElement>(null);
  const [step,setStep]=useState<Step>(1);
  const [fileName,setFileName]=useState("");
  const [headers,setHeaders]=useState<string[]>([]);
  const [rows,setRows]=useState<Row[]>([]);
  const [mapping,setMapping]=useState<Record<string,string>>({});
  const [error,setError]=useState("");
  const [importing,setImporting]=useState(false);
  const [progress,setProgress]=useState(0);
  const [result,setResult]=useState<ImportResult|null>(null);

  const missing=useMemo(()=>fields.filter(([key,,required])=>required&&!mapping[key]),[mapping]);
  const stats=useMemo(()=>{
    let ok=0,warn=0,bad=0;
    rows.forEach(row=>{
      const requiredMissing=fields.some(([key,,required])=>required&&!text(row,mapping,key));
      if(requiredMissing) bad++;
      else if(!text(row,mapping,"ean")||!text(row,mapping,"supplier")) warn++;
      else ok++;
    });
    return {ok,warn,bad};
  },[mapping,rows]);

  async function handleFile(file?:File){
    if(!file)return;
    const ext=file.name.split(".").pop()?.toLowerCase();
    if(ext!=="xlsx"&&ext!=="csv"){setError("Gebruik een Excel-bestand (.xlsx) of CSV-bestand (.csv).");return;}
    try{
      const parsed=ext==="csv"?parseCsv(await file.text()):await parseXlsx(await file.arrayBuffer());
      if(!parsed.length)throw new Error();
      const newHeaders=Object.keys(parsed[0]);
      const auto:Record<string,string>={};
      fields.forEach(([key,,,aliases])=>{const match=newHeaders.find(h=>aliases.some(a=>norm(a)===norm(h)));if(match)auto[key]=match;});
      setFileName(file.name);setRows(parsed);setHeaders(newHeaders);setMapping(auto);setError("");setResult(null);setStep(2);
    }catch{setError("Het bestand kon niet worden gelezen. Controleer het sjabloon en probeer opnieuw.");}
  }

  async function runImport(){
    setImporting(true);setError("");setProgress(0);
    const errors:string[]=[];
    let added=0,skipped=0,warnings=0;
    try{
      const defaults=getPricingDefaults();
      const existing=getStoredProducts();
      const existingCodes=new Set(existing.map(product=>product.code));
      const existingEans=new Set(existing.flatMap(product=>product.variants.map(variant=>variant.ean).filter(Boolean) as string[]));

      for(let index=0;index<rows.length;index+=1){
        const row=rows[index];
        const name=text(row,mapping,"productName");
        const color=text(row,mapping,"color");
        const size=text(row,mapping,"size");
        if(!name||!color||!size){skipped+=1;errors.push(`Regel ${index+2}: productnaam, kleur of maat ontbreekt.`);continue;}

        const ean=text(row,mapping,"ean");
        if(ean&&existingEans.has(ean)){skipped+=1;errors.push(`Regel ${index+2}: EAN ${ean} bestaat al.`);continue;}
        if(ean)existingEans.add(ean); else warnings+=1;

        const purchasePrice=numberValue(text(row,mapping,"purchasePrice"));
        const suppliedSalesPrice=numberValue(text(row,mapping,"salesPrice"));
        const suppliedMarkup=numberValue(text(row,mapping,"markup"));
        const pricing=calculatePricing({supplierPurchasePrice:purchasePrice,brandMarkup:suppliedMarkup||defaults.brandMarkup,salesPrice:suppliedSalesPrice||undefined},suppliedSalesPrice>0?"sales-price":"brand-markup",defaults);
        const collection=text(row,mapping,"collection")||"Import";
        const brand=text(row,mapping,"brand")||"Onbekend";
        const supplier=text(row,mapping,"supplier")||"";
        if(!supplier)warnings+=1;

        const supplierProductCode=text(row,mapping,"supplierSku");

        const input:ProductInput={
          code:nextImportCode(existingCodes,existingCodes.size),
          supplierProductCode,
          name,
          collection,
          category:"",
          supplier,
          status:truthy(text(row,mapping,"active"))?"Actief":"Inactief",
          vatCode:"2V",
          brand,
          material:"",
          garmentType:"",
          fit:"",
          colorFamily:color,
          seasonType:"Doorlopend",
          countryOfOrigin:"",
          description:text(row,mapping,"description"),
          purchasePrice:pricing.supplierPurchasePrice,
          wholesalePrice:pricing.salesPrice,
          shippingCosts:pricing.shippingCosts,
          otherCosts:pricing.otherCosts,
          totalCost:pricing.totalCost,
          brandMarkup:pricing.brandMarkup,
          recommendedRetailPrice:pricing.recommendedRetailPrice,
          retailerMarkup:pricing.retailerMarkup,
          colors:[color],
          sizes:[size],
          importedVariants:[{color,size,stock:numberValue(text(row,mapping,"stock")),ean:ean||undefined,supplierVariantCode:text(row,mapping,"supplierSku")||undefined}],
        };
        addProduct(input);added+=1;
        setProgress(Math.round(((index+1)/rows.length)*100));
        if(index%20===0)await new Promise(resolve=>setTimeout(resolve,0));
      }
      const importResult={added,skipped,warnings,errors};
      setResult(importResult);
      window.localStorage.setItem("fashion-erp-article-import-history-v1",JSON.stringify([{id:`import-${Date.now()}`,fileName,createdAt:new Date().toISOString(),...importResult},...JSON.parse(window.localStorage.getItem("fashion-erp-article-import-history-v1")||"[]")].slice(0,100)));
      setProgress(100);
    }catch(caught){setError(caught instanceof Error?caught.message:"Importeren is mislukt.");}
    finally{setImporting(false);}
  }

  function downloadLog(){
    if(!result)return;
    const lines=["Resultaat;Aantal",`Toegevoegd;${result.added}`,`Overgeslagen;${result.skipped}`,`Waarschuwingen;${result.warnings}`,"",...result.errors.map(item=>`Fout;${item.replaceAll(";",",")}`)];
    const blob=new Blob(["\ufeff"+lines.join("\n")],{type:"text/csv;charset=utf-8"});
    const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`STiTch-importlog-${new Date().toISOString().slice(0,10)}.csv`;anchor.click();URL.revokeObjectURL(url);
  }

  return <div>
    <PageHeader eyebrow="Import Center" title="Artikelen importeren" description="Upload, koppel, controleer en importeer artikelgegevens veilig in STiTch."/>
    <div className={styles.steps}>{["Bestand","Kolommen koppelen","Controleren","Importeren"].map((label,index)=><span key={label} className={step===index+1?styles.activeStep:""}>{index+1}. {label}</span>)}</div>

    {step===1&&<><section className={styles.templateCard}><div className={styles.iconBox}><AppIcon name="document" size={22}/></div><div className={styles.templateText}><h2>Gebruik het STiTch Excel-sjabloon</h2><p>Het bestand bevat het juiste grid, een voorbeeldregel en uitleg. STiTch maakt interne artikelnummers automatisch aan.</p><div className={styles.requiredFields}>Verplicht: productnaam, kleur en maat</div></div><a className={styles.downloadButton} href="/templates/STiTch-artikelimport-template.xlsx" download>Excel-sjabloon downloaden</a></section><section className={styles.uploadCard}><div><h2>Upload het ingevulde bestand</h2><p>Ondersteunde bestanden: .xlsx en .csv</p></div><div className={styles.dropZone} onClick={()=>inputRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void handleFile(e.dataTransfer.files[0]);}}><input ref={inputRef} className={styles.fileInput} type="file" accept=".xlsx,.csv" onChange={e=>void handleFile(e.target.files?.[0])}/><span className={styles.uploadIcon}><AppIcon name="clipboard" size={22}/></span><strong>Sleep het bestand hierheen</strong><span>of klik om een bestand te kiezen</span></div>{error&&<p className={styles.error}>{error}</p>}<div className={styles.actions}><Link href="/instellingen/import-center" className={styles.secondaryButton}>Terug</Link></div></section></>}

    {step===2&&<section className={styles.uploadCard}><div className={styles.sectionHeader}><div><h2>Kolommen koppelen</h2><p>{fileName} · {rows.length} regels gevonden</p></div><button className={styles.textButton} onClick={()=>setStep(1)}>Ander bestand</button></div><div className={styles.mappingTable}><div className={styles.mappingHeader}><div>STiTch-veld</div><div>Kolom uit bestand</div><div>Voorbeeld</div></div>{fields.map(([key,label,required])=>{const selected=mapping[key]??"";return <div className={styles.mappingRow} key={key}><div><strong>{label}</strong>{required&&<span className={styles.required}> *</span>}</div><select value={selected} onChange={e=>setMapping(current=>({...current,[key]:e.target.value}))}><option value="">Niet koppelen</option>{headers.map(header=><option key={header}>{header}</option>)}</select><div className={styles.example}>{selected?String(rows[0]?.[selected]??"—"):"—"}</div></div>})}</div>{missing.length>0&&<p className={styles.error}>Koppel eerst: {missing.map(([,label])=>label).join(", ")}.</p>}<div className={styles.actions}><button className={styles.secondaryButton} onClick={()=>setStep(1)}>Terug</button><button className={styles.primaryButton} disabled={missing.length>0} onClick={()=>setStep(3)}>Controleren <AppIcon name="arrowRight" size={15}/></button></div></section>}

    {step===3&&<section className={styles.uploadCard}><div><h2>Import controleren</h2><p>Bekijk de eerste regels en los eventuele fouten eerst op.</p></div><div className={styles.summary}><div><strong>{rows.length}</strong><span>Regels</span></div><div><strong>{stats.ok}</strong><span>Volledig</span></div><div><strong>{stats.warn}</strong><span>Waarschuwingen</span></div><div><strong>{stats.bad}</strong><span>Fouten</span></div></div><div className={styles.previewWrap}><table className={styles.preview}><thead><tr><th>Productnaam</th><th>Kleur</th><th>Maat</th><th>Leverancier</th><th>EAN</th><th>Status</th></tr></thead><tbody>{rows.slice(0,10).map((row,index)=>{const bad=fields.some(([key,,required])=>required&&!text(row,mapping,key));const warn=!text(row,mapping,"ean")||!text(row,mapping,"supplier");return <tr key={index}><td>{text(row,mapping,"productName")||"—"}</td><td>{text(row,mapping,"color")||"—"}</td><td>{text(row,mapping,"size")||"—"}</td><td>{text(row,mapping,"supplier")||"—"}</td><td>{text(row,mapping,"ean")||"—"}</td><td><span className={bad?styles.bad:warn?styles.warn:styles.ok}>{bad?"Fout":warn?"Waarschuwing":"Gereed"}</span></td></tr>})}</tbody></table></div><div className={styles.actions}><button className={styles.secondaryButton} onClick={()=>setStep(2)}>Terug</button><button className={styles.primaryButton} disabled={stats.bad>0} onClick={()=>setStep(4)}>Naar importeren <AppIcon name="arrowRight" size={15}/></button></div></section>}

    {step===4&&<section className={styles.completeCard}>{!result?<><span className={styles.completeIcon}><AppIcon name="clipboard" size={28}/></span><h2>{rows.length} artikelen klaarzetten</h2><p>STiTch maakt interne artikelnummers, berekent ontbrekende prijzen en slaat iedere regel met de juiste kleur, maat, voorraad en EAN op.</p>{importing&&<div className={styles.progressTrack}><div className={styles.progressBar} style={{width:`${progress}%`}}/></div>}{importing&&<div className={styles.progressLabel}>{progress}% voltooid</div>}{error&&<p className={styles.error}>{error}</p>}<div className={styles.actions}><button className={styles.secondaryButton} disabled={importing} onClick={()=>setStep(3)}>Terug</button><button className={styles.primaryButton} disabled={importing} onClick={()=>void runImport()}>{importing?"Importeren...":"Import uitvoeren"}</button></div></>:<><span className={styles.completeIcon}><AppIcon name="check" size={28}/></span><h2>Import afgerond</h2><p>{result.added} artikelen toegevoegd, {result.skipped} overgeslagen en {result.warnings} waarschuwingen geregistreerd.</p><div className={styles.summary}><div><strong>{result.added}</strong><span>Toegevoegd</span></div><div><strong>{result.skipped}</strong><span>Overgeslagen</span></div><div><strong>{result.warnings}</strong><span>Waarschuwingen</span></div><div><strong>{result.errors.length}</strong><span>Foutmeldingen</span></div></div>{result.errors.length>0&&<div className={styles.errorList}>{result.errors.slice(0,8).map(item=><div key={item}>{item}</div>)}</div>}<div className={styles.actions}><button className={styles.secondaryButton} onClick={downloadLog}>Importlog downloaden</button><Link className={styles.primaryButton} href="/artikelen">Naar artikelen</Link></div></>}</section>}
  </div>;
}
