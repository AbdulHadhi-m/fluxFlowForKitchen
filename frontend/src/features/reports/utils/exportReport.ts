import {
  DashboardSummaryData,
  DailySalesTrend,
  PopularMenuItem,
  DatePreset,
} from "../types/reports.types";

interface ExportReportPayload {
  preset: DatePreset;
  startDate?: string;
  endDate?: string;
  dashboardData?: DashboardSummaryData | null;
  dailyTrends?: DailySalesTrend[];
  popularItems?: PopularMenuItem[];
}

/**
 * Clean string escaping for XML Spreadsheet
 */
const escapeXml = (str: string | number | undefined | null): string => {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
};

/**
 * Exports a multi-sheet Microsoft Excel Workbook (.xls / SpreadsheetML)
 */
export const exportReportToExcel = (payload: ExportReportPayload) => {
  const {
    preset,
    startDate,
    endDate,
    dashboardData,
    dailyTrends = [],
    popularItems = [],
  } = payload;

  const sales = dashboardData?.sales;
  const orders = dashboardData?.orders;
  const payments = dashboardData?.payments || [];
  const categories = dashboardData?.categories || [];
  const hourly = dashboardData?.hourly_trends || [];
  const inventory = dashboardData?.inventory;
  const procurement = dashboardData?.procurement;

  const dateRangeLabel =
    preset === "CUSTOM" && startDate && endDate
      ? `${startDate} to ${endDate}`
      : preset.replace(/_/g, " ");

  const todayStr = new Date().toISOString().split("T")[0];
  const filename = `Fluxiflow_Business_Analytics_${preset}_${todayStr}.xls`;

  // Construct XML Spreadsheet
  let xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>Fluxiflow Kitchen Suite - Business Analytics Report</Title>
  <Author>Fluxiflow Executive System</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="ReportTitle">
   <Font ss:FontName="Calibri" ss:Size="16" ss:Bold="1" ss:Color="#047857"/>
   <Alignment ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="SubTitle">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Italic="1" ss:Color="#64748B"/>
  </Style>
  <Style ss:ID="SectionHeader">
   <Font ss:FontName="Calibri" ss:Size="13" ss:Bold="1" ss:Color="#1E293B"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TableHeader">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#059669" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#047857"/>
   </Borders>
  </Style>
  <Style ss:ID="TableHeaderSecondary">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
  </Style>
  <Style ss:ID="CellBold">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1"/>
  </Style>
  <Style ss:ID="CellCurrency">
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="CellCurrencyBold">
   <Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#047857"/>
   <NumberFormat ss:Format="₹#,##0.00"/>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="CellNumber">
   <NumberFormat ss:Format="#,##0"/>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="CellPercent">
   <NumberFormat ss:Format="0.0%"/>
   <Alignment ss:Horizontal="Right"/>
  </Style>
  <Style ss:ID="CellCenter">
   <Alignment ss:Horizontal="Center"/>
  </Style>
 </Styles>
`;

  // SHEET 1: Executive Summary & Financial KPIs
  xml += `
 <Worksheet ss:Name="Executive Summary">
  <Table ss:DefaultColumnWidth="120">
   <Column ss:Width="200"/>
   <Column ss:Width="160"/>
   <Column ss:Width="160"/>
   <Column ss:Width="200"/>

   <Row ss:Height="30">
    <Cell ss:MergeAcross="3" ss:StyleID="ReportTitle">
     <Data ss:Type="String">FLUXIFLOW KITCHEN SUITE - BUSINESS ANALYTICS &amp; REPORTS</Data>
    </Cell>
   </Row>
   <Row>
    <Cell ss:MergeAcross="3" ss:StyleID="SubTitle">
     <Data ss:Type="String">Report Period: ${escapeXml(dateRangeLabel)} | Generated: ${escapeXml(new Date().toLocaleString())}</Data>
    </Cell>
   </Row>
   <Row ss:Height="10"/>

   <Row ss:Height="24">
    <Cell ss:MergeAcross="1" ss:StyleID="SectionHeader"><Data ss:Type="String">FINANCIAL PERFORMANCE</Data></Cell>
    <Cell ss:MergeAcross="1" ss:StyleID="SectionHeader"><Data ss:Type="String">OPERATIONS &amp; VOLUME</Data></Cell>
   </Row>

   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Net Revenue</Data></Cell>
    <Cell ss:StyleID="CellCurrencyBold"><Data ss:Type="Number">${parseFloat(sales?.net_sales || "0")}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Total Orders Placed</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${orders?.total_orders ?? 0}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Gross Revenue (Subtotal)</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${parseFloat(sales?.gross_sales || "0")}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Completed Orders</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${orders?.completed_orders ?? 0}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Total Discounts Given</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${parseFloat(sales?.discount_amount || sales?.discounts || "0")}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Active / In-Prep Orders</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${orders?.active_orders ?? 0}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Taxes Collected</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${parseFloat(sales?.tax_amount || sales?.tax || "0")}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Cancelled / Void Orders</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${orders?.cancelled_orders ?? 0}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Total Paid &amp; Settled</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${parseFloat(sales?.total_paid || "0")}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Fulfillment Rate</Data></Cell>
    <Cell ss:StyleID="CellPercent"><Data ss:Type="Number">${(orders?.completion_rate ?? 100) / 100}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Balance Outstanding Due</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${parseFloat(sales?.balance_due || "0")}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Average Order Value (AOV)</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${parseFloat(sales?.average_order_value || "0")}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Total Invoices Issued</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${sales?.total_bills ?? sales?.bill_count ?? 0}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Total Inventory SKUs</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${inventory?.total_items ?? 0}</Data></Cell>
   </Row>

   <Row ss:Height="15"/>
   <Row ss:Height="24">
    <Cell ss:MergeAcross="3" ss:StyleID="SectionHeader"><Data ss:Type="String">INVENTORY &amp; PROCUREMENT SUMMARY</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Healthy In-Stock Items</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${inventory?.in_stock ?? 0}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Open Purchase Orders</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${procurement?.open_purchase_orders ?? 0}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Low Stock Warning Items</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${inventory?.low_stock ?? 0}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">POs Awaiting Approval</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${procurement?.pending_approval ?? 0}</Data></Cell>
   </Row>
   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Out of Stock Critical Items</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${inventory?.out_of_stock ?? 0}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">Stock Availability Rate</Data></Cell>
    <Cell ss:StyleID="CellPercent"><Data ss:Type="Number">${
      inventory?.total_items && inventory.total_items > 0
        ? (inventory.total_items - (inventory.out_of_stock || 0)) / inventory.total_items
        : 1
    }</Data></Cell>
   </Row>
  </Table>
 </Worksheet>
`;

  // SHEET 2: Daily Sales Trajectory
  xml += `
 <Worksheet ss:Name="Daily Trajectory">
  <Table ss:DefaultColumnWidth="130">
   <Column ss:Width="100"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="130"/>
   <Column ss:Width="110"/>
   <Column ss:Width="130"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Net Sales (₹)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Gross Sales (₹)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Paid (₹)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Order Count</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Avg Ticket (₹)</Data></Cell>
   </Row>
`;

  dailyTrends.forEach((trend) => {
    const net = parseFloat(trend.net_sales) || 0;
    const gross = parseFloat(trend.gross_sales) || 0;
    const paid = parseFloat(trend.total_paid) || 0;
    const count = trend.order_count || 0;
    const avgTicket = count > 0 ? net / count : 0;

    xml += `
   <Row>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(trend.date)}</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${net}</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${gross}</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${paid}</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${count}</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${avgTicket.toFixed(2)}</Data></Cell>
   </Row>`;
  });

  xml += `
  </Table>
 </Worksheet>
