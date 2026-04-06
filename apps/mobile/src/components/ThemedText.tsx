import { Text, type TextProps, StyleSheet } from "react-native";

type ThemedTextProps = TextProps & {
  variant?: "title" | "subtitle" | "body" | "caption" | "label";
};

export function ThemedText({ variant = "body", style, ...props }: ThemedTextProps) {
  return <Text style={[styles.base, styles[variant], style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    color: "#fafafa",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  caption: {
    fontSize: 13,
    color: "#a1a1aa",
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#a1a1aa",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
