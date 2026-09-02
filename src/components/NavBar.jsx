import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="bg-brand.dark text-white shadow mb-6">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold tracking-wide">
          iVote
        </Link>

        <div className="space-x-6 text-lg">
          <Link
            to="/"
            className="hover:text-brand.light transition"
          >
            Create Poll
          </Link>

          <Link
            to="/admin"
            className="hover:text-brand.light transition"
          >
            Admin
          </Link>
        </div>
      </div>
    </nav>
  );
}
