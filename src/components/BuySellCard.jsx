const SellCard = () => {
  const data = [
    { rank: 1, pe: 697.36, stock: "NSE:MFSL" },
    { rank: 2, pe: 646.13, stock: "NSE:ETERNAL" },
    { rank: 3, pe: 375.71, stock: "NSE:NYKAA" },
    { rank: 4, pe: 180.64, stock: "NSE:LENSKART" },
    { rank: 5, pe: 172.99, stock: "NSE:POWERINDIA" },
  ];

  return (
    <div className="bg-white border border-red-200 rounded-xl shadow-sm overflow-hidden">
      <div className="bg-red-50 px-4 py-3 border-b border-red-100">
        <h2 className="text-lg font-bold text-red-700">Today's Sell</h2>
      </div>

      <table className="w-full">
        <thead>
          <tr className="text-gray-600">
            <th className="p-3">Rank</th>
            <th className="p-3">PE</th>
            <th className="p-3">Stock</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item) => (
            <tr
              key={item.rank}
              className="border-t border-gray-100 hover:bg-red-50"
            >
              <td className="p-3 text-center">{item.rank}</td>
              <td className="p-3 text-center">{item.pe}</td>
              <td className="p-3 text-center font-medium">{item.stock}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SellCard;
