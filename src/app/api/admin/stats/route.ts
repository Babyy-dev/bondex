import { NextRequest, NextResponse } from "next/server";
import { getOrders, getHotels } from "@/lib/db";

function toJSTDate(isoString: string): string {
  // Convert UTC ISO to JST date string YYYY-MM-DD
  const d = new Date(new Date(isoString).getTime() + 9 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
}

export async function GET(_req: NextRequest) {
  try {
    const [orders, hotels] = await Promise.all([getOrders(), getHotels()]);
    const now = new Date();
    const todayJST = toJSTDate(now.toISOString());

    // Today's stats
    const todayOrders = orders.filter((o) => toJSTDate(o.createdAt) === todayJST);
    const todayRevenue = todayOrders
      .filter((o) => o.status !== "AUTO_CANCELLED" && o.status !== "CARRIER_REFUSED" && o.status !== "CREATED")
      .reduce((sum, o) => sum + (o.totalPrice || o.basePrice), 0);
    const todayCheckedIn = todayOrders.filter((o) => o.checkedInAt && toJSTDate(o.checkedInAt) === todayJST).length;

    // Last 30 days revenue by date
    const last30: Record<string, { orders: number; revenue: number }> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = toJSTDate(d.toISOString());
      last30[dateStr] = { orders: 0, revenue: 0 };
    }
    for (const order of orders) {
      const dateStr = toJSTDate(order.createdAt);
      if (last30[dateStr] && order.status !== "AUTO_CANCELLED" && order.status !== "CARRIER_REFUSED" && order.status !== "CREATED") {
        last30[dateStr].orders++;
        last30[dateStr].revenue += order.totalPrice || order.basePrice;
      }
    }

    // Status breakdown
    const statusCounts: Record<string, number> = {};
    for (const order of orders) {
      statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
    }

    // Per-hotel payout
    const hotelPayouts: {
      hotelId: string;
      hotelName: string;
      orderCount: number;
      totalRevenue: number;
      totalCarrierCost: number;
      totalPayout: number;
    }[] = hotels.map((hotel) => {
      const hotelOrders = orders.filter(
        (o) => o.fromHotelId === hotel.id &&
          o.status !== "AUTO_CANCELLED" &&
          o.status !== "CARRIER_REFUSED" &&
          o.status !== "CREATED"
      );
      const totalRevenue     = hotelOrders.reduce((s, o) => s + (o.totalPrice || o.basePrice), 0);
      const totalCarrierCost = hotelOrders.reduce((s, o) => s + (o.actualCarrierCost ?? 0), 0);
      const totalPayout      = hotelOrders.reduce((s, o) => s + (o.payoutAmount ?? Math.round((o.totalPrice || o.basePrice) * 0.15) + (o.actualCarrierCost ?? 0)), 0);
      return {
        hotelId:         hotel.id,
        hotelName:       hotel.name + (hotel.branchName ? ` (${hotel.branchName})` : ""),
        orderCount:      hotelOrders.length,
        totalRevenue,
        totalCarrierCost,
        totalPayout,
      };
    });

    // Total revenue this month
    const thisMonth = todayJST.slice(0, 7); // "YYYY-MM"
    const monthRevenue = orders
      .filter((o) =>
        toJSTDate(o.createdAt).startsWith(thisMonth) &&
        o.status !== "AUTO_CANCELLED" &&
        o.status !== "CARRIER_REFUSED" &&
        o.status !== "CREATED"
      )
      .reduce((sum, o) => sum + (o.totalPrice || o.basePrice), 0);

    return NextResponse.json({
      today: {
        date: todayJST,
        orders: todayOrders.length,
        revenue: todayRevenue,
        checkedIn: todayCheckedIn,
      },
      thisMonth: {
        month: thisMonth,
        revenue: monthRevenue,
      },
      statusCounts,
      last30Days: Object.entries(last30).map(([date, v]) => ({ date, ...v })),
      hotelPayouts,
      totalOrders: orders.length,
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ error: "Failed to get stats" }, { status: 500 });
  }
}
