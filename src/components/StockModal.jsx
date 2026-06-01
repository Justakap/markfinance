import BuyCard from "./BuyCard";
import SellCard from "./SellCard";
import RsiBuyCard from "./RsiBuyCard";
import RsiSellCard from "./RsiSellCard";

const StockModal = ({ closeModal, marketData = [], rsiTimeframe = "1d" }) => {
  const getRsiValue = (stock) => {
    switch (rsiTimeframe) {
      case "1m":
        return stock.rsi1m;
      case "5m":
        return stock.rsi5m;
      case "15m":
        return stock.rsi15m;
      case "1h":
        return stock.hourlyRsi;
      default:
        return stock.rsi;
    }
  };

  const buyStocks = [...marketData]
    .filter((s) => s.pe)
    .sort((a, b) => a.pe - b.pe)
    .slice(0, 5);

  const sellStocks = [...marketData]
    .filter((s) => s.pe)
    .sort((a, b) => b.pe - a.pe)
    .slice(0, 5);

  const rsiBuyStocks = [...marketData]
    .filter((s) => getRsiValue(s) != null)
    .sort((a, b) => getRsiValue(a) - getRsiValue(b))
    .slice(0, 5)
    .map((stock) => ({
      ...stock,
      activeRsi: getRsiValue(stock),
    }));

  const rsiSellStocks = [...marketData]
    .filter((s) => getRsiValue(s) != null)
    .sort((a, b) => getRsiValue(b) - getRsiValue(a))
    .slice(0, 5)
    .map((stock) => ({
      ...stock,
      activeRsi: getRsiValue(stock),
    }));

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-gray-50 w-full max-w-7xl rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Watchlist Analysis
            </h2>
            <p className="text-sm text-gray-500">Buy / Sell Recommendations</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="w-10 h-10 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition"
          >
            ✕
          </button>
        </div>
        <div className="p-6">
          <div className="grid lg:grid-cols-2 gap-6">
            <BuyCard stocks={buyStocks} />
            <SellCard stocks={sellStocks} />
            <RsiBuyCard stocks={rsiBuyStocks} />
            <RsiSellCard stocks={rsiSellStocks} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockModal;
