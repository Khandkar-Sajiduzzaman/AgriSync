import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NegotiationCard({ negotiation, currentUserRole, onRespond }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isCountering, setIsCountering] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");

  const isActive = negotiation.status === "pending" || negotiation.status === "countered";
  const isFarmer = currentUserRole === "farmer";

  // Live countdown timer logic
  useEffect(() => {
    if (!isActive || !negotiation.expiresAt) return;

    const updateTimer = () => {
      const diff = new Date(negotiation.expiresAt) - new Date();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [negotiation.expiresAt, isActive]);

  const handleAction = (status) => {
    onRespond(negotiation.id, { 
      status, 
      counterPrice: status === "countered" ? Number(counterPrice) : null 
    });
    setIsCountering(false);
  };

  return (
    <div className={`p-5 rounded-xl border ${isActive ? 'border-agri-400 shadow-md bg-white' : 'border-stone-200 bg-stone-50 opacity-80'} transition-all`}>
      {/* Header & Timer */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-stone-800">{negotiation.product.name}</h3>
          <p className="text-sm text-stone-500">Original Price: ৳{negotiation.product.price}</p>
        </div>
        {isActive && timeLeft !== "Expired" && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold animate-pulse">
            <Clock className="w-4 h-4" />
            {timeLeft}
          </div>
        )}
      </div>

      {/* Current Offer Focus */}
      <div className="bg-cream-100 p-4 rounded-lg mb-4 text-center border border-cream-200">
        <p className="text-sm text-stone-600 mb-1 uppercase tracking-wider font-semibold">Current Offer</p>
        <p className="text-3xl font-extrabold text-agri-700">
          ৳{negotiation.status === 'countered' ? negotiation.counterPrice : negotiation.offerPrice}
        </p>
        <p className="text-xs text-stone-500 mt-2">
          "{negotiation.message}"
        </p>
      </div>

      {/* Action Area (Only show to Farmer if pending, or Buyer if countered) */}
      {isActive && timeLeft !== "Expired" && (
        <div className="mt-4">
          {/* Farmer sees actions on 'pending', Buyer sees actions on 'countered' */}
          {((isFarmer && negotiation.status === "pending") || (!isFarmer && negotiation.status === "countered")) ? (
            !isCountering ? (
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleAction("accepted")} 
                  className="flex-1 bg-agri-600 hover:bg-agri-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Accept
                </Button>
                <Button 
                  onClick={() => setIsCountering(true)} 
                  variant="outline" 
                  className="flex-1 border-agri-600 text-agri-700 hover:bg-agri-50"
                >
                  <ArrowRightLeft className="w-4 h-4 mr-2" /> Counter
                </Button>
                <Button 
                  onClick={() => handleAction("rejected")} 
                  variant="destructive" 
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <Input 
                  type="number" 
                  placeholder="Enter counter price (৳)" 
                  value={counterPrice}
                  onChange={(e) => setCounterPrice(e.target.value)}
                  className="flex-2"
                />
                <Button 
                  onClick={() => handleAction("countered")}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                >
                  Send Counter
                </Button>
                <Button variant="ghost" onClick={() => setIsCountering(false)}>Cancel</Button>
              </div>
            )
          ) : (
            <p className="text-sm text-stone-500 text-center italic">Waiting for the other party to respond...</p>
          )}
        </div>
      )}

      {/* Status Badges for completed deals */}
      {!isActive && (
        <div className={`mt-4 py-2 text-center rounded-lg font-bold text-sm ${
          negotiation.status === 'accepted' ? 'bg-green-100 text-green-800' :
          negotiation.status === 'rejected' ? 'bg-red-100 text-red-800' :
          'bg-stone-200 text-stone-600'
        }`}>
          {negotiation.status === 'accepted' ? 'Deal Accepted 🎉' : 
           negotiation.status === 'rejected' ? 'Deal Rejected' : 'Offer Expired'}
        </div>
      )}
    </div>
  );
}