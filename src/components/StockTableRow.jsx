import { memo, useEffect, useRef, useState } from "react";
import {
  formatChangeAmount,
  formatChangePercent,
  formatPriceFromQuote,
} from "../utils/currency";
import { normalizeIndicatorQuote, toFiniteNumber } from "../utils/indicators";

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

const formatIndianNumber = (value) => {
  if (value == null || Number.isNaN(Number(value))) return "--";
  return Number(value).toLocaleString("en-IN");
};

const getVelocityDetails = (quote) => {
  const normalized = normalizeIndicatorQuote(quote);
  const rows = [
    { label: "5m", current: normalized?.rsi5m, prev: normalized?.prevRsi5m },
    { label: "15m", current: normalized?.rsi15m, prev: normalized?.prevRsi15m },
    {
      label: "1h",
      current: normalized?.hourlyRsi,
      prev: normalized?.prevHourlyRsi,
    },
    { label: "1d", current: normalized?.rsi, prev: normalized?.prevRsi },
  ];

  const allValid = rows.every(
    (row) =>
      Number.isFinite(toFiniteNumber(row.current)) &&
      Number.isFinite(toFiniteNumber(row.prev)),
  );

  if (!allValid) {
    return { value: "-", tone: "text-gray-500", rows };
  }

  const allAbove = rows.every((row) => Number(row.current) > Number(row.prev));
  const allBelow = rows.every((row) => Number(row.current) < Number(row.prev));

  if (allAbove) {
    return { value: "+ve", tone: "text-green-600", rows };
  }

  if (allBelow) {
    return { value: "-ve", tone: "text-red-600", rows };
  }

  return { value: "-", tone: "text-gray-500", rows };
};

const getPriceVelocityDetails = (quote) => {
  const normalized = normalizeIndicatorQuote(quote);
  const current = toFiniteNumber(normalized?.price ?? normalized?.ltp);
  const rows = [
    { label: "5m", current, prev: normalized?.prevPrice5m },
    { label: "15m", current, prev: normalized?.prevPrice15m },
    { label: "1h", current, prev: normalized?.prevPrice1h },
    { label: "1d", current, prev: normalized?.prevPrice },
  ];

  const allValid = rows.every(
    (row) =>
      Number.isFinite(toFiniteNumber(row.current)) &&
      Number.isFinite(toFiniteNumber(row.prev)),
  );

  if (!allValid) {
    return { value: "-", tone: "text-gray-500", current, rows };
  }

  const allAbove = rows.every((row) => Number(row.current) > Number(row.prev));
  const allBelow = rows.every((row) => Number(row.current) < Number(row.prev));

  if (allAbove) {
    return { value: "+ve", tone: "text-green-600", current, rows };
  }

  if (allBelow) {
    return { value: "-ve", tone: "text-red-600", current, rows };
  }

  return { value: "-", tone: "text-gray-500", current, rows };
};

