import QRCode from "qrcode";
import { normalizeIban } from "./validators";

// Builds an EPC069-12 "SEPA Credit Transfer" QR payload (commonly called a
// "GiroCode" in Germany/Austria) - a plain-text, line-based format that most
// European banking apps can scan directly to prefill a bank transfer. This is
// purely a well-known, publicly documented text format: Godwit never touches,
// processes, or receives the money itself, it only renders this text as a QR
// code image using the same `qrcode` package already used for poll QR codes.
export function buildSepaQrPayload({ iban, accountHolderName, bic, amount, currency = "EUR", reference, message }) {
  const lines = [
    "BCD",
    "002",
    "1",
    "SCT",
    bic ? String(bic).trim().slice(0, 11) : "",
    String(accountHolderName || "").trim().slice(0, 70),
    normalizeIban(iban),
    amount ? `${currency}${Number(amount).toFixed(2)}` : "",
    "",
    reference ? String(reference).trim().slice(0, 35) : "",
    message ? String(message).trim().slice(0, 140) : ""
  ];
  return lines.join("\n");
}

export async function buildSepaQrDataUrl(details) {
  const payload = buildSepaQrPayload(details);
  return QRCode.toDataURL(payload, { margin: 1, width: 240 });
}
