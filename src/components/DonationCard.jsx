import { useState } from "react";
import { startDonationCheckout } from "../lib/donationCheckout";

// Renders one venue-support QR-campaign item: an amount field and a support button that redirects
// to a Stripe-hosted Checkout page. Stripe splits the payment automatically - 91% transfers to
// the venue's own connected Stripe account, and a 9% platform fee stays with Godwit - which is
// why the fee is disclosed here rather than only in the Terms (donors should know before they pay).
export default function DonationCard({ item, campaignToken }) {
  const suggested = item.donation_suggested_amount ? Number(item.donation_suggested_amount) : null;
  const [amount, setAmount] = useState(suggested ? String(suggested) : "");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleDonate() {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter an amount to support this venue.");
      return;
    }
    setError("");
    setStatus("loading");
    try {
      const url = await startDonationCheckout({ campaignToken, itemId: item.item_id, amount: numericAmount });
      window.location.assign(url);
    } catch (checkoutError) {
      setError(checkoutError.message || "Unable to start the payment.");
      setStatus("idle");
    }
  }

  return (
    <div className="qr-portal-menu-item qr-portal-menu-donation">
      <span className="qr-portal-menu-item-title">{item.title || "Support this venue"}</span>
      {(item.body || item.donation_message) && (
        <p className="qr-portal-menu-item-body">{item.body || item.donation_message}</p>
      )}

      <div className="qr-donation-amount-row">
        <span className="qr-donation-currency">{item.donation_currency || "EUR"}</span>
        <input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Amount"
          className="qr-donation-amount-input"
          aria-label="Support amount"
        />
      </div>

      {error && <p className="qr-donation-error">{error}</p>}

      <button type="button" onClick={handleDonate} disabled={status === "loading"} className="qr-donation-button">
        {status === "loading" ? "Redirecting to Stripe…" : "Support this venue"}
      </button>

      <p className="qr-donation-disclaimer">
        Payments are securely processed by Stripe. This is a voluntary payment to the venue, not a charitable
        donation and not tax-deductible. Of each payment, 91% goes directly to this venue and 9% is a Godwit
        platform fee. Godwit never sees or stores your card details.
      </p>
    </div>
  );
}
