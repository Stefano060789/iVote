import { useEffect, useState } from "react";
import { formatIbanForDisplay, normalizeIban } from "../lib/validators";
import { buildSepaQrDataUrl } from "../lib/sepaQr";

// Renders one "donation" QR-campaign item: the organizer's IBAN/account details
// plus a scannable SEPA Credit Transfer QR (a "GiroCode"), so a voter's own
// banking app can prefill the transfer. Godwit never touches the money - this
// is purely a display of the organizer's own bank details.
export default function DonationCard({ item }) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [copiedField, setCopiedField] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (item.donation_iban) {
      buildSepaQrDataUrl({
        iban: item.donation_iban,
        accountHolderName: item.donation_account_holder_name,
        bic: item.donation_bic,
        amount: item.donation_suggested_amount,
        currency: item.donation_currency || "EUR",
        message: item.title || item.donation_message
      })
        .then((url) => { if (!cancelled) setQrDataUrl(url); })
        .catch((error) => console.error("Unable to build donation QR code", error));
    }
    return () => { cancelled = true; };
  }, [item.donation_iban, item.donation_account_holder_name, item.donation_bic, item.donation_suggested_amount, item.donation_currency, item.title, item.donation_message]);

  if (!item.donation_iban) return null;

  function copy(value, field) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(""), 2000);
    });
  }

  return (
    <div className="qr-portal-menu-item qr-portal-menu-donation">
      <span className="qr-portal-menu-item-title">{item.title || "Support this venue"}</span>
      {(item.body || item.donation_message) && (
        <p className="qr-portal-menu-item-body">{item.body || item.donation_message}</p>
      )}

      <div className="qr-donation-details">
        <div className="qr-donation-row">
          <div>
            <span className="qr-donation-label">IBAN</span>
            <span className="qr-donation-value">{formatIbanForDisplay(item.donation_iban)}</span>
          </div>
          <button type="button" onClick={() => copy(normalizeIban(item.donation_iban), "iban")} className="qr-donation-copy">
            {copiedField === "iban" ? "Copied!" : "Copy"}
          </button>
        </div>
        <div className="qr-donation-row">
          <div>
            <span className="qr-donation-label">Account holder</span>
            <span className="qr-donation-value">{item.donation_account_holder_name}</span>
          </div>
        </div>
        {item.donation_suggested_amount && (
          <div className="qr-donation-row">
            <div>
              <span className="qr-donation-label">Suggested amount</span>
              <span className="qr-donation-value">{item.donation_currency} {Number(item.donation_suggested_amount).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {qrDataUrl && (
        <div className="qr-donation-qr">
          <img src={qrDataUrl} alt="Scan with your banking app to donate" width="140" height="140" />
          <p>Scan with your banking app to prefill the transfer</p>
        </div>
      )}

      <p className="qr-donation-disclaimer">
        Donations go directly to the organizer's own bank account. Godwit does not process, receive, or take a fee on donations.
      </p>
    </div>
  );
}
