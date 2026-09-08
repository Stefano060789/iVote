import { Link } from "react-router-dom";

export default function ThankYou() {
  return (
    <div className="mx-auto max-w-lg p-10 text-center text-white">
      <h1 className="text-3xl font-bold mb-4">Thank you for voting!</h1>
      <p>Your vote has been recorded.</p>
      <div className="mt-8 border-t border-slate-700 pt-5">
        <p className="text-sm text-slate-300">iVote helps venues turn simple QR scans into useful feedback.</p>
        <Link to="/" className="mt-3 inline-block text-sm font-semibold text-teal-300 underline">Learn about iVote</Link>
      </div>
    </div>
  );
}
