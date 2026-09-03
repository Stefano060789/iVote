import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <nav className="bg-brand.dark text-white shadow mb-6">
      <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold tracking-wide">
          iVote
        </Link>

        <div className="space-x-4">
          <Link to="/admin" className="text-gray-700 hover:text-blue-600 font-medium">Admin</Link>
          <Link to="/create" className="text-gray-700 hover:text-blue-600 font-medium">Create Poll</Link>
        </div>
      </div>
    </nav>
  );
}
