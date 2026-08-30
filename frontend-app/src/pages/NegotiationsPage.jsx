import { useState, useEffect } from "react";
import { getMyNegotiations, respondToOffer } from "../api/negotiationApi";
import NegotiationCard from "../components/product/NegotiationCard";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function NegotiationsPage() {
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Grab the role so we know if they are a buyer or farmer
  const currentUserRole = JSON.parse(localStorage.getItem("user"))?.role;

  const loadNegotiations = async () => {
    setLoading(true);
    try {
      const data = await getMyNegotiations();
      setNegotiations(data);
    } catch (err) {
      toast.error(err.message || "Failed to load negotiations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNegotiations();
  }, []);

  // This function is passed down to the NegotiationCard
  // so it can trigger the API when the user clicks Accept/Reject/Counter
  const handleRespond = async (id, responseData) => {
    try {
      await respondToOffer(id, responseData);
      toast.success("Response sent successfully!");
      // Refresh the list immediately to update the UI
      loadNegotiations();
    } catch (err) {
      toast.error(err.message || "Failed to send response");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-agri-600" />
        <span className="ml-2 text-stone-600">Loading your deals...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-agri-900">Deal Dashboard</h1>
        <p className="text-stone-500 mt-1">
          Manage your active price negotiations and counter-offers here.
        </p>
      </div>

      {negotiations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-stone-200">
          <p className="text-stone-500 text-lg">You don't have any active negotiations right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {negotiations.map((neg) => (
            <NegotiationCard
              key={neg.id}
              negotiation={neg}
              currentUserRole={currentUserRole}
              onRespond={handleRespond}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default NegotiationsPage;