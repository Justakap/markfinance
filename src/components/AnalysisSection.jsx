import BuyCard from "./BuyCard";
import SellCard from "./SellCard";
import RsiBuyCard from "./RsiBuyCard";
import RsiSellCard from "./RsiSellCard";

const AnalysisSection = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 mt-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <BuyCard />
        <SellCard />
        <RsiBuyCard />
        <RsiSellCard />
      </div>
    </div>
  );
};

export default AnalysisSection;
