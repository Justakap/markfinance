import { memo, useEffect, useRef, useState } from "react";
import {
  formatChangeAmount,
  formatChangePercent,
  formatPriceFromQuote,
} from "../utils/currency";

const displaySymbol = (symbol) =>
  symbol.replace(".NS", "").replace(".BO", "");

const getMarketColor = (market) => {
  switch (market) {
    case "NSE":
      return "bg-blue-100 text-blue-700";
    case "BSE":
      return "bg-indigo-100 text-indigo-700";
    case "NASDAQ":
      return "bg-green-100 text-green-700";
    case "NYSE":
      return "bg-purple-100 text-purple-700";
    case "CRYPTO":
    case "CCC":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const StockTableRow = memo(function StockTableRow({
  stock,
  quote,
  rsiData,
  selectionMode,
  isSelected,
  onToggleSelect,
}) {
  const prevPriceRef = useRef(quote?.price);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const prev = prevPriceRef.current;
    const next = quote?.price;

    if (prev != null && next != null && prev !== next) {
      setFlash(next > prev ? "up" : "down");
      const timer = setTimeout(() => setFlash(null), 700);
      prevPriceRef.current = next;
      return () => clearTimeout(timer);
    }

    prevPriceRef.current = next;
    return undefined;
  }, [quote?.price]);

  const flashClass =
    flash === "up"
      ? "bg-green-100/80"
      : flash === "down"
        ? "bg-red-100/80"
        : "";

  const changeValue = quote?.changeAmount ?? quote?.change ?? 0;
  const changeColor =
    changeValue > 0
      ? "text-green-600"
      : changeValue < 0
        ? "text-red-600"
        : "text-gray-600";

  const rowHighlight = isSelected ? "bg-blue-50/70" : "";

  return (
    <tr
      onClick={() => onToggleSelect?.(stock.symbol)}
      className={`border-t border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer ${flashClass} ${rowHighlight}`}
    >
      {selectionMode && (
        <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(stock.symbol)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </td>
      )}
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-blue-700">
            {displaySymbol(stock.symbol)}
          </span>
          <span
            className={`text-[10px] px-2 py-1 rounded-full font-medium ${getMarketColor(stock.market)}`}
          >
            {stock.market}
          </span>
        </div>
      </td>
      <td className="p-3 text-gray-800 text-sm">{stock.name}</td>
      <td className="p-3 text-gray-800 font-medium">
        {formatPriceFromQuote(quote, stock)}
      </td>
      <td className={`p-3 whitespace-nowrap ${changeColor}`}>
        <div className="flex flex-col leading-snug">
          <span className="text-sm font-semibold tabular-nums">
            {formatChangeAmount(quote, stock)}
          </span>
          <span className="text-[11px] font-medium tabular-nums opacity-80">
            {formatChangePercent(quote)}
          </span>
        </div>
      </td>
      <td className="p-3 text-gray-800 text-sm">
        {quote?.volume ? quote.volume.toLocaleString() : "--"}
      </td>
      <td className="p-3 text-gray-800">{quote?.ema20 ?? "--"}</td>
      <td className="p-3 text-gray-800">{rsiData.rsi ?? "--"}</td>
      <td className="p-3 text-gray-800">{rsiData.prev ?? "--"}</td>
      <td
        className={`p-3 font-semibold text-sm ${
          (rsiData.change || 0) > 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {rsiData.change != null
          ? `${rsiData.change > 0 ? "+" : ""}${Number(rsiData.change).toFixed(2)}%`
          : "--"}
      </td>
      <td className="p-3 text-gray-800">
        {quote?.pe != null ? Number(quote.pe).toFixed(2) : "--"}
      </td>
    </tr>
  );
});

export default StockTableRow;
