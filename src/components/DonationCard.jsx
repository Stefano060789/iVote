import { useState } from "react";
import { useTranslation } from "react-i18next";
import { startDonationCheckout } from "../lib/donationCheckout";

// Renders one venue-support QR-campaign item: an amount field and a support button that redirects
// to a Stripe-hosted Checkout page. Stripe splits the payment automatically - 91% transfers to
// the venue's own connected Stripe account, and a 9% platform fee stays with Godwit - which is
// why the fee is disclosed here rather than only in the Terms (donors should know before they pay).
export default function DonationCard({ item, campaignToken }) {
  const { t } = useTranslation();
  const category = item.donation_category || "contribution";
  const categoryLabel = t(`donationCategories.${category}`);
  const suggested = item.donation_suggested_amount ? Number(item.donation_suggested_amount) : null;
  const [amount, setAmount] = useState(suggested ? String(suggested) : "");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  async function handleDonate() {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError(t("donationCard.amountRequired"));
      return;
    }
    setError("");
    setStatus("loading");
    try {
      const url = await startDonationCheckout({ campaignToken, itemId: item.item_id, amount: numericAmount });
      window.location.assign(url);
    } catch (checkoutError) {
      setError(checkoutError.message || t("donationCard.paymentFailed"));
      setStatus("idle");
    }
  }

  return (
    <div className="qr-portal-menu-item qr-portal-menu-donation">
      <span className="qr-portal-menu-item-title">{item.title || t("donationCard.defaultTitle", { category: categoryLabel })}</span>
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
          placeholder={t("donationCard.amount")}
          className="qr-donation-amount-input"
          aria-label={t("donationCard.amountLabel", { category: categoryLabel })}
        />
      </div>

      {error && <p className="qr-donation-error">{error}</p>}

      <button type="button" onClick={handleDonate} disabled={status === "loading"} className="qr-donation-button">
        {status === "loading" ? t("donationCard.redirecting") : t("donationCard.payButton", { category: categoryLabel })}
      </button>

      <p className="qr-donation-disclaimer">
        {t("donationCard.disclaimer", { category: categoryLabel })}
      </p>
    </div>
  );
}
