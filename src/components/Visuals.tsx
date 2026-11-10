import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  View,
  ViewStyle,
  Text,
} from "react-native";
const ReducedMotion = createContext(true);
export function MotionProvider({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (alive) setReduced(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return (
    <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>
  );
}
export function FadeIn({
  children,
  style,
  testID,
  delay = 0,
}: {
  testID?: string;
  delay?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useContext(ReducedMotion);
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    value.stopAnimation();
    if (reduced) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: 220,
      delay,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [reduced, value, delay]);
  return (
    <Animated.View
      testID={testID}
      style={[
        style,
        {
          opacity: value,
          transform: [
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
export function Touch({
  style,
  onPressIn,
  onPressOut,
  ...props
}: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle> }) {
  const reduced = useContext(ReducedMotion);
  const scale = useRef(new Animated.Value(1)).current;
  function move(to: number) {
    scale.stopAnimation();
    if (reduced) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue: to,
      damping: 22,
      stiffness: 320,
      mass: 0.5,
      useNativeDriver: Platform.OS !== "web",
    }).start();
  }
  useEffect(() => {
    if (reduced) {
      scale.stopAnimation();
      scale.setValue(1);
    }
  }, [reduced, scale]);
  useEffect(() => () => scale.stopAnimation(), [scale]);
  return (
    <AnimatedPressable
      {...props}
      accessibilityState={{
        ...props.accessibilityState,
        disabled: !!props.disabled,
      }}
      style={[
        { minHeight: 48, justifyContent: "center" },
        style,
        { transform: [{ scale }] },
      ]}
      onPressIn={(e) => {
        move(0.98);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        move(1);
        onPressOut?.(e);
      }}
    />
  );
}
const suits = ["♣", "♦", "♥", "♠"];
const names = ["clubs", "diamonds", "hearts", "spades"];
export function PlayingCard({
  card,
  hidden = false,
  compact = false,
  decorative = false,
}: {
  card?: number;
  hidden?: boolean;
  compact?: boolean;
  decorative?: boolean;
}) {
  const rank = card === undefined ? "" : "23456789TJQKA"[Math.floor(card / 4)];
  const suit = card === undefined ? 0 : card % 4;
  const back = hidden || card === undefined;
  const color = suit === 1 || suit === 2 ? "#AF3546" : "#162D32";
  const rankName =
    (
      { A: "Ace", K: "King", Q: "Queen", J: "Jack", T: "Ten" } as Record<
        string,
        string
      >
    )[rank] ?? rank;
  return (
    <View
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : "image"}
      accessibilityLabel={
        back ? "Face-down card" : `${rankName} of ${names[suit]}`
      }
      aria-hidden={decorative}
      style={{
        width: compact ? 34 : 46,
        height: compact ? 48 : 66,
        borderRadius: 7,
        backgroundColor: back ? "#214C42" : "#F3F0E7",
        borderWidth: 1,
        borderColor: back ? "#6A9C87" : "#D4D6CD",
        padding: 5,
        justifyContent: "space-between",
        boxShadow: "0px 3px 8px rgba(0,0,0,0.18)",
      }}
    >
      {back ? (
        <View
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#6A9C87",
            borderRadius: 3,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "#C6D9CE", fontSize: compact ? 18 : 24 }}>
            ♠
          </Text>
        </View>
      ) : (
        <>
          <Text
            style={{
              color,
              fontWeight: "800",
              fontSize: compact ? 12 : 16,
              lineHeight: compact ? 14 : 18,
            }}
          >
            {rank}
          </Text>
          <Text
            style={{
              color,
              fontSize: compact ? 19 : 26,
              alignSelf: "flex-end",
              lineHeight: compact ? 21 : 28,
            }}
          >
            {suits[suit]}
          </Text>
        </>
      )}
    </View>
  );
}
export function CardRow({
  cards,
  hidden = false,
  compact = false,
}: {
  cards: number[];
  hidden?: boolean;
  compact?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {cards.map((c, i) => (
        <FadeIn key={`${i}-${hidden ? "hidden" : c}`} delay={i * 30}>
          <PlayingCard card={c} hidden={hidden} compact={compact} />
        </FadeIn>
      ))}
    </View>
  );
}
export function LessonArt({ lesson }: { lesson: string }) {
  const royal = [51, 47, 43, 39, 35];
  if (lesson === "rules")
    return (
      <View
        style={{
          gap: 12,
          padding: 16,
          borderRadius: 16,
          backgroundColor: "#0D2927",
        }}
      >
        <Text style={{ color: "#B7CDC3", fontSize: 12, letterSpacing: 1 }}>
          READ THE BEST FIVE CARDS
        </Text>
        <CardRow cards={royal} compact />
        <Text style={{ color: "#D8E6DE", fontSize: 14 }}>
          One board. The same best five cards.
        </Text>
      </View>
    );
  if (lesson === "ranking")
    return (
      <View
        style={{
          gap: 12,
          padding: 16,
          borderRadius: 16,
          backgroundColor: "#0D2927",
        }}
      >
        <Text style={{ color: "#B7CDC3", fontSize: 12 }}>
          SAME PAIRS. COMPARE THE KICKER.
        </Text>
        <CardRow cards={[48, 49, 44, 45, 43]} compact />
        <CardRow cards={[50, 51, 46, 47, 36]} compact />
        <Text style={{ color: "#D8E6DE", fontSize: 14 }}>
          Queen kicker beats jack kicker.
        </Text>
      </View>
    );
  if (lesson === "odds" || lesson === "bluffs" || lesson === "spr")
    return (
      <View
        style={{
          padding: 20,
          borderRadius: 16,
          backgroundColor: "#0D2927",
          gap: 8,
        }}
      >
        <Text style={{ color: "#88CBB0", fontSize: 12, fontWeight: "700" }}>
          PUT THE PRICE IN PERSPECTIVE
        </Text>
        <Text style={{ color: "#F3F0E7", fontSize: 26, fontWeight: "700" }}>
          {lesson === "odds"
            ? "20 ÷ (80 + 20) = 20%"
            : lesson === "bluffs"
              ? "30 ÷ (60 + 30) = ⅓"
              : "60 ÷ 30 = 2 SPR"}
        </Text>
        <Text style={{ color: "#B7CDC3", fontSize: 14 }}>
          Under the assumptions in the example below.
        </Text>
      </View>
    );
  return null;
}
