export function renderReceipt(args: {
  receiptNumber: number;
  title: string;
  when: Date;
  seller: string;
  tableName: string;
  startedAt?: Date | null;
  endedAt?: Date | null;
  minutes?: number | null;
  rentalAmount?: number | null;
  items: { name: string; qty: number; unitPrice: number; lineTotal: number }[];
  total: number;
  method: "CASH" | "DEBIT";
}) {
  const dt = args.when.toLocaleString("es-CL");
  const lines = args.items.map(i =>
    `<div class="row"><div>${i.qty} x ${escapeHtml(i.name)}</div><div>$${fmt(i.lineTotal)}</div></div>`
  ).join("");

  const timeBlock = args.startedAt
    ? `<div class="small">Inicio: ${args.startedAt.toLocaleTimeString("es-CL")} · Fin: ${args.endedAt?.toLocaleTimeString("es-CL")} · Min: ${args.minutes ?? 0}</div>`
    : `<div class="small">Ticket de barra (sin arriendo)</div>`;

  const rentalBlock = args.startedAt
    ? `<div class="row"><div>Arriendo</div><div>$${fmt(args.rentalAmount ?? 0)}</div></div>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Voucher ${args.receiptNumber}</title>
<style>
  @page { size: 80mm auto; margin: 6mm; }
  body { font-family: system-ui, Arial; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: 800; }
  .small { font-size: 12px; }
  .row { display:flex; justify-content:space-between; gap:10px; font-size: 13px; }
  .hr { border-top: 1px dashed #000; margin: 8px 0; }
</style>
</head>
<body>
  <div class="center bold">KLUB HOUSE</div>
  <div class="center small">Tu lugar de entretención</div>
  <div class="center small">${dt}</div>
  <div class="hr"></div>

  <div class="row"><div>Folio</div><div class="bold">${args.receiptNumber}</div></div>
  <div class="row"><div>Mesa</div><div>${escapeHtml(args.tableName)}</div></div>
  <div class="row"><div>Vendedor</div><div>${escapeHtml(args.seller)}</div></div>
  ${timeBlock}

  <div class="hr"></div>
  ${lines}
  ${rentalBlock}
  <div class="hr"></div>

  <div class="row bold"><div>TOTAL</div><div>$${fmt(args.total)}</div></div>
  <div class="row"><div>Pago</div><div>${args.method === "CASH" ? "Efectivo" : "Débito"}</div></div>

  <div class="hr"></div>
  <div class="center small">Gracias por preferirnos ✦</div>
</body>
</html>`;
}

function fmt(n: number) {
  return n.toLocaleString("es-CL");
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c] as string));
}
