const RsiSellCard = ({ stocks = [] }) => {
  return (
    <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-red-50 px-4 py-3 border-b border-red-100">
        <h2 className="text-lg font-bold text-red-700">RSI Sell (Overbought)</h2>
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-gray-600">
            <th className="p-3">Rank</th>
            <th className="p-3">RSI Daily</th>
            <th className="p-3">Stock</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((item, index) => (
            <tr
              key={item.symbol}
              className="border-t border-gray-100 hover:bg-red-50"
            >
              <td className="p-3 text-center">{index + 1}</td>
              <td className="p-3 text-center font-semibold text-red-700">
                {item.activeRsi?.toFixed(2)}
              </td>
              <td className="p-3 text-center font-medium">{item.symbol}</td>
            </tr>
          ))}
          {stocks.length === 0 && (
            <tr>
              <td colSpan="3" className="p-4 text-center text-gray-500">
                No Data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default RsiSellCard;
