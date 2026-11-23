"use strict";

const el = id => document.getElementById(id);

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("This file could not be read."));
    reader.readAsDataURL(file);
  });
}

let patterns=Object.keys(tilePaths).map((name,i)=>({code:"SC-00"+(i+1),name:{diamonds:"Diamond lattice",slots:"Staggered slots",waves:"Curved ribbons"}[name],src:svgUrl(patternSource(name)),folder:""}));
let revision=0;
const exportedStyle=`
:root{font:100%/1.5 system-ui,sans-serif;color:#183754}*{box-sizing:border-box}
body{max-width:76rem;margin:auto;padding:2rem 1rem;font-size:1.125rem}h1{font-size:2.25rem;line-height:1.15;overflow-wrap:anywhere}
label,input,button{font:inherit}input,button{padding:.5rem;min-height:2.75rem;max-width:100%}
nav{display:flex;gap:.75rem;align-items:end;flex-wrap:wrap}label{display:grid}
main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(14rem,100%),1fr));gap:1rem}
figure{margin:0;min-width:0;break-inside:avoid}img{width:100%;height:12rem;object-fit:contain;background:#edf2f7}
figcaption{overflow-wrap:anywhere}a{color:#0655d8}[hidden]{display:none!important}
@media print{nav,footer{display:none}body{padding:0}main{grid-template-columns:repeat(2,1fr)}figure{break-inside:avoid}img{height:45mm}@page{margin:14mm}}`;
function figure(doc,p) {
  const card=doc.createElement("figure"), img=doc.createElement("img"), cap=doc.createElement("figcaption");
  img.src=p.src;img.alt=p.name||p.code;
  cap.textContent=[p.code,p.name,p.folder].filter(Boolean).join(" · ");
  card.append(img,cap);return card;
}
function render() {
  const search=el("search").value.trim().toLocaleLowerCase();
  const visible=patterns.filter(p=>[p.name,p.code,p.folder].join(" ").toLocaleLowerCase().includes(search));
  el("summary").textContent=(el("title").value.trim()||"Screen patterns")+" · "+visible.length+" of "+patterns.length+(patterns.length===1?" swatch":" swatches");
  el("gallery").replaceChildren(...visible.map(p=>figure(document,p)));
  el("download").disabled=!patterns.length;el("print").disabled=!visible.length;
}
async function importFiles(files) {
  const turn=++revision, svg=[...files].filter(f=>/\.svg$/i.test(f.name));
  if(!svg.length){el("message").textContent="Select a folder containing SVGs or choose SVG files.";return;}
  if(svg.reduce((n,f)=>n+f.size,0)>60*1024*1024){el("message").textContent="Choose up to 60 MB of SVG artwork per catalogue.";return;}
  const next=[],skipped=[];
  for(const file of svg) {
    try {
      const raw=await file.text(), xml=new DOMParser().parseFromString(raw,"image/svg+xml");
      if(xml.documentElement.localName!=="svg"||xml.querySelector("parsererror"))throw new Error("Malformed SVG.");
      const base=file.name.replace(/\.svg$/i,"");
      const match=/^([A-Za-z]+[-_ ]?\d+[a-z]?)(?:[-_ ]+(.+))?$/i.exec(base);
      const code=match?match[1]:base, name=match?(match[2]||"").replace(/[-_]+/g," "):"";
      const folder=(file.webkitRelativePath||"").split("/").slice(1,-1).join(" / ");
      next.push({code,name,folder,src:await readFile(new Blob([raw],{type:"image/svg+xml"}))});
    } catch {skipped.push(file.name);}
    if(turn!==revision)return;
  }
  patterns=next.sort((a,b)=>a.code.localeCompare(b.code,undefined,{numeric:true})||a.name.localeCompare(b.name));
  el("search").value="";el("message").textContent=skipped.length?"Skipped unreadable SVGs · "+skipped.join(", "):"";
  render();
}
function exportCatalogue() {
  const title=el("title").value.trim()||"Screen patterns";
  const doc=document.implementation.createHTMLDocument(title);
  doc.documentElement.lang="en-ZA";
  const charset=doc.createElement("meta");charset.setAttribute("charset","utf-8");doc.head.prepend(charset);
  const viewport=doc.createElement("meta");viewport.name="viewport";viewport.content="width=device-width, initial-scale=1";doc.head.append(viewport);
  const style=doc.createElement("style");style.textContent=exportedStyle;doc.head.append(style);
  const h=doc.createElement("h1");h.textContent=title;
  const nav=doc.createElement("nav"), label=doc.createElement("label"), input=doc.createElement("input"), print=doc.createElement("button");
  label.textContent="Search patterns";input.type="search";input.id="search";label.append(input);
  print.id="print";print.textContent="Print swatches";nav.append(label,print);
  const count=doc.createElement("p");count.id="count";count.setAttribute("role","status");count.textContent=patterns.length+(patterns.length===1?" swatch":" swatches");
  const main=doc.createElement("main");main.append(...patterns.map(p=>figure(doc,p)));
  const script=doc.createElement("script");
  script.textContent=`const search=document.getElementById("search");
search.addEventListener("input",()=>{const q=search.value.trim().toLocaleLowerCase();let shown=0;for(const card of document.querySelectorAll("figure")){card.hidden=!card.textContent.toLocaleLowerCase().includes(q);if(!card.hidden)shown++;}document.getElementById("count").textContent=shown+(shown===1?" swatch":" swatches");});
document.getElementById("print").onclick=()=>window.print();`;
  doc.body.append(h,nav,count,main,script);
  download(new Blob(["<!doctype html>\n",doc.documentElement.outerHTML],{type:"text/html;charset=utf-8"}),"pattern-catalogue.html");
}
for(const id of ["folder","files"])el(id).onchange=e=>importFiles(e.target.files);
el("title").oninput=el("search").oninput=render;
el("download").onclick=exportCatalogue;
el("print").onclick=async()=>{await Promise.all([...el("gallery").querySelectorAll("img")].map(img=>img.decode().catch(()=>{})));window.print();};
render();
