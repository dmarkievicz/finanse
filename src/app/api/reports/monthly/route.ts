import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { buildMonthlyReport } from "@/lib/reports/monthly-report";
import { formatPln } from "@/lib/format";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "xlsx";
    const month =
      searchParams.get("month") ?? new Date().toISOString().slice(0, 7);

    const report = await buildMonthlyReport(supabase, month);

    if (format === "pdf") {
      const doc = new jsPDF();
      let y = 18;
      doc.setFontSize(16);
      doc.text("Raport miesięczny — Finanse Damian", 14, y);
      y += 10;
      doc.setFontSize(11);
      doc.text(report.monthLabel, 14, y);
      y += 12;
      doc.text(`Majątek netto (${report.to}): ${formatPln(report.netWorth)}`, 14, y);
      y += 7;
      doc.text(`Przychody: ${formatPln(report.income)}`, 14, y);
      y += 7;
      doc.text(`Wydatki: ${formatPln(report.expenses)}`, 14, y);
      y += 7;
      doc.text(`Nadwyżka: ${formatPln(report.surplus)}`, 14, y);
      y += 7;
      doc.text(`Stopa oszczędności: ${report.savingsRate}%`, 14, y);
      y += 12;
      doc.setFontSize(12);
      doc.text("Wydatki wg kategorii", 14, y);
      y += 8;
      doc.setFontSize(10);
      for (const c of report.categories.slice(0, 20)) {
        if (y > 270) {
          doc.addPage();
          y = 18;
        }
        doc.text(`${c.name}: ${formatPln(c.total)}`, 14, y);
        y += 6;
      }

      const pdf = doc.output("arraybuffer");
      return new NextResponse(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="raport-${month}.pdf"`,
        },
      });
    }

    const rows = [
      { Sekcja: "Podsumowanie", Pozycja: "Majątek netto", Wartość: report.netWorth },
      { Sekcja: "Podsumowanie", Pozycja: "Przychody", Wartość: report.income },
      { Sekcja: "Podsumowanie", Pozycja: "Wydatki", Wartość: report.expenses },
      { Sekcja: "Podsumowanie", Pozycja: "Nadwyżka", Wartość: report.surplus },
      { Sekcja: "Podsumowanie", Pozycja: "Stopa oszczędności %", Wartość: report.savingsRate },
      ...report.categories.map((c) => ({
        Sekcja: "Kategorie",
        Pozycja: c.name,
        Wartość: c.total,
      })),
    ];

    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Raport");
    const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="raport-${month}.xlsx"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd raportu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
