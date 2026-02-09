import { View, StyleSheet } from "react-native";
import Colors from "@/constants/Colors";
import { useColorScheme } from "@/components/useColorScheme";

export function ProductCardSkeleton() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  return (
    <View style={styles.card}>
      <View style={[styles.image, { backgroundColor: colors.sandDivider + "80" }]} />
      <View style={styles.content}>
        <View style={[styles.line, styles.brand, { backgroundColor: colors.sandDivider + "80" }]} />
        <View style={[styles.line, styles.title1, { backgroundColor: colors.sandDivider + "60" }]} />
        <View style={[styles.line, styles.title2, { backgroundColor: colors.sandDivider + "60" }]} />
        <View style={[styles.line, styles.price, { backgroundColor: colors.sandDivider + "80" }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    maxWidth: "100%",
  },
  image: {
    aspectRatio: 4 / 5,
    borderRadius: 12,
  },
  content: {
    paddingTop: 8,
  },
  line: {
    borderRadius: 4,
    height: 12,
    marginBottom: 6,
  },
  brand: {
    width: "60%",
    height: 14,
  },
  title1: {
    width: "100%",
  },
  title2: {
    width: "70%",
  },
  price: {
    width: "35%",
    height: 14,
    marginTop: 4,
  },
});
