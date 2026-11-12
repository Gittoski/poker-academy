import React from "react";
import { View, Text } from "react-native";
import { Table, cardName } from "../table";
import { seatPosition } from "../positions";
import { botNames } from "../bots";
import { CardRow } from "./Visuals";
import { ui } from "./ui";
const places = [
  { bottom: 0, left: "50%" as const, marginLeft: -40 },
  { top: 195, left: 0 },
  { top: 44, left: 0 },
  { top: 0, left: "50%" as const, marginLeft: -40 },
  { top: 44, right: 0 },
  { top: 195, right: 0 },
];
export function TableSurface({
  table,
  referenceOpponent = false,
}: {
  table: Table;
  referenceOpponent?: boolean;
}) {
  return (
    <View
      style={[
        ui.card,
        { padding: 12, borderColor: "#356855", backgroundColor: "#0C221F" },
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={ui.label}>
          {["PREFLOP", "FLOP", "TURN", "RIVER"][table.stage]}
        </Text>
        <Text style={ui.label}>
          {table.done ? "HAND FINISHED" : "YOUR TURN"}
        </Text>
      </View>
      <View testID="poker-table-surface" style={{ height: 270, width: "100%" }}>
        <View
          aria-hidden
          style={{
            position: "absolute",
            left: 4,
            right: 4,
            top: 24,
            bottom: 24,
            borderRadius: 150,
            backgroundColor: "#174C3B",
            borderWidth: 5,
            borderColor: "#285D4C",
          }}
        />
        <View
          style={{
            position: "absolute",
            top: 105,
            left: "50%",
            marginLeft: -97,
            width: 194,
            alignItems: "center",
            gap: 7,
          }}
        >
          <CardRow
            cards={table.board.length ? table.board : [0, 1, 2, 3, 4]}
            hidden={!table.board.length}
            compact
          />
        </View>
        <View
          style={{
            position: "absolute",
            top: 158,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: "#F1F1E9",
              fontSize: 16,
              fontWeight: "700",
              lineHeight: 24,
            }}
          >
            {table.done
              ? "Pot awarded"
              : `Pot ${table.players.reduce((n, p) => n + p.total, 0)} chips`}
          </Text>
        </View>
        {table.players.map((p, i) => {
          const position = seatPosition(table.button, i);
          const reveal = table.done && table.board.length === 5 && !p.folded;
          const text = p.folded
            ? "Folded"
            : p.stack === 0 && !table.done
              ? "All-in"
              : `${p.stack} chips`;
          return (
            <View
              testID={`table-seat-${i}`}
              accessible
              accessibilityLabel={`${referenceOpponent && i === 2 ? "Reference" : botNames[i]}, ${position}, ${p.stack} chips, ${p.folded ? "folded" : "in hand"}${i === table.button ? ", dealer" : ""}`}
              key={i}
              style={[
                {
                  position: "absolute",
                  width: 80,
                  height: 52,
                  padding: 4,
                  borderRadius: 12,
                  backgroundColor: p.folded ? "#14272B" : "#102E27",
                  borderWidth: 1,
                  borderColor:
                    !table.done && i === table.actor ? "#E2C78F" : "#4B7467",
                  alignItems: "center",
                  justifyContent: "center",
                },
                places[i],
              ]}
            >
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  lineHeight: 14,
                  fontWeight: "700",
                  color: "#F1F1E9",
                }}
              >
                {i === table.button ? "D · " : ""}
                {referenceOpponent && i === 2
                  ? "Reference"
                  : i === 5
                    ? "Caller"
                    : botNames[i]}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  lineHeight: 12,
                  color: "#A5E8C7",
                  fontWeight: "700",
                }}
              >
                {position}
              </Text>
              <Text
                numberOfLines={1}
                style={{ fontSize: 11, lineHeight: 14, color: "#C0CED0" }}
              >
                {reveal ? p.hole.map(cardName).join(" ") : text}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