`;

  // SHEET 3: Top-Selling Menu Items
  xml += `
 <Worksheet ss:Name="Top Menu Items">
  <Table ss:DefaultColumnWidth="140">
   <Column ss:Width="60"/>
   <Column ss:Width="240"/>
   <Column ss:Width="120"/>
   <Column ss:Width="120"/>
   <Column ss:Width="140"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Rank</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Dish / Item Name</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Quantity Sold</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Orders Included</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Revenue (₹)</Data></Cell>
   </Row>
`;

  popularItems.forEach((item, idx) => {
    xml += `
   <Row>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${idx + 1}</Data></Cell>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">${escapeXml(item.item_name)}</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${item.quantity_sold}</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${item.order_count}</Data></Cell>
    <Cell ss:StyleID="CellCurrencyBold"><Data ss:Type="Number">${parseFloat(item.revenue) || 0}</Data></Cell>
   </Row>`;
  });

  xml += `
  </Table>
 </Worksheet>
`;

  // SHEET 4: Payment Tenders Breakdown
  xml += `
 <Worksheet ss:Name="Payment Tenders">
  <Table ss:DefaultColumnWidth="140">
   <Column ss:Width="160"/>
   <Column ss:Width="140"/>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="TableHeaderSecondary"><Data ss:Type="String">Tender / Method</Data></Cell>
    <Cell ss:StyleID="TableHeaderSecondary"><Data ss:Type="String">Settled Amount (₹)</Data></Cell>
    <Cell ss:StyleID="TableHeaderSecondary"><Data ss:Type="String">Transactions</Data></Cell>
    <Cell ss:StyleID="TableHeaderSecondary"><Data ss:Type="String">Share (%)</Data></Cell>
   </Row>
