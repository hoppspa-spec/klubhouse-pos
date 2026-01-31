async function checkout(method: "CASH" | "DEBIT") {
  if (!ticket) return;
  setLoading(true);
  setErr(null);

  try {
    const res = await api<{
      ok: boolean;
      receiptNumber: number;
      total: number;
      receiptToken: string;
      alreadyPaid?: boolean;
    }>(`/tickets/${ticket.id}/checkout`, {
      method: "POST",
      body: JSON.stringify({ method }),
    });

    const url = `${API_URL}/tickets/${ticket.id}/receipt?token=${encodeURIComponent(res.receiptToken)}`;
    window.location.assign(url);
  } catch (e: any) {
    console.error(e);
    setErr(e?.message || "No pude cobrar.");
  } finally {
    setLoading(false);
  }
}
