import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const formatTimeLabel = () =>
  new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

const escapeCsvValue = (value) => {
  if (value == null) return "";
  const text = String(value);
  if (/["\n,]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const TableExportMenu = ({
  rows = [],
  columns = [],
  filePrefix = "Report",
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const buildFilenameBase = () => `${filePrefix}_${formatTimeLabel()}`;

  const matrix = useMemo(
    () =>
      rows.map((row) =>
        columns.map((column) =>
          typeof column.value === "function"
            ? column.value(row)
            : row[column.value],
        ),
      ),
    [rows, columns],
  );

  const headers = useMemo(
    () => columns.map((column) => column.label),
    [columns],
  );

  const exportCsv = () => {
    const csv = [headers, ...matrix]
      .map((line) => line.map(escapeCsvValue).join(","))
      .join("\n");

    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
      `${buildFilenameBase()}.csv`,
    );
    setOpen(false);
  };

  const exportXlsx = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...matrix]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${buildFilenameBase()}.xlsx`);
    setOpen(false);
  };

  const exportPdf = () => {
    const doc = new jsPDF({
      orientation: columns.length > 7 ? "landscape" : "portrait",
      unit: "pt",
      format: "a4",
    });

    autoTable(doc, {
      head: [headers],
      body: matrix,
      styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [37, 99, 235] },
      margin: { top: 28, left: 18, right: 18, bottom: 24 },
    });

    doc.save(`${buildFilenameBase()}.pdf`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className="inline-flex items-center gap-2 border border-gray-300 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        <Download size={14} />
        Export
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={exportCsv}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
          >
            <FileText size={14} />
            CSV
          </button>
          <button
            type="button"
            onClick={exportXlsx}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
          >
            <FileSpreadsheet size={14} />
            XLSX
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
          >
            <FileText size={14} />
            PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default TableExportMenu;