`;

  payments.forEach((p) => {
    const amt = parseFloat(p.total_amount) || 0;
    const pct = p.percentage ? parseFloat(p.percentage) / 100 : 0;

    xml += `
   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">${escapeXml(p.payment_method)}</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${amt}</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${p.count}</Data></Cell>
    <Cell ss:StyleID="CellPercent"><Data ss:Type="Number">${pct}</Data></Cell>
   </Row>`;
  });

  xml += `
  </Table>
 </Worksheet>
`;

  // SHEET 5: Category Performance
  if (categories.length > 0) {
    xml += `
 <Worksheet ss:Name="Category Mix">
  <Table ss:DefaultColumnWidth="140">
   <Column ss:Width="200"/>
   <Column ss:Width="140"/>
   <Column ss:Width="140"/>
   <Column ss:Width="120"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Category Name</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Total Revenue (₹)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Quantity Sold</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Sales Share (%)</Data></Cell>
   </Row>
`;

    categories.forEach((cat) => {
      xml += `
   <Row>
    <Cell ss:StyleID="CellBold"><Data ss:Type="String">${escapeXml(cat.category_name)}</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${parseFloat(cat.total_revenue) || 0}</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${cat.quantity_sold}</Data></Cell>
    <Cell ss:StyleID="CellPercent"><Data ss:Type="Number">${(parseFloat(cat.percentage) || 0) / 100}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
`;
  }

  // SHEET 6: Hourly Kitchen Operations
  if (hourly.length > 0) {
    xml += `
 <Worksheet ss:Name="Hourly Operations">
  <Table ss:DefaultColumnWidth="140">
   <Column ss:Width="100"/>
   <Column ss:Width="140"/>
   <Column ss:Width="140"/>
   <Column ss:Width="140"/>

   <Row ss:Height="24">
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Hour (24h)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Time Slot</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Net Sales (₹)</Data></Cell>
    <Cell ss:StyleID="TableHeader"><Data ss:Type="String">Order Count</Data></Cell>
   </Row>
`;

    hourly.forEach((h) => {
      const formattedTime =
        h.hour === 0
          ? "12:00 AM"
          : h.hour < 12
          ? `${h.hour}:00 AM`
          : h.hour === 12
          ? "12:00 PM"
          : `${h.hour - 12}:00 PM`;

      xml += `
   <Row>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="Number">${h.hour}</Data></Cell>
    <Cell ss:StyleID="CellCenter"><Data ss:Type="String">${escapeXml(formattedTime)}</Data></Cell>
    <Cell ss:StyleID="CellCurrency"><Data ss:Type="Number">${parseFloat(h.net_sales) || 0}</Data></Cell>
    <Cell ss:StyleID="CellNumber"><Data ss:Type="Number">${h.order_count}</Data></Cell>
   </Row>`;
    });

    xml += `
  </Table>
 </Worksheet>
`;
  }

  xml += `</Workbook>`;

  // Trigger browser download
  const blob = new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generic CSV exporter
 */
export const exportReportToCsv = (
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) => {
  const csvContent = [
    headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","),
    ...rows.map((row) =>
      row.map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\r\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename.endsWith(".csv") ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
