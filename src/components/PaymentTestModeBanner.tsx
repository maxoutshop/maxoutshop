const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
        Production checkout is not configured yet. Finish payments go-live to accept real payments.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full border-b border-border bg-surface px-4 py-2 text-center text-[11px] text-muted-foreground">
        Test mode — payments in the preview are not real.{" "}
        <a
          href="https://docs.lovable.dev/features/payments#test-and-live-environments"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Read more
        </a>
      </div>
    );
  }
  return null;
}
