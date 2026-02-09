import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";
import { useI18nStore } from "@/stores/useI18nStore";
import { useCartStore } from "@/stores/useCartStore";

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>["name"];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

function CartTabIcon({ color }: { color: string }) {
  const count = useCartStore((s) => s.getItemCount());
  return (
    <View style={cartBadgeStyles.wrap}>
      <FontAwesome name="shopping-cart" size={24} color={color} style={{ marginBottom: -3 }} />
      {count > 0 && (
        <View style={[cartBadgeStyles.badge, { backgroundColor: Colors.light.primary }]}>
          <Text style={cartBadgeStyles.text}>{count > 99 ? "99+" : count}</Text>
        </View>
      )}
    </View>
  );
}

const cartBadgeStyles = StyleSheet.create({
  wrap: { position: "relative" },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  text: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const t = useI18nStore((s) => s.t);

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.sandDivider },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("home"),
          tabBarLabel: t("home"),
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t("cart"),
          tabBarIcon: ({ color }) => <CartTabIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t("account_and_lists"),
          tabBarLabel: t("profile"),
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
