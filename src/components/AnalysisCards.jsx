import BuySellCard from "./BuySellCard";

const AnalysisCards = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 mt-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <BuySellCard title="Today's Buy" />

        <BuySellCard title="Today's Sell" />

        <BuySellCard title="RSI Buy" />

        <BuySellCard title="RSI Sell" />
      </div>
    </div>
  );
};

export default AnalysisCards;
