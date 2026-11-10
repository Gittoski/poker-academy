import { Touch } from "./Visuals";
import React, { useState } from "react";
import { Text, View, TextInput, Share } from "react-native";
import {
  Progress,
  weaknesses,
  freshProgress,
  decodeProgress,
  level,
} from "../progress";
import { lessons } from "../curriculum";
import { ui } from "./ui";
export function ProgressPanel({
  progress,
  save,
  review,
  ready,
}: {
  progress: Progress;
  save: (p: Progress) => void;
  review: () => void;
  ready: boolean;
}) {
  const [backup, setBackup] = useState("");
  const [restore, setRestore] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const rows = weaknesses(progress);
  return (
    <>
      <View style={ui.card}>
        <Text style={ui.heading}>
          Level {level(progress.xp)} · {progress.xp % 100}/100 XP to next level
        </Text>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="XP progress toward next level"
          accessibilityValue={{ min: 0, max: 100, now: progress.xp % 100 }}
          style={{ height: 10, backgroundColor: "#263B36", borderRadius: 5 }}
        >
          <View
            style={{
              height: 10,
              width: `${progress.xp % 100}%`,
              backgroundColor: "#57D9B0",
              borderRadius: 5,
            }}
          />
        </View>
        <Text style={ui.muted}>
          {lessons.filter((l) => progress.completed.includes(l.id)).length}/
          {lessons.length} lessons completed. Levels reward practice, not proven
          playing strength.
        </Text>
        <Text style={ui.heading}>Topics to revisit</Text>
        {rows.length ? (
          rows.map(([t, a]) => (
            <Text style={ui.muted} key={t}>
              {t}: {a.correct}/{a.total} correct ·{" "}
              {Math.round((100 * a.correct) / a.total)}%
              {a.total < 5 ? " · small sample" : ""}
            </Text>
          ))
        ) : (
          <Text style={ui.muted}>No attempts yet. Try a practice drill.</Text>
        )}
        <Touch
          accessibilityRole="button"
          disabled={!ready}
          style={ui.button}
          onPress={review}
        >
          <Text style={ui.text}>Practice weakest topic</Text>
        </Touch>
      </View>
      <View style={ui.card}>
        <Text style={ui.heading}>Your data, on your device</Text>
        <Text style={ui.muted}>
          Back up before resetting or changing devices. Restoring replaces
          current progress; invalid backups are rejected. Virtual table chips
          are not learning progress.
        </Text>
        <Touch
          accessibilityRole="button"
          disabled={!ready}
          style={ui.button}
          onPress={() => {
            const text = JSON.stringify(progress, null, 2);
            setBackup(text);
            Share.share({ message: text }).catch(() =>
              setMessage("Sharing unavailable. Copy the backup below."),
            );
          }}
        >
          <Text style={ui.text}>Export progress backup</Text>
        </Touch>
        {backup ? (
          <TextInput
            accessibilityLabel="Progress backup JSON"
            style={ui.input}
            multiline
            editable={false}
            selectTextOnFocus
            value={backup}
          />
        ) : null}
        <TextInput
          accessibilityLabel="Restore progress JSON"
          style={ui.input}
          multiline
          value={restore}
          onChangeText={setRestore}
          placeholder="Paste a backup to restore"
          placeholderTextColor="#AEBCC6"
        />
        <Touch
          accessibilityRole="button"
          style={ui.button}
          onPress={() => {
            try {
              if (!restore.trim()) throw new Error();
              const next = decodeProgress(restore);
              save(next);
              setMessage("Backup accepted. Saving restored progress.");
              setRestore("");
            } catch {
              setMessage(
                "Invalid or unsupported backup. Current progress was preserved.",
              );
            }
          }}
        >
          <Text style={ui.text}>Replace progress from backup</Text>
        </Touch>
        <Touch
          accessibilityRole="button"
          style={ui.danger}
          onPress={() => setConfirm(true)}
        >
          <Text style={ui.text}>Reset learning progress</Text>
        </Touch>
        {confirm && (
          <>
            <Text style={ui.text}>
              Erase all XP, quiz completion and attempts on this device? This
              cannot be undone without a backup.
            </Text>
            <Touch
              accessibilityRole="button"
              style={ui.danger}
              onPress={() => {
                save(freshProgress());
                setConfirm(false);
                setMessage("Reset requested. Saving empty progress.");
              }}
            >
              <Text style={ui.text}>Confirm erase progress</Text>
            </Touch>
            <Touch
              accessibilityRole="button"
              style={ui.button}
              onPress={() => setConfirm(false)}
            >
              <Text style={ui.text}>Cancel reset</Text>
            </Touch>
          </>
        )}
        {message ? (
          <Text accessibilityRole="alert" style={ui.muted}>
            {message}
          </Text>
        ) : null}
      </View>
    </>
  );
}
