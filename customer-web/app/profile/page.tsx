"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useI18nStore } from "@/stores/useI18nStore";
import api from "@/lib/api";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Loader2, Package, MapPin } from "lucide-react";

interface Order {
    id: number;
    total_amount: number;
    status: string;
    created_at: string;
    shipping_address: string;
}

export default function ProfilePage() {
    const { user, isAuthenticated } = useAuthStore();
    const t = useI18nStore((s) => s.t);
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/login");
            return;
        }

        const fetchOrders = async () => {
            try {
                // Fetches orders for the current user
                const response = await api.get("/orders/my-orders");
                setOrders(response.data);
            } catch (error) {
                console.error("Failed to fetch orders:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, [isAuthenticated, router]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-secondary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">{t("your_profile")}</h1>
                <p className="text-gray-500 mt-2">{t("welcome_back")}, {user?.full_name}</p>
                <p className="text-gray-500">{user?.email}</p>
            </div>

            <Link
                href="/profile/addresses"
                className="inline-flex items-center gap-2 text-[#ec9213] font-semibold mb-6 hover:underline"
            >
                <MapPin className="h-5 w-5" />
                {t("shipping_addresses")}
            </Link>

            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Package className="h-6 w-6" />
                {t("order_history")}
            </h2>

            {orders.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500">{t("no_orders_yet")}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <Card key={order.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="bg-gray-50 py-4 flex flex-row items-center justify-between">
                                <div>
                                    <div className="text-sm text-gray-500 uppercase font-semibold">{t("order_placed")}</div>
                                    <div className="text-gray-900 font-medium">
                                        {new Date(order.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 uppercase font-semibold">{t("total")}</div>
                                    <div className="text-gray-900 font-medium">AED {order.total_amount.toFixed(2)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 uppercase font-semibold">{t("order_number")}</div>
                                    <div className="text-gray-900 font-medium">{order.id}</div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${order.status === 'paid' ? 'bg-green-100 text-green-800' :
                                                order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                    'bg-gray-100 text-gray-800'}`}>
                                            {order.status}
                                        </span>
                                        <div className="mt-2 text-sm text-gray-600">
                                            <strong>{t("ship_to")}</strong> {order.shipping_address}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
