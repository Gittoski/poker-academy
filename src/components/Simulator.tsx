import { solvedSpot, actionLabel } from "../solvedStrategy";
import { CardRow, Touch } from "./Visuals";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Share,
  useWindowDimensions,
} from "react-native";
import { Action, legal } from "../table";
import {
  SimulatorSession,
  sessionAction,
  continueSession,
  currentDecision,
  retryDecision,
  decisionTable,
  markDecision,
  returnToLive,
  recordCursor,
} from "../simulatorSession";
import { TableSurface } from "./TableSurface";
import { HandLibrary } from "./HandLibrary";
import { DecisionChart } from "./DecisionChart";
import { heroPosition } from "../baselineCoach";
import { botNames } from "../bots";
import { ui } from "./ui";
export function Simulator({
  session,
  change,
  reset,
  persistenceError,
  onNavigate,
}: {
  session: SimulatorSession | null;
  change: (update: (s: SimulatorSession) => SimulatorSession) => void;
  reset: (mode?: "free" | "coached" | "river") => void;
  persistenceError: string;
  onNavigate?: () => void;
}) {
  const { width } = useWindowDimensions();
  const [showBetOptions, setShowBetOptions] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const [showLiveChart, setShowLiveChart] = useState(false);
  const [showCoachDetails, setShowCoachDetails] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");
  if (!session)
    return (
      <View style={ui.card}>
        <Text style={ui.heading}>
          {persistenceError ? "Table needs attention" : "Loading your table…"}
        </Text>
        {persistenceError && (
          <Text accessibilityRole="alert" style={ui.text}>
            {persistenceError}
          </Text>
        )}
        {confirmReset ? (
          <Touch
            accessibilityRole="button"
            style={ui.danger}
            onPress={() => reset()}
          >
            <Text style={ui.text}>Confirm reset virtual table</Text>
          </Touch>
        ) : persistenceError ? (
          <Touch
            accessibilityRole="button"
            style={ui.button}
            onPress={() => setConfirmReset(true)}
          >
            <Text style={ui.text}>Reset virtual table</Text>
          </Touch>
        ) : null}
      </View>
    );
  if (showLibrary)
    return (
      <HandLibrary
        session={session}
        change={change}
        close={() => {
          setShowLibrary(false);
          onNavigate?.();
        }}
        play={() => {
          setShowLibrary(false);
          setTarget("");
          setError("");
          onNavigate?.();
        }}
      />
    );
  const table = session.table;
  const feedback =
    session.retryOf === null ? session.coaching.at(-1) : undefined;
  const decision = currentDecision(session);
  const l = legal(table);
  const p = table.players[0];
  function move(action: Action) {
    try {
      let deviation = false;
      change((s) => {
        const next = sessionAction(s, action);
        deviation = next.coaching.at(-1)?.status === "deviation";
        return next;
      });
      setShowCoachDetails(deviation);
      setTarget("");
      setShowBetOptions(false);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function next() {
    try {
      change(continueSession);
      onNavigate?.();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      {session.retryOf !== null && (
        <View style={ui.card}>
          <Text style={ui.heading}>Retrying the same decision</Text>
          <Text style={ui.muted}>
            The cards, stacks, board and prior actions are restored. This is a
            practice attempt, not a new first try.
          </Text>
        </View>
      )}
      {session.resume && (
        <Touch
          accessibilityRole="button"
          style={ui.button}
          onPress={() => {
            change(returnToLive);
            onNavigate?.();
          }}
        >
          <Text style={ui.text}>Return to live table</Text>
        </Touch>
      )}
      <View
        style={[
          ui.row,
          { alignItems: "center", justifyContent: "space-between" },
        ]}
      >
        <Text style={ui.heading}>Simulator</Text>
        <Touch
          accessibilityRole="button"
          style={[ui.button, { paddingHorizontal: 10 }]}
          onPress={() => {
            setShowLibrary(true);
            onNavigate?.();
          }}
        >
          <Text style={[ui.text, { fontSize: 13 }]}>
            Saved hands & practice
          </Text>
        </Touch>
      </View>
      <View style={ui.row}>
        {[
          { mode: "free" as const, label: "Free table" },
          { mode: "coached" as const, label: "Coached hands" },
          { mode: "river" as const, label: "Solved river" },
        ].map((v) => (
          <Touch
            key={v.mode}
            accessibilityRole="button"
            accessibilityState={{ selected: session.mode === v.mode }}
            style={[
              ui.button,
              session.mode === v.mode && { borderColor: "#83E2BC" },
            ]}
            onPress={() => {
              if (v.mode !== session.mode) {
                reset(v.mode);
                setTarget("");
                setError("");
              }
            }}
          >
            <Text style={ui.text}>{v.label}</Text>
          </Touch>
        ))}
      </View>
      <Text style={ui.muted}>
        {session.mode === "river"
          ? "Preset river · BTN vs BB · Assumed ranges, calculated strategy. Varied cards on this board; check / half-pot / pot openings."
          : session.mode === "coached"
            ? "100 BB · Earlier seats preset folded · Teaching baseline, not GTO"
            : "Virtual chips · Free play. Switching mode starts a new table."}
      </Text>
      <Text style={ui.label}>
        HAND {session.hand} · BLINDS 1/2 · VIRTUAL CHIPS
      </Text>
      {session.mode === "coached" && (
        <Text style={ui.label}>
          YOUR POSITION ·{" "}
          {heroPosition(table.button) === "UTG"
            ? "LJ (UTG)"
            : heroPosition(table.button)}
        </Text>
      )}
      {persistenceError && (
        <Text accessibilityRole="alert" style={ui.text}>
          {persistenceError}
        </Text>
      )}
      <TableSurface
        table={table}
        referenceOpponent={session.mode === "river"}
      />
      {error ? (
        <Text accessibilityRole="alert" style={ui.text}>
          {error}
        </Text>
      ) : null}
      {feedback && (
        <View
          testID="simulator-coach-feedback"
          accessibilityRole="alert"
          style={[
            ui.card,
            {
              backgroundColor:
                feedback.status === "match"
                  ? "#153C2B"
                  : feedback.status === "deviation"
                    ? "#3D222D"
                    : "#172534",
              borderColor:
                feedback.status === "match"
                  ? "#83E2BC"
                  : feedback.status === "deviation"
                    ? "#F2A0B1"
                    : "#7D99AE",
            },
          ]}
        >
          <Text style={ui.heading}>{feedback.title}</Text>
          <Text style={ui.muted}>
            {feedback.status === "ungraded"
              ? "Outside current strategy coverage. You can keep playing."
              : feedback.reference === "solver"
                ? "Conditional river solve · assumed ranges"
                : "Authored first-in baseline · not a GTO verdict"}
          </Text>
          <Touch
            accessibilityRole="button"
            accessibilityState={{ expanded: showCoachDetails }}
            style={ui.button}
            onPress={() => setShowCoachDetails(!showCoachDetails)}
          >
            <Text style={ui.text}>
              {showCoachDetails
                ? "Hide coaching explanation"
                : "Why this feedback?"}
            </Text>
          </Touch>
          {decision && (
            <View style={ui.row}>
              <Touch
                accessibilityRole="button"
                style={ui.button}
                onPress={() => {
                  change((s) => retryDecision(s, decision.id));
                  setTarget("");
                  setError("");
                  onNavigate?.();
                }}
              >
                <Text style={ui.text}>Retry this decision</Text>
              </Touch>
              <Touch
                accessibilityRole="button"
                style={ui.button}
                onPress={() => change((s) => markDecision(s, decision.id))}
              >
                <Text style={ui.text}>
                  {decision.marked ? "Unmark troublesome" : "Mark troublesome"}
                </Text>
              </Touch>
            </View>
          )}
          <Touch
            accessibilityRole="button"
            style={ui.button}
            accessibilityState={{ expanded: showChart }}
            onPress={() => setShowChart(!showChart)}
          >
            <Text style={ui.text}>
              {showChart ? "Hide decision chart" : "Show decision chart"}
            </Text>
          </Touch>
          {showChart && (
            <DecisionChart table={decision ? decisionTable(decision) : table} />
          )}
          {showCoachDetails && (
            <>
              <Text style={ui.muted}>{feedback.context}</Text>
              <Text style={ui.text}>{feedback.explanation}</Text>
            </>
          )}
        </View>
      )}
      {!table.done && session.mode === "river" && (
        <>
          <Touch
            accessibilityRole="button"
            accessibilityState={{ expanded: showLiveChart }}
            style={ui.button}
            onPress={() => setShowLiveChart(!showLiveChart)}
          >
            <Text style={ui.text}>
              {showLiveChart
                ? "Hide live strategy chart"
                : "Show live strategy chart"}
            </Text>
          </Touch>
          {showLiveChart && (
            <DecisionChart key={table.actions.length} table={table} />
          )}
        </>
      )}
      {!table.done && (
        <View style={ui.card}>
          <View style={[ui.row, { alignItems: "center" }]}>
            <CardRow cards={p.hole} compact />
            <View style={{ flex: 1 }}>
              <Text style={ui.heading}>Your decision</Text>
              <Text style={ui.muted}>
                Call {l.call} · {p.stack} behind
              </Text>
            </View>
          </View>
          <View style={ui.row}>
            {l.call > 0 && (
              <Touch
                accessibilityRole="button"
                style={[
                  ui.button,
                  { flex: 1, paddingHorizontal: 8, alignItems: "center" },
                ]}
                onPress={() => move({ type: "fold" })}
              >
                <Text style={ui.text}>Fold</Text>
              </Touch>
            )}
            <Touch
              accessibilityRole="button"
              style={[
                ui.button,
                { flex: 1, paddingHorizontal: 8, alignItems: "center" },
              ]}
              onPress={() => move({ type: l.call ? "call" : "check" })}
            >
              <Text style={ui.text}>{l.call ? "Call " + l.call : "Check"}</Text>
            </Touch>
            {l.canRaise && (
              <Touch
                accessibilityRole="button"
                accessibilityLabel="Bet / raise options"
                accessibilityState={{ expanded: showBetOptions }}
                style={[
                  ui.button,
                  { flex: 1, paddingHorizontal: 8, alignItems: "center" },
                ]}
                onPress={() => setShowBetOptions(!showBetOptions)}
              >
                <Text style={ui.text}>
                  {showBetOptions ? "Close" : table.bet ? "Raise…" : "Bet…"}
                </Text>
              </Touch>
            )}
          </View>
          {l.canRaise && showBetOptions && (
            <>
              <Text style={ui.muted}>
                Raise TO a total this street. Minimum {l.minTo}, maximum{" "}
                {l.maxTo}; a smaller all-in is legal.
              </Text>
              {session.mode === "river" && solvedSpot(table) && (
                <View style={ui.row}>
                  {solvedSpot(table)!
                    .node.actions.filter((a) => a.type === "raise")
                    .map((a, i) => (
                      <Touch
                        key={i}
                        accessibilityRole="button"
                        style={ui.button}
                        onPress={() => move(a)}
                      >
                        <Text style={ui.text}>{actionLabel(a, table)}</Text>
                      </Touch>
                    ))}
                </View>
              )}
              <TextInput
                accessibilityLabel="Raise total in chips"
                style={ui.input}
                keyboardType="number-pad"
                value={target}
                onChangeText={setTarget}
                placeholder="Total chips this street"
                placeholderTextColor="#AEBCC6"
              />
              <View style={ui.row}>
                <Touch
                  accessibilityRole="button"
                  style={ui.button}
                  onPress={() => move({ type: "raise", to: Number(target) })}
                >
                  <Text style={ui.text}>Raise to amount</Text>
                </Touch>
                <Touch
                  accessibilityRole="button"
                  style={ui.button}
                  onPress={() => move({ type: "raise", to: l.maxTo })}
                >
                  <Text style={ui.text}>All-in {l.maxTo}</Text>
                </Touch>
              </View>
            </>
          )}
        </View>
      )}
      {table.done && (
        <View style={ui.card}>
          <Text accessibilityRole="alert" style={ui.heading}>
            Hand complete
          </Text>
          <Text style={ui.text}>
            {table.awards
              .map((n, i) =>
                n
                  ? `${session.mode === "river" && i === 2 ? "Reference" : botNames[i]} receives ${n}`
                  : "",
              )
              .filter(Boolean)
              .join("\n")}
          </Text>
          <Text style={ui.muted}>
            Awards include pot wins and returned unmatched chips. A result is
            not a strategic grade.
          </Text>
          <Touch accessibilityRole="button" style={ui.button} onPress={next}>
            <Text style={ui.text}>
              {session.resume ? "Return to live hand" : "Next hand"}
            </Text>
          </Touch>
          <Text style={ui.muted}>
            {session.mode === "river"
              ? "Repeats this preset board with varied exact cards, rotating the BB opening action. Stacks reset; this is focused strategy practice, not a bankroll game."
              : session.mode === "coached"
                ? "Each coached hand starts fresh with 200 chips (100 BB) per seat. Practice results are not a persistent bankroll."
                : "Seats at or below 2 chips are refilled to 200 virtual chips before the next hand. Refills are practice credits, not winnings."}
          </Text>
          <Touch
            accessibilityRole="button"
            style={ui.button}
            onPress={() =>
              Share.share({
                message: JSON.stringify(recordCursor(session), null, 2),
              }).catch(() => setError("Replay could not be shared."))
            }
          >
            <Text style={ui.text}>Export hand replay</Text>
          </Touch>
        </View>
      )}
      <Touch
        accessibilityRole="button"
        accessibilityState={{ expanded: showDetails }}
        style={ui.button}
        onPress={() => setShowDetails(!showDetails)}
      >
        <Text style={ui.text}>
          {showDetails ? "Hide table details" : "Table details & history"}
        </Text>
      </Touch>
      {showDetails && (
        <View style={ui.card}>
          <Text style={ui.heading}>Table details</Text>
          <Text style={ui.muted}>
            Six seats, blinds 1/2 chips, no ante or rake. Initial 200 chips =
            100 BB. Free/coached modes use toy opponents. Solved river mode uses
            the opponent’s exact-combination reference frequencies on covered
            nodes, with toy fallback off-tree. These are not calibrated
            recreational-player models. Your table stays saved across tabs and
            reloads.
          </Text>
          <Text style={ui.muted}>
            {session.mode === "river"
              ? "Earlier streets are preset, not graded. One board, varied range combinations, assumed ranges and a limited betting tree. Next hand rotates check / 6-chip bet / 11-chip bet by BB. Full-game coverage is still incomplete."
              : session.mode === "coached"
                ? "Every coached hand resets all seats to 200 chips (100 BB). Earlier seats are preset folded to create an unopened decision. No persistent bankroll is claimed."
                : `Seats at or below the 2-chip big blind are refilled to 200 virtual chips between hands. ${session.refills} seat refills so far. Refills are practice credits, not winnings.`}
          </Text>
          {session.coaching.length > 0 && (
            <>
              <Text style={ui.heading}>Decision review</Text>
              {session.coaching.map((f, i) => (
                <View key={i} style={{ gap: 8 }}>
                  <Text style={ui.text}>
                    Decision {i + 1}: {f.title}
                  </Text>
                  <Text style={ui.muted}>{f.context}</Text>
                  <Text style={ui.muted}>{f.explanation}</Text>
                </View>
              ))}
            </>
          )}
          <Text style={ui.heading}>Action history</Text>
          {table.log.map((v, i) => (
            <Text key={i} style={ui.muted}>
              {v}
            </Text>
          ))}
          <Touch
            accessibilityRole="button"
            style={ui.danger}
            onPress={() => setConfirmReset(true)}
          >
            <Text style={ui.text}>Reset virtual table</Text>
          </Touch>
          {confirmReset && (
            <>
              <Text style={ui.text}>
                Discard this table and start from hand 1? Learning progress will
                be kept.
              </Text>
              <Touch
                accessibilityRole="button"
                style={ui.danger}
                onPress={() => {
                  reset(session.mode);
                  setConfirmReset(false);
                }}
              >
                <Text style={ui.text}>Confirm reset virtual table</Text>
              </Touch>
              <Touch
                accessibilityRole="button"
                style={ui.button}
                onPress={() => setConfirmReset(false)}
              >
                <Text style={ui.text}>Cancel table reset</Text>
              </Touch>
            </>
          )}
        </View>
      )}
    </>
  );
}
