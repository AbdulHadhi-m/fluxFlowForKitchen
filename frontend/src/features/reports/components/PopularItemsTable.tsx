import React from "react";
import { PopularMenuItem } from "../types/reports.types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, UtensilsCrossed } from "lucide-react";

interface PopularItemsTableProps {
  items: PopularMenuItem[];
}

export const PopularItemsTable: React.FC<PopularItemsTableProps> = ({ items }) => {
  return (
    <Card className="bg-slate-900/60 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
          <Award className="h-4 w-4 text-amber-400" />
          Top-Selling Dishes
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No item sales in this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-400 border-b border-slate-800/80 font-semibold">
                <tr>
                  <th className="pb-2 pl-1">#</th>
                  <th className="pb-2">Item Name</th>
                  <th className="pb-2 text-center">Qty Sold</th>
                  <th className="pb-2 text-center">Orders</th>
                  <th className="pb-2 text-right pr-1">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-slate-300">
                {items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/20">
                    <td className="py-2.5 pl-1">
                      <Badge className={idx === 0 ? "bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]" : "bg-slate-800 text-slate-400 text-[10px]"}>
                        #{idx + 1}
                      </Badge>
                    </td>
                    <td className="py-2.5 font-bold text-white flex items-center gap-1.5">
                      <UtensilsCrossed className="h-3 w-3 text-slate-500" />
                      {item.item_name}
                    </td>
                    <td className="py-2.5 text-center font-mono font-bold text-indigo-300">
                      {item.quantity_sold}
                    </td>
                    <td className="py-2.5 text-center font-mono text-slate-400">
                      {item.order_count}
                    </td>
                    <td className="py-2.5 text-right pr-1 font-mono font-bold text-emerald-400">
                      ${item.revenue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