const StockTableRow = memo(function StockTableRow({
  stock,
  quote,
  rsiData,
  selectionMode,
  isSelected,
  onToggleSelect,
}) {
  const prevPriceRef = useRef(quote?.price ?? quote?.ltp);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    const prev = prevPriceRef.current;
    const next = quote?.price ?? quote?.ltp;

    if (prev != null && next != null && prev !== next) {
      setFlash(next > prev ? "up" : "down");
      const timer = setTimeout(() => setFlash(null), 700);
      prevPriceRef.current = next;
      return () => clearTimeout(timer);
    }

    prevPriceRef.current = next;
    return undefined;
  }, [quote?.price, quote?.ltp]);

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
  const rowId = stock.instrumentKey || stock.symbol;
  const price = toFiniteNumber(quote?.price ?? quote?.ltp);
  const ema20 = toFiniteNumber(quote?.ema20);
  const volume = toFiniteNumber(quote?.volume);
  const volAvg = toFiniteNumber(quote?.volAvg);
  const acc = Number.isFinite(volume) && Number.isFinite(volAvg) && volAvg > 0
    ? volume / volAvg
    : null;
  const hasDmaSignal = Number.isFinite(price) && Number.isFinite(ema20);
  const isAboveDma = hasDmaSignal ? price > ema20 : null;
  const velocity = getVelocityDetails(quote);
  const priceVelocity = getPriceVelocityDetails(quote);

  return (
    <tr
      onClick={() => onToggleSelect?.(rowId)}
      className={`border-t border-gray-200 hover:bg-blue-50 transition-colors cursor-pointer ${flashClass} ${rowHighlight}`}
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
          <div className="flex items-center gap-2">
            <span className="font-medium text-blue-700 text-[14.5px]">
              {displaySymbol(stock.symbol)}
            </span>
            <span
              className={`text-[10px] px-2 py-1 rounded-full font-medium ${getMarketColor(stock.market)}`}
            >
              {stock.market}
            </span>
          </div>
          <span className="text-[11px] text-gray-600 truncate max-w-[180px]" title={stock.name}>
            {stock.name}
          </span>
        </div>
      </td>
      <td className="p-3 text-gray-800 font-medium text-[14.5px]">
        {formatPriceFromQuote(quote, stock)}
      </td>
      <td className={`p-3 whitespace-nowrap ${changeColor}`}>
        <div className="flex flex-col leading-snug">
          <span className="text-[13px] font-semibold tabular-nums">
            {formatChangeAmount(quote, stock)}
          </span>
          <span className="text-[10px] font-medium tabular-nums opacity-80">
            {formatChangePercent(quote)}
          </span>
        </div>
      </td>
      <td className="p-3 text-gray-800 text-[13px]">
        {formatIndianNumber(quote?.volume)}
      </td>
      <td className="p-3 text-gray-800 text-[13px]">
        {formatIndianNumber(quote?.volAvg)}
      </td>
      <td className="p-3 text-gray-800 text-[13px]">
        {acc != null ? acc.toFixed(2) : "--"}
      </td>
      <td className="p-3 text-gray-800 text-[14.5px]">{quote?.ema20 ?? "--"}</td>
      <td className="p-3 text-gray-800 text-[14.5px]">{quote?.ema75 ?? "--"}</td>
      <td
        className={`p-3 font-semibold text-[13px] ${
          isAboveDma == null
            ? "text-gray-500"
            : isAboveDma
              ? "text-green-600"
              : "text-red-600"
        }`}
      >
        {isAboveDma == null ? "--" : isAboveDma ? "Above" : "Below"}
      </td>
      <td className="p-3 text-gray-800 text-[14.5px]">{rsiData.rsi ?? "--"}</td>
      <td className="p-3 text-gray-800 text-[14.5px]">{rsiData.prev ?? "--"}</td>
      <td
        className={`p-3 font-semibold text-[13px] ${
          (rsiData.change || 0) > 0 ? "text-green-600" : "text-red-600"
        }`}
      >
        {rsiData.change != null
          ? `${rsiData.change > 0 ? "+" : ""}${Number(rsiData.change).toFixed(2)}`
          : "--"}
      </td>
      <td className={`group relative p-3 text-[13px] font-semibold ${velocity.tone}`}>
        <span>{velocity.value}</span>
        <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-72 rounded-md border border-gray-200 bg-white p-2 text-[11px] shadow-lg group-hover:block">
          <div className="mb-2 grid grid-cols-[44px_1fr_1fr_1fr] items-center gap-2 border-b border-gray-100 pb-1 font-semibold text-gray-600">
            <span>Time</span>
            <span className="text-right">Cur</span>
            <span className="text-right">Prev</span>
            <span className="text-right">Change</span>
          </div>
          <div className="space-y-1 text-gray-600">
            {velocity.rows.map((row) => {
              const current = toFiniteNumber(row.current);
              const prev = toFiniteNumber(row.prev);
              const change =
                Number.isFinite(current) && Number.isFinite(prev)
                  ? current - prev
                  : null;
              const changeClass =
                change == null
                  ? "text-gray-500"
                  : change > 0
                    ? "text-green-600"
                    : change < 0
                      ? "text-red-600"
                      : "text-gray-500";

              return (
                <div
                  key={row.label}
                  className="grid grid-cols-[44px_1fr_1fr_1fr] items-center gap-2"
                >
                  <span className="font-medium text-gray-700">{row.label}</span>
                  <span className="text-right tabular-nums text-gray-800">
                    {Number.isFinite(current) ? current.toFixed(2) : "--"}
                  </span>
                  <span className="text-right tabular-nums text-gray-800">
                    {Number.isFinite(prev) ? prev.toFixed(2) : "--"}
                  </span>
                  <span className={`text-right tabular-nums font-semibold ${changeClass}`}>
                    {change == null
                      ? "--"
                      : `${change > 0 ? "+" : ""}${change.toFixed(2)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </td>
      <td className={`group relative p-3 text-[13px] font-semibold ${priceVelocity.tone}`}>
        <span>{priceVelocity.value}</span>
        <div className="pointer-events-none absolute right-0 top-full z-20 mt-2 hidden w-72 rounded-md border border-gray-200 bg-white p-2 text-[11px] shadow-lg group-hover:block">
          <div className="mb-2 flex items-center justify-between border-b border-gray-100 pb-2">
            <span className="font-semibold text-gray-700">Current</span>
            <span className="tabular-nums font-semibold text-gray-900">
              {Number.isFinite(priceVelocity.current)
                ? priceVelocity.current.toFixed(2)
                : "--"}
            </span>
          </div>
          <div className="mb-2 grid grid-cols-[44px_1fr_1fr] items-center gap-2 border-b border-gray-100 pb-1 font-semibold text-gray-600">
            <span>Time</span>
            <span className="text-right">Prev</span>
            <span className="text-right">Change</span>
          </div>
          <div className="space-y-1 text-gray-600">
            {priceVelocity.rows.map((row) => {
              const current = toFiniteNumber(priceVelocity.current);
              const prev = toFiniteNumber(row.prev);
              const change =
                Number.isFinite(current) && Number.isFinite(prev)
                  ? current - prev
                  : null;
              const changeClass =
                change == null
                  ? "text-gray-500"
                  : change > 0
                    ? "text-green-600"
                    : change < 0
                      ? "text-red-600"
                      : "text-gray-500";

              return (
                <div
                  key={row.label}
                  className="grid grid-cols-[44px_1fr_1fr] items-center gap-2"
                >
                  <span className="font-medium text-gray-700">{row.label}</span>
                  <span className="text-right tabular-nums text-gray-800">
                    {Number.isFinite(prev) ? prev.toFixed(2) : "--"}
                  </span>
                  <span className={`text-right tabular-nums font-semibold ${changeClass}`}>
                    {change == null
                      ? "--"
                      : `${change > 0 ? "+" : ""}${change.toFixed(2)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </td>
      <td className="p-3 text-gray-800 text-[14.5px]">
        {quote?.pe != null ? Number(quote.pe).toFixed(2) : "--"}
      </td>
    </tr>
  );
});

export default StockTableRow;
