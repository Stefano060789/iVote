import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function QrRedirect() {
  const navigate = useNavigate();
  const { token } = useParams();

  useEffect(() => {
    async function resolveQr() {
      const stableShortUrl = `${window.location.origin}/qr/${token}`;
      const { data, error } = await supabase
        .from("polls")
        .select("id")
        .eq("stable_short_url", stableShortUrl)
        .single();

      if (error || !data) {
        console.error(error);
        return;
      }

      navigate(`/vote/${data.id}`, { replace: true });
    }

    resolveQr();
  }, [navigate, token]);

  return <p className="text-center p-6">Opening poll...</p>;
}
