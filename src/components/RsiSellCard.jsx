const RsiSellCard = ({ stocks = [] }) => {
  return (
    <div className="bg-white border border-orange-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-orange-50 px-4 py-3 border-b border-orange-100">
        <h2 className="text-lg font-bold text-orange-700">RSI Sell</h2>
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-gray-600">
            <th className="p-3">Rank</th>
            <th className="p-3">RSI Change</th>
            <th className="p-3">Stock</th>
          </tr>
        </thead>

        <tbody>
          {stocks.map((item, index) => (
            <tr
              key={item.symbol}
              className="border-t border-gray-100 hover:bg-orange-50"
            >
              <td className="p-3 text-center">{index + 1}</td>

              <td
                className={`p-3 text-center font-semibold ${
                  item.activeRsiChange >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {item.activeRsiChange > 0 ? "" : ""}
                {item.activeRsiChange?.toFixed(2)}%
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
