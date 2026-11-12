import React from "react";
import { View, Text } from "react-native";
import { Table } from "../table";
import {
  evaluateBaseline,
  handClass,
  heroPosition,
  baselineName,
} from "../baselineCoach";
import { hands, firstIn, Position } from "../preflop";
import { ui } from "./ui";
export function DecisionChart({ table }: { table: Table }) {
  const coverage = evaluateBaseline(table, { type: "fold" });
  if (coverage.status === "ungraded")
    return (
      <View style={ui.card}>
        <Text style={ui.heading}>No applicable chart</Text>
        <Text style={ui.muted}>{coverage.explanation}</Text>
      </View>
    );
  const position = heroPosition(table.button) as Position;
  const hand = handClass(table.players[0].hole);
  return (
    <View style={ui.card}>
      <Text style={ui.heading}>Chart for this decision</Text>
      <Text style={ui.label}>
        {position === "UTG" ? "LJ (UTG)" : position} · {hand} · 100 BB ·
        UNOPENED
      </Text>
      <Text style={ui.text}>
        {hand}: {firstIn(position, hand)}
        {firstIn(position, hand) === "Raise"
          ? ` to ${position === "SB" ? 3 : 2.5} BB`
          : ""}
      </Text>
      <Text style={ui.muted}>
        {baselineName}. Authored raise-or-fold convention, not a solved GTO
        chart. No ante/rake; SB deliberately shares BTN hand selection. Other
        scenarios require different data.
      </Text>
      <Text style={ui.muted}>
        Green: raise · Slate: fold · Gold border: your hand. s = suited, o =
        offsuit.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {hands.map((h) => (
          <View
            accessible
            accessibilityLabel={`${h}: ${firstIn(position, h)}${h === hand ? "; your hand" : ""}`}
            key={h}
            style={{
              width: "7.69%",
              minHeight: 28,
              justifyContent: "center",
              backgroundColor:
                firstIn(position, h) === "Raise" ? "#245F4C" : "#17232D",
              borderWidth: h === hand ? 2 : 0.5,
              borderColor: h === hand ? "#E2C78F" : "#0A1015",
            }}
          >
            <Text
              style={{ fontSize: 9, textAlign: "center", color: "#F1F1E9" }}
            >
              {h}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
