import { memo, useEffect, useRef, useState } from "react";

const displaySymbol = (symbol) =>
  String(symbol || "").replace(".NS", "").replace(".BO", "");

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

const getTypeBadge = (type = "") => {
  const value = String(type || "").toUpperCase();

  if (value === "EQ") return "EQ";
  if (value === "INDEX") return "IDX";
  if (value.includes("FUT")) return "FUT";
  if (value.includes("OPT")) return "OPT";
  if (value === "ETF") return "ETF";
  if (value.includes("COM")) return "COM";
  return value || "INST";
};

const formatIndianNumber = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "--";
  return Number(value).toLocaleString("en-IN");
};

const formatSignedIndianNumber = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "--";
  const numeric = Number(value);
  if (numeric > 0) return `+${formatIndianNumber(numeric)}`;
  if (numeric < 0) return `-${formatIndianNumber(Math.abs(numeric))}`;
  return formatIndianNumber(0);
};

const formatDecimal = (value, digits = 2) => {
  if (value == null || Number.isNaN(Number(value))) return "--";
  return Number(value).toFixed(digits);
};

const formatIv = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "--";
  const numeric = Number(value);
  const display = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
  return display.toFixed(2);
};

const getSignedToneClass = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "text-gray-600";
  const numeric = Number(value);
  if (numeric > 0) return "text-green-600";
  if (numeric < 0) return "text-red-600";
  return "text-gray-600";
};

const GreekTableRow = memo(function GreekTableRow({
  stock,
  quote,
  selectionMode,
  isSelected,
  onToggleSelect,
}) {
  const prevPriceRef = useRef(quote?.ltp ?? quote?.price ?? quote?.optionPremium);
  const [flash, setFlash] = useState(null);
  const rate = Number(quote?.ltp ?? quote?.price ?? quote?.optionPremium);
  const vwap = Number(quote?.vwap);
  const oi = Number(quote?.oi ?? quote?.openInterest);
  const rsi = Number(quote?.rsi);
  const oiChange = Number(quote?.oiChange ?? quote?.changeInOi);
  const oiChangeColor =
    oiChange > 0 ? "text-green-600" : oiChange < 0 ? "text-red-600" : "text-gray-600";
  const vwapColor =
    Number.isFinite(rate) && Number.isFinite(vwap)
      ? rate < vwap
        ? "text-red-600"
        : rate > vwap
          ? "text-green-600"
          : "text-gray-800"
      : "text-gray-800";
  const rowId = stock.instrumentKey || stock.symbol;
  const rowHighlight = isSelected ? "bg-blue-50/70" : "";

  useEffect(() => {
    const prev = prevPriceRef.current;
    const next = quote?.ltp ?? quote?.price ?? quote?.optionPremium;

    if (prev != null && next != null && prev !== next) {
      setFlash(next > prev ? "up" : "down");
      const timer = setTimeout(() => setFlash(null), 900);
      prevPriceRef.current = next;
      return () => clearTimeout(timer);
    }

    prevPriceRef.current = next;
    return undefined;
  }, [quote?.ltp, quote?.price, quote?.optionPremium]);

  const flashClass =
    flash === "up"
      ? "bg-green-100"
      : flash === "down"
        ? "bg-red-100"
        : "";

  return (
    <tr
      onClick={() => onToggleSelect?.(rowId)}
      className={`border-t border-gray-200 hover:bg-blue-50 transition-colors duration-300 cursor-pointer ${flashClass} ${rowHighlight}`}
    >
      {selectionMode && (
        <td className="p-3 w-10" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect?.(rowId)}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </td>
      )}
      <td className="p-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-blue-700">
              {displaySymbol(stock.symbol)}
            </span>
            <span
              className={`text-[10px] px-2 py-1 rounded-full font-medium ${getMarketColor(stock.market)}`}
            >
              {stock.market}
            </span>
            <span className="text-[10px] px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-700">
              {getTypeBadge(stock.instrumentType || stock.assetType || stock.type)}
            </span>
          </div>
          <span className="text-xs text-gray-600">{stock.name}</span>
        </div>
      </td>
      <td className="p-3 text-gray-800 text-sm tabular-nums">
        {Number.isFinite(rate) ? formatDecimal(rate) : "--"}
      </td>
      <td className="p-3 text-gray-800 text-sm tabular-nums">
        {formatIndianNumber(oi)}
      </td>
      <td className="p-3 text-gray-800 text-sm tabular-nums">
        {Number.isFinite(rsi) ? formatDecimal(rsi) : "--"}
      </td>
      <td className={`p-3 text-sm tabular-nums font-semibold ${oiChangeColor}`}>
        {formatSignedIndianNumber(oiChange)}
      </td>
      <td className="p-3 text-gray-800 text-sm tabular-nums">
        {formatIv(quote?.iv)}
      </td>
      <td className={`p-3 text-sm tabular-nums font-semibold ${getSignedToneClass(quote?.delta)}`}>
        {formatDecimal(quote?.delta)}
      </td>
      <td className={`p-3 text-sm tabular-nums font-semibold ${getSignedToneClass(quote?.theta)}`}>
        {formatDecimal(quote?.theta)}
      </td>
      <td className={`p-3 text-sm tabular-nums font-semibold ${getSignedToneClass(quote?.gamma)}`}>
        {formatDecimal(quote?.gamma, 4)}
      </td>
      <td className={`p-3 text-sm tabular-nums font-semibold ${getSignedToneClass(quote?.vega)}`}>
        {formatDecimal(quote?.vega)}
      </td>
      <td className={`p-3 text-sm tabular-nums font-semibold ${vwapColor}`}>
        {formatDecimal(quote?.vwap)}
      </td>
    </tr>
  );
});

export default GreekTableRow;
